"""Maintenance history router - admin adds logs per serial."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MaintenanceHistory, Serial, Ticket
from schemas import MaintenanceCreate, MaintenanceOut
from auth import get_current_admin

router = APIRouter(prefix="/api/admin/maintenance", tags=["Maintenance"])


@router.get("/{serial_number}", response_model=List[MaintenanceOut])
def get_maintenance_history(
    serial_number: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    serial = db.query(Serial).filter(Serial.serial_number == serial_number.upper()).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")
    return (
        db.query(MaintenanceHistory)
        .filter(MaintenanceHistory.serial_id == serial.id)
        .order_by(MaintenanceHistory.report_date.desc())
        .all()
    )


@router.post("/", response_model=MaintenanceOut, status_code=201)
def add_maintenance_log(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    serial = db.query(Serial).filter(Serial.id == payload.serial_id).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")

    log = MaintenanceHistory(
        serial_id=payload.serial_id,
        ticket_id=payload.ticket_id,
        technician_name=payload.technician_name,
        fault_type=payload.fault_type,
        parts_replaced=payload.parts_replaced,
        report_date=payload.report_date,
        resolved_date=payload.resolved_date,
        notes=payload.notes,
    )
    db.add(log)

    # If linked to a ticket, resolve it
    if payload.ticket_id and payload.resolved_date:
        ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
        if ticket:
            ticket.status = "resolved"

    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    log = db.query(MaintenanceHistory).filter(MaintenanceHistory.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    db.delete(log)
    db.commit()
