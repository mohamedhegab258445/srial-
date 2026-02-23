from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from services.chatbot import generate_chat_response

router = APIRouter(prefix="/chat", tags=["Ai Chatbot"])

class ChatMessage(BaseModel):
    role: str # "user" or "model" 
    parts: List[str] # ["Hello"]

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Receive user chat history and return AI response.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")
    
    # Convert Pydantic objects to dicts for the service
    messages_dict = [{"role": msg.role, "parts": msg.parts} for msg in request.messages]
    
    reply_text = generate_chat_response(messages_dict)
    
    return ChatResponse(reply=reply_text)
