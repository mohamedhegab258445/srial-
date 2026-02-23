"""
Serial Router - Core endpoint for warranty lookup + QR generation + activation.
"""
import uuid
from datetime import datetime, date, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Serial, Product, User, MaintenanceHistory
from schemas import SerialLookupResult, SerialCreate, SerialActivate, SerialOut, MaintenanceOut, ProductOut, UserOut
from auth import get_current_admin
from qr_generator import get_qr_bytes

router = APIRouter(prefix="/api/serials", tags=["Serials"])


def _compute_warranty(serial: Serial):
    """Compute warranty countdown from purchase_date + warranty_months."""
    if not serial.purchase_date or serial.warranty_status == "inactive":
        return 0, 0, 0, 0.0

    warranty_months = serial.product.warranty_months
    days_total = warranty_months * 30
    purchase_dt = datetime.combine(serial.purchase_date, datetime.min.time())
    today = datetime.now()
    days_used = max(0, (today - purchase_dt).days)
    days_remaining = max(0, days_total - days_used)
    progress_percent = min(100.0, round((days_used / days_total) * 100, 1)) if days_total > 0 else 100.0
    return days_total, days_remaining, days_used, progress_percent


# ─── PUBLIC: Lookup Serial ────────────────────────────────────────────────────────

@router.get("/{serial_number}", response_model=SerialLookupResult)
def lookup_serial(serial_number: str, db: Session = Depends(get_db)):
    """Public endpoint - scan QR or enter serial to get warranty card."""
    serial = (
        db.query(Serial)
        .options(
            joinedload(Serial.product),
            joinedload(Serial.user),
            joinedload(Serial.maintenance_history),
        )
        .filter(Serial.serial_number == serial_number.upper().strip())
        .first()
    )

    if not serial:
        raise HTTPException(status_code=404, detail="Serial number not found")

    # Auto-expire warranty if past end date
    if serial.warranty_status == "active" and serial.purchase_date:
        warranty_months = serial.product.warranty_months
        purchase_dt = datetime.combine(serial.purchase_date, datetime.min.time())
        end_date = purchase_dt.replace(month=purchase_dt.month + warranty_months % 12,
                                       year=purchase_dt.year + warranty_months // 12)
        if datetime.now() > end_date:
            serial.warranty_status = "expired"
            db.commit()
            db.refresh(serial)

    days_total, days_remaining, days_used, progress_percent = _compute_warranty(serial)

    history = sorted(serial.maintenance_history, key=lambda m: m.report_date, reverse=True)

    return SerialLookupResult(
        serial_number=serial.serial_number,
        warranty_status=serial.warranty_status,
        product=ProductOut.model_validate(serial.product),
        customer_name=serial.user.name if serial.user else None,
        purchase_date=serial.purchase_date,
        activation_date=serial.activation_date,
        warranty_months=serial.product.warranty_months,
        days_total=days_total,
        days_remaining=days_remaining,
        days_used=days_used,
        progress_percent=progress_percent,
        maintenance_history=[MaintenanceOut.model_validate(m) for m in history],
    )


# ─── ADMIN: Generate Serials ──────────────────────────────────────────────────────

@router.post("/admin/generate", response_model=List[SerialOut], dependencies=[Depends(get_current_admin)])
def generate_serials(payload: SerialCreate, db: Session = Depends(get_db)):
    """Admin: generate N serial numbers for a product."""
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    created = []
    for _ in range(min(payload.count, 500)):  # cap at 500 per request
        serial_number = f"SRL-{uuid.uuid4().hex[:8].upper()}"
        # Ensure uniqueness
        while db.query(Serial).filter(Serial.serial_number == serial_number).first():
            serial_number = f"SRL-{uuid.uuid4().hex[:8].upper()}"

        s = Serial(
            serial_number=serial_number,
            product_id=payload.product_id,
            notes=payload.notes,
            warranty_status="inactive",
        )
        db.add(s)
        db.flush()  # get id

        # Generate QR code file
        qr_url = f"/api/serials/{serial_number}/qr"
        s.qr_code_url = qr_url
        created.append(s)

    db.commit()
    for s in created:
        db.refresh(s)
    return created


# ─── ADMIN: List All Serials ──────────────────────────────────────────────────────

@router.get("/admin/list", response_model=List[SerialOut], dependencies=[Depends(get_current_admin)])
def list_serials(
    product_id: int = Query(None),
    status: str = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Serial).options(joinedload(Serial.product), joinedload(Serial.user))
    if product_id:
        q = q.filter(Serial.product_id == product_id)
    if status:
        q = q.filter(Serial.warranty_status == status)
    return q.offset(skip).limit(limit).all()


# ─── ADMIN: Activate Warranty ─────────────────────────────────────────────────────

@router.post("/{serial_number}/activate", response_model=SerialOut, dependencies=[Depends(get_current_admin)])
def activate_warranty(serial_number: str, payload: SerialActivate, db: Session = Depends(get_db)):
    """Admin: activate warranty by linking serial to customer + purchase date."""
    import re
    def norm(phone: str | None) -> str | None:
        if not phone:
            return phone
        digits = re.sub(r"\D", "", phone)
        if digits.startswith("0") and len(digits) == 11:
            digits = "2" + digits  # 01x → 201x
        return digits

    serial = db.query(Serial).filter(Serial.serial_number == serial_number.upper()).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")
    if serial.warranty_status == "active":
        raise HTTPException(status_code=400, detail="Warranty already activated")

    # Normalize phone + sanitize empty strings → None (avoids unique constraint on email)
    normalized_phone = norm(payload.customer_phone) or None
    clean_email      = payload.customer_email.strip() or None if payload.customer_email else None

    # Find or create customer
    user = None
    if normalized_phone:
        user = db.query(User).filter(User.phone == normalized_phone).first()
    if not user and clean_email:
        user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        user = User(
            name=payload.customer_name,
            phone=normalized_phone,
            email=clean_email,   # None not '' → no unique constraint issue
        )
        db.add(user)
        db.flush()
    else:
        # Update name if provided
        if payload.customer_name:
            user.name = payload.customer_name

    serial.user_id = user.id
    serial.purchase_date = payload.purchase_date
    serial.activation_date = datetime.now(timezone.utc)
    serial.warranty_status = "active"
    db.commit()

    # Reload with relationships to satisfy SerialOut schema
    serial = db.query(Serial).options(
        joinedload(Serial.product),
        joinedload(Serial.user),
    ).filter(Serial.serial_number == serial_number.upper()).first()
    return serial


# ─── ADMIN: Export All Serials to CSV ─────────────────────────────────────────────

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/admin/export")
def export_serials_csv(token: str = Query(...), db: Session = Depends(get_db)):
    """Admin: Export all serials to a CSV file."""
    try:
        from auth import decode_token
        payload = decode_token(token)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    serials = db.query(Serial).options(
        joinedload(Serial.product),
        joinedload(Serial.user)
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "الرقم التسلسلي", 
        "المنتج", 
        "حالة الضمان", 
        "تاريخ الشراء", 
        "تاريخ التفعيل", 
        "اسم العميل", 
        "رقم هاتف العميل", 
        "ملاحظات"
    ])

    # Write data
    for s in serials:
        writer.writerow([
            s.serial_number,
            s.product.name if s.product else "",
            s.warranty_status,
            s.purchase_date.strftime("%Y-%m-%d") if s.purchase_date else "",
            s.activation_date.strftime("%Y-%m-%d %H:%M:%S") if s.activation_date else "",
            s.user.name if s.user else "",
            s.user.phone if s.user else "",
            s.notes or ""
        ])

    output.seek(0)

    # Encode to handle Arabic characters correctly in Excel (UTF-8 with BOM)
    encoded_output = "\ufeff" + output.getvalue()

    return StreamingResponse(
        iter([encoded_output]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=serials_export.csv"}
    )


# ─── PUBLIC: Download QR Image ────────────────────────────────────────────────────

@router.get("/{serial_number}/qr")
def download_qr(serial_number: str, db: Session = Depends(get_db)):
    """Return QR code PNG for a serial number."""
    serial = db.query(Serial).filter(Serial.serial_number == serial_number.upper()).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")
    img_bytes = get_qr_bytes(serial_number.upper())
    return Response(content=img_bytes, media_type="image/png")
