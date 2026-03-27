# apps/hospital-pricing/backend/models/audit.py
import uuid
from datetime import datetime
from sqlalchemy import Uuid, String, DateTime, ForeignKey, JSON, event, DDL
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class AuditLogEntry(Base):
    __tablename__ = "audit_log_entries"
    log_id:        Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    entity_id:     Mapped[uuid.UUID] = mapped_column(ForeignKey("hospital_entities.entity_id"), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(), nullable=False)
    event_type:    Mapped[str]       = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str]       = mapped_column(String(100), nullable=False)
    resource_id:   Mapped[uuid.UUID] = mapped_column(Uuid(), nullable=False)
    payload:       Mapped[dict]      = mapped_column(JSON, nullable=False)
    created_at:    Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow, index=True)


# PostgreSQL trigger: prevent any UPDATE or DELETE on audit_log_entries (DISC-04)
_IMMUTABILITY_TRIGGER = DDL("""
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log_entries is immutable — updates and deletes are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable_trigger ON audit_log_entries;
CREATE TRIGGER audit_log_immutable_trigger
    BEFORE UPDATE OR DELETE ON audit_log_entries
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
""")

event.listen(
    AuditLogEntry.__table__,
    "after_create",
    _IMMUTABILITY_TRIGGER.execute_if(dialect="postgresql"),
)
