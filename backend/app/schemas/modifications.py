# backend/app/schemas/modifications.py — v5.0
# CAMBIO: Agregados 3 campos para desglose de adiciones:
#   - entity_contribution_addition
#   - university_contribution_addition
#   - calculated_benefit_value
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

VALID_TYPES = {
    'ADDITION', 'EXTENSION', 'BOTH', 'CONTRACTUAL',
    'SUSPENSION', 'RESTART',
    'CESION_CESIONARIA', 'CESION_CEDENTE', 'LIQUIDATION'
}


class ModificationBase(BaseModel):
    modification_type:               str
    approval_date:                   date
    administrative_act:              Optional[str]     = None
    justification:                   Optional[str]     = None
    # ── Adición ──────────────────────────────────────────────────────
    addition_value:                  Optional[Decimal] = None   # total de la adición
    entity_contribution_addition:    Optional[Decimal] = None   # parte entidad
    university_contribution_addition: Optional[Decimal] = None  # parte universidad
    calculated_benefit_value:        Optional[Decimal] = None   # beneficio acumulado calculado
    new_total_value:                 Optional[Decimal] = None
    # ── Prórroga ─────────────────────────────────────────────────────
    extension_days:                  Optional[int]     = None
    new_end_date:                    Optional[date]    = None
    extension_period_text:           Optional[str]     = None
    # ── Póliza y pago ────────────────────────────────────────────────
    requires_policy_update:          bool              = False
    policy_update_description:       Optional[str]     = None
    payment_method_modification:     Optional[str]     = None
    ordering_official_id:            Optional[int]     = None


class ModificationCreate(ModificationBase):
    pass


class ModificationUpdate(BaseModel):
    modification_type:               Optional[str]     = None
    approval_date:                   Optional[date]    = None
    administrative_act:              Optional[str]     = None
    justification:                   Optional[str]     = None
    addition_value:                  Optional[Decimal] = None
    entity_contribution_addition:    Optional[Decimal] = None
    university_contribution_addition: Optional[Decimal] = None
    calculated_benefit_value:        Optional[Decimal] = None
    new_total_value:                 Optional[Decimal] = None
    extension_days:                  Optional[int]     = None
    new_end_date:                    Optional[date]    = None
    extension_period_text:           Optional[str]     = None
    requires_policy_update:          Optional[bool]    = None
    policy_update_description:       Optional[str]     = None
    payment_method_modification:     Optional[str]     = None
    ordering_official_id:            Optional[int]     = None


class ModificationOut(ModificationBase):
    modification_id:     int
    project_id:          int
    modification_number: int
    is_active:           bool
    created_at:          datetime
    updated_at:          Optional[datetime] = None

    model_config = {'from_attributes': True}
