from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Wallet, Transaction
from schemas import WalletCreate, WalletOut, TransactionCreate, TransactionOut
from auth import get_current_admin

router = APIRouter(prefix="/api/erp/wallets", tags=["ERP - Treasury & Wallets"])

@router.get("/", response_model=List[WalletOut])
def get_wallets(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(Wallet).all()

@router.post("/", response_model=WalletOut)
def create_wallet(wallet: WalletCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    new_wallet = Wallet(**wallet.model_dump())
    db.add(new_wallet)
    db.commit()
    db.refresh(new_wallet)
    return new_wallet

@router.get("/{wallet_id}", response_model=WalletOut)
def get_wallet(wallet_id: int, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    w = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return w

@router.get("/{wallet_id}/transactions", response_model=List[TransactionOut])
def get_wallet_transactions(wallet_id: int, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    w = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return db.query(Transaction).filter(Transaction.wallet_id == wallet_id).order_by(Transaction.id.desc()).all()

@router.post("/{wallet_id}/deposit", response_model=TransactionOut)
def deposit_to_wallet(wallet_id: int, tx: dict, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    amount = float(tx.get("amount", 0))
    desc = tx.get("description", "إيداع يدوي")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    w = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    w.balance += amount
    new_tx = Transaction(
        wallet_id=w.id,
        type="in",
        amount=amount,
        description=desc,
        reference_type="manual_deposit"
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx

@router.post("/{wallet_id}/withdraw", response_model=TransactionOut)
def withdraw_from_wallet(wallet_id: int, tx: dict, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    amount = float(tx.get("amount", 0))
    desc = tx.get("description", "سحب يدوي")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    w = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if w.balance < amount:
        raise HTTPException(status_code=400, detail="الرصيد غير كافٍ للقيام بهذه العملية")
        
    w.balance -= amount
    new_tx = Transaction(
        wallet_id=w.id,
        type="out",
        amount=amount,
        description=desc,
        reference_type="manual_withdraw"
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx
