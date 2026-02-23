"""
Router: settings.py
Site-wide settings stored as key-value pairs in DB.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone

from database import get_db, Base
from auth import get_current_admin

router = APIRouter(prefix="/api/admin/settings", tags=["Settings"])


# ─── Model ────────────────────────────────────────────────────────────────────

class SiteSetting(Base):
    __tablename__ = "site_settings"
    id         = Column(Integer, primary_key=True)
    key        = Column(String, unique=True, nullable=False)
    value      = Column(String, default="")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── Defaults seeded on first call ────────────────────────────────────────────

DEFAULTS: dict[str, str] = {
    "site_name":          "مودرن هوم",
    "support_email":      "",
    "support_phone":      "",
    "whatsapp_number":    "",
    "footer_text":        "جميع الحقوق محفوظة",
    "otp_welcome_msg":    "مرحباً! رمز التحقق الخاص بك هو: {code}",
    "ticket_note":        "سيتم الرد على تذكرتك خلال 24 ساعة.",
    "warranty_note":      "الضمان يشمل عيوب التصنيع فقط.",
    "ticket_msg_in_progress": "مرحباً {name} 👋\nبدأ فريق الدعم لدينا الآن في مراجعة تذكرتك رقم #{ticket_id}.\nالحالة الحالية: قيد المعالجة ⏳\nسنوافيك بالتحديثات قريباً. شكراً لانتظارك!",
    "ticket_msg_resolved":    "مرحباً {name} 👋\nيسعدنا إخبارك أنه تم التعامل مع تذكرتك رقم #{ticket_id}.\nالحالة الحالية: تم الحل ✅\nنأمل أن تكون المشكلة قد تمت تسويتها بالكامل.",
    "ticket_msg_closed":      "مرحباً {name} 👋\nتم إغلاق تذكرتك رقم #{ticket_id} بناءً على إتمام طلبك.\nالحالة الحالية: مغلقة 🔒\nنحن دائماً في خدمتك!",
}


def _seed(db: Session):
    for k, v in DEFAULTS.items():
        if not db.query(SiteSetting).filter(SiteSetting.key == k).first():
            db.add(SiteSetting(key=k, value=v))
    db.commit()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SettingItem(BaseModel):
    key:   str
    value: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    _seed(db)
    rows = db.query(SiteSetting).all()
    return {r.key: r.value for r in rows}


@router.put("")
def save_settings(items: List[SettingItem], db: Session = Depends(get_db), _=Depends(get_current_admin)):
    _seed(db)
    for item in items:
        row = db.query(SiteSetting).filter(SiteSetting.key == item.key).first()
        if row:
            row.value      = item.value
            row.updated_at = datetime.now(timezone.utc)
        else:
            db.add(SiteSetting(key=item.key, value=item.value))
    db.commit()
    rows = db.query(SiteSetting).all()
    return {r.key: r.value for r in rows}


@router.get("/whatsapp-status")
def get_whatsapp_status(_=Depends(get_current_admin)):
    """Check the real self-hosted whatsapp-web.js gateway status."""
    import os, httpx
    gateway_url = os.getenv("WHATSAPP_GATEWAY_URL", "http://localhost:3001")
    try:
        r = httpx.get(f"{gateway_url}/status", timeout=5)
        data = r.json()
        return {
            "configured": True,
            "ready": data.get("ready", False),
            "phone": data.get("phone"),
            "qr": data.get("qr"),   # base64 PNG, None when connected
            "gateway_url": gateway_url,
        }
    except Exception as e:
        return {
            "configured": False,
            "ready": False,
            "error": str(e),
            "gateway_url": gateway_url,
        }


@router.post("/whatsapp-logout")
def whatsapp_logout(_=Depends(get_current_admin)):
    """Disconnect the WhatsApp session via the self-hosted gateway."""
    import os, httpx
    gateway_url = os.getenv("WHATSAPP_GATEWAY_URL", "http://localhost:3001")
    try:
        r = httpx.post(f"{gateway_url}/logout", timeout=5)
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """No auth - returns only safe public settings for frontend use."""
    public_keys = {"site_name", "footer_text", "whatsapp_number", "ticket_note", "warranty_note"}
    rows = db.query(SiteSetting).filter(SiteSetting.key.in_(public_keys)).all()
    return {r.key: r.value for r in rows}

