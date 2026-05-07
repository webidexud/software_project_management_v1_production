from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import ExecutingDepartment
from app.schemas.catalogs import ExecutingDepartmentOut, ExecutingDepartmentCreate, ExecutingDepartmentUpdate

router = APIRouter(prefix="/executing-departments", tags=["Dependencias"])

@router.get("/", response_model=List[ExecutingDepartmentOut])
def list(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(ExecutingDepartment)
    if active_only: q = q.filter(ExecutingDepartment.is_active == True)
    return q.order_by(ExecutingDepartment.department_name).all()

@router.post("/", response_model=ExecutingDepartmentOut, status_code=201)
def create(data: ExecutingDepartmentCreate, db: Session = Depends(get_db)):
    if db.query(ExecutingDepartment).filter(ExecutingDepartment.department_name == data.department_name).first():
        raise HTTPException(400, "Ya existe una dependencia con ese nombre")
    obj = ExecutingDepartment(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=ExecutingDepartmentOut)
def update(id: int, data: ExecutingDepartmentUpdate, db: Session = Depends(get_db)):
    obj = db.query(ExecutingDepartment).filter(ExecutingDepartment.department_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{id}/toggle", response_model=ExecutingDepartmentOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(ExecutingDepartment).filter(ExecutingDepartment.department_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return obj
