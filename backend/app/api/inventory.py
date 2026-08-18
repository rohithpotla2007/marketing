from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.product import ProductOut
from app.api.products import format_product_out
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory Monitoring"])

@router.get("/low-stock", response_model=list[ProductOut])
def get_low_stock(db: Session = Depends(get_db)):
    """Retrieve all products with quantity between 1 and their low-stock threshold."""
    products = inventory_service.get_low_stock_products(db)
    return [format_product_out(p) for p in products]

@router.get("/out-of-stock", response_model=list[ProductOut])
def get_out_of_stock(db: Session = Depends(get_db)):
    """Retrieve all products with 0 available units."""
    products = inventory_service.get_out_of_stock_products(db)
    return [format_product_out(p) for p in products]
