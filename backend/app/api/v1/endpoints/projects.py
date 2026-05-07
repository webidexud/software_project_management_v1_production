# backend/app/api/v1/endpoints/projects.py — v4.0
# CAMBIO: Eliminada la lógica de internal_project_number.
#         - Removida función next_internal_number()
#         - Removido endpoint GET /next-number/{year}
#         - create_project ya no asigna internal_project_number
#         - update_project ya no hace pop('internal_project_number')
#         - list_projects ordena por project_id desc (en lugar de internal_project_number)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.database import get_db
from app.models.catalogs import (
    Project, ProjectType, Entity, ExecutingDepartment,
    ProjectStatus, FinancingType, ExecutionModality, OrderingOfficial
)
from app.schemas.projects import ProjectOut, ProjectCreate, ProjectUpdate, ProjectTypeOut

router = APIRouter(prefix="/projects", tags=["Proyectos"])


def enrich(p, ctx):
    item = ProjectOut.model_validate(p)
    item.entity_name     = ctx['entities'].get(p.entity_id)
    item.department_name = ctx['departments'].get(p.executing_department_id)
    item.status_name     = ctx['statuses'].get(p.project_status_id, {}).get('name')
    item.status_color    = ctx['statuses'].get(p.project_status_id, {}).get('color')
    item.type_name       = ctx['types'].get(p.project_type_id)
    item.financing_name  = ctx['financing'].get(p.financing_type_id)
    item.modality_name   = ctx['modalities'].get(p.execution_modality_id)
    item.official_name   = ctx['officials'].get(p.ordering_official_id)
    return item


def get_ctx(db):
    return {
        'entities':    {e.entity_id: e.entity_name for e in db.query(Entity).all()},
        'departments': {d.department_id: d.department_name for d in db.query(ExecutingDepartment).all()},
        'statuses':    {s.status_id: {'name': s.status_name, 'color': s.status_color} for s in db.query(ProjectStatus).all()},
        'types':       {t.project_type_id: t.type_name for t in db.query(ProjectType).all()},
        'financing':   {f.financing_type_id: f.financing_name for f in db.query(FinancingType).all()},
        'modalities':  {m.execution_modality_id: m.modality_name for m in db.query(ExecutionModality).all()},
        'officials':   {o.official_id: f"{o.first_name} {o.first_surname}" for o in db.query(OrderingOfficial).all()},
    }


@router.get("/", response_model=List[ProjectOut])
def list_projects(
    year: Optional[int] = None,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    q = db.query(Project)
    if active_only: q = q.filter(Project.is_active == True)
    if year:        q = q.filter(Project.project_year == year)
    # Ordenar por año desc, luego project_id desc (orden natural de creación)
    rows = q.order_by(Project.project_year.desc(), Project.project_id.desc()).all()
    ctx = get_ctx(db)
    return [enrich(p, ctx) for p in rows]


@router.get("/{id}", response_model=ProjectOut)
def get_project(id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == id).first()
    if not p: raise HTTPException(404, "Proyecto no encontrado")
    return enrich(p, get_ctx(db))


@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    obj = Project(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return enrich(obj, get_ctx(db))


@router.put("/{id}", response_model=ProjectOut)
def update_project(id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    from sqlalchemy.exc import DataError, IntegrityError
    obj = db.query(Project).filter(Project.project_id == id).first()
    if not obj: raise HTTPException(404, "Proyecto no encontrado")
    # Nunca permitir cambiar la clave de BD ni el año
    safe_data = data.model_dump(exclude_unset=True)
    safe_data.pop('project_year', None)
    for k, v in safe_data.items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except DataError as e:
        db.rollback()
        detail = str(e.orig) if hasattr(e, 'orig') else str(e)
        if 'numeric field overflow' in detail:
            raise HTTPException(400, "Error de rango numérico: verifique que el porcentaje de beneficio sea menor a 1000 y los valores monetarios sean correctos")
        raise HTTPException(400, f"Error en los datos: {detail[:200]}")
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(400, "Error de integridad: verifique las fechas y valores del proyecto")
    return enrich(obj, get_ctx(db))


@router.patch("/{id}/toggle", response_model=ProjectOut)
def toggle_project(id: int, db: Session = Depends(get_db)):
    obj = db.query(Project).filter(Project.project_id == id).first()
    if not obj: raise HTTPException(404, "Proyecto no encontrado")
    obj.is_active = not obj.is_active
    db.commit()
    db.refresh(obj)
    return enrich(obj, get_ctx(db))


@router.get("/types/all", response_model=List[ProjectTypeOut])
def list_project_types(db: Session = Depends(get_db)):
    return db.query(ProjectType).filter(ProjectType.is_active == True).order_by(ProjectType.type_name).all()


@router.get("/{id}/additions")
def get_project_additions(id: int, db: Session = Depends(get_db)):
    """Suma de addition_value de modificaciones tipo ADDITION o BOTH activas del proyecto."""
    from app.models.project_modification import ProjectModification
    total = db.query(func.sum(ProjectModification.addition_value)).filter(
        ProjectModification.project_id == id,
        ProjectModification.modification_type.in_(['ADDITION', 'BOTH']),
        ProjectModification.is_active == True,
    ).scalar()
    return {"project_id": id, "total_additions": float(total or 0)}
