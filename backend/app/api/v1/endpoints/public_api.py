# backend/app/api/v1/endpoints/public_api.py
# ─────────────────────────────────────────────────────────────────────
# Endpoint público de consulta de proyectos SIEXUD.
# URL base: GET /api/proyectos
#
# Parámetros opcionales (query string):
#   año          → filtra por año del proyecto          Ej: ?año=2026
#   estado       → filtra por nombre de estado          Ej: ?estado=EN EJECUCIÓN
#   entidad      → filtra por nombre parcial de entidad Ej: ?entidad=UNAL
#   region       → filtra por región de ejecución       Ej: ?region=ANDINA
#   solo_activos → true/false (default: true)           Ej: ?solo_activos=false
#   pagina       → número de página (default: 1)        Ej: ?pagina=2
#   por_pagina   → resultados por página (default: 100, máx: 500)
#
# Ejemplo de uso:
#   GET http://localhost/api/proyectos
#   GET http://localhost/api/proyectos?año=2025&region=ANDINA&pagina=1
#   GET http://localhost/api/proyectos/{id}   → detalle completo de un proyecto
# ─────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date

from app.db.database import get_db
from app.models.catalogs import (
    Project, ProjectStatus, Entity, ExecutingDepartment,
    ProjectType, FinancingType, ExecutionModality, OrderingOfficial,
)
from app.models.project_modification import ProjectModification

router = APIRouter(prefix="/proyectos", tags=["API Pública de Proyectos"])


# ── Helpers ───────────────────────────────────────────────────────────

def fmt_date(d) -> Optional[str]:
    """Formatea una fecha a ISO 8601 (YYYY-MM-DD)."""
    if d is None:
        return None
    if isinstance(d, str):
        return d
    return d.isoformat()


def fmt_money(v) -> Optional[float]:
    """Convierte Decimal a float, None si no hay valor."""
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


REGION_LABELS = {
    'NACIONAL':      'Nacional',
    'INTERNACIONAL': 'Internacional',
    'AMAZONIA':      'Amazonía',
    'ANDINA':        'Andina',
    'CARIBE':        'Caribe',
    'INSULAR':       'Insular',
    'PACIFICA':      'Pacífica',
    'ORINOQUIA':     'Orinoquía',
}


