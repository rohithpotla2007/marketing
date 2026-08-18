import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="warehouse", nullable=False)  # admin, warehouse
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    orders = relationship("Order", back_populates="user")
    restock_transactions = relationship("RestockTransaction", back_populates="user")
    replacement_transactions = relationship("ReplacementTransaction", back_populates="user")
    shipments = relationship("Shipment", back_populates="shipped_by")
