# apps/hospital-pricing/backend/models/hospital.py
import uuid, enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Uuid, String, Boolean, Enum as SAEnum, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UserRole(str, enum.Enum):
    procurement_officer = "procurement_officer"
    procurement_approver = "procurement_approver"
    entity_admin = "entity_admin"
    platform_admin = "platform_admin"


class HospitalEntity(Base):
    __tablename__ = "hospital_entities"
    entity_id:          Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    name:               Mapped[str]       = mapped_column(String(255), nullable=False)
    gpo_memberships:    Mapped[list]      = mapped_column(JSON, default=list)
    is_covered_entity:  Mapped[bool]      = mapped_column(Boolean, default=False)
    ein:                Mapped[Optional[str]] = mapped_column(String(20))
    created_at:         Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)
    users:              Mapped[list["User"]] = relationship("User", back_populates="entity")
    facilities:         Mapped[list["Facility"]] = relationship("Facility", back_populates="entity")


class Supplier(Base):
    __tablename__ = "suppliers"
    supplier_id:   Mapped[uuid.UUID]     = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    name:          Mapped[str]           = mapped_column(String(255), nullable=False)
    dea_number:    Mapped[Optional[str]] = mapped_column(String(20))
    hin:           Mapped[Optional[str]] = mapped_column(String(20))
    contact_email: Mapped[str]           = mapped_column(String(255), nullable=False)
    created_at:    Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)


class Facility(Base):
    __tablename__ = "facilities"
    facility_id:      Mapped[uuid.UUID]  = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    entity_id:        Mapped[uuid.UUID]  = mapped_column(ForeignKey("hospital_entities.entity_id"), nullable=False)
    name:             Mapped[str]        = mapped_column(String(255), nullable=False)
    address:          Mapped[str]        = mapped_column(String(500), nullable=False)
    ship_to_code:     Mapped[str]        = mapped_column(String(50), nullable=False)
    is_340b_eligible: Mapped[bool]       = mapped_column(Boolean, default=False)
    entity:           Mapped["HospitalEntity"] = relationship("HospitalEntity", back_populates="facilities")


class User(Base):
    __tablename__ = "users"
    user_id:         Mapped[uuid.UUID]  = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    entity_id:       Mapped[uuid.UUID]  = mapped_column(ForeignKey("hospital_entities.entity_id"), nullable=False)
    email:           Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str]        = mapped_column(String(255), nullable=False)
    role:            Mapped[UserRole]   = mapped_column(SAEnum(UserRole), nullable=False)
    is_active:       Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime]   = mapped_column(DateTime, default=datetime.utcnow)
    entity:          Mapped["HospitalEntity"] = relationship("HospitalEntity", back_populates="users")
