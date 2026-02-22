from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, ForeignKey,
    func, CheckConstraint
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
