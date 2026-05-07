# backend/app/api/v1/endpoints/rup.py — v3.0
# CAMBIO: Agregado endpoint GET /rup/products?class_code=XXXXXX
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.catalogs import RupCode, ProjectRupCode
from app.schemas.projects import RupCodeOut, ProjectRupCodeOut, ProjectRupBulk, RupSegment, RupFamily, RupClass

router = APIRouter(prefix="/rup", tags=["RUP"])


@router.get("/search", response_model=List[RupCodeOut])
def search_rup(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    pattern = f"%{q}%"
    rows = db.query(RupCode).filter(
        RupCode.is_active == True,
        (RupCode.rup_code.ilike(pattern) | RupCode.code_description.ilike(pattern))
    ).limit(30).all()
    return rows


@router.get("/segments", response_model=List[RupSegment])
def list_segments(db: Session = Depends(get_db)):
    rows = db.query(RupCode.segment_code, RupCode.segment_name)\
        .filter(RupCode.is_active == True, RupCode.segment_code != None)\
        .distinct().order_by(RupCode.segment_name).all()
    return [{"segment_code": r.segment_code, "segment_name": r.segment_name} for r in rows]


@router.get("/families", response_model=List[RupFamily])
def list_families(segment_code: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(RupCode.family_code, RupCode.family_name)\
        .filter(RupCode.is_active == True, RupCode.family_code != None)
    if segment_code:
        q = q.filter(RupCode.segment_code == segment_code)
    rows = q.distinct().order_by(RupCode.family_name).all()
    return [{"family_code": r.family_code, "family_name": r.family_name} for r in rows]


@router.get("/classes", response_model=List[RupClass])
def list_classes(family_code: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(RupCode.class_code, RupCode.class_name)\
        .filter(RupCode.is_active == True, RupCode.class_code != None)
    if family_code:
        q = q.filter(RupCode.family_code == family_code)
    rows = q.distinct().order_by(RupCode.class_name).all()
    return [{"class_code": r.class_code, "class_name": r.class_name} for r in rows]


# ── NUEVO: productos por clase ────────────────────────────────────
@router.get("/products", response_model=List[RupCodeOut])
def list_products(class_code: Optional[str] = None, db: Session = Depends(get_db)):
    """Devuelve todos los productos (códigos RUP de 8 dígitos) de una clase."""
    q = db.query(RupCode).filter(
        RupCode.is_active == True,
        RupCode.product_code != None,
    )
    if class_code:
        q = q.filter(RupCode.class_code == class_code)
    rows = q.order_by(RupCode.product_name).all()
    return rows


@router.get("/project/{project_id}", response_model=List[ProjectRupCodeOut])
def get_project_rup(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(ProjectRupCode, RupCode)\
        .join(RupCode, ProjectRupCode.rup_code_id == RupCode.rup_code_id)\
        .filter(
            ProjectRupCode.project_id == project_id,
            ProjectRupCode.is_active == True,
        ).all()

    result = []
    for prc, rc in rows:
        result.append(ProjectRupCodeOut(
            project_rup_code_id=prc.project_rup_code_id,
            rup_code_id=rc.rup_code_id,
            rup_code=rc.rup_code,
            product_name=rc.product_name,
            class_name=rc.class_name,
            family_name=rc.family_name,
            segment_name=rc.segment_name,
            is_main_code=prc.is_main_code,
            is_active=prc.is_active,
        ))
    return result


@router.post("/project/{project_id}/assign")
def assign_rup(project_id: int, body: ProjectRupBulk, db: Session = Depends(get_db)):
    from app.models.catalogs import Project
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        return {"ok": False, "msg": "Proyecto no encontrado"}

    db.query(ProjectRupCode).filter(
        ProjectRupCode.project_id == project_id,
    ).update({"is_active": False})

    today = date.today()
    for item in body.codes:
        new = ProjectRupCode(
            project_id=project_id,
            rup_code_id=item.rup_code_id,
            is_main_code=item.is_main_code,
            assignment_date=today,
            is_active=True,
        )
        db.add(new)
    db.commit()
    return {"ok": True, "count": len(body.codes)}
