"""
API routes for playlist generation, analytics, feedback, and user management.
"""
from fastapi import APIRouter
from src.backend.api.endpoints import router as endpoints_router

router = APIRouter()
router.include_router(endpoints_router, prefix="/v1")

@router.get("/status")
def status():
    return {"status": "Backend is running"}
