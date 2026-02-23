from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, ForeignKey,
    func, CheckConstraint, Float, Boolean
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), unique=True, index=True)
    email = Column(String(200), unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    serials = relationship("Serial", back_populates="user")
    tickets = relationship("Ticket", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    image_url = Column(String(500))
    specs = Column(Text)  # JSON string
    warranty_months = Column(Integer, nullable=False, default=12)
    wuilt_product_id = Column(String(200), unique=True, nullable=True, index=True)  # Wuilt productId for matching
    created_at = Column(DateTime, server_default=func.now())

    serials = relationship("Serial", back_populates="product")



class Serial(Base):
    __tablename__ = "serials"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    purchase_date = Column(Date)
    activation_date = Column(DateTime)
    warranty_status = Column(
        String(20),
        CheckConstraint("warranty_status IN ('inactive','active','expired','void')"),
        default="inactive",
        nullable=False,
    )
    qr_code_url = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product", back_populates="serials")
    user = relationship("User", back_populates="serials")
    tickets = relationship("Ticket", back_populates="serial")
    maintenance_history = relationship("MaintenanceHistory", back_populates="serial")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    serial_id = Column(Integer, ForeignKey("serials.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    status = Column(
        String(20),
        CheckConstraint("status IN ('open','in_progress','resolved','closed')"),
        default="open",
        nullable=False,
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    serial = relationship("Serial", back_populates="tickets")
    user = relationship("User", back_populates="tickets")
    attachments = relationship("TicketAttachment", back_populates="ticket")
    maintenance = relationship("MaintenanceHistory", back_populates="ticket")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())

    ticket = relationship("Ticket", back_populates="attachments")


class MaintenanceHistory(Base):
    __tablename__ = "maintenance_history"

    id = Column(Integer, primary_key=True, index=True)
    serial_id = Column(Integer, ForeignKey("serials.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    technician_name = Column(String(150))
    fault_type = Column(String(200))
    parts_replaced = Column(Text)  # JSON array string
    report_date = Column(Date, nullable=False)
    resolved_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    serial = relationship("Serial", back_populates="maintenance_history")
    ticket = relationship("Ticket", back_populates="maintenance")


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    contact = Column(String(200), nullable=False)  # phone or email
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(300), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# ERP SYSTEM MODELS (المسار الثاني)
# ==========================================

class Supplier(Base):
    __tablename__ = "erp_suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(30))
    address = Column(Text)
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
    
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class Wallet(Base):
    __tablename__ = "erp_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
    
    transactions = relationship("Transaction", back_populates="wallet")


class Transaction(Base):
    __tablename__ = "erp_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("erp_wallets.id"), nullable=False)
    type = Column(String(50), nullable=False) # 'in', 'out'
    amount = Column(Float, nullable=False)
    description = Column(Text)
    date = Column(DateTime, server_default=func.now())
    reference_id = Column(Integer, nullable=True) # Could link to invoice/po/expense
    reference_type = Column(String(50), nullable=True) # 'expense', 'sales', 'purchase'
    
    wallet = relationship("Wallet", back_populates="transactions")


class ExpenseCategory(Base):
    __tablename__ = "erp_expense_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    
    expenses = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "erp_expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("erp_expense_categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, server_default=func.now())
    notes = Column(Text)
    wallet_id = Column(Integer, ForeignKey("erp_wallets.id"), nullable=True)
    
    category = relationship("ExpenseCategory", back_populates="expenses")


class StockItem(Base):
    __tablename__ = "erp_stock_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False) # Spare part name or product name
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True) # Link to exact product if applicable
    quantity = Column(Integer, default=0)
    cost_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    
    product = relationship("Product", backref="stock_items")
    purchase_items = relationship("PurchaseOrderItem", back_populates="stock_item")
    sales_items = relationship("SalesInvoiceItem", back_populates="stock_item")


class PurchaseOrder(Base):
    __tablename__ = "erp_purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("erp_suppliers.id"), nullable=False)
    date = Column(DateTime, server_default=func.now())
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    status = Column(String(50), default="pending") # pending, completed
    
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")


class PurchaseOrderItem(Base):
    __tablename__ = "erp_purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("erp_purchase_orders.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("erp_stock_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    stock_item = relationship("StockItem", back_populates="purchase_items")


class SalesInvoice(Base):
    __tablename__ = "erp_sales_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200)) # Can be linked to user later or kept as text
    customer_phone = Column(String(50))
    date = Column(DateTime, server_default=func.now())
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    status = Column(String(50), default="completed")
    
    items = relationship("SalesInvoiceItem", back_populates="invoice")


class SalesInvoiceItem(Base):
    __tablename__ = "erp_sales_invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("erp_sales_invoices.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("erp_stock_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    
    invoice = relationship("SalesInvoice", back_populates="items")
    stock_item = relationship("StockItem", back_populates="sales_items")
