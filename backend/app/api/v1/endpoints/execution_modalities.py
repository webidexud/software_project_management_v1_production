from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import ExecutionModality
from app.schemas.catalogs import ExecutionModalityOut, ExecutionModalityCreate, ExecutionModalityUpdate

router = APIRouter(prefix="/execution-modalities", tags=["Modalidades"])

@router.get("/", response_model=List[ExecutionModalityOut])
def list(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(ExecutionModality)
    if active_only: q = q.filter(ExecutionModality.is_active == True)
    return q.order_by(ExecutionModality.modality_name).all()

@router.post("/", response_model=ExecutionModalityOut, status_code=201)
def create(data: ExecutionModalityCreate, db: Session = Depends(get_db)):
    if db.query(ExecutionModality).filter(ExecutionModality.modality_name == data.modality_name).first():
        raise HTTPException(400, "Ya existe una modalidad con ese nombre")
    obj = ExecutionModality(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=ExecutionModalityOut)
def update(id: int, data: ExecutionModalityUpdate, db: Session = Depends(get_db)):
    obj = db.query(ExecutionModality).filter(ExecutionModality.execution_modality_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{id}/toggle", response_model=ExecutionModalityOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(ExecutionModality).filter(ExecutionModality.execution_modality_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return obj
