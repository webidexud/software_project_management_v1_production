# backend/app/models/catalogs.py — v4.0
# CAMBIO: Eliminado internal_project_number de Project y ProjectRupCode.
#         ProjectRupCode ahora usa project_id (FK) en lugar de (project_year + internal_project_number).
#         ProjectDocument ahora usa project_id (FK) en lugar de (project_year + internal_project_number).
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, Numeric, SmallInteger, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class EntityType(Base):
    __tablename__ = "entity_types"
    entity_type_id     = Column(Integer, primary_key=True)
    type_name          = Column(String(100), nullable=False)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime, server_default=func.now())
    created_by_user_id = Column(Integer)


class Entity(Base):
    __tablename__ = "entities"
    entity_id           = Column(Integer, primary_key=True)
    entity_name         = Column(String(255), nullable=False)
    tax_id              = Column(String(100), nullable=False)
    entity_type_id      = Column(Integer, ForeignKey("entity_types.entity_type_id"))
    main_address        = Column(String(200))
    main_phone          = Column(String(100))
    institutional_email = Column(String(200))
    website             = Column(String(200))
    main_contact        = Column(String(100))
    contact_position    = Column(String(100))
    contact_phone       = Column(String(50))
    contact_email       = Column(String(200))
    last_update_date    = Column(Date)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())
    created_by_user_id  = Column(Integer)
    updated_at          = Column(DateTime)
    updated_by_user_id  = Column(Integer)


class ExecutingDepartment(Base):
    __tablename__ = "executing_departments"
    department_id      = Column(Integer, primary_key=True)
    department_name    = Column(String(200), nullable=False)
    website            = Column(String(200))
    address            = Column(String(200))
    phone              = Column(String(50))
    email              = Column(String(200))
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime, server_default=func.now())
    created_by_user_id = Column(Integer)
    updated_at         = Column(DateTime)
    updated_by_user_id = Column(Integer)


class FinancingType(Base):
    __tablename__ = "financing_types"
    financing_type_id = Column(Integer, primary_key=True)
    financing_name    = Column(String(200), nullable=False)
    is_active         = Column(Boolean, default=True)


class ExecutionModality(Base):
    __tablename__ = "execution_modalities"
    execution_modality_id = Column(Integer, primary_key=True)
    modality_name         = Column(String(100), nullable=False)
    is_active             = Column(Boolean, default=True)
    created_at            = Column(DateTime, server_default=func.now())
    created_by_user_id    = Column(Integer)


class OrderingOfficial(Base):
    __tablename__ = "ordering_officials"
    official_id              = Column(Integer, primary_key=True)
    first_name               = Column(String(100), nullable=False)
    second_name              = Column(String(100))
    first_surname            = Column(String(100), nullable=False)
    second_surname           = Column(String(100))
    identification_type      = Column(String(20), default='CC')
    identification_number    = Column(String(50), nullable=False)
    appointment_resolution   = Column(String(100))
    resolution_date          = Column(Date)
    institutional_email      = Column(String(200))
    phone                    = Column(String(50))
    is_active                = Column(Boolean, default=True)
    created_at               = Column(DateTime, server_default=func.now())
    created_by_user_id       = Column(Integer)
    updated_at               = Column(DateTime)
    updated_by_user_id       = Column(Integer)


class ProjectStatus(Base):
    __tablename__ = "project_statuses"
    status_id          = Column(Integer, primary_key=True)
    status_code        = Column(String(20), nullable=False)
    status_name        = Column(String(100), nullable=False)
    status_color       = Column(String(20))
    status_order       = Column(Integer)
    status_description = Column(Text)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime, server_default=func.now())


class ProjectType(Base):
    __tablename__ = "project_types"
    project_type_id = Column(Integer, primary_key=True)
    type_name       = Column(String(100), nullable=False)
    is_active       = Column(Boolean, default=True)


