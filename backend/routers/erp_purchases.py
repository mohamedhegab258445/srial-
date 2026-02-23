from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import PurchaseOrder, PurchaseOrderItem, Supplier, StockItem
from schemas import PurchaseOrderCreate, PurchaseOrderOut
from auth import get_current_admin

router = APIRouter(prefix="/api/erp/purchases", tags=["ERP - Purchases"])

@router.get("/", response_model=List[PurchaseOrderOut])
def get_purchase_orders(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(PurchaseOrder).order_by(PurchaseOrder.id.desc()).all()

@router.post("/", response_model=PurchaseOrderOut)
def create_purchase_order(po_data: PurchaseOrderCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    # 1. Verify Supplier
    supplier = db.query(Supplier).filter(Supplier.id == po_data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="المورد غير موجود")
        
    # 2. Create the overarching PO record
    new_po = PurchaseOrder(
        supplier_id=po_data.supplier_id,
        total_amount=po_data.total_amount,
        paid_amount=po_data.paid_amount,
        status=po_data.status
    )
    db.add(new_po)
    db.flush() # flush to get the PO ID
    
    # 3. Process items and update Stock
    calculated_total = 0.0
    
    for item in po_data.items:
        # Verify the stock item exists
        stock = db.query(StockItem).filter(StockItem.id == item.stock_item_id).first()
        if not stock:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Stock item ID {item.stock_item_id} not found")
            
        line_total = item.quantity * item.unit_price
        calculated_total += line_total
        
        # Create PO Item line
        po_item = PurchaseOrderItem(
            purchase_order_id=new_po.id,
            stock_item_id=stock.id,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        db.add(po_item)
        
        # Update actual stock quantity and avg cost price logic if needed (simplifying for now)
        stock.quantity += item.quantity
        stock.cost_price = item.unit_price # Updating cost to the latest purchase price
        
    # Optional check:
    # if calculated_total != po_data.total_amount:
    #    raise Exception("Total amount mismatch")
        
    # 4. Update Supplier Balance (Money Owed to Supplier)
    unpaid_amount = new_po.total_amount - new_po.paid_amount
    if unpaid_amount > 0:
        supplier.current_balance += unpaid_amount
        
    db.commit()
    db.refresh(new_po)
    return new_po

@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(po_id: int, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po
