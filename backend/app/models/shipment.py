import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False, index=True)
    tracking_number = Column(String(100), unique=True, index=True, nullable=False)
    shipped_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shipped_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    notes = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="shipment")
    shipped_by = relationship("User", back_populates="shipments")