class Project(Base):
    __tablename__ = "projects"
    # ── Identificación ───────────────────────────────────────────────
    project_id                       = Column(Integer, primary_key=True)
    project_year                     = Column(SmallInteger, nullable=False)
    # internal_project_number ELIMINADO — se usa project_id como clave única
    external_project_number          = Column(String(40))
    project_name                     = Column(String(800), nullable=False)
    project_purpose                  = Column(Text, nullable=False)
    # ── Clasificación ────────────────────────────────────────────────
    entity_id                        = Column(Integer, ForeignKey("entities.entity_id"), nullable=False)
    executing_department_id          = Column(Integer, ForeignKey("executing_departments.department_id"), nullable=False)
    project_status_id                = Column(Integer, ForeignKey("project_statuses.status_id"), nullable=False)
    project_type_id                  = Column(Integer, ForeignKey("project_types.project_type_id"), nullable=False)
    financing_type_id                = Column(Integer, ForeignKey("financing_types.financing_type_id"), nullable=False)
    execution_modality_id            = Column(Integer, ForeignKey("execution_modalities.execution_modality_id"), nullable=False)
    # ── Financiero ───────────────────────────────────────────────────
    project_value                    = Column(Numeric(15, 0), nullable=False)
    accounting_code                  = Column(String(50))
    institutional_benefit_percentage = Column(Numeric(5, 0), default=12)
    institutional_benefit_value      = Column(Numeric(15, 0))
    university_contribution          = Column(Numeric(15, 0), default=0)
    entity_contribution              = Column(Numeric(15, 0))
    beneficiaries_count              = Column(Integer)
    # ── Plazos ───────────────────────────────────────────────────────
    subscription_date                = Column(Date)
    start_date                       = Column(Date, nullable=False)
    end_date                         = Column(Date, nullable=False)
    # ── Actores ──────────────────────────────────────────────────────
    ordering_official_id             = Column(Integer, ForeignKey("ordering_officials.official_id"))
    main_email                       = Column(String(200))
    # ── Actos administrativos ────────────────────────────────────────
    administrative_act               = Column(String(50))
    secop_link                       = Column(String(1000))
    observations                     = Column(Text)
    rup_codes_general_observations   = Column(Text)
    session_type                     = Column(String(50))
    minutes_date                     = Column(Date)
    minutes_number                   = Column(String(50))
    supervisor_type                  = Column(String(30), default="JEFE_EXTENSION")
    # ── Control ──────────────────────────────────────────────────────
    is_active                        = Column(Boolean, default=True)
    created_at                       = Column(DateTime, server_default=func.now())
    created_by_user_id               = Column(Integer)
    updated_at                       = Column(DateTime)
    updated_by_user_id               = Column(Integer)


class RupCode(Base):
    __tablename__ = "rup_codes"
    rup_code_id      = Column(Integer, primary_key=True)
    rup_code         = Column(String(20), nullable=False)
    code_description = Column(Text)
    segment_code     = Column(String(10))
    segment_name     = Column(String(200))
    family_code      = Column(String(10))
    family_name      = Column(String(200))
    class_code       = Column(String(10))
    class_name       = Column(String(200))
    product_code     = Column(String(10))
    product_name     = Column(String(200))
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, server_default=func.now())


class ProjectRupCode(Base):
    __tablename__ = "project_rup_codes"
    project_rup_code_id = Column(Integer, primary_key=True)
    # CAMBIO: ahora referencia project_id en lugar de (project_year + internal_project_number)
    project_id          = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    rup_code_id         = Column(Integer, ForeignKey("rup_codes.rup_code_id"), nullable=False)
    is_main_code        = Column(Boolean, default=False)
    assignment_date     = Column(Date)
    assigned_by_user_id = Column(Integer)
    is_active           = Column(Boolean, default=True)


class ProjectSecondaryEmail(Base):
    __tablename__ = "project_secondary_emails"
    secondary_email_id = Column(Integer, primary_key=True)
    project_id         = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    email              = Column(String(200), nullable=False)
    contact_type       = Column(String(50))
    contact_name       = Column(String(100))
    contact_position   = Column(String(100))
    contact_phone      = Column(String(20))
    observations       = Column(Text)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime, server_default=func.now())
    created_by_user_id = Column(Integer)
    updated_at         = Column(DateTime)
    updated_by_user_id = Column(Integer)
