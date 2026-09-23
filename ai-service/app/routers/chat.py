from fastapi import APIRouter
from app.models.schemas import (
    ChatRespondRequest,
    ChatRespondResponse,
    ExpandQueryRequest,
    ExpandQueryResponse,
)
from app.services.rag_chat import generate_chat_response
from app.services.query_expansion import expand_query

router = APIRouter(prefix="/api/chat", tags=["RAG Repository Chat"])


@router.post("/respond", response_model=ChatRespondResponse)
async def handle_chat_respond(request: ChatRespondRequest):
    """
    Generates a context-grounded conversational answer for a question regarding repository code.
    """
    return await generate_chat_response(
        question=request.question,
        retrieved_chunks=request.retrieved_chunks,
        conversation_history=request.conversation_history,
    )


@router.post("/expand-query", response_model=ExpandQueryResponse)
async def handle_expand_query(request: ExpandQueryRequest):
    """
    Expands conversational user queries into keyword-rich terms for vector retrieval.
    """
    expanded = await expand_query(request.question)
    return ExpandQueryResponse(
        original_query=request.question,
        expanded_query=expanded,
    )
