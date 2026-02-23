from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ExpenseCategory, Expense, Wallet, Transaction
from schemas import ExpenseCategoryCreate, ExpenseCategoryOut, ExpenseCreate, ExpenseOut
from auth import get_current_admin

router = APIRouter(prefix="/api/erp/expenses", tags=["ERP - Expenses"])

@router.get("/categories", response_model=List[ExpenseCategoryOut])
def get_expense_categories(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(ExpenseCategory).all()

@router.post("/categories", response_model=ExpenseCategoryOut)
def create_expense_category(category: ExpenseCategoryCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    new_cat = ExpenseCategory(**category.model_dump())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.get("/", response_model=List[ExpenseOut])
def get_expenses(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(Expense).order_by(Expense.id.desc()).all()

@router.post("/", response_model=ExpenseOut)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    # Create the expense record
    new_exp = Expense(**expense.model_dump())
    db.add(new_exp)
    db.flush() # get id
    
    # If a wallet was selected to pay this expense, deduct the money
    if new_exp.wallet_id:
        w = db.query(Wallet).filter(Wallet.id == new_exp.wallet_id).first()
        if w:
            if w.balance < new_exp.amount:
                db.rollback()
                raise HTTPException(status_code=400, detail="رصيد الخزينة لا يكفي لتسجيل هذا المصروف")
                
            w.balance -= new_exp.amount
            
            # Record the transaction
            tx = Transaction(
                wallet_id=w.id,
                type="out",
                amount=new_exp.amount,
                description=f"مصروف - {new_exp.notes or new_exp.category_id}",
                reference_id=new_exp.id,
                reference_type="expense"
            )
            db.add(tx)
        else:
            db.rollback()
            raise HTTPException(status_code=404, detail="الخزينة المحددة غير موجودة")
            
    db.commit()
    db.refresh(new_exp)
    return new_exp
