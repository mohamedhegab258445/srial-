"""Users / Customer Auth router - OTP login + My Products."""
from datetime import datetime, timedelta
from typing import List
import logging
import re
import httpx

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import User, OTPCode, Serial
from routers.settings import SiteSetting
from schemas import OTPRequest, OTPVerify, TokenOut, SerialOut
from auth import create_access_token, generate_otp, require_customer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Customer Auth"])
products_router = APIRouter(prefix="/api/customer", tags=["Customer Portal"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return s.value if s else default


def normalize_phone(contact: str) -> str:
    """Convert 01xxxxxxxxx → 201xxxxxxxxx (international without +)"""
    digits = re.sub(r"\D", "", contact)
    if digits.startswith("0") and len(digits) == 11:
        digits = "2" + digits   # Egypt: 01x → 201x
    return digits


def send_whatsapp_otp(phone: str, code: str, db: Session) -> bool:
    """
    Send OTP via the local WhatsApp Gateway (localhost:3001).
    Falls back gracefully if the gateway isn't running or not connected.
    """
    # Read message template from settings (optional customization)
    template = get_setting(
        db, "otp_welcome_msg",
        "مرحباً 👋\nرمز التحقق الخاص بك هو: *{code}*\nصالح لمدة 10 دقائق. لا تشاركه مع أحد."
    )

    to      = normalize_phone(phone)
    message = template.replace("{code}", code)

    try:
        r = httpx.post(
            "http://localhost:3001/send",
            json={"to": to, "message": message},
            timeout=8,
        )
        if r.status_code == 200 and r.json().get("success"):
            logger.info(f"WhatsApp OTP sent to {to}")
            return True
        else:
            logger.warning(f"Gateway error: {r.text}")
            return False
    except Exception as e:
        logger.info(f"WhatsApp gateway not available: {e}")
        return False


# ─── OTP Request ─────────────────────────────────────────────────────────────

@router.post("/otp/request")
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP code via WhatsApp (UltraMsg) or fallback dev mode."""
    code = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate old OTPs
    db.query(OTPCode).filter(OTPCode.contact == payload.contact, OTPCode.used == 0).delete()

    otp = OTPCode(contact=payload.contact, code=code, expires_at=expires)
    db.add(otp)
    db.commit()

    # Try to send via WhatsApp
    sent = send_whatsapp_otp(payload.contact, code, db)

    response: dict = {"message": f"OTP sent to {payload.contact}"}

    # Only expose dev_code if WhatsApp was NOT configured
    if not sent:
        response["dev_code"] = code   # Remove once WhatsApp is configured

    return response


# ─── OTP Verify ──────────────────────────────────────────────────────────────

@router.post("/otp/verify", response_model=TokenOut)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.contact == payload.contact,
            OTPCode.code == payload.code,
            OTPCode.used == 0,
        )
        .order_by(OTPCode.id.desc())
        .first()
    )
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")

    otp.used = 1

    # Find or create user
    user = db.query(User).filter(
        (User.phone == payload.contact) | (User.email == payload.contact)
    ).first()

    if not user:
        if not payload.name:
            raise HTTPException(status_code=400, detail="Name is required for new customers")
        is_phone = payload.contact.replace("+", "").isdigit()
        user = User(
            name=payload.name,
            phone=payload.contact if is_phone else None,
            email=payload.contact if not is_phone else None,
        )
        db.add(user)
        db.flush()

    db.commit()

    token = create_access_token({"sub": str(user.id), "role": "customer", "name": user.name})
    return TokenOut(access_token=token)


# ─── My Products ─────────────────────────────────────────────────────────────

@products_router.get("/products", response_model=List[SerialOut])
def my_products(current_user: dict = Depends(require_customer), db: Session = Depends(get_db)):
    user_id = int(current_user["sub"])
    serials = (
        db.query(Serial)
        .options(joinedload(Serial.product))
        .filter(Serial.user_id == user_id)
        .all()
    )
    return serials
