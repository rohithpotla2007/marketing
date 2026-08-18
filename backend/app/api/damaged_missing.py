from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.verification import DamageMissingRecord
from app.schemas.damaged_missing import DamageMissingOut, DamageMissingSummary
from typing import Optional

router = APIRouter(prefix="/damaged-missing", tags=["Damaged & Missing Products"])

@router.get("", response_model=DamageMissingSummary)
def get_damaged_missing_products(
    status: Optional[str] = Query(None, description="Filter by status: REPORTED, REPLACED, RESOLVED"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    search: Optional[str] = Query(None, description="Search by product name or order number"),
    db: Session = Depends(get_db)
):
    """List damaged and missing product records with summary totals."""
    query = db.query(DamageMissingRecord).filter(DamageMissingRecord.total_affected > 0)
    
    if status:
        query = query.filter(DamageMissingRecord.status == status.upper())
        
    if category_id:
        query = query.join(DamageMissingRecord.product).filter(DamageMissingRecord.product.has(category_id=category_id))
        
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.join(DamageMissingRecord.product).join(DamageMissingRecord.order).filter(
            DamageMissingRecord.product.has(name=search_pattern) |
            DamageMissingRecord.order.has(order_number=search_pattern)
        )
        
    records = query.order_by(DamageMissingRecord.created_at.desc()).all()
    
    # Calculate aggregate totals from DB
    damaged_total = sum(r.damaged_quantity for r in records)
    missing_total = sum(r.missing_quantity for r in records)
    total_affected = damaged_total + missing_total
    
    items = []
    for r in records:
        items.append(DamageMissingOut(
            id=r.id,
            order_id=r.order_id,
            order_number=r.order.order_number if r.order else f"ORD-{r.order_id}",
            product_id=r.product_id,
            product_name=r.product.name if r.product else "Unknown",
            product_code=r.product.product_code if r.product else "N/A",
            product_image=r.product.image_url if r.product else None,
            category_name=r.product.category.name if (r.product and r.product.category) else "General",
            damaged_quantity=r.damaged_quantity,
            missing_quantity=r.missing_quantity,
            total_affected=r.total_affected,
            status=r.status,
            reported_by=r.reported_by.username if r.reported_by else "Staff",
            notes=r.notes,
            created_at=r.created_at
        ))
        
    return DamageMissingSummary(
        total_damaged_items=damaged_total,
        total_missing_items=missing_total,
        total_affected_items=total_affected,
        total_records=len(items),
        items=items
    )