def build_row(p: Project, ctx: dict, mods_map: dict) -> dict:
    """Construye el dict de respuesta para un proyecto."""

    # Fecha fin vigente — última prórroga activa o fecha original
    prorrogas = [
        m for m in mods_map.get(p.project_id, [])
        if m.modification_type in ('EXTENSION', 'BOTH')
        and m.is_active
        and m.new_end_date
    ]
    prorrogas.sort(key=lambda m: m.modification_number)
    fecha_fin_vigente = prorrogas[-1].new_end_date if prorrogas else p.end_date

    # Adiciones activas
    adiciones = [
        m for m in mods_map.get(p.project_id, [])
        if m.modification_type in ('ADDITION', 'BOTH')
        and m.is_active
    ]
    total_adicionado   = sum(float(m.addition_value or 0) for m in adiciones)
    valor_vigente      = float(p.project_value or 0) + total_adicionado
    num_modificaciones = len(mods_map.get(p.project_id, []))

    region_code = p.execution_region or None

    return {
        # ── Identificación ────────────────────────────────────────────
        "numero_interno":         p.project_id,
        "numero_externo":         p.external_project_number,
        "año":                    p.project_year,

        # ── Contenido ─────────────────────────────────────────────────
        "nombre":                 p.project_name,
        "objeto":                 p.project_purpose,

        # ── Clasificación ─────────────────────────────────────────────
        "estado":                 ctx['statuses'].get(p.project_status_id),
        "tipo":                   ctx['types'].get(p.project_type_id),
        "tipo_financiacion":      ctx['financing'].get(p.financing_type_id),
        "modalidad_ejecucion":    ctx['modalities'].get(p.execution_modality_id),
        "region_impactada":       REGION_LABELS.get(region_code, region_code),
        "region_codigo":          region_code,
        "supervisor":             (
            'Rector' if p.supervisor_type == 'RECTOR'
            else 'Jefe de Extensión'
        ),

        # ── Actores ───────────────────────────────────────────────────
        "entidad_contratante":    ctx['entities'].get(p.entity_id),
        "dependencia_ejecutora":  ctx['departments'].get(p.executing_department_id),
        "funcionario_ordenador":  ctx['officials'].get(p.ordering_official_id),
        "correo_principal":       p.main_email,

        # ── Fechas ────────────────────────────────────────────────────
        "fecha_suscripcion":      fmt_date(p.subscription_date),
        "fecha_inicio":           fmt_date(p.start_date),
        "fecha_fin_original":     fmt_date(p.end_date),
        "fecha_fin_vigente":      fmt_date(fecha_fin_vigente),
        "prorrogado":             len(prorrogas) > 0,
        "num_prorrogas":          len(prorrogas),

        # ── Financiero ────────────────────────────────────────────────
        "valor_original":         fmt_money(p.project_value),
        "total_adicionado":       total_adicionado if total_adicionado > 0 else None,
        "valor_vigente":          valor_vigente,
        "aporte_entidad":         fmt_money(p.entity_contribution),
        "aporte_universidad":     fmt_money(p.university_contribution),
        "beneficio_institucional":fmt_money(p.institutional_benefit_value),
        "pct_beneficio":          fmt_money(p.institutional_benefit_percentage),

        # ── Documentación ─────────────────────────────────────────────
        "acto_administrativo":    p.administrative_act,
        "enlace_secop":           p.secop_link,
        "codigo_contable":        p.accounting_code,

        # ── Control ───────────────────────────────────────────────────
        "activo":                 p.is_active,
        "num_modificaciones":     num_modificaciones,
    }


def load_ctx(db: Session) -> dict:
    """Carga catálogos en memoria para evitar N+1 queries."""
    return {
        'entities':    {e.entity_id:    e.entity_name    for e in db.query(Entity).all()},
        'departments': {d.department_id: d.department_name for d in db.query(ExecutingDepartment).all()},
        'statuses':    {s.status_id:    s.status_name    for s in db.query(ProjectStatus).all()},
        'types':       {t.type_id:      t.type_name      for t in db.query(ProjectType).all()},
        'financing':   {f.financing_type_id: f.financing_name for f in db.query(FinancingType).all()},
        'modalities':  {m.modality_id:  m.modality_name  for m in db.query(ExecutionModality).all()},
        'officials':   {o.official_id:  o.full_name      for o in db.query(OrderingOfficial).all()},
    }


def load_mods_map(db: Session, project_ids: list) -> dict:
    """Carga todas las modificaciones de los proyectos en un dict por project_id."""
    if not project_ids:
        return {}
    mods = db.query(ProjectModification)\
        .filter(ProjectModification.project_id.in_(project_ids))\
        .order_by(ProjectModification.project_id, ProjectModification.modification_number)\
        .all()
    result = {}
    for m in mods:
        result.setdefault(m.project_id, []).append(m)
    return result


# ═══════════════════════════════════════════════════════════════════
# GET /proyectos — listado paginado
# ═══════════════════════════════════════════════════════════════════

