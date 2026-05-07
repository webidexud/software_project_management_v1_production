from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

# ── Entity Types ──────────────────────────────────────────────────────
class EntityTypeOut(BaseModel):
    entity_type_id: int
    type_name: str
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class EntityTypeCreate(BaseModel):
    type_name: str
    is_active: bool = True

class EntityTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    is_active: Optional[bool] = None

# ── Entities ──────────────────────────────────────────────────────────
class EntityOut(BaseModel):
    entity_id: int
    entity_name: str
    tax_id: str
    entity_type_id: Optional[int] = None
    entity_type_name: Optional[str] = None
    main_address: Optional[str] = None
    main_phone: Optional[str] = None
    institutional_email: Optional[str] = None
    website: Optional[str] = None
    main_contact: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class EntityCreate(BaseModel):
    entity_name: str
    tax_id: str
    entity_type_id: int
    main_address: Optional[str] = None
    main_phone: Optional[str] = None
    institutional_email: Optional[str] = None
    website: Optional[str] = None
    main_contact: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool = True

class EntityUpdate(BaseModel):
    entity_name: Optional[str] = None
    tax_id: Optional[str] = None
    entity_type_id: Optional[int] = None
    main_address: Optional[str] = None
    main_phone: Optional[str] = None
    institutional_email: Optional[str] = None
    website: Optional[str] = None
    main_contact: Optional[str] = None
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

# ── Executing Departments ─────────────────────────────────────────────
class ExecutingDepartmentOut(BaseModel):
    department_id: int
    department_name: str
    website: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class ExecutingDepartmentCreate(BaseModel):
    department_name: str
    website: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class ExecutingDepartmentUpdate(BaseModel):
    department_name: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# ── Execution Modalities ──────────────────────────────────────────────
class ExecutionModalityOut(BaseModel):
    execution_modality_id: int
    modality_name: str
    modality_description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class ExecutionModalityCreate(BaseModel):
    modality_name: str
    modality_description: Optional[str] = None
    is_active: bool = True

class ExecutionModalityUpdate(BaseModel):
    modality_name: Optional[str] = None
    modality_description: Optional[str] = None

# ── Financing Types ───────────────────────────────────────────────────
class FinancingTypeOut(BaseModel):
    financing_type_id: int
    financing_name: str
    is_active: bool
    model_config = {"from_attributes": True}

class FinancingTypeCreate(BaseModel):
    financing_name: str
    is_active: bool = True

class FinancingTypeUpdate(BaseModel):
    financing_name: Optional[str] = None

# ── Ordering Officials ────────────────────────────────────────────────
class OrderingOfficialOut(BaseModel):
    official_id: int
    first_name: str
    second_name: Optional[str] = None
    first_surname: str
    second_surname: Optional[str] = None
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    appointment_resolution: Optional[str] = None
    resolution_date: Optional[date] = None
    institutional_email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    full_name: Optional[str] = None
    model_config = {"from_attributes": True}

class OrderingOfficialCreate(BaseModel):
    first_name: str
    second_name: Optional[str] = None
    first_surname: str
    second_surname: Optional[str] = None
    identification_type: str = "CC"
    identification_number: str
    appointment_resolution: Optional[str] = None
    resolution_date: Optional[date] = None
    institutional_email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

class OrderingOfficialUpdate(BaseModel):
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    first_surname: Optional[str] = None
    second_surname: Optional[str] = None
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    appointment_resolution: Optional[str] = None
    resolution_date: Optional[date] = None
    institutional_email: Optional[str] = None
    phone: Optional[str] = None

# ── Project Statuses ──────────────────────────────────────────────────
class ProjectStatusOut(BaseModel):
    status_id: int
    status_code: str
    status_name: str
    status_color: Optional[str] = None
    status_order: Optional[int] = None
    status_description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class ProjectStatusCreate(BaseModel):
    status_code: str
    status_name: str
    status_color: Optional[str] = "#0EA5E9"
    status_order: Optional[int] = None
    status_description: Optional[str] = None
    is_active: bool = True

class ProjectStatusUpdate(BaseModel):
    status_code: Optional[str] = None
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    status_order: Optional[int] = None
    status_description: Optional[str] = None
