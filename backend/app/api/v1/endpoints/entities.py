from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.catalogs import Entity, EntityType
from app.schemas.catalogs import EntityOut, EntityCreate, EntityUpdate

router = APIRouter(prefix="/entities", tags=["Entidades"])

def enrich(r, types):
    item = EntityOut.model_validate(r)
    item.entity_type_name = types.get(r.entity_type_id)
    return item

def get_types(db): return {t.entity_type_id: t.type_name for t in db.query(EntityType).all()}

@router.get("/", response_model=List[EntityOut])
def list(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Entity)
    if active_only: q = q.filter(Entity.is_active == True)
    types = get_types(db)
    return [enrich(r, types) for r in q.order_by(Entity.entity_name).all()]

@router.post("/", response_model=EntityOut, status_code=201)
def create(data: EntityCreate, db: Session = Depends(get_db)):
    if db.query(Entity).filter(Entity.tax_id == data.tax_id).first():
        raise HTTPException(400, "Ya existe una entidad con ese NIT/Tax ID")
    obj = Entity(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return enrich(obj, get_types(db))

@router.put("/{id}", response_model=EntityOut)
def update(id: int, data: EntityUpdate, db: Session = Depends(get_db)):
    obj = db.query(Entity).filter(Entity.entity_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return enrich(obj, get_types(db))

@router.patch("/{id}/toggle", response_model=EntityOut)
def toggle(id: int, db: Session = Depends(get_db)):
    obj = db.query(Entity).filter(Entity.entity_id == id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.is_active = not obj.is_active
    db.commit(); db.refresh(obj)
    return enrich(obj, get_types(db))
