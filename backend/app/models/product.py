import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint('quantity >= 0', name='check_quantity_non_negative'),
        CheckConstraint('reserved_quantity >= 0', name='check_reserved_quantity_non_negative'),
    )

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), index=True, nullable=False)
    description = Column(String(500), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    restock_transactions = relationship("RestockTransaction", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")
    order_verifications = relationship("OrderVerification", back_populates="product")
    damage_missing_records = relationship("DamageMissingRecord", back_populates="product")

    @property
    def available_quantity(self) -> int:
        return max(0, self.quantity - self.reserved_quantity)

    @property
    def status(self) -> str:
        if self.quantity > self.low_stock_threshold:
            return "IN STOCK"
        elif self.quantity > 0:
            return "LOW STOCK"
        else:
            return "OUT OF STOCK"
