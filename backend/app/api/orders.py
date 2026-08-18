from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.order import OrderCreateRequest, OrderOut, OrderListResponse
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.services import order_service
from typing import Optional

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=OrderOut)
def create_order(
    request: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Place a new order and reserve available warehouse stock."""
    return order_service.create_order(
        db=db,
        request=request,
        user_id=current_user.id,
        username=current_user.username
    )

@router.get("", response_model=OrderListResponse)
def list_orders(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, ACCEPTED, SHIPPED, CANCELLED"),
    search: Optional[str] = Query(None, description="Search by order number or notes"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List orders sorted dynamically by fulfillment availability ratio and creation date."""
    return order_service.get_orders(
        db=db,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/{order_id}", response_model=OrderOut)
def get_order_details(order_id: int, db: Session = Depends(get_db)):
    """Get single order details."""
    order = order_service.get_order_by_id(db, order_id)
    return order_service.format_order_out(order)

@router.post("/{order_id}/accept", response_model=OrderOut)
def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a pending order and transition it to the Tracking & Verification module."""
    return order_service.accept_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id,
        username=current_user.username
    )
