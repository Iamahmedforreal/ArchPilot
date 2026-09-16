from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from schema.ai_chat_schema import(
    AIMessageRequest,
)

router  = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("{project_id}/ai/messages", status_code=status.HTTP_201_CREATED)
async def post_ai_message():
    pass