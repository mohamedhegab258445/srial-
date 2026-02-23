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
    
    # Extract ALL user messages to see if a serial was mentioned in the history
    all_user_msgs = " ".join([m.parts[0] for m in request.messages if m.role == "user"])
    last_user_msg = request.messages[-1].parts[0] if request.messages[-1].role == "user" else ""
    
    # Try to find a serial number in the message history (prioritize the last one mentioned)
    serial_matches = re.findall(r'(SRL-[A-Z0-9]+)', all_user_msgs, re.IGNORECASE)
    active_serial = serial_matches[-1].upper() if serial_matches else None
    
    extra_context = ""
    if active_serial:
        # Query the database
        serial_obj = db.query(Serial).filter(Serial.serial_number == active_serial).first()
        if serial_obj and serial_obj.user and serial_obj.user.phone:
            from datetime import datetime, timedelta
            from models import OTPCode
            
            phone = serial_obj.user.phone
            contact_key = f"chat_auth:{active_serial}:{phone}"
            
            # Check if recently verified (within last 30 minutes)
            recent_verified = db.query(OTPCode).filter(
                OTPCode.contact == contact_key,
                OTPCode.used == 1,
                OTPCode.expires_at > datetime.utcnow() - timedelta(minutes=30)
            ).first()
            
            product_name = serial_obj.product.name if serial_obj.product else "غير معروف"
            
            if recent_verified:
                extra_context = f"\n\n[معلومة أمنية للاستخدام: العميل موثق بنجاح. بيانات السيريال {active_serial} هي: المنتج: {product_name}، حالة الضمان: {serial_obj.warranty_status}. أجب عن أسئلته بناءً على هذه البيانات بحرية تامة.]"
            else:
                # Not verified. Check if the LAST message contains an OTP candidate (4 digits)
                otp_match = re.search(r'\b(\d{4})\b', last_user_msg)
                
                if otp_match:
                    code = otp_match.group(1)
                    # Try to verify
                    otp = db.query(OTPCode).filter(
                        OTPCode.contact == contact_key,
                        OTPCode.code == code,
                        OTPCode.used == 0,
                        OTPCode.expires_at > datetime.utcnow()
                    ).first()
                    
                    if otp:
                        # Valid OTP! Mark as used and extend expiry to create a 30-min window
                        otp.used = 1
                        otp.expires_at = datetime.utcnow() + timedelta(minutes=30)
                        db.commit()
                        extra_context = f"\n\n[معلومة أمنية للاستخدام: العميل أدخل كود OTP صحيح! موثق بنجاح. بيانات السيريال {active_serial} هي: المنتج: {product_name}، حالة الضمان: {serial_obj.warranty_status}. أخبر العميل أن التوثيق نجح وأعطه هذه البيانات.]"
                    else:
                        extra_context = f"\n\n[معلومة للنظام: العميل أدخل كود OTP غير صحيح أو أنه انتهت صلاحيته. اطلب منه المحاولة مرة أخرى أو طلب كود جديد.]"
                
                else:
                    # User didn't enter code. Send OTP if we haven't sent a valid one recently.
                    recent_unverified = db.query(OTPCode).filter(
                        OTPCode.contact == contact_key,
                        OTPCode.used == 0,
                        OTPCode.expires_at > datetime.utcnow()
                    ).first()
                    
                    if not recent_unverified:
                        from auth import generate_otp
                        from utils import send_whatsapp_message
                        from routers.check import get_setting
                        
                        code = generate_otp()
                        expires = datetime.utcnow() + timedelta(minutes=10)
                        db.query(OTPCode).filter(OTPCode.contact == contact_key, OTPCode.used == 0).delete()
                        db.add(OTPCode(contact=contact_key, code=code, expires_at=expires))
                        db.commit()
                        
                        template = get_setting(
                            db, "otp_welcome_msg",
                            "مرحباً 👋\nرمز التحقق لبوابة الضمان: *{code}*\nصالح لمدة 10 دقائق. لا تشاركه مع أحد."
                        )
                        msg = template.replace("{code}", code)
                        send_whatsapp_message(phone, msg)
                        
                    extra_context = f"\n\n[معلومة النظام: العميل يستعلم عن {active_serial} ولم يتم توثيقه بعد. تم إرسال رسالة واتساب برمز OTP للعميل آلياً الآن. اطلب منه إدخال الرمز المكون من 4 أرقام الذي وصله على الواتساب لكي تعرض له البيانات بأمان. **تنبيه هام ومشدد: لا تخبره باسم المنتج ولا تعرض أي تفاصيل إطلاقاً حتى يكتب الرمز الصحيح!**]"

        elif serial_obj and not serial_obj.user:
            extra_context = f"\n\n[معلومة للنظام: السيريال {active_serial} موجود ولكنه غير مرتبط بأي عميل حالياً (غير مفعل). يمكنك إخبار العميل بذلك ومساعدته في كيفية تفعيل الضمان عبر الموقع.]"
            
        else:
            extra_context = f"\n\n[معلومة للنظام: المستخدم سأل عن السيريال {active_serial} ولكن بعد البحث في قاعدة البيانات تبين أن هذا السيريال غير موجود إطلاقاً، يرجى إخبار المستخدم بذلك بلطف.]"

    # Convert Pydantic objects to dicts for the service
    messages_dict = [{"role": msg.role, "parts": msg.parts} for msg in request.messages]
    
    reply_text = generate_chat_response(messages_dict, extra_context=extra_context)
    
    return ChatResponse(reply=reply_text)
