"""
Router: dealers.py
Dealer/Agent management system.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from database import get_db, Base
from auth import get_current_admin

router = APIRouter(prefix="/api/dealers", tags=["dealers"])


# ─── Models ───────────────────────────────────────────────────────────────────

class Dealer(Base):
    __tablename__ = "dealers"
    id         = Column(Integer, primary_key=True)
    name       = Column(String, nullable=False)
    phone      = Column(String)
    email      = Column(String)
    region     = Column(String)
    code       = Column(String, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DealerSerial(Base):
    __tablename__ = "dealer_serials"
    id          = Column(Integer, primary_key=True)
    dealer_id   = Column(Integer, ForeignKey("dealers.id", ondelete="CASCADE"))
    serial_id   = Column(Integer, ForeignKey("serials.id",  ondelete="CASCADE"))
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── Schemas ──────────────────────────────────────────────────────────────────

class DealerCreate(BaseModel):
    name:   str
    phone:  Optional[str] = None
    email:  Optional[str] = None
    region: Optional[str] = None


class DealerUpdate(BaseModel):
    name:   Optional[str] = None
    phone:  Optional[str] = None
    email:  Optional[str] = None
    region: Optional[str] = None


class AssignSerial(BaseModel):
    serial_number: str   # use serial_number instead of id (easier from UI)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("")
def create_dealer(data: DealerCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    count  = db.query(Dealer).count()
    code   = f"DLR-{str(count + 1).zfill(4)}"
    dealer = Dealer(**data.model_dump(), code=code)
    db.add(dealer)
    db.commit()
    db.refresh(dealer)
    return _dealer_out(dealer, 0)


@router.get("")
def list_dealers(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    dealers = db.query(Dealer).order_by(Dealer.id.asc()).all()
    result  = []
    for d in dealers:
        sc = db.query(DealerSerial).filter(DealerSerial.dealer_id == d.id).count()
        result.append(_dealer_out(d, sc))
    return result


@router.get("/{dealer_id}")
def get_dealer(dealer_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    from models import Serial as SerialModel
    d  = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not d:
        raise HTTPException(404, "Dealer not found")
    ds_rows = db.query(DealerSerial).filter(DealerSerial.dealer_id == dealer_id).all()
    serials = []
    for row in ds_rows:
        s = db.query(SerialModel).filter(SerialModel.id == row.serial_id).first()
        if s:
            serials.append({
                "id": s.id, "serial_number": s.serial_number,
                "warranty_status": s.warranty_status,
                "assigned_at": str(row.assigned_at)[:10],
            })
    out = _dealer_out(d, len(serials))
    out["email"]   = d.email
    out["serials"] = serials
    return out


@router.put("/{dealer_id}")
def update_dealer(dealer_id: int, data: DealerUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    d = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not d:
        raise HTTPException(404, "Dealer not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    sc = db.query(DealerSerial).filter(DealerSerial.dealer_id == dealer_id).count()
    return _dealer_out(d, sc)


@router.delete("/{dealer_id}")
def delete_dealer(dealer_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    d = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not d:
        raise HTTPException(404, "Dealer not found")
    db.query(DealerSerial).filter(DealerSerial.dealer_id == dealer_id).delete()
    db.delete(d)
    db.commit()
    return {"message": "Dealer deleted"}


@router.post("/{dealer_id}/assign-serial")
def assign_serial(dealer_id: int, data: AssignSerial, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    from models import Serial as SerialModel
    d = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not d:
        raise HTTPException(404, "Dealer not found")
    serial = db.query(SerialModel).filter(SerialModel.serial_number == data.serial_number).first()
    if not serial:
        raise HTTPException(404, "Serial not found")
    exists = db.query(DealerSerial).filter(
        DealerSerial.dealer_id == dealer_id,
        DealerSerial.serial_id == serial.id
    ).first()
    if exists:
        raise HTTPException(400, "Serial already assigned to this dealer")
    db.add(DealerSerial(dealer_id=dealer_id, serial_id=serial.id))
    db.commit()
    return {"message": "Serial assigned successfully"}


@router.delete("/{dealer_id}/remove-serial/{serial_number}")
def remove_serial(dealer_id: int, serial_number: str, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    from models import Serial as SerialModel
    serial = db.query(SerialModel).filter(SerialModel.serial_number == serial_number).first()
    if not serial:
        raise HTTPException(404, "Serial not found")
    row = db.query(DealerSerial).filter(
        DealerSerial.dealer_id == dealer_id,
        DealerSerial.serial_id == serial.id
    ).first()
    if not row:
        raise HTTPException(404, "Assignment not found")
    db.delete(row)
    db.commit()
    return {"message": "Serial removed from dealer"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _dealer_out(d: Dealer, sc: int) -> dict:
    return {
        "id": d.id, "code": d.code, "name": d.name,
        "phone": d.phone, "email": d.email, "region": d.region,
        "serial_count": sc,
    }
