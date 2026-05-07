# backend/app/api/v1/endpoints/document_types.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.models.project_document import ProjectDocumentType

router = APIRouter(prefix="/document-types", tags=["Tipos de Documento"])


# ── Schemas ───────────────────────────────────────────────────────────
class DocumentTypeCreate(BaseModel):
    type_code:        str
    type_name:        str
    type_description: Optional[str] = None


class DocumentTypeUpdate(BaseModel):
    type_name:        Optional[str] = None
    type_description: Optional[str] = None


def to_dict(dt: ProjectDocumentType) -> dict:
    return {
        "document_type_id": dt.document_type_id,
        "type_code":        dt.type_code,
        "type_name":        dt.type_name,
        "type_description": dt.type_description,
        "is_active":        dt.is_active,
    }


# ── GET /document-types/ ─────────────────────────────────────────────
@router.get("/")
def list_document_types(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(ProjectDocumentType)
    if active_only:
        q = q.filter(ProjectDocumentType.is_active == True)
    return [to_dict(dt) for dt in q.order_by(ProjectDocumentType.type_name).all()]


# ── POST /document-types/ ────────────────────────────────────────────
@router.post("/", status_code=201)
def create_document_type(data: DocumentTypeCreate, db: Session = Depends(get_db)):
    code = data.type_code.upper().strip()
    if len(code) > 10:
        raise HTTPException(400, "El código no puede superar 10 caracteres")
    # Verificar unicidad de código y nombre
    if db.query(ProjectDocumentType).filter(ProjectDocumentType.type_code == code).first():
        raise HTTPException(400, f"Ya existe un tipo con el código '{code}'")
    if db.query(ProjectDocumentType).filter(ProjectDocumentType.type_name == data.type_name.upper().strip()).first():
        raise HTTPException(400, f"Ya existe un tipo con el nombre '{data.type_name}'")
    dt = ProjectDocumentType(
        type_code=code,
        type_name=data.type_name.upper().strip(),
        type_description=data.type_description,
        is_active=True,
    )
    db.add(dt)
    db.commit()
    db.refresh(dt)
    return to_dict(dt)


# ── PUT /document-types/{id} ─────────────────────────────────────────
@router.put("/{document_type_id}")
def update_document_type(document_type_id: int, data: DocumentTypeUpdate, db: Session = Depends(get_db)):
    dt = db.query(ProjectDocumentType).filter(
        ProjectDocumentType.document_type_id == document_type_id
    ).first()
    if not dt:
        raise HTTPException(404, "Tipo de documento no encontrado")
    if data.type_name is not None:
        new_name = data.type_name.upper().strip()
        # Verificar unicidad del nombre (excluyendo el mismo registro)
        existing = db.query(ProjectDocumentType).filter(
            ProjectDocumentType.type_name == new_name,
            ProjectDocumentType.document_type_id != document_type_id,
        ).first()
        if existing:
            raise HTTPException(400, f"Ya existe un tipo con el nombre '{new_name}'")
        dt.type_name = new_name
    if data.type_description is not None:
        dt.type_description = data.type_description
    db.commit()
    db.refresh(dt)
    return to_dict(dt)


# ── PATCH /document-types/{id}/toggle ────────────────────────────────
@router.patch("/{document_type_id}/toggle")
def toggle_document_type(document_type_id: int, db: Session = Depends(get_db)):
    dt = db.query(ProjectDocumentType).filter(
        ProjectDocumentType.document_type_id == document_type_id
    ).first()
    if not dt:
        raise HTTPException(404, "Tipo de documento no encontrado")
    dt.is_active = not dt.is_active
    db.commit()
    db.refresh(dt)
    return to_dict(dt)
