from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.tracking import (
    OrderVerificationRequest,
    OrderTrackingOut,
    ReplacementRequest,
    ReplacementResponse,
    ShipmentRequest,
    ShipmentOut
)
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.services import tracking_service
from typing import Optional

router = APIRouter(prefix="/tracking", tags=["Order Tracking & Verification"])

@router.get("", response_model=list[OrderTrackingOut])
def list_tracking_orders(
    search: Optional[str] = Query(None, description="Search by order number"),
    db: Session = Depends(get_db)
):
    """List all accepted orders awaiting or undergoing item verification."""
    return tracking_service.get_tracking_orders(db, search=search)

@router.get("/history/shipments", response_model=list[ShipmentOut])
def list_shipped_orders(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """List historical shipped orders log."""
    return tracking_service.get_shipped_orders_history(db, limit=limit)

@router.get("/{order_id}", response_model=OrderTrackingOut)
def get_tracking_order(order_id: int, db: Session = Depends(get_db)):
    """Get verification status and item breakdown for an accepted order."""
    return tracking_service.get_tracking_order_by_id(db, order_id)

@router.post("/{order_id}/verify", response_model=OrderTrackingOut)
def verify_order_items(
    order_id: int,
    request: OrderVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record physical inspection quantities (good, damaged, missing)."""
    return tracking_service.verify_order_items(
        db=db,
        order_id=order_id,
        request=request,
        user_id=current_user.id,
        username=current_user.username
    )

@router.post("/{order_id}/replace", response_model=ReplacementResponse)
def replace_item(
    order_id: int,
    request: ReplacementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Issue replacement inventory for damaged or missing products."""
    return tracking_service.replace_damaged_missing_item(
        db=db,
        order_id=order_id,
        product_id=request.product_id,
        user_id=current_user.id,
        username=current_user.username,
        reason=request.reason
    )

@router.post("/{order_id}/ship", response_model=ShipmentOut)
def ship_order(
    order_id: int,
    request: ShipmentRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dispatch a verified order and finalize warehouse inventory deduction."""
    notes = request.notes if request else None
    return tracking_service.ship_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id,
        username=current_user.username,
        notes=notes
    )
