from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import StockItem, Product
from schemas import StockItemCreate, StockItemOut
from auth import get_current_admin

router = APIRouter(prefix="/api/erp/stock", tags=["ERP - Stock Items"])

@router.get("/", response_model=List[StockItemOut])
def get_stock_items(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(StockItem).order_by(StockItem.id.desc()).all()

@router.post("/", response_model=StockItemOut)
def create_stock_item(stock_data: StockItemCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    # Optional: link to existing product
    if stock_data.product_id:
        prod = db.query(Product).filter(Product.id == stock_data.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail="Product ID doesn't exist to link")
            
    new_item = StockItem(**stock_data.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=StockItemOut)
def update_stock_item(item_id: int, data: StockItemCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_stock_item(item_id: int, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
        
    db.delete(item)
    db.commit()
    return {"message": "Stock Item deleted."}
