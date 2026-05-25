"""
AI Provider 路由 — 查询/切换/自定义 AI 提供商
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from models import User
from routers.auth import get_current_user
from services.ai_provider import (
    get_available_providers,
    get_user_provider,
    set_user_provider,
    add_custom_provider,
    remove_custom_provider,
    AIProvider,
)

router = APIRouter(prefix="/api/ai", tags=["AI Provider"])


class ProviderSelect(BaseModel):
    provider_id: str


class CustomProviderCreate(BaseModel):
    id: str
    name: str
    api_base: str
    model: str
    max_tokens: int = 4096
    temperature: float = 0.7


class ProviderResponse(BaseModel):
    id: str
    name: str
    model: str
    max_tokens: int
    builtin: bool


class CurrentProviderResponse(BaseModel):
    provider_id: str
    name: str
    model: str


@router.get("/providers", response_model=list[ProviderResponse])
async def list_providers(
    current_user: User = Depends(get_current_user),
):
    """获取所有可用的 AI Provider"""
    return get_available_providers()


@router.get("/provider/current", response_model=CurrentProviderResponse)
async def get_current_provider(
    current_user: User = Depends(get_current_user),
):
    """获取当前用户选择的 AI Provider"""
    provider = get_user_provider(current_user.id)
    return CurrentProviderResponse(
        provider_id=provider.id,
        name=provider.name,
        model=provider.model,
    )


@router.post("/provider/select")
async def select_provider(
    payload: ProviderSelect,
    current_user: User = Depends(get_current_user),
):
    """切换 AI Provider"""
    ok = set_user_provider(current_user.id, payload.provider_id)
    if not ok:
        raise HTTPException(status_code=400, detail=f"未知的 Provider: {payload.provider_id}")
    return {"message": f"已切换到 {payload.provider_id}"}


@router.post("/providers/custom")
async def create_custom_provider(
    payload: CustomProviderCreate,
    current_user: User = Depends(get_current_user),
):
    """添加自定义 AI Provider"""
    provider = AIProvider(
        id=payload.id,
        name=payload.name,
        api_base=payload.api_base,
        model=payload.model,
        max_tokens=payload.max_tokens,
        temperature=payload.temperature,
        supports_streaming=True,
    )
    add_custom_provider(provider)
    return {"message": f"自定义 Provider {payload.name} 已添加"}


@router.delete("/providers/custom/{provider_id}")
async def delete_custom_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user),
):
    """删除自定义 Provider"""
    ok = remove_custom_provider(provider_id)
    if not ok:
        raise HTTPException(status_code=404, detail="自定义 Provider 不存在")
    return {"message": f"Provider {provider_id} 已删除"}
