from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.product import ProductOut, ProductCreate, ProductUpdate, ProductListResponse
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.services import inventory_service
from typing import Optional

router = APIRouter(prefix="/products", tags=["Products"])

def format_product_out(p) -> ProductOut:
    return ProductOut(
        id=p.id,
        product_code=p.product_code,
        name=p.name,
        description=p.description,
        category_id=p.category_id,
        category_name=p.category.name if p.category else "General",
        image_url=p.image_url,
        quantity=p.quantity,
        reserved_quantity=p.reserved_quantity,
        available_quantity=p.available_quantity,
        low_stock_threshold=p.low_stock_threshold,
        status=p.status,
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.get("", response_model=ProductListResponse)
def list_products(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    search: Optional[str] = Query(None, description="Search by name, SKU, or category"),
    status: Optional[str] = Query(None, description="Filter by status: IN STOCK, LOW STOCK, OUT OF STOCK"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List products with optional category, search, and stock status filters."""
    total, products = inventory_service.get_products(
        db, category_id=category_id, search=search, status_filter=status, skip=skip, limit=limit
    )
    return ProductListResponse(
        total=total,
        items=[format_product_out(p) for p in products]
    )

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get single product details."""
    p = inventory_service.get_product_by_id(db, product_id)
    return format_product_out(p)

@router.post("", response_model=ProductOut)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new product to warehouse inventory."""
    p = inventory_service.create_product(db, data, user_id=current_user.id, username=current_user.username)
    return format_product_out(p)

@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update product information."""
    p = inventory_service.update_product(db, product_id, data, user_id=current_user.id, username=current_user.username)
    return format_product_out(p)
