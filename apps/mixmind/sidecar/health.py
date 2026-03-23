from fastapi import APIRouter
from version import VERSION

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "version": VERSION}
