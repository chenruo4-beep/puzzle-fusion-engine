"""模板路由 - 6 个预设日记模板的查询与应用"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.template import Template
from schemas.template import TemplateResponse, TemplateApply

router = APIRouter()


@router.get("/", response_model=list[TemplateResponse])
async def list_templates(db: Session = Depends(get_db)):
    """获取所有模板列表（6 个预设模板）"""
    templates = db.query(Template).all()
    # 如果没有模板，返回内置默认列表
    if not templates:
        return _default_templates()
    return templates


@router.post("/{template_id}/apply")
async def apply_template(template_id: int, body: TemplateApply, db: Session = Depends(get_db)):
    """应用指定模板 - 接收用户填写的内容"""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        # 尝试从默认模板匹配
        defaults = _default_templates()
        if template_id <= len(defaults):
            template = defaults[template_id - 1]
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="模板不存在")

    return {
        "message": "模板应用成功",
        "template_name": template.name if isinstance(template, Template) else template["name"],
        "content": body.content,
    }


def _default_templates() -> list[dict]:
    """返回 6 个默认内置模板"""
    return [
        {
            "id": 1,
            "name": "今日三件事",
            "description": "快速记录今天最想做的三件事",
            "prompts": '["今天最重要的是什么？", "为什么这件事很重要？", "完成后你会感觉如何？"]',
            "created_at": "2026-05-12T00:00:00",
        },
        {
            "id": 2,
            "name": "情绪日记",
            "description": "觉察并记录今日的情绪流动",
            "prompts": '["今天主要情绪是什么？", "什么触发了这种情绪？", "你是如何应对的？"]',
            "created_at": "2026-05-12T00:00:00",
        },
        {
            "id": 3,
            "name": "感恩记录",
            "description": "记录今天值得感恩的人事物",
            "prompts": '["今天你感谢什么？", "谁让你感到温暖？", "你学到了什么？"]',
            "created_at": "2026-05-12T00:00:00",
        },
        {
            "id": 4,
            "name": "成长复盘",
            "description": "回顾今天的决策与行动，思考改进方向",
            "prompts": '["今天做了什么决定？", "结果如何？", "下次你会怎么做？"]',
            "created_at": "2026-05-12T00:00:00",
        },
        {
            "id": 5,
            "name": "关系觉察",
            "description": "觉察今天与他人的互动模式",
            "prompts": '["今天和谁的互动印象深刻？", "你的沟通模式是什么？", "有什么想对对方说的？"]',
            "created_at": "2026-05-12T00:00:00",
        },
        {
            "id": 6,
            "name": "自由书写",
            "description": "不受约束地写下任何你想表达的",
            "prompts": '["此刻脑海中浮现的是什么？", "有什么想说的？", "写完后感觉如何？"]',
            "created_at": "2026-05-12T00:00:00",
        },
    ]