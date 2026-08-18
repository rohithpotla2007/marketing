from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings
import datetime

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
def check_health(db: Session = Depends(get_db)):
    """System health check and database connectivity probe."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "database": db_status,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
