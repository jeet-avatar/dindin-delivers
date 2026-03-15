"""Usage-Based Insurance (UBI) tracking module for Dollor.ai"""
from insurance.routes import router as insurance_router
from insurance.events import log_insurance_event

__all__ = ["insurance_router", "log_insurance_event"]
