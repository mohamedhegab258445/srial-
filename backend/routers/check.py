"""
check.py — Serial-based warranty verification
Flow: serial + phone → OTP sent to registered phone → return warranty data
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import re, logging, os

from database import get_db
from models import Serial, OTPCode, User
from auth import generate_otp
from routers.settings import SiteSetting
from utils import normalize_phone, send_whatsapp_message
from main import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/check", tags=["Warranty Check"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CheckStartRequest(BaseModel):
    serial: str
    phone: str

class CheckVerifyRequest(BaseModel):
    serial: str
    phone: str
    code: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return s.value if s else default


def phones_match(a: str, b: str) -> bool:
    """Compare two phone numbers ignoring leading zeros/country codes."""
    return normalize_phone(a) == normalize_phone(b)


def send_otp_whatsapp(phone: str, code: str, db: Session) -> bool:
    template = get_setting(
        db, "otp_welcome_msg",
        "مرحباً 👋\nرمز التحقق لبوابة الضمان: *{code}*\nصالح لمدة 10 دقائق. لا تشاركه مع أحد."
    )
    message = template.replace("{code}", code)
    return send_whatsapp_message(phone, message)


# ─── POST /api/check/start ────────────────────────────────────────────────────

@router.post("/start")
@limiter.limit("5/minute")
def check_start(request: Request, payload: CheckStartRequest, db: Session = Depends(get_db)):
    """
    Validate that the phone matches the serial's registered owner.
    If valid, send OTP to that phone.
    """
    serial = db.query(Serial).options(
        joinedload(Serial.user), joinedload(Serial.product)
    ).filter(
        Serial.serial_number == payload.serial.upper()
    ).first()

    if not serial:
        raise HTTPException(status_code=404, detail="الرقم التسلسلي غير موجود")

    if not serial.user:
        raise HTTPException(status_code=400, detail="هذا المنتج لم يُفعَّل ضمانه بعد")

    # Check phone matches
    registered_phone = serial.user.phone or ""
    if not phones_match(payload.phone, registered_phone):
        raise HTTPException(
            status_code=400,
            detail="رقم الهاتف غير متطابق مع المسجّل في الضمان"
        )

    # Generate OTP
    code = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    contact_key = f"check:{payload.serial.upper()}:{normalize_phone(payload.phone)}"

    # Invalidate old OTPs
    db.query(OTPCode).filter(OTPCode.contact == contact_key, OTPCode.used == 0).delete()
    db.add(OTPCode(contact=contact_key, code=code, expires_at=expires))
    db.commit()

    sent = send_otp_whatsapp(payload.phone, code, db)

    resp = {"message": "تم إرسال رمز التحقق"}
    if not sent:
        resp["dev_code"] = code  # shown in UI when WhatsApp not connected
    return resp


# ─── POST /api/check/verify ───────────────────────────────────────────────────

@router.post("/verify")
@limiter.limit("10/minute")
def check_verify(request: Request, payload: CheckVerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP and return full warranty data."""
    contact_key = f"check:{payload.serial.upper()}:{normalize_phone(payload.phone)}"

    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.contact == contact_key,
            OTPCode.code == payload.code,
            OTPCode.used == 0,
        )
        .order_by(OTPCode.id.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="رمز التحقق منتهي الصلاحية")

    otp.used = 1
    db.commit()

    # Fetch full serial data
    serial = db.query(Serial).options(
        joinedload(Serial.user),
        joinedload(Serial.product),
        joinedload(Serial.maintenance_history),
        joinedload(Serial.tickets),
    ).filter(
        Serial.serial_number == payload.serial.upper()
    ).first()

    if not serial:
        raise HTTPException(status_code=404, detail="الرقم التسلسلي غير موجود")

    return {
        "serial_number": serial.serial_number,
        "warranty_status": serial.warranty_status,
        "purchase_date": str(serial.purchase_date) if serial.purchase_date else None,
        "activation_date": serial.activation_date.isoformat() if serial.activation_date else None,
        "notes": serial.notes,
        "qr_code_url": serial.qr_code_url,
        "product": {
            "id": serial.product.id,
            "name": serial.product.name,
            "image_url": serial.product.image_url,
            "warranty_months": serial.product.warranty_months,
            "specs": serial.product.specs,
        } if serial.product else None,
        "user": {
            "name": serial.user.name,
            "phone": serial.user.phone,
        } if serial.user else None,
        "maintenance_history": [
            {
                "id": m.id,
                "fault_type": m.fault_type,
                "technician_name": m.technician_name,
                "report_date": str(m.report_date),
                "resolved_date": str(m.resolved_date) if m.resolved_date else None,
                "notes": m.notes,
                "parts_replaced": m.parts_replaced,
            }
            for m in (serial.maintenance_history or [])
        ],
        "tickets": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in (serial.tickets or [])
        ],
    }
