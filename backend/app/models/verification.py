import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class OrderVerification(Base):
    __tablename__ = "order_verifications"
    __table_args__ = (
        CheckConstraint('expected_quantity >= 0', name='check_expected_qty_non_negative'),
        CheckConstraint('good_quantity >= 0', name='check_good_qty_non_negative'),
        CheckConstraint('damaged_quantity >= 0', name='check_damaged_qty_non_negative'),
        CheckConstraint('missing_quantity >= 0', name='check_missing_qty_non_negative'),
    )

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    expected_quantity = Column(Integer, nullable=False)
    good_quantity = Column(Integer, default=0, nullable=False)
    damaged_quantity = Column(Integer, default=0, nullable=False)
    missing_quantity = Column(Integer, default=0, nullable=False)
    is_replaced = Column(Boolean, default=False, nullable=False)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="verifications")
    product = relationship("Product", back_populates="order_verifications")
    verified_by = relationship("User")

class DamageMissingRecord(Base):
    __tablename__ = "damage_missing_records"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    damaged_quantity = Column(Integer, default=0, nullable=False)
    missing_quantity = Column(Integer, default=0, nullable=False)
    total_affected = Column(Integer, default=0, nullable=False)
    status = Column(String(30), default="REPORTED", nullable=False, index=True)  # REPORTED, REPLACED, RESOLVED
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    order = relationship("Order", back_populates="damage_missing_records")
    product = relationship("Product", back_populates="damage_missing_records")
    reported_by = relationship("User")
