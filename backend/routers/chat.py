from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from sqlalchemy.orm import Session
import re

from database import get_db
from models import Serial
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
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Receive user chat history and return AI response.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")
    
    # Extract the last user message to see if they mentioned a serial
    last_user_msg = request.messages[-1].parts[0] if request.messages[-1].role == "user" else ""
    
    # Try to find a serial number in the message
    # Looking for something like SRL-XYZ123 (assuming 'SRL-' prefix, but let's be flexible)
    serial_match = re.search(r'(SRL-[A-Z0-9]+)', last_user_msg, re.IGNORECASE)
    
    extra_context = ""
    if serial_match:
        serial_str = serial_match.group(1).upper()
        # Query the database
        serial_obj = db.query(Serial).filter(Serial.serial_number == serial_str).first()
        if serial_obj:
            product_name = serial_obj.product.name if serial_obj.product else "منتج غير معروف"
            extra_context = f"\n\n[معلومة للنظام: المستخدم يسأل عن السيريال {serial_str}. المنتج هو: {product_name} وحالته الحالية هي: {serial_obj.warranty_status} وتاريخ نهاية أو بداية الضمان متاح في النظام.]"
        else:
            extra_context = f"\n\n[معلومة للنظام: المستخدم سأل عن السيريال {serial_str} ولكن بعد البحث في قاعدة البيانات تبين أن هذا السيريال غير موجود إطلاقاً، يرجى إخبار المستخدم بذلك ولطفاً.]"

    # Convert Pydantic objects to dicts for the service
    messages_dict = [{"role": msg.role, "parts": msg.parts} for msg in request.messages]
    
    reply_text = generate_chat_response(messages_dict, extra_context=extra_context)
    
    return ChatResponse(reply=reply_text)
