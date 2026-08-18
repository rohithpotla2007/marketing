from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.restock import RestockRequest, RestockResponse, RestockTransactionOut
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.services import inventory_service

router = APIRouter(prefix="/restocks", tags=["Restocking"])

@router.post("", response_model=RestockResponse)
def restock_product(
    request: RestockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restock an inventory product and record the transaction atomically."""
    return inventory_service.restock_product(
        db=db,
        product_id=request.product_id,
        quantity_added=request.quantity_added,
        user_id=current_user.id,
        username=current_user.username,
        notes=request.notes
    )

@router.get("", response_model=list[RestockTransactionOut])
def get_restock_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get recent restocking history records."""
    return inventory_service.get_restock_history(db, limit=limit)
