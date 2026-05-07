from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import FinancingType
from app.schemas.catalogs import FinancingTypeOut, FinancingTypeCreate, FinancingTypeUpdate

router = APIRouter(prefix="/financing-types", tags=["Financiaciones"])

@router.get("/", response_model=List[FinancingTypeOut])
def list(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(FinancingType)
    if active_only: q = q.filter(FinancingType.is_active == True)
    return q.order_by(FinancingType.financing_name).all()

@router.post("/", response_model=FinancingTypeOut, status_code=201)
def create(data: FinancingTypeCreate, db: Session = Depends(get_db)):
    if db.query(FinancingType).filter(FinancingType.financing_name == data.financing_name).first():
        raise HTTPException(400, "Ya existe un tipo de financiación con ese nombre")
    obj = FinancingType(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=FinancingTypeOut)
def update(id: int, data: FinancingTypeUpdate, db: Session = Depends(get_db)):
    obj = db.query(FinancingType).filter(FinancingType.financing_type_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{id}/toggle", response_model=FinancingTypeOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(FinancingType).filter(FinancingType.financing_type_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return obj
