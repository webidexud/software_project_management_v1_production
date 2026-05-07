"""Endpoints CRUD para correos secundarios de proyectos."""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import Project, ProjectSecondaryEmail
from app.schemas.projects import SecondaryEmailCreate, SecondaryEmailUpdate, SecondaryEmailOut

router = APIRouter(prefix="/projects/{project_id}/emails", tags=["Correos de Proyecto"])

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

def get_project_or_404(project_id: int, db: Session):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    return p

@router.get("/", response_model=List[SecondaryEmailOut])
def list_emails(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    return db.query(ProjectSecondaryEmail)\
        .filter(ProjectSecondaryEmail.project_id == project_id)\
        .order_by(ProjectSecondaryEmail.secondary_email_id).all()

@router.post("/", response_model=SecondaryEmailOut, status_code=201)
def create_email(project_id: int, data: SecondaryEmailCreate, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    if not EMAIL_RE.match(data.email):
        raise HTTPException(400, "Formato de correo inválido")
    obj = ProjectSecondaryEmail(project_id=project_id, **data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{email_id}", response_model=SecondaryEmailOut)
def update_email(project_id: int, email_id: int, data: SecondaryEmailUpdate, db: Session = Depends(get_db)):
    obj = db.query(ProjectSecondaryEmail)\
        .filter(ProjectSecondaryEmail.secondary_email_id == email_id,
                ProjectSecondaryEmail.project_id == project_id).first()
    if not obj:
        raise HTTPException(404, "Correo no encontrado")
    if data.email and not EMAIL_RE.match(data.email):
        raise HTTPException(400, "Formato de correo inválido")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{email_id}", status_code=204)
def delete_email(project_id: int, email_id: int, db: Session = Depends(get_db)):
    obj = db.query(ProjectSecondaryEmail)\
        .filter(ProjectSecondaryEmail.secondary_email_id == email_id,
                ProjectSecondaryEmail.project_id == project_id).first()
    if not obj:
        raise HTTPException(404, "Correo no encontrado")
    db.delete(obj)
    db.commit()
