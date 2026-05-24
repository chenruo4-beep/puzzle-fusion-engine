"""
API响应格式标准化工具
"""

from typing import Any, Optional, Dict, List, Union
from fastapi import HTTPException, status
from pydantic import BaseModel


class APIResponse(BaseModel):
    """标准API成功响应"""
    success: bool = True
    message: str = "操作成功"
    data: Optional[Any] = None
    code: int = 200


class APIErrorResponse(BaseModel):
    """标准API错误响应"""
    success: bool = False
    message: str
    code: int
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


def success_response(
    data: Any = None,
    message: str = "操作成功",
    code: int = 200
) -> Dict[str, Any]:
    """返回成功的标准响应"""
    return {
        "success": True,
        "message": message,
        "data": data,
        "code": code
    }


def error_response(
    message: str,
    code: int = 400,
    error: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """返回错误的标准响应"""
    return {
        "success": False,
        "message": message,
        "code": code,
        "error": error,
        "details": details
    }


def bad_request_response(
    message: str = "请求参数错误",
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """返回400错误"""
    return error_response(message, 400, details=details)


def unauthorized_response(
    message: str = "未授权访问"
) -> Dict[str, Any]:
    """返回401错误"""
    return error_response(message, 401)


def forbidden_response(
    message: str = "权限不足"
) -> Dict[str, Any]:
    """返回403错误"""
    return error_response(message, 403)


def not_found_response(
    message: str = "资源不存在"
) -> Dict[str, Any]:
    """返回404错误"""
    return error_response(message, 404)


def validation_error_response(
    errors: List[Dict[str, Any]],
    message: str = "数据验证失败"
) -> Dict[str, Any]:
    """返回422验证错误"""
    return error_response(
        message,
        422,
        details={"validation_errors": errors}
    )


def internal_server_response(
    message: str = "服务器内部错误"
) -> Dict[str, Any]:
    """返回500错误"""
    return error_response(message, 500)


def paginated_response(
    data: List[Any],
    total: int,
    page: int,
    page_size: int,
    message: str = "查询成功"
) -> Dict[str, Any]:
    """返回分页响应"""
    return success_response({
        "items": data,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }, message)