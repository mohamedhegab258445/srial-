from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import SalesInvoice, SalesInvoiceItem, StockItem, Wallet, Transaction
from schemas import SalesInvoiceCreate, SalesInvoiceOut
from auth import get_current_admin

router = APIRouter(prefix="/api/erp/sales", tags=["ERP - Sales"])

@router.get("/", response_model=List[SalesInvoiceOut])
def get_sales_invoices(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(SalesInvoice).order_by(SalesInvoice.id.desc()).all()

@router.post("/", response_model=SalesInvoiceOut)
def create_sales_invoice(invoice_data: SalesInvoiceCreate, wallet_id: int = None, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    # 1. Ensure Wallet exists if payment is made immediately
    wallet = None
    if invoice_data.paid_amount > 0:
        if not wallet_id:
            raise HTTPException(status_code=400, detail="يجب تحديد خزينة (Wallet) لاستلام المبلغ المدفوع")
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="الخزينة المحددة غير موجودة")
            
    # 2. Verify stock availability
    for item in invoice_data.items:
        stock = db.query(StockItem).filter(StockItem.id == item.stock_item_id).first()
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock item ID {item.stock_item_id} not found")
        if stock.quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"رصيد المخزن من الصنف '{stock.name}' لا يكفي. المتاح {stock.quantity}")

    # 3. Create overarching Invoice
    new_inv = SalesInvoice(
        customer_name=invoice_data.customer_name,
        customer_phone=invoice_data.customer_phone,
        total_amount=invoice_data.total_amount,
        paid_amount=invoice_data.paid_amount,
        status=invoice_data.status
    )
    db.add(new_inv)
    db.flush() # flush to get invoice ID
    
    # 4. Process line items & decrement stock
    for item in invoice_data.items:
        stock = db.query(StockItem).filter(StockItem.id == item.stock_item_id).first()
        
        # Deduct quantity from warehouse
        stock.quantity -= item.quantity
        
        # Record invoice line item
        inv_item = SalesInvoiceItem(
            invoice_id=new_inv.id,
            stock_item_id=stock.id,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        db.add(inv_item)
        
    # 5. Record incoming transaction to the wallet if paid
    if wallet and invoice_data.paid_amount > 0:
        wallet.balance += invoice_data.paid_amount
        tx = Transaction(
            wallet_id=wallet.id,
            type="in",
            amount=invoice_data.paid_amount,
            description=f"مبيعات - فاتورة #{new_inv.id} للعميل: {new_inv.customer_name}",
            reference_id=new_inv.id,
            reference_type="sales"
        )
        db.add(tx)
        
    db.commit()
    db.refresh(new_inv)
    return new_inv

@router.get("/{invoice_id}", response_model=SalesInvoiceOut)
def get_sales_invoice(invoice_id: int, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Sales Invoice not found")
    return inv
