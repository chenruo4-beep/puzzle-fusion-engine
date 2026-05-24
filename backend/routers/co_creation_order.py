"""合拍订单路由 - 双人确认+冷静期机制"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import json

from database import get_db
from models.co_creation_order import CoCreationOrder
from models.co_creation import CoCreation
from models.user import User
from models.journey_map import JourneyMap, MapStep, MapProgress
from routers.auth import get_current_user

router = APIRouter(tags=["co-creation-orders"])


class OrderCreate(BaseModel):
    co_creation_id: int
    initiator_id: Optional[int] = None  # deprecated, now from auth header
    initiator_name: str
    partner_name: str
    amount: float = 9.9


class PartnerConfirm(BaseModel):
    paid_by: str = "initiator"  # initiator/partner/aa


class RefundRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/")
async def create_order(body: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """发起合拍地图订单（第一步：发起人创建）"""
    order = CoCreationOrder(
        co_creation_id=body.co_creation_id,
        initiator_id=current_user.id,
        initiator_name=body.initiator_name or current_user.email,
        partner_name=body.partner_name,
        amount=body.amount,
        status="pending_partner",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": order.status,
            "message": f"已邀请 {body.partner_name} 确认，等待对方回应..."
        }
    }


@router.post("/{order_id}/confirm")
async def partner_confirm(order_id: int, body: PartnerConfirm, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """对方确认订单（第二步：合伙人确认+选择出资方式）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status != "pending_partner":
        raise HTTPException(status_code=400, detail="订单状态不允许确认")

    order.partner_id = current_user.id
    order.paid_by = body.paid_by
    order.status = "partner_confirmed"
    db.commit()
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": order.status,
            "paid_by": body.paid_by,
            "message": "双方已确认！请完成支付生成地图。"
        }
    }


@router.post("/{order_id}/pay")
async def pay_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """支付订单（第三步：支付+开启冷静期+自动生成行进地图）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status != "partner_confirmed":
        raise HTTPException(status_code=400, detail="订单未确认，无法支付")

    # 设置冷静期（3天）
    cool_down_end = datetime.utcnow() + timedelta(days=3)

    order.status = "paid"
    order.paid_at = datetime.utcnow()
    order.cool_down_end = cool_down_end
    order.refund_available = True
    db.commit()
    db.refresh(order)

    # 自动生成行进地图
    map_id = None
    try:
        co = db.query(CoCreation).filter(CoCreation.id == order.co_creation_id).first()
        if co and co.result:
            result = json.loads(co.result)
            roadmap = result.get("roadmap", [])
            directions = result.get("directions", [])
            first_dir = directions[0] if directions else {}

            # 创建 JourneyMap
            journey_map = JourneyMap(
                user_id=current_user.id,
                title=f"{co.user_a_name} × {co.user_b_name} · {co.project_type}",
                subtitle=result.get("golden_sentence", ""),
                difficulty=first_dir.get("difficulty", "medium"),
                time_to_result="4周",
                status="active",
                progress=0,
            )
            db.add(journey_map)
            db.commit()
            db.refresh(journey_map)

            # 创建 MapSteps
            if roadmap:
                for i, step_data in enumerate(roadmap):
                    step = MapStep(
                        map_id=journey_map.id,
                        step_number=step_data.get("step", i + 1),
                        title=step_data.get("title", f"第{i+1}步"),
                        description=step_data.get("description", ""),
                        landmark=step_data.get("landmark", ""),
                        landmark_icon=step_data.get("landmark_icon", "📍"),
                        time_estimate="1周",
                        action=step_data.get("description", ""),
                        status="active" if i == 0 else "locked",
                        position_x=100 + i * 180,
                        position_y=200 + (i % 2) * 120,
                    )
                    db.add(step)
            else:
                # fallback: 从 directions 生成步骤
                for i, d in enumerate(directions):
                    step = MapStep(
                        map_id=journey_map.id,
                        step_number=i + 1,
                        title=d.get("title", f"方向{i+1}"),
                        description=d.get("description", ""),
                        landmark=d.get("landmark", ""),
                        landmark_icon=d.get("landmark_icon", "📍"),
                        time_estimate="1周",
                        action=d.get("next_action", ""),
                        status="active" if i == 0 else "locked",
                        position_x=100 + i * 180,
                        position_y=200 + (i % 2) * 120,
                    )
                    db.add(step)

            db.commit()

            # 创建进度记录
            progress = MapProgress(
                user_id=current_user.id,
                map_id=journey_map.id,
                current_step=1,
                overall_progress=0,
            )
            db.add(progress)
            db.commit()

            # 更新订单
            order.map_generated = True
            order.map_id = journey_map.id
            db.commit()

            map_id = journey_map.id
    except Exception as e:
        import traceback
        traceback.print_exc()
        # 地图生成失败不影响支付，但需要记录日志

    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": "paid",
            "cool_down_end": cool_down_end.isoformat(),
            "refund_available": True,
            "map_generated": order.map_generated,
            "map_id": map_id,
            "message": f"支付成功！3天冷静期内（至 {cool_down_end.strftime('%m月%d日')}）可随时退款。",
        }
    }


@router.post("/{order_id}/refund")
async def refund_order(order_id: int, body: RefundRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """退款（冷静期内）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 校验权限：只有发起人可以退款
    if order.initiator_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有发起人可以申请退款")
    
    if not order.refund_available:
        raise HTTPException(status_code=400, detail="冷静期已过，无法退款")
    
    if order.cool_down_end and datetime.utcnow() > order.cool_down_end:
        order.refund_available = False
        db.commit()
        raise HTTPException(status_code=400, detail="冷静期已过，无法退款")
    
    order.status = "refunded"
    order.refund_available = False
    db.commit()
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": "refunded",
            "message": "退款已处理。如果未来改变主意，随时可以重新开始。"
        }
    }


