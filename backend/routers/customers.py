"""Admin Customers router - full CRUD for customer database."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Serial, Ticket
from auth import get_current_admin

router = APIRouter(prefix="/api/admin/customers", tags=["Admin Customers"])


@router.get("")
def list_customers(search: Optional[str] = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    q = db.query(User)
    if search:
        q = q.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    users = q.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        serials_count = db.query(Serial).filter(Serial.user_id == u.id).count()
        active_count = db.query(Serial).filter(Serial.user_id == u.id, Serial.warranty_status == "active").count()
        tickets_count = db.query(Ticket).filter(Ticket.user_id == u.id).count()
        result.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "created_at": str(u.created_at)[:10] if u.created_at else "",
            "serials_count": serials_count,
            "active_warranties": active_count,
            "tickets_count": tickets_count,
        })
    return result


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    u = db.query(User).filter(User.id == customer_id).first()
    if not u:
        raise HTTPException(404, "Customer not found")
    serials = db.query(Serial).filter(Serial.user_id == customer_id).all()
    tickets = db.query(Ticket).filter(Ticket.user_id == customer_id).all()
    return {
        "id": u.id,
        "name": u.name,
        "phone": u.phone,
        "email": u.email,
        "created_at": str(u.created_at)[:10] if u.created_at else "",
        "serials": [{"serial_number": s.serial_number, "warranty_status": s.warranty_status, "purchase_date": str(s.purchase_date) if s.purchase_date else ""} for s in serials],
        "tickets": [{"id": t.id, "title": t.title, "status": t.status} for t in tickets],
    }


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    u = db.query(User).filter(User.id == customer_id).first()
    if not u:
        raise HTTPException(404, "Customer not found")
    if "name" in data:
        u.name = data["name"]
    if "phone" in data:
        u.phone = data["phone"]
    if "email" in data:
        u.email = data["email"]
    db.commit()
    return {"message": "Customer updated"}


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    u = db.query(User).filter(User.id == customer_id).first()
    if not u:
        raise HTTPException(404, "Customer not found")
    db.delete(u)
    db.commit()
    return {"message": "Customer deleted"}
