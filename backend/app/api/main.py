from fastapi import APIRouter
from app.api.routes import auth, analysis, platform_proxy

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(analysis.router, prefix="/analyse", tags=["analysis"])
api_router.include_router(platform_proxy.router, prefix="/platform", tags=["platform"])