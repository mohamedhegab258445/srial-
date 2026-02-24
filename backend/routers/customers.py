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
    
    # Optional: For better performance with large data, we should use func.count in the query, 
    # but for now we optimize by not running 3 db queries inside the loop for every user.
    # To keep the fix lightweight and safe, we'll fetch all serials/tickets once or group by.
    # Actually, the simplest fix for timeouts right now is to just optimize the N+1.
    
    # We will query the counts grouped by user_id to avoid N+1
    from sqlalchemy import func
    
    serials_counts = db.query(Serial.user_id, func.count(Serial.id)).group_by(Serial.user_id).all()
    active_warranties_counts = db.query(Serial.user_id, func.count(Serial.id)).filter(Serial.warranty_status == "active").group_by(Serial.user_id).all()
    tickets_counts = db.query(Ticket.user_id, func.count(Ticket.id)).group_by(Ticket.user_id).all()
    
    # Convert to dictionaries for fast lookup
    s_map = {k: v for k, v in serials_counts}
    aw_map = {k: v for k, v in active_warranties_counts}
    t_map = {k: v for k, v in tickets_counts}

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "created_at": str(u.created_at)[:10] if u.created_at else "",
            "serials_count": s_map.get(u.id, 0),
            "active_warranties": aw_map.get(u.id, 0),
            "tickets_count": t_map.get(u.id, 0),
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
