import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # RESTOCK, ORDER_CREATED, ORDER_ACCEPTED, VERIFICATION_DONE, REPLACEMENT_ISSUED, ORDER_SHIPPED, PRODUCT_CREATED
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=False)
    entity = Column(String(50), nullable=False, index=True)   # Product, Order, Inventory, Shipment
    entity_id = Column(String(100), nullable=True)
    details = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