@router.get("/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取订单详情"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 校验权限：只有相关用户才能查看订单
    if order.initiator_id != current_user.id and order.partner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此订单")
    
    # 检查冷静期是否过期
    if order.cool_down_end and datetime.utcnow() > order.cool_down_end:
        order.refund_available = False
        db.commit()
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": order.status,
            "initiator_name": order.initiator_name,
            "partner_name": order.partner_name,
            "paid_by": order.paid_by,
            "amount": order.amount,
            "cool_down_end": order.cool_down_end.isoformat() if order.cool_down_end else None,
            "refund_available": order.refund_available,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        }
    }


class ArchiveRequest(BaseModel):
    note: Optional[str] = None


@router.post("/{order_id}/archive")
async def archive_order(order_id: int, body: ArchiveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """存档订单（关系结束后保留纪念地图）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 校验权限：只有相关用户可以存档
    if order.initiator_id != current_user.id and order.partner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权存档此订单")
    
    order.archived = True
    order.archived_at = datetime.utcnow()
    order.archive_note = body.note or ""
    db.commit()
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "archived": True,
            "archived_at": order.archived_at.isoformat(),
            "message": "已存档为纪念地图。这段旅程值得被记住。"
        }
    }


@router.post("/{order_id}/unarchive")
async def unarchive_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """恢复存档订单"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 校验权限：只有相关用户可以恢复存档
    if order.initiator_id != current_user.id and order.partner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权恢复此订单")
    
    order.archived = False
    order.archived_at = None
    db.commit()
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "archived": False,
            "message": "已恢复。欢迎回来。"
        }
    }


@router.get("/")
async def list_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """列出订单列表"""
    # 只返回当前用户参与的订单
    orders = db.query(CoCreationOrder).filter(
        (CoCreationOrder.initiator_id == current_user.id) |
        (CoCreationOrder.partner_id == current_user.id)
    ).order_by(CoCreationOrder.created_at.desc()).all()
    return {
        "success": True,
        "data": [{
            "id": o.id,
            "co_creation_id": o.co_creation_id,
            "status": o.status,
            "initiator_name": o.initiator_name,
            "partner_name": o.partner_name,
            "amount": o.amount,
            "archived": o.archived,
            "cool_down_end": o.cool_down_end.isoformat() if o.cool_down_end else None,
            "refund_available": o.refund_available,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        } for o in orders]
    }
