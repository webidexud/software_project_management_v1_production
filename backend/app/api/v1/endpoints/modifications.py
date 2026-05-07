"""
backend/app/api/v1/endpoints/modifications.py — v5.0
CAMBIO: Al crear o editar una adición (ADDITION o BOTH):
  - Se aceptan entity_contribution_addition y university_contribution_addition
  - Se calcula automáticamente calculated_benefit_value:
    ((aporte_entidad_original + Σ entity_contribution_addition activas) * 12%) / 112%
  - El valor se guarda en la modificación como historial (NO modifica el proyecto)
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.db.database import get_db
from app.models.catalogs import Project
from app.models.project_modification import (
    ProjectModification,
    ModificationSuspension,
    ModificationAssignment,
    ModificationClauseChange,
    ModificationLiquidation,
)
from app.schemas.projects import (
    ModificationCreate, SuspensionCreate, SuspensionRestartPatch,
    ClauseChangeCreate, AssignmentCreate, LiquidationCreate
)

router = APIRouter(tags=["Modificaciones"])

VALID_TYPES = {
    'ADDITION', 'EXTENSION', 'BOTH', 'CONTRACTUAL',
    'SUSPENSION', 'RESTART',
    'CESION_CESIONARIA', 'CESION_CEDENTE', 'LIQUIDATION'
}


def next_mod_number(db: Session, project_id: int) -> int:
    mx = db.query(func.max(ProjectModification.modification_number)) \
        .filter(ProjectModification.project_id == project_id).scalar()
    return (mx or 0) + 1


def calcular_beneficio(project: Project, db: Session, exclude_mod_id: int = None) -> int:
    """
    Calcula el beneficio institucional vigente acumulado:
    ((aporte_entidad_original + Σ entity_contribution_addition activas) * 12%) / 112%

    exclude_mod_id: excluir una modificación específica del cálculo (útil al editar)
    """
    aporte_entidad_original = float(project.entity_contribution or 0)

    q = db.query(func.sum(ProjectModification.entity_contribution_addition)).filter(
        ProjectModification.project_id == project.project_id,
        ProjectModification.modification_type.in_(['ADDITION', 'BOTH']),
        ProjectModification.is_active == True,
        ProjectModification.entity_contribution_addition != None,
    )
    if exclude_mod_id:
        q = q.filter(ProjectModification.modification_id != exclude_mod_id)

    suma_adiciones_entidad = float(q.scalar() or 0)

    total_entidad = aporte_entidad_original + suma_adiciones_entidad
    beneficio = (total_entidad * 0.12) / 1.12
    return round(beneficio)


def enrich_mod(m, db):
    return {
        "modification_id":                   m.modification_id,
        "project_id":                        m.project_id,
        "modification_number":               m.modification_number,
        "modification_type":                 m.modification_type,
        "addition_value":                    float(m.addition_value) if m.addition_value else None,
        "entity_contribution_addition":      float(m.entity_contribution_addition) if m.entity_contribution_addition else None,
        "university_contribution_addition":  float(m.university_contribution_addition) if m.university_contribution_addition else None,
        "calculated_benefit_value":          float(m.calculated_benefit_value) if m.calculated_benefit_value else None,
        "extension_days":                    m.extension_days,
        "new_end_date":                      str(m.new_end_date) if m.new_end_date else None,
        "new_total_value":                   float(m.new_total_value) if m.new_total_value else None,
        "justification":                     m.justification,
        "administrative_act":                m.administrative_act,
        "approval_date":                     str(m.approval_date) if m.approval_date else None,
        "extension_period_text":             m.extension_period_text,
        "requires_policy_update":            m.requires_policy_update,
        "policy_update_description":         m.policy_update_description,
        "payment_method_modification":       m.payment_method_modification,
        "ordering_official_id":              m.ordering_official_id,
        "is_active":                         m.is_active,
        "created_at":                        str(m.created_at) if m.created_at else None,
        "updated_at":                        str(m.updated_at) if m.updated_at else None,
    }


def enrich_mod_detail(m, db):
    base = enrich_mod(m, db)

    sus = db.query(ModificationSuspension).filter(
        ModificationSuspension.modification_id == m.modification_id
    ).first()
    if sus:
        base["suspension"] = {
            "suspension_id":            sus.suspension_id,
            "suspension_start_date":    str(sus.suspension_start_date),
            "suspension_end_date":      str(sus.suspension_end_date),
            "planned_restart_date":     str(sus.planned_restart_date),
            "actual_restart_date":      str(sus.actual_restart_date) if sus.actual_restart_date else None,
            "contractor_justification": sus.contractor_justification,
            "supervisor_justification": sus.supervisor_justification,
            "entity_supervisor_name":   sus.entity_supervisor_name,
            "entity_supervisor_id":     sus.entity_supervisor_id,
            "suspension_status":        sus.suspension_status,
            "restart_modification_id":  sus.restart_modification_id,
        }

    asgn = db.query(ModificationAssignment).filter(
        ModificationAssignment.modification_id == m.modification_id
    ).first()
    if asgn:
        base["assignment"] = {
            "assignment_id":               asgn.assignment_id,
            "assignor_name":               asgn.assignor_name,
            "assignor_id":                 asgn.assignor_id,
            "assignor_id_type":            asgn.assignor_id_type,
            "assignee_name":               asgn.assignee_name,
            "assignee_id":                 asgn.assignee_id,
            "assignee_id_type":            asgn.assignee_id_type,
            "assignment_date":             str(asgn.assignment_date),
            "assignment_signature_date":   str(asgn.assignment_signature_date) if asgn.assignment_signature_date else None,
            "value_to_assign":             float(asgn.value_to_assign) if asgn.value_to_assign else None,
            "value_paid_to_assignor":      float(asgn.value_paid_to_assignor) if asgn.value_paid_to_assignor else None,
            "value_pending_to_assignor":   float(asgn.value_pending_to_assignor) if asgn.value_pending_to_assignor else None,
            "cdp":                         asgn.cdp,
            "rp":                          asgn.rp,
            "guarantee_modification_request": asgn.guarantee_modification_request,
        }

    clause = db.query(ModificationClauseChange).filter(
        ModificationClauseChange.modification_id == m.modification_id
    ).first()
    if clause:
        base["clause"] = {
            "clause_change_id":            clause.clause_change_id,
            "modification_description":    clause.modification_description,
            "requires_resource_liberation": clause.requires_resource_liberation,
            "cdp_to_release":              clause.cdp_to_release,
            "rp_to_release":               clause.rp_to_release,
            "liberation_amount":           float(clause.liberation_amount) if clause.liberation_amount else None,
        }

    liq = db.query(ModificationLiquidation).filter(
        ModificationLiquidation.modification_id == m.modification_id
    ).first()
    if liq:
        base["liquidation"] = {
            "liquidation_id":                liq.liquidation_id,
            "liquidation_date":              str(liq.liquidation_date) if liq.liquidation_date else None,
            "execution_percentage":          float(liq.execution_percentage) if liq.execution_percentage else None,
            "supervisor_liquidation_request": liq.supervisor_liquidation_request,
            "entity_liquidation_request":    None,
            "observations":                  None,
        }

    if m.modification_type == 'RESTART':
        linked_sus = db.query(ModificationSuspension).filter(
            ModificationSuspension.restart_modification_id == m.modification_id
        ).first()
        if linked_sus:
            base["restarted_suspension"] = {
                "suspension_id":         linked_sus.suspension_id,
                "actual_restart_date":   str(linked_sus.actual_restart_date) if linked_sus.actual_restart_date else None,
                "suspension_start_date": str(linked_sus.suspension_start_date),
                "suspension_end_date":   str(linked_sus.suspension_end_date),
            }

    return base


# ─────────────────────────────────────────────────────────────────────
# LISTAR modificaciones de un proyecto
# ─────────────────────────────────────────────────────────────────────
@router.get("/projects/{project_id}/modifications/")
def list_modifications(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")
    mods = db.query(ProjectModification) \
        .filter(ProjectModification.project_id == project_id) \
        .order_by(ProjectModification.modification_number).all()
    return [enrich_mod_detail(m, db) for m in mods]


# ─────────────────────────────────────────────────────────────────────
# DETALLE de una modificación
# ─────────────────────────────────────────────────────────────────────
@router.get("/modifications/{mod_id}")
def get_modification(mod_id: int, db: Session = Depends(get_db)):
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    return enrich_mod_detail(m, db)


# ─────────────────────────────────────────────────────────────────────
# CREAR modificación
# ─────────────────────────────────────────────────────────────────────
@router.post("/projects/{project_id}/modifications/")
def create_modification(project_id: int, data: ModificationCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    if data.modification_type not in VALID_TYPES:
        raise HTTPException(400, f"Tipo inválido. Permitidos: {', '.join(sorted(VALID_TYPES))}")

    mod_num = next_mod_number(db, project_id)

    # ✅ Calcular beneficio acumulado si es adición
    benefit = None
    if data.modification_type in ('ADDITION', 'BOTH'):
        # Sumar aportes entidad de adiciones activas ya existentes
        suma_prev = float(db.query(func.sum(ProjectModification.entity_contribution_addition)).filter(
            ProjectModification.project_id == project_id,
            ProjectModification.modification_type.in_(['ADDITION', 'BOTH']),
            ProjectModification.is_active == True,
            ProjectModification.entity_contribution_addition != None,
        ).scalar() or 0)

        aporte_entidad_original = float(proj.entity_contribution or 0)
        nueva_adicion_entidad   = float(data.entity_contribution_addition or 0)
        total_entidad           = aporte_entidad_original + suma_prev + nueva_adicion_entidad
        benefit                 = round((total_entidad * 0.12) / 1.12)

    obj = ProjectModification(
        project_id=project_id,
        modification_number=mod_num,
        modification_type=data.modification_type,
        approval_date=data.approval_date,
        administrative_act=data.administrative_act,
        justification=data.justification,
        addition_value=data.addition_value,
        entity_contribution_addition=data.entity_contribution_addition,
        university_contribution_addition=data.university_contribution_addition,
        calculated_benefit_value=benefit,
        extension_days=data.extension_days,
        new_end_date=data.new_end_date,
        new_total_value=data.new_total_value,
        extension_period_text=data.extension_period_text,
        requires_policy_update=data.requires_policy_update,
        policy_update_description=data.policy_update_description,
        payment_method_modification=data.payment_method_modification,
        ordering_official_id=data.ordering_official_id,
        is_active=True,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return enrich_mod(obj, db)


# ─────────────────────────────────────────────────────────────────────
# EDITAR modificación + sub-registros
# ─────────────────────────────────────────────────────────────────────
@router.put("/modifications/{mod_id}")
def update_modification(mod_id: int, data: dict, db: Session = Depends(get_db)):
    from datetime import datetime as dt
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")

    BASE_FIELDS = [
        'administrative_act', 'approval_date', 'justification',
        'addition_value', 'entity_contribution_addition', 'university_contribution_addition',
        'new_end_date', 'extension_days', 'extension_period_text', 'new_total_value',
        'requires_policy_update', 'policy_update_description', 'payment_method_modification',
    ]
    for field in BASE_FIELDS:
        if field in data:
            val = data[field]
            if field in ('approval_date', 'new_end_date') and isinstance(val, str) and val:
                from datetime import date as dt_date
                val = dt_date.fromisoformat(val)
            setattr(m, field, val)

    # ✅ Recalcular beneficio si es adición
    if m.modification_type in ('ADDITION', 'BOTH'):
        proj = db.query(Project).filter(Project.project_id == m.project_id).first()
        if proj:
            suma_prev = float(db.query(func.sum(ProjectModification.entity_contribution_addition)).filter(
                ProjectModification.project_id == m.project_id,
                ProjectModification.modification_type.in_(['ADDITION', 'BOTH']),
                ProjectModification.is_active == True,
                ProjectModification.entity_contribution_addition != None,
                ProjectModification.modification_id != mod_id,  # excluir la actual
            ).scalar() or 0)

            aporte_entidad_original = float(proj.entity_contribution or 0)
            nueva_adicion_entidad   = float(m.entity_contribution_addition or 0)
            total_entidad           = aporte_entidad_original + suma_prev + nueva_adicion_entidad
            m.calculated_benefit_value = round((total_entidad * 0.12) / 1.12)

    m.updated_at = dt.utcnow()
    db.commit()
    db.refresh(m)

    # Sub-registros
    if 'suspension' in data and data['suspension']:
        sus = db.query(ModificationSuspension).filter(
            ModificationSuspension.modification_id == mod_id
        ).first()
        if sus:
            for k, v in data['suspension'].items():
                setattr(sus, k, v)
            db.commit()

    if 'clause' in data and data['clause']:
        cl = db.query(ModificationClauseChange).filter(
            ModificationClauseChange.modification_id == mod_id
        ).first()
        if cl:
            for k, v in data['clause'].items():
                setattr(cl, k, v)
            db.commit()

    if 'assignment' in data and data['assignment']:
        asgn = db.query(ModificationAssignment).filter(
            ModificationAssignment.modification_id == mod_id
        ).first()
        if asgn:
            for k, v in data['assignment'].items():
                setattr(asgn, k, v)
            db.commit()

    return enrich_mod_detail(m, db)


# ─────────────────────────────────────────────────────────────────────
# TOGGLE activo/inactivo
# ─────────────────────────────────────────────────────────────────────
@router.patch("/modifications/{mod_id}/toggle")
def toggle_modification(mod_id: int, db: Session = Depends(get_db)):
    from datetime import datetime as dt
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    m.is_active  = not m.is_active
    m.updated_at = dt.utcnow()
    db.commit()
    db.refresh(m)
    return enrich_mod(m, db)


# ─────────────────────────────────────────────────────────────────────
# SUB-REGISTROS: Suspensión, Reinicio, Cláusula, Cesión, Liquidación
# ─────────────────────────────────────────────────────────────────────
@router.post("/modifications/{mod_id}/suspension")
def add_suspension(mod_id: int, data: SuspensionCreate, db: Session = Depends(get_db)):
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    sus = ModificationSuspension(
        modification_id=mod_id,
        suspension_start_date=data.suspension_start_date,
        suspension_end_date=data.suspension_end_date,
        planned_restart_date=data.planned_restart_date,
        contractor_justification=data.contractor_justification,
        supervisor_justification=data.supervisor_justification,
        suspension_status='ACTIVE',
    )
    db.add(sus)
    db.commit()
    db.refresh(sus)
    return {"ok": True, "suspension_id": sus.suspension_id}


@router.patch("/modifications/suspensions/{sus_id}/restart")
def restart_suspension(sus_id: int, data: SuspensionRestartPatch, db: Session = Depends(get_db)):
    sus = db.query(ModificationSuspension).filter(ModificationSuspension.suspension_id == sus_id).first()
    if not sus:
        raise HTTPException(404, "Suspensión no encontrada")
    sus.actual_restart_date     = data.actual_restart_date
    sus.restart_modification_id = data.restart_modification_id
    sus.suspension_status       = 'RESTARTED'
    db.commit()
    return {"ok": True}


@router.post("/modifications/{mod_id}/clause")
def add_clause(mod_id: int, data: ClauseChangeCreate, db: Session = Depends(get_db)):
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    cl = ModificationClauseChange(
        modification_id=mod_id,
        clause_number=data.clause_number,
        clause_name=data.clause_name,
        new_clause_text=data.new_clause_text,
        modification_description=data.modification_description,
        requires_resource_liberation=data.requires_resource_liberation,
        cdp_to_release=data.cdp_to_release,
        rp_to_release=data.rp_to_release,
        liberation_amount=data.liberation_amount,
    )
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return {"ok": True, "clause_change_id": cl.clause_change_id}


@router.post("/modifications/{mod_id}/assignment")
def add_assignment(mod_id: int, data: AssignmentCreate, db: Session = Depends(get_db)):
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    asgn = ModificationAssignment(
        modification_id=mod_id,
        assignment_type=data.assignment_type,
        assignor_name=data.assignor_name,
        assignor_id=data.assignor_id,
        assignor_id_type=data.assignor_id_type,
        assignee_name=data.assignee_name,
        assignee_id=data.assignee_id,
        assignee_id_type=data.assignee_id_type,
        assignment_date=data.assignment_date,
        assignment_signature_date=data.assignment_signature_date,
        value_to_assign=data.value_to_assign,
        value_paid_to_assignor=data.value_paid_to_assignor,
        value_pending_to_assignor=data.value_pending_to_assignor,
        cdp=data.cdp,
        rp=data.rp,
        guarantee_modification_request=data.guarantee_modification_request,
    )
    db.add(asgn)
    db.commit()
    db.refresh(asgn)
    return {"ok": True, "assignment_id": asgn.assignment_id}


@router.post("/modifications/{mod_id}/liquidation")
def add_liquidation(mod_id: int, data: LiquidationCreate, db: Session = Depends(get_db)):
    m = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not m:
        raise HTTPException(404, "Modificación no encontrada")
    liq = ModificationLiquidation(
        modification_id=mod_id,
        liquidation_type=data.liquidation_type,
        execution_percentage=data.execution_percentage,
        executed_value=data.executed_value,
        pending_payment_value=data.pending_payment_value,
        value_to_release=data.value_to_release,
        cdp=data.cdp,
        cdp_value=data.cdp_value,
        rp=data.rp,
        rp_value=data.rp_value,
        initial_contract_value=data.initial_contract_value,
        final_value_with_additions=data.final_value_with_additions,
        resolution_number=data.resolution_number,
        resolution_date=data.resolution_date,
        unilateral_cause=data.unilateral_cause,
        cause_analysis=data.cause_analysis,
        liquidation_date=data.liquidation_date,
        liquidation_signature_date=data.liquidation_signature_date,
        supervisor_liquidation_request=data.supervisor_liquidation_request,
        suspensions_summary=json.dumps(data.suspensions_summary) if data.suspensions_summary else None,
        extensions_summary=json.dumps(data.extensions_summary) if data.extensions_summary else None,
        additions_summary=json.dumps(data.additions_summary) if data.additions_summary else None,
    )
    db.add(liq)
    db.commit()
    db.refresh(liq)
    return {"ok": True, "liquidation_id": liq.liquidation_id}


# ─────────────────────────────────────────────────────────────────────
# SUSPENSIONES activas de un proyecto
# ─────────────────────────────────────────────────────────────────────
@router.get("/projects/{project_id}/suspensions/")
def list_suspensions(project_id: int, db: Session = Depends(get_db)):
    mods = db.query(ProjectModification).filter(
        ProjectModification.project_id == project_id,
        ProjectModification.modification_type == 'SUSPENSION',
        ProjectModification.is_active == True,
    ).all()
    result = []
    for mod in mods:
        sus = db.query(ModificationSuspension).filter(
            ModificationSuspension.modification_id == mod.modification_id
        ).first()
        if sus:
            result.append({
                "suspension_id":         sus.suspension_id,
                "modification_id":       mod.modification_id,
                "modification_number":   mod.modification_number,
                "suspension_start_date": str(sus.suspension_start_date),
                "suspension_end_date":   str(sus.suspension_end_date),
                "planned_restart_date":  str(sus.planned_restart_date),
                "actual_restart_date":   str(sus.actual_restart_date) if sus.actual_restart_date else None,
                "suspension_status":     sus.suspension_status,
            })
    return result
