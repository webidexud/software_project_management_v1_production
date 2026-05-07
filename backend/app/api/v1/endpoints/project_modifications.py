"""
Endpoints para modificaciones de proyectos.

Rutas:
  GET    /projects/{project_id}/modifications/       → listar
  POST   /projects/{project_id}/modifications/       → crear
  GET    /modifications/{mod_id}                     → detalle
  PUT    /modifications/{mod_id}                     → editar
  PATCH  /modifications/{mod_id}/toggle              → activar/desactivar
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.models.catalogs import Project          # modelo Project existente
# Importar el modelo de modificación:
from app.models.project_modification import ProjectModification
from app.schemas.modifications import ModificationCreate, ModificationUpdate, ModificationOut, VALID_TYPES

# ── Router para rutas bajo /projects/{project_id}/modifications ──
router_project = APIRouter(prefix="/projects/{project_id}/modifications", tags=["Modificaciones"])

# ── Router para rutas bajo /modifications ──
router_mod = APIRouter(prefix="/modifications", tags=["Modificaciones"])


def get_project_or_404(project_id: int, db: Session) -> Project:
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    return p


def next_mod_number(db: Session, project_id: int) -> int:
    """Calcula el siguiente número de modificación para el proyecto."""
    max_num = db.query(func.max(ProjectModification.modification_number))\
        .filter(ProjectModification.project_id == project_id).scalar()
    return (max_num or 0) + 1


# ── GET /projects/{project_id}/modifications/ ────────────────────────
@router_project.get("/", response_model=List[ModificationOut])
def list_modifications(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    return (
        db.query(ProjectModification)
        .filter(ProjectModification.project_id == project_id)
        .order_by(ProjectModification.modification_number)
        .all()
    )


# ── POST /projects/{project_id}/modifications/ ───────────────────────
@router_project.post("/", response_model=ModificationOut, status_code=201)
def create_modification(project_id: int, data: ModificationCreate, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)

    if data.modification_type not in VALID_TYPES:
        raise HTTPException(400, f"Tipo de modificación inválido. Valores permitidos: {', '.join(sorted(VALID_TYPES))}")

    # Validaciones de campos obligatorios según tipo
    if data.modification_type in ('ADDITION', 'BOTH') and data.addition_value is None:
        raise HTTPException(400, "addition_value es obligatorio para tipos ADDITION y BOTH")
    if data.modification_type in ('EXTENSION', 'BOTH') and data.extension_days is None:
        raise HTTPException(400, "extension_days es obligatorio para tipos EXTENSION y BOTH")

    mod_num = next_mod_number(db, project_id)
    obj = ProjectModification(
        **data.model_dump(),
        project_id=project_id,
        modification_number=mod_num,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── GET /modifications/{mod_id} ──────────────────────────────────────
@router_mod.get("/{mod_id}", response_model=ModificationOut)
def get_modification(mod_id: int, db: Session = Depends(get_db)):
    obj = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not obj:
        raise HTTPException(404, "Modificación no encontrada")
    return obj


# ── PUT /modifications/{mod_id} ──────────────────────────────────────
@router_mod.put("/{mod_id}", response_model=ModificationOut)
def update_modification(mod_id: int, data: ModificationUpdate, db: Session = Depends(get_db)):
    obj = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not obj:
        raise HTTPException(404, "Modificación no encontrada")

    update_data = data.model_dump(exclude_unset=True)

    if 'modification_type' in update_data and update_data['modification_type'] not in VALID_TYPES:
        raise HTTPException(400, f"Tipo inválido. Permitidos: {', '.join(sorted(VALID_TYPES))}")

    for k, v in update_data.items():
        setattr(obj, k, v)

    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── PATCH /modifications/{mod_id}/toggle ─────────────────────────────
@router_mod.patch("/{mod_id}/toggle", response_model=ModificationOut)
def toggle_modification(mod_id: int, db: Session = Depends(get_db)):
    obj = db.query(ProjectModification).filter(ProjectModification.modification_id == mod_id).first()
    if not obj:
        raise HTTPException(404, "Modificación no encontrada")
    obj.is_active = not obj.is_active
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj
