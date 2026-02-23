"""Tickets router - customer submits, admin manages."""
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Ticket, Serial, User, TicketAttachment
from schemas import TicketCreate, TicketStatusUpdate, TicketOut
from auth import get_current_admin

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(f"{UPLOAD_DIR}/attachments", exist_ok=True)


def _get_or_create_user(db: Session, name: Optional[str], phone: Optional[str], email: Optional[str]) -> Optional[User]:
    # Sanitize: convert '' to None to avoid unique constraint on email/phone
    phone = phone.strip() or None if phone else None
    email = email.strip() or None if email else None
    if not (phone or email):
        return None
    user = None
    if phone:
        user = db.query(User).filter(User.phone == phone).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user and name:
        user = User(name=name, phone=phone, email=email)  # None, not '' → safe
        db.add(user)
        db.flush()
    return user


# ─── PUBLIC: Submit ticket ────────────────────────────────────────────────────────

@router.post("/", response_model=TicketOut, status_code=201)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    serial = db.query(Serial).filter(Serial.serial_number == payload.serial_number.upper()).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial number not found")

    user = _get_or_create_user(db, payload.customer_name, payload.customer_phone, payload.customer_email)

    ticket = Ticket(
        serial_id=serial.id,
        user_id=user.id if user else serial.user_id,
        title=payload.title,
        description=payload.description,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


# ─── PUBLIC: Upload attachment ────────────────────────────────────────────────────

from storage import upload_image_to_cloudinary

@router.post("/{ticket_id}/attachments", status_code=201)
def upload_attachment(ticket_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf", ".mp4"]:
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_bytes = file.file.read()
    
    try:
        cloudinary_url = upload_image_to_cloudinary(
            file_content=file_bytes,
            folder="tickets",
            public_id=f"ticket_{ticket_id}_{os.path.basename(file.filename)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")

    att = TicketAttachment(ticket_id=ticket_id, file_url=cloudinary_url)
    db.add(att)
    db.commit()
    db.refresh(att)
    return {"id": att.id, "file_url": att.file_url}


# ─── ADMIN: List tickets ──────────────────────────────────────────────────────────

@router.get("/admin", response_model=List[TicketOut])
def list_tickets(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    q = db.query(Ticket).options(
        joinedload(Ticket.serial).joinedload(Serial.product),
        joinedload(Ticket.user),
        joinedload(Ticket.attachments),
    )
    if status:
        q = q.filter(Ticket.status == status)
    return q.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/admin/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), _: dict = Depends(get_current_admin)):
    ticket = db.query(Ticket).options(
        joinedload(Ticket.serial).joinedload(Serial.product),
        joinedload(Ticket.user),
        joinedload(Ticket.attachments),
    ).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/admin/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    valid = ["open", "in_progress", "resolved", "closed"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    ticket = db.query(Ticket).options(joinedload(Ticket.user)).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    
    # Notify user via WhatsApp if status changed
    if old_status != payload.status and ticket.user and ticket.user.phone:
        status_ar = {
            "open": "مفتوحة 🟢",
            "in_progress": "قيد المعالجة ⏳",
            "resolved": "تم الحل ✅",
            "closed": "مغلقة 🔒"
        }.get(payload.status, payload.status)
        
        # Load custom template if applicable
        from routers.settings import SiteSetting
        setting_key_map = {
            "in_progress": "ticket_msg_in_progress",
            "resolved":    "ticket_msg_resolved",
            "closed":      "ticket_msg_closed"
        }
        
        msg = ""
        setting_key = setting_key_map.get(payload.status)
        if setting_key:
            template = db.query(SiteSetting).filter(SiteSetting.key == setting_key).first()
            if template and template.value:
                # Replace placeholders
                msg = template.value.replace("{name}", ticket.user.name).replace("{ticket_id}", str(ticket.id))
        
        # Fallback to the old message if no template logic was met
        if not msg:
            msg = f"مرحباً {ticket.user.name} 👋\nتم تحديث حالة تذكرتك رقم #{ticket.id} إلى: *{status_ar}*"
            
        from utils import send_whatsapp_message
        send_whatsapp_message(ticket.user.phone, msg)

    return ticket


@router.delete("/admin/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db), _: dict = Depends(get_current_admin)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Remove attachments first
    db.query(TicketAttachment).filter(TicketAttachment.ticket_id == ticket_id).delete()
    db.delete(ticket)
    db.commit()
    return {"message": "Ticket deleted"}
