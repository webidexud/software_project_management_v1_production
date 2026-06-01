# backend/app/schemas/projects.py — v5.1
# CAMBIO v5.1: Agregados 3 campos en ModificationCreate para desglose de adiciones:
#   entity_contribution_addition, university_contribution_addition, calculated_benefit_value
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal


class ProjectTypeOut(BaseModel):
    project_type_id: int
    type_name: str
    is_active: bool
    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    project_id: int
    project_year: int
    external_project_number: Optional[str] = None
    project_name: str
    project_purpose: str
    entity_id: int
    entity_name: Optional[str] = None
    executing_department_id: int
    department_name: Optional[str] = None
    project_status_id: int
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    project_type_id: int
    type_name: Optional[str] = None
    financing_type_id: int
    financing_name: Optional[str] = None
    execution_modality_id: int
    modality_name: Optional[str] = None
    project_value: Decimal
    accounting_code: Optional[str] = None
    institutional_benefit_percentage: Optional[Decimal] = None
    institutional_benefit_value: Optional[Decimal] = None
    university_contribution: Optional[Decimal] = None
    entity_contribution: Optional[Decimal] = None
    beneficiaries_count: Optional[int] = None
    subscription_date: Optional[date] = None
    start_date: date
    end_date: date
    ordering_official_id: Optional[int] = None
    official_name: Optional[str] = None
    main_email: Optional[str] = None
    administrative_act: Optional[str] = None
    secop_link: Optional[str] = None
    observations: Optional[str] = None
    rup_codes_general_observations: Optional[str] = None
    session_type: Optional[str] = None
    minutes_date: Optional[date] = None
    minutes_number: Optional[str] = None
    supervisor_type: Optional[str] = None
    execution_region: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    project_year: int
    external_project_number: Optional[str] = None
    project_name: str
    project_purpose: str
    entity_id: int
    executing_department_id: int
    project_status_id: int
    project_type_id: int
    financing_type_id: int
    execution_modality_id: int
    project_value: Decimal
    accounting_code: Optional[str] = None
    institutional_benefit_percentage: Optional[Decimal] = None
    institutional_benefit_value: Optional[Decimal] = None
    university_contribution: Optional[Decimal] = None
    entity_contribution: Optional[Decimal] = None
    beneficiaries_count: Optional[int] = None
    subscription_date: Optional[date] = None
    start_date: date
    end_date: date
    ordering_official_id: int
    main_email: Optional[str] = None
    administrative_act: Optional[str] = None
    secop_link: Optional[str] = None
    observations: Optional[str] = None
    rup_codes_general_observations: Optional[str] = None
    session_type: Optional[str] = None
    minutes_date: Optional[date] = None
    minutes_number: Optional[str] = None
    supervisor_type: Optional[str] = 'JEFE_EXTENSION'
    execution_region: Optional[str] = None


class ProjectUpdate(BaseModel):
    external_project_number: Optional[str] = None
    project_name: Optional[str] = None
    project_purpose: Optional[str] = None
    entity_id: Optional[int] = None
    executing_department_id: Optional[int] = None
    project_status_id: Optional[int] = None
    project_type_id: Optional[int] = None
    financing_type_id: Optional[int] = None
    execution_modality_id: Optional[int] = None
    project_value: Optional[Decimal] = None
    accounting_code: Optional[str] = None
    institutional_benefit_percentage: Optional[Decimal] = None
    institutional_benefit_value: Optional[Decimal] = None
    university_contribution: Optional[Decimal] = None
    entity_contribution: Optional[Decimal] = None
    beneficiaries_count: Optional[int] = None
    subscription_date: Optional[date] = None
    start_date: Optional[date]    = None 
    end_date: Optional[date]    = None
    ordering_official_id: Optional[int] = None
    main_email: Optional[str] = None
    administrative_act: Optional[str] = None
    secop_link: Optional[str] = None
    observations: Optional[str] = None
    rup_codes_general_observations: Optional[str] = None
    session_type: Optional[str] = None
    minutes_date: Optional[date] = None
    minutes_number: Optional[str] = None
    supervisor_type: Optional[str] = None
    execution_region: Optional[str] = None


class ProjectTypeOut(BaseModel):
    project_type_id: int
    type_name: str
    is_active: bool
    model_config = {"from_attributes": True}


# ── RUP ──────────────────────────────────────────────────────────────
class RupCodeOut(BaseModel):
    rup_code_id: int
    rup_code: str
    code_description: Optional[str] = None
    segment_code: Optional[str] = None
    segment_name: Optional[str] = None
    family_code: Optional[str] = None
    family_name: Optional[str] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    is_active: bool
    model_config = {"from_attributes": True}


