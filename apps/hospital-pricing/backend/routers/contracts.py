# apps/hospital-pricing/backend/routers/contracts.py
"""
Contracts router: CRUD + AKS safe harbor enforcement.

AKS safe harbor: admin_fee_pct must not exceed 3% per 42 CFR §1001.952(j)
Statute: 42 U.S.C. §1320a-7b(b)
"""
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from auth.deps import require_entity_admin
from models.contract import WholesaleAgreement, ContractStatus

router = APIRouter(prefix="/contracts", tags=["contracts"])

AKS_ADMIN_FEE_CEILING = Decimal("0.03")  # 42 CFR §1001.952(j) — GPO safe harbor max 3%
AKS_STATUTE_CITATION = "42 U.S.C. §1320a-7b(b) and 42 CFR §1001.952(j)"


def _build_response(c: "WholesaleAgreement") -> "ContractResponse":
    mfn: Optional[dict] = None
    if c.mfn_clause is not None:
        mfn = {
            "mfn_id": str(c.mfn_clause.mfn_id),
            "trigger_type": c.mfn_clause.trigger_type.value,
            "disclosure_frequency": c.mfn_clause.disclosure_frequency,
            "carve_outs": c.mfn_clause.carve_outs,
            "cure_period_days": c.mfn_clause.cure_period_days,
            "true_up_retroactive": c.mfn_clause.true_up_retroactive,
        }
    return ContractResponse(
        contract_id=c.contract_id,
        supplier_id=c.supplier_id,
        status=c.status.value,
        effective_date=c.effective_date,
        expiration_date=c.expiration_date,
        admin_fee_pct=c.admin_fee_pct,
        aks_safe_harbor_documented=c.aks_safe_harbor_documented,
        baa_required=c.baa_required,
        mfn_clause=mfn,
    )


class ContractCreate(BaseModel):
    supplier_id: uuid.UUID
    effective_date: date
    expiration_date: date
    gpo_contract_number: Optional[str] = None
    admin_fee_pct: Optional[Decimal] = Field(None, ge=0)
    baa_required: bool = False
    price_escalation_cap_pct: Decimal = Field(Decimal("0.03"), ge=0, le=Decimal("0.10"))

    @field_validator("admin_fee_pct")
    @classmethod
    def validate_aks_safe_harbor(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v > AKS_ADMIN_FEE_CEILING:
            raise ValueError(
                f"admin_fee_pct {float(v):.1%} exceeds AKS safe harbor ceiling of 3.0% "
                f"per {AKS_STATUTE_CITATION}. "
                f"Contract creation blocked to prevent Anti-Kickback Statute violation."
            )
        return v


class ContractResponse(BaseModel):
    contract_id: uuid.UUID
    supplier_id: uuid.UUID
    status: str
    effective_date: date
    expiration_date: date
    admin_fee_pct: Optional[Decimal]
    aks_safe_harbor_documented: bool
    baa_required: bool
    mfn_clause: Optional[dict]

    model_config = {"from_attributes": True}


@router.post("/", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    body: ContractCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_entity_admin),
) -> ContractResponse:
    """Create a new wholesale contract. Enforces AKS safe harbor at creation time."""
    entity_id = uuid.UUID(payload["entity_id"])

    contract = WholesaleAgreement(
        hospital_entity_id=entity_id,
        supplier_id=body.supplier_id,
        effective_date=body.effective_date,
        expiration_date=body.expiration_date,
        gpo_contract_number=body.gpo_contract_number,
        admin_fee_pct=body.admin_fee_pct,
        baa_required=body.baa_required,
        price_escalation_cap_pct=body.price_escalation_cap_pct,
        status=ContractStatus.draft,
    )
    db.add(contract)
    await db.commit()

    # Re-query with mfn_clause eager-loaded (async lazy load not allowed)
    result = await db.execute(
        select(WholesaleAgreement)
        .options(selectinload(WholesaleAgreement.mfn_clause))
        .where(WholesaleAgreement.contract_id == contract.contract_id)
    )
    contract = result.scalar_one()
    return _build_response(contract)


@router.post("/{contract_id}/activate", response_model=ContractResponse)
async def activate_contract(
    contract_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_entity_admin),
) -> ContractResponse:
    """
    Activate a draft contract. Blocked if baa_required=True but no BAA document is on file.
    A BAA (Business Associate Agreement) must be executed before activation per HIPAA §164.308(b).
    """
    entity_id = uuid.UUID(payload["entity_id"])

    result = await db.execute(
        select(WholesaleAgreement)
        .options(selectinload(WholesaleAgreement.mfn_clause))
        .where(
            WholesaleAgreement.contract_id == contract_id,
            WholesaleAgreement.hospital_entity_id == entity_id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract {contract_id} not found",
        )

    # BAA activation block: if BAA is required, document must be on file before activation
    if contract.baa_required and not contract.document_s3_path:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Contract cannot be activated: baa_required=True but no BAA document is on file. "
                "Upload a signed BAA (Business Associate Agreement) before activating this contract "
                "per HIPAA §164.308(b)."
            ),
        )

    contract.status = ContractStatus.active
    await db.commit()

    # Re-query with mfn_clause eager-loaded (async lazy load not allowed)
    result = await db.execute(
        select(WholesaleAgreement)
        .options(selectinload(WholesaleAgreement.mfn_clause))
        .where(WholesaleAgreement.contract_id == contract_id)
    )
    contract = result.scalar_one()
    return _build_response(contract)


@router.get("/", response_model=list[ContractResponse])
async def list_contracts(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_entity_admin),
) -> list[ContractResponse]:
    """List all contracts for the current entity (tenant-scoped)."""
    entity_id = uuid.UUID(payload["entity_id"])
    result = await db.execute(
        select(WholesaleAgreement)
        .options(selectinload(WholesaleAgreement.mfn_clause))
        .where(WholesaleAgreement.hospital_entity_id == entity_id)
    )
    contracts = result.scalars().all()
    return [_build_response(c) for c in contracts]


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_entity_admin),
) -> ContractResponse:
    """Fetch a single contract by ID, including current processing status."""
    entity_id = uuid.UUID(payload["entity_id"])
    result = await db.execute(
        select(WholesaleAgreement)
        .options(selectinload(WholesaleAgreement.mfn_clause))
        .where(
            WholesaleAgreement.contract_id == contract_id,
            WholesaleAgreement.hospital_entity_id == entity_id,
        )
    )
    contract = result.scalar_one_or_none()
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return _build_response(contract)
