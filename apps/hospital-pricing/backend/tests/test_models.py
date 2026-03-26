# apps/hospital-pricing/backend/tests/test_models.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

# Stub asyncpg so database.py engine creation doesn't require the real driver
import sys
from unittest.mock import MagicMock
if "asyncpg" not in sys.modules:
    sys.modules["asyncpg"] = MagicMock()

import pytest
from models.hospital import HospitalEntity, User, UserRole


def test_hospital_entity_fields():
    h = HospitalEntity(
        name="Mayo Clinic",
        gpo_memberships=["Vizient"],
        is_covered_entity=True,
        ein="41-6011702",
    )
    assert h.name == "Mayo Clinic"
    assert h.is_covered_entity is True


def test_user_role_enum():
    assert UserRole.procurement_officer.value == "procurement_officer"
    assert UserRole.platform_admin.value == "platform_admin"
