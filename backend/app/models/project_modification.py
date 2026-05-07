# backend/app/models/project_modification.py — v4.0
# CAMBIO: Agregadas 3 columnas para desglose de adiciones y beneficio calculado:
#   - entity_contribution_addition
#   - university_contribution_addition
#   - calculated_benefit_value
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, Numeric, SmallInteger, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class ProjectModification(Base):
    __tablename__ = "project_modifications"
    __table_args__ = {"extend_existing": True}

    modification_id                  = Column(Integer, primary_key=True)
    project_id                       = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    modification_number              = Column(SmallInteger, nullable=False)
    modification_type                = Column(String(20), nullable=False)

    # ── Adición presupuestal ─────────────────────────────────────────
    addition_value                   = Column(Numeric(15, 0))   # valor TOTAL de la adición
    entity_contribution_addition     = Column(Numeric(15, 0))   # parte que aporta la entidad
    university_contribution_addition = Column(Numeric(15, 0))   # parte que aporta la universidad
    # Beneficio institucional acumulado al momento de esta adición:
    # ((aporte_entidad_original + Σ entity_contribution_addition activas) * 12%) / 112%
    calculated_benefit_value         = Column(Numeric(15, 0))

    new_total_value                  = Column(Numeric(15, 0))

    # ── Prórroga ─────────────────────────────────────────────────────
    extension_days                   = Column(Integer)
    new_end_date                     = Column(Date)
    extension_period_text            = Column(String(200))

    # ── Datos generales ──────────────────────────────────────────────
    justification                    = Column(Text)
    administrative_act               = Column(String(50))
    approval_date                    = Column(Date)

    # ── Póliza y pago ────────────────────────────────────────────────
    requires_policy_update           = Column(Boolean, default=False)
    policy_update_description        = Column(Text)
    payment_method_modification      = Column(Text)

    # ── CDP / RP ─────────────────────────────────────────────────────
    cdp                              = Column(String(100))
    cdp_value                        = Column(Numeric(15, 2))
    rp                               = Column(String(100))
    rp_value                         = Column(Numeric(15, 2))

    # ── Control ──────────────────────────────────────────────────────
    ordering_official_id             = Column(Integer, ForeignKey("ordering_officials.official_id"))
    created_by_user_id               = Column(Integer)
    created_at                       = Column(DateTime, server_default=func.now())
    updated_at                       = Column(DateTime)
    updated_by_user_id               = Column(Integer)
    is_active                        = Column(Boolean, default=True)


class ModificationSuspension(Base):
    __tablename__ = "modification_suspensions"
    __table_args__ = {"extend_existing": True}

    suspension_id             = Column(Integer, primary_key=True)
    modification_id           = Column(Integer, ForeignKey("project_modifications.modification_id"), nullable=False)
    suspension_start_date     = Column(Date, nullable=False)
    suspension_end_date       = Column(Date, nullable=False)
    planned_restart_date      = Column(Date, nullable=False)
    actual_restart_date       = Column(Date)
    contractor_justification  = Column(Text, nullable=False)
    supervisor_justification  = Column(Text, nullable=False)
    entity_supervisor_name    = Column(String(200))
    entity_supervisor_id      = Column(String(50))
    suspension_status         = Column(String(20), default='ACTIVE')
    restart_modification_id   = Column(Integer, ForeignKey("project_modifications.modification_id"))
    created_at                = Column(DateTime, server_default=func.now())
    created_by_user_id        = Column(Integer)
    is_active                 = Column(Boolean, default=True)


class ModificationAssignment(Base):
    __tablename__ = "modification_assignments"
    __table_args__ = {"extend_existing": True}

    assignment_id                  = Column(Integer, primary_key=True)
    modification_id                = Column(Integer, ForeignKey("project_modifications.modification_id"), nullable=False)
    assignment_type                = Column(String(30), nullable=False)
    assignor_name                  = Column(String(200), nullable=False)
    assignor_id                    = Column(String(50), nullable=False)
    assignor_id_type               = Column(String(10))
    assignee_name                  = Column(String(200), nullable=False)
    assignee_id                    = Column(String(50), nullable=False)
    assignee_id_type               = Column(String(10))
    supervisor_name                = Column(String(200))
    supervisor_id                  = Column(String(50))
    assignment_date                = Column(Date, nullable=False)
    assignment_signature_date      = Column(Date)
    value_paid_to_assignor         = Column(Numeric(15, 2))
    value_pending_to_assignor      = Column(Numeric(15, 2))
    value_to_assign                = Column(Numeric(15, 2), nullable=False)
    handover_report_path           = Column(String(300))
    technical_report_path          = Column(String(300))
    account_statement_path         = Column(String(300))
    cdp                            = Column(String(100))
    rp                             = Column(String(100))
    guarantee_modification_request = Column(Text)
    related_derived_project_id     = Column(Integer, ForeignKey("projects.project_id"))
    created_at                     = Column(DateTime, server_default=func.now())
    created_by_user_id             = Column(Integer)
    is_active                      = Column(Boolean, default=True)


class ModificationClauseChange(Base):
    __tablename__ = "modification_clause_changes"
    __table_args__ = {"extend_existing": True}

    clause_change_id             = Column(Integer, primary_key=True)
    modification_id              = Column(Integer, ForeignKey("project_modifications.modification_id"), nullable=False)
    clause_number                = Column(String(20), nullable=False)
    clause_name                  = Column(String(200), nullable=False)
    original_clause_text         = Column(Text)
    new_clause_text              = Column(Text, nullable=False)
    modification_description     = Column(Text)
    requires_resource_liberation = Column(Boolean, default=False)
    cdp_to_release               = Column(String(100))
    rp_to_release                = Column(String(100))
    liberation_amount            = Column(Numeric(15, 2))
    created_at                   = Column(DateTime, server_default=func.now())
    created_by_user_id           = Column(Integer)
    is_active                    = Column(Boolean, default=True)


class ModificationLiquidation(Base):
    __tablename__ = "modification_liquidations"
    __table_args__ = {"extend_existing": True}

    liquidation_id                 = Column(Integer, primary_key=True)
    modification_id                = Column(Integer, ForeignKey("project_modifications.modification_id"), nullable=False)
    liquidation_type               = Column(String(20), nullable=False)
    resolution_number              = Column(String(50))
    resolution_date                = Column(Date)
    unilateral_cause               = Column(Text)
    cause_analysis                 = Column(Text)
    initial_contract_value         = Column(Numeric(15, 2), nullable=False)
    final_value_with_additions     = Column(Numeric(15, 2), nullable=False)
    execution_percentage           = Column(Numeric(5, 2), nullable=False)
    executed_value                 = Column(Numeric(15, 2), nullable=False)
    pending_payment_value          = Column(Numeric(15, 2))
    value_to_release               = Column(Numeric(15, 2))
    cdp                            = Column(String(100))
    cdp_value                      = Column(Numeric(15, 2))
    rp                             = Column(String(100))
    rp_value                       = Column(Numeric(15, 2))
    suspensions_summary            = Column(Text)
    extensions_summary             = Column(Text)
    additions_summary              = Column(Text)
    liquidation_date               = Column(Date, nullable=False)
    liquidation_signature_date     = Column(Date)
    supervisor_liquidation_request = Column(Text, nullable=False)
    created_at                     = Column(DateTime, server_default=func.now())
    created_by_user_id             = Column(Integer)
    is_active                      = Column(Boolean, default=True)
