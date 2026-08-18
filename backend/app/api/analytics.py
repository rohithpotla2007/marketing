from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.analytics import AnalyticsDashboardResponse, DashboardSummary
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", response_model=AnalyticsDashboardResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Retrieve database-computed metrics and distributions for Recharts."""
    return analytics_service.get_analytics_data(db)

@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    """Retrieve top-level KPI counts for the main dashboard cards."""
    return analytics_service.get_dashboard_summary(db)