@router.get(
    "/",
    summary="Listado de proyectos",
    description="""
Retorna todos los proyectos del portafolio SIEXUD con información completa:
identificación, fechas, valor vigente (incluyendo adiciones), aportes, actores y más.

**Parámetros de filtro:**
- `año` — filtra por año del proyecto (ej: 2025)
- `estado` — filtra por nombre del estado (ej: EN EJECUCIÓN)
- `entidad` — búsqueda parcial por nombre de entidad
- `region` — código de región: ANDINA, CARIBE, PACIFICA, ORINOQUIA, AMAZONIA, INSULAR, NACIONAL, INTERNACIONAL
- `solo_activos` — true (defecto) / false para incluir inactivos
- `pagina` — número de página (defecto: 1)
- `por_pagina` — resultados por página (defecto: 100, máximo: 500)
    """,
)
def listar_proyectos(
    año:          Optional[int] = Query(None, description="Año del proyecto"),
    estado:       Optional[str] = Query(None, description="Nombre del estado"),
    entidad:      Optional[str] = Query(None, description="Búsqueda parcial por nombre de entidad"),
    region:       Optional[str] = Query(None, description="Código de región"),
    solo_activos: bool          = Query(True,  description="Solo proyectos activos"),
    pagina:       int           = Query(1,     ge=1, description="Número de página"),
    por_pagina:   int           = Query(100,   ge=1, le=500, description="Resultados por página"),
    db: Session = Depends(get_db),
):
    q = db.query(Project)

    if solo_activos:
        q = q.filter(Project.is_active == True)
    if año:
        q = q.filter(Project.project_year == año)
    if region:
        q = q.filter(Project.execution_region == region.upper())

    # Filtro por estado (join)
    if estado:
        st = db.query(ProjectStatus)\
            .filter(func.upper(ProjectStatus.status_name).contains(estado.upper()))\
            .first()
        if st:
            q = q.filter(Project.project_status_id == st.status_id)
        else:
            # Si no encuentra el estado, retorna vacío
            return {
                "total":      0, "pagina": pagina,
                "por_pagina": por_pagina, "paginas_totales": 0,
                "proyectos":  [],
            }

    # Filtro por entidad (join)
    if entidad:
        ents = db.query(Entity)\
            .filter(Entity.entity_name.ilike(f"%{entidad}%"))\
            .all()
        if ents:
            ids = [e.entity_id for e in ents]
            q = q.filter(Project.entity_id.in_(ids))
        else:
            return {
                "total":      0, "pagina": pagina,
                "por_pagina": por_pagina, "paginas_totales": 0,
                "proyectos":  [],
            }

    total = q.count()
    paginas_totales = max(1, -(-total // por_pagina))  # ceil division

    proyectos = q\
        .order_by(Project.project_year.desc(), Project.project_id.desc())\
        .offset((pagina - 1) * por_pagina)\
        .limit(por_pagina)\
        .all()

    ctx      = load_ctx(db)
    ids      = [p.project_id for p in proyectos]
    mods_map = load_mods_map(db, ids)

    return {
        "total":          total,
        "pagina":         pagina,
        "por_pagina":     por_pagina,
        "paginas_totales":paginas_totales,
        "proyectos":      [build_row(p, ctx, mods_map) for p in proyectos],
    }


# ═══════════════════════════════════════════════════════════════════
# GET /proyectos/{id} — detalle completo de un proyecto
# ═══════════════════════════════════════════════════════════════════

@router.get(
    "/{proyecto_id}",
    summary="Detalle de un proyecto",
    description="Retorna toda la información de un proyecto específico por su ID interno.",
)
def detalle_proyecto(proyecto_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == proyecto_id).first()
    if not p:
        raise HTTPException(404, detail=f"Proyecto {proyecto_id} no encontrado.")

    ctx      = load_ctx(db)
    mods_map = load_mods_map(db, [proyecto_id])
    row      = build_row(p, ctx, mods_map)

    # En el detalle, incluir también las modificaciones
    mods_raw = mods_map.get(proyecto_id, [])
    row["modificaciones"] = [
        {
            "numero":             m.modification_number,
            "tipo":               m.modification_type,
            "acto_administrativo":m.administrative_act,
            "fecha_aprobacion":   fmt_date(m.approval_date),
            "justificacion":      m.justification,
            "valor_adicion":      fmt_money(m.addition_value),
            "aporte_entidad":     fmt_money(m.entity_contribution_addition),
            "aporte_universidad": fmt_money(m.university_contribution_addition),
            "nueva_fecha_fin":    fmt_date(m.new_end_date),
            "dias_prorrogados":   m.extension_days,
            "periodo_prorroga":   m.extension_period_text,
            "activa":             m.is_active,
        }
        for m in mods_raw
    ]

    return row