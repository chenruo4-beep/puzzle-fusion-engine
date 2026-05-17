"""合拍订单路由 - 双人确认+冷静期机制"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models.co_creation_order import CoCreationOrder

router = APIRouter(tags=["co-creation-orders"])


class OrderCreate(BaseModel):
    co_creation_id: int
    initiator_id: int
    initiator_name: str
    partner_name: str
    amount: float = 9.9


class PartnerConfirm(BaseModel):
    partner_id: int
    paid_by: str = "initiator"  # initiator/partner/aa


class RefundRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/")
async def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    """发起合拍地图订单（第一步：发起人创建）"""
    order = CoCreationOrder(
        co_creation_id=body.co_creation_id,
        initiator_id=body.initiator_id,
        initiator_name=body.initiator_name,
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
async def partner_confirm(order_id: int, body: PartnerConfirm, db: Session = Depends(get_db)):
    """对方确认订单（第二步：合伙人确认+选择出资方式）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status != "pending_partner":
        raise HTTPException(status_code=400, detail="订单状态不允许确认")
    
    order.partner_id = body.partner_id
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
async def pay_order(order_id: int, db: Session = Depends(get_db)):
    """支付订单（第三步：支付+开启冷静期）"""
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
    
    return {
        "success": True,
        "data": {
            "id": order.id,
            "status": "paid",
            "cool_down_end": cool_down_end.isoformat(),
            "refund_available": True,
            "message": f"支付成功！3天冷静期内（至 {cool_down_end.strftime('%m月%d日')}）可随时退款。"
        }
    }


@router.post("/{order_id}/refund")
async def refund_order(order_id: int, body: RefundRequest, db: Session = Depends(get_db)):
    """退款（冷静期内）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
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
async def get_order(order_id: int, db: Session = Depends(get_db)):
    """获取订单详情"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
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
async def archive_order(order_id: int, body: ArchiveRequest, db: Session = Depends(get_db)):
    """存档订单（关系结束后保留纪念地图）"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
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
async def unarchive_order(order_id: int, db: Session = Depends(get_db)):
    """恢复存档订单"""
    order = db.query(CoCreationOrder).filter(CoCreationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
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
async def list_orders(db: Session = Depends(get_db)):
    """列出所有订单"""
    orders = db.query(CoCreationOrder).order_by(CoCreationOrder.created_at.desc()).all()
    return {
        "success": True,
        "data": [{
            "id": o.id,
            "status": o.status,
            "initiator_name": o.initiator_name,
            "partner_name": o.partner_name,
            "amount": o.amount,
            "archived": o.archived,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        } for o in orders]
    }
