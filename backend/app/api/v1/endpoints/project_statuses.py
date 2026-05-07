from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import re
from app.db.database import get_db
from app.models.catalogs import ProjectStatus
from app.schemas.catalogs import ProjectStatusOut, ProjectStatusCreate, ProjectStatusUpdate

router = APIRouter(prefix="/project-statuses", tags=["Estados"])

HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

@router.get("/", response_model=List[ProjectStatusOut])
def list_all(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(ProjectStatus)
    if active_only: q = q.filter(ProjectStatus.is_active == True)
    return q.order_by(ProjectStatus.status_order).all()

@router.post("/", response_model=ProjectStatusOut, status_code=201)
def create(data: ProjectStatusCreate, db: Session = Depends(get_db)):
    if not HEX_RE.match(data.status_color or ''):
        raise HTTPException(400, "El color debe ser un código hexadecimal válido de 6 dígitos (ej: #0EA5E9)")
    if len(data.status_code) > 10:
        raise HTTPException(400, "El código del estado no puede superar 10 caracteres")
    obj = ProjectStatus(**data.model_dump())
    db.add(obj)
    try:
        db.commit(); db.refresh(obj)
        return obj
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Ya existe un estado con ese código o nombre")

@router.put("/{id}", response_model=ProjectStatusOut)
def update(id: int, data: ProjectStatusUpdate, db: Session = Depends(get_db)):
    obj = db.query(ProjectStatus).filter(ProjectStatus.status_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    if data.status_color and not HEX_RE.match(data.status_color):
        raise HTTPException(400, "Color inválido, debe ser hexadecimal #RRGGBB")
    if data.status_code and len(data.status_code) > 10:
        raise HTTPException(400, "El código no puede superar 10 caracteres")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit(); db.refresh(obj)
        return obj
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Ya existe un estado con ese código o nombre")

@router.patch("/{id}/toggle", response_model=ProjectStatusOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(ProjectStatus).filter(ProjectStatus.status_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return obj
