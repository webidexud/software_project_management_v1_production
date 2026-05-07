from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import OrderingOfficial
from app.schemas.catalogs import OrderingOfficialOut, OrderingOfficialCreate, OrderingOfficialUpdate

router = APIRouter(prefix="/ordering-officials", tags=["Funcionarios"])

def fn(o): return " ".join(p for p in [o.first_name, o.second_name, o.first_surname, o.second_surname] if p)
def enrich(r):
    item = OrderingOfficialOut.model_validate(r); item.full_name = fn(r); return item

@router.get("/", response_model=List[OrderingOfficialOut])
def list(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(OrderingOfficial)
    if active_only: q = q.filter(OrderingOfficial.is_active == True)
    return [enrich(r) for r in q.order_by(OrderingOfficial.first_surname).all()]

@router.post("/", response_model=OrderingOfficialOut, status_code=201)
def create(data: OrderingOfficialCreate, db: Session = Depends(get_db)):
    if db.query(OrderingOfficial).filter(
        OrderingOfficial.identification_type == data.identification_type,
        OrderingOfficial.identification_number == data.identification_number
    ).first():
        raise HTTPException(400, "Ya existe un funcionario con ese número de identificación")
    obj = OrderingOfficial(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return enrich(obj)

@router.put("/{id}", response_model=OrderingOfficialOut)
def update(id: int, data: OrderingOfficialUpdate, db: Session = Depends(get_db)):
    obj = db.query(OrderingOfficial).filter(OrderingOfficial.official_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return enrich(obj)

@router.patch("/{id}/toggle", response_model=OrderingOfficialOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(OrderingOfficial).filter(OrderingOfficial.official_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return enrich(obj)
