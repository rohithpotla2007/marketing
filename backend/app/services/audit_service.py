from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Optional

def log_activity(
    db: Session,
    action: str,
    username: str,
    entity: str,
    details: str,
    user_id: Optional[int] = None,
    entity_id: Optional[str] = None
) -> AuditLog:
    """Record an immutable system audit trail entry."""
    audit = AuditLog(
        action=action,
        user_id=user_id,
        username=username or "System",
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details
    )
    db.add(audit)
    return audit