class RupSegment(BaseModel):
    segment_code: str
    segment_name: str


class RupFamily(BaseModel):
    family_code: str
    family_name: str


class RupClass(BaseModel):
    class_code: str
    class_name: str


class ProjectRupCodeOut(BaseModel):
    project_rup_code_id: int
    rup_code_id: int
    rup_code: str
    product_name: Optional[str] = None
    class_name: Optional[str] = None
    family_name: Optional[str] = None
    segment_name: Optional[str] = None
    is_main_code: bool
    is_active: bool
    model_config = {"from_attributes": True}


class ProjectRupAssign(BaseModel):
    rup_code_id: int
    is_main_code: bool = False


class ProjectRupBulk(BaseModel):
    codes: list[ProjectRupAssign]


# ── Correos secundarios ───────────────────────────────────────────────
class SecondaryEmailCreate(BaseModel):
    email: str
    contact_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    observations: Optional[str] = None


class SecondaryEmailUpdate(BaseModel):
    email: Optional[str] = None
    contact_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    observations: Optional[str] = None
    is_active: Optional[bool] = None


class SecondaryEmailOut(BaseModel):
    secondary_email_id: int
    project_id: int
    email: str
    contact_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    observations: Optional[str] = None
    is_active: bool
    model_config = {"from_attributes": True}


# ── Modificaciones ───────────────────────────────────────────────────
class ModificationCreate(BaseModel):
    modification_type: str
    approval_date: date
    administrative_act: Optional[str] = None
    justification: Optional[str] = None
    # ── Adición ──────────────────────────────────────────────────────
    addition_value: Optional[Decimal] = None
    entity_contribution_addition: Optional[Decimal] = None        # ← NUEVO
    university_contribution_addition: Optional[Decimal] = None    # ← NUEVO
    # ─────────────────────────────────────────────────────────────────
    extension_days: Optional[int] = None
    new_end_date: Optional[date] = None
    new_total_value: Optional[Decimal] = None
    extension_period_text: Optional[str] = None
    requires_policy_update: bool = False
    policy_update_description: Optional[str] = None
    payment_method_modification: Optional[str] = None
    ordering_official_id: Optional[int] = None


class SuspensionCreate(BaseModel):
    suspension_start_date: date
    suspension_end_date: date
    planned_restart_date: date
    contractor_justification: str
    supervisor_justification: str
    entity_supervisor_name: Optional[str] = None
    entity_supervisor_id: Optional[str] = None


class SuspensionRestartPatch(BaseModel):
    actual_restart_date: date
    restart_modification_id: int


class ClauseChangeCreate(BaseModel):
    clause_number: Optional[str] = '1'
    clause_name: Optional[str] = 'Modificación Contractual'
    new_clause_text: Optional[str] = None
    modification_description: str
    requires_resource_liberation: bool = False
    cdp_to_release: Optional[str] = None
    rp_to_release: Optional[str] = None
    liberation_amount: Optional[Decimal] = None


class AssignmentCreate(BaseModel):
    assignment_type: str
    assignor_name: str
    assignor_id: Optional[str] = None
    assignor_id_type: Optional[str] = None
    assignee_name: str
    assignee_id: Optional[str] = None
    assignee_id_type: Optional[str] = None
    assignment_date: Optional[date] = None
    assignment_signature_date: Optional[date] = None
    value_to_assign: Optional[Decimal] = None
    value_paid_to_assignor: Optional[Decimal] = None
    value_pending_to_assignor: Optional[Decimal] = None
    cdp: Optional[str] = None
    rp: Optional[str] = None
    guarantee_modification_request: Optional[str] = None


class LiquidationCreate(BaseModel):
    liquidation_type: str = 'BILATERAL'
    liquidation_date: date
    execution_percentage: Decimal
    executed_value: Decimal
    supervisor_liquidation_request: str
    pending_payment_value: Optional[Decimal] = None
    value_to_release: Optional[Decimal] = None
    cdp: Optional[str] = None
    cdp_value: Optional[Decimal] = None
    rp: Optional[str] = None
    rp_value: Optional[Decimal] = None
    initial_contract_value: Optional[Decimal] = None
    final_value_with_additions: Optional[Decimal] = None
    resolution_number: Optional[str] = None
    resolution_date: Optional[date] = None
    unilateral_cause: Optional[str] = None
    cause_analysis: Optional[str] = None
    liquidation_signature_date: Optional[date] = None
    additions_summary: Optional[Any] = None
    extensions_summary: Optional[Any] = None
    suspensions_summary: Optional[Any] = None
