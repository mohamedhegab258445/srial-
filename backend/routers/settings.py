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
    "site_name":          "Smart Warranty Tracker",
    "support_email":      "",
    "support_phone":      "",
    "whatsapp_number":    "",
    "footer_text":        "جميع الحقوق محفوظة",
    "otp_welcome_msg":    "مرحباً! رمز التحقق الخاص بك هو: {code}",
    "ticket_note":        "سيتم الرد على تذكرتك خلال 24 ساعة.",
    "warranty_note":      "الضمان يشمل عيوب التصنيع فقط.",
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


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """No auth - returns only safe public settings for frontend use."""
    public_keys = {"site_name", "footer_text", "whatsapp_number", "ticket_note", "warranty_note"}
    rows = db.query(SiteSetting).filter(SiteSetting.key.in_(public_keys)).all()
    return {r.key: r.value for r in rows}
