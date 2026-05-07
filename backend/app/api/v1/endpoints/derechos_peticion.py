# backend/app/api/v1/endpoints/derechos_peticion.py — v2.0
# CAMBIO PRINCIPAL: Claude genera las respuestas de cada punto dinámicamente
# basándose en las preguntas reales del DP y los datos consultados en SIEXUD.
import io
import json
import uuid
import zipfile
import httpx
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.db.database import get_db
from app.core.config import settings
from app.models.catalogs import (
    Project, ProjectStatus, Entity, ExecutingDepartment
)
from app.models.project_modification import ProjectModification

router = APIRouter(prefix="/derechos-peticion", tags=["Derechos de Petición"])

_dp_store: dict = {}


# ── Helpers ───────────────────────────────────────────────────────────

def get_entity_name(db, entity_id):
    en = db.query(Entity).filter(Entity.entity_id == entity_id).first()
    return en.entity_name if en else '—'

def get_status_name(db, status_id):
    st = db.query(ProjectStatus).filter(ProjectStatus.status_id == status_id).first()
    return st.status_name if st else '—'

def get_dept_name(db, dept_id):
    dp = db.query(ExecutingDepartment).filter(
        ExecutingDepartment.department_id == dept_id).first()
    return dp.department_name if dp else '—'

def fmt_date(d):
    if not d: return 'N/A'
    if isinstance(d, str): return d
    try: return d.strftime('%d/%m/%Y')
    except: return str(d)

def fmt_money(v):
    if not v: return '$ 0'
    return f"$ {float(v):,.0f}".replace(',', '.')


# ── POST /derechos-peticion/analizar/ ───────────────────────────────

@router.post("/analizar/")
async def analizar_dp(archivo: UploadFile = File(...)):
    """Lee el PDF del DP y extrae metadatos + preguntas con Claude."""
    api_key = getattr(settings, 'anthropic_api_key', None)
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY no configurada")

    import base64
    pdf_bytes = await archivo.read()
    pdf_b64   = base64.b64encode(pdf_bytes).decode()

    prompt = """Analiza este derecho de petición y extrae la información en JSON.
Responde ÚNICAMENTE con el JSON, sin texto adicional ni markdown.

{
  "radicado": "número de radicado o referencia",
  "fecha": "fecha DD/MM/YYYY",
  "remitente_nombre": "nombre completo",
  "remitente_cargo": "cargo",
  "entidad_remitente": "entidad/organización",
  "correo_notificacion": "correo para respuesta",
  "asunto": "asunto del documento",
  "preguntas": [
    {
      "numero": "1",
      "texto": "texto completo de la pregunta",
      "requiere_tabla": true,
      "tipo_info": "convenios|pagos|subcontratacion|avance|otro",
      "periodo_desde": "año o fecha de inicio del período consultado",
      "periodo_hasta": "año o fecha fin del período consultado"
    }
  ],
  "filtros_sugeridos": {
    "year_desde": 2023,
    "year_hasta": 2026
  }
}"""

    try:
        async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 2000,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": pdf_b64,
                                }
                            },
                            {"type": "text", "text": prompt}
                        ]
                    }],
                }
            )
        if response.status_code != 200:
            raise HTTPException(500, f"Error API Claude: {response.text}")

        text = response.json()["content"][0]["text"].strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Error parseando respuesta de IA: {str(e)}")
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout leyendo el PDF")


# ── Generar respuestas con Claude basadas en datos reales ────────────

async def generar_respuestas_con_ia(
    preguntas: list,
    proyectos: list,
    modificaciones: list,
    radicado: str,
    entidad_remitente: str,
    api_key: str,
) -> list:
    """
    Para cada pregunta del DP, Claude genera la respuesta apropiada
    usando los datos reales consultados en SIEXUD.
    """

    # ── Preparar resumen de datos para el contexto ────────────────
    total_convenios = len(proyectos)
    valor_total     = sum(float(p.get('value', 0)) for p in proyectos)
    total_mods      = len(modificaciones)

    # Resumen compacto de convenios (para no saturar tokens)
    convenios_resumen = []
    for p in proyectos[:50]:  # máximo 50 en el contexto
        convenios_resumen.append(
            f"- Conv. {p.get('external','N/D')} | {p.get('entity','')} | "
            f"{p.get('purpose','')[:80]} | {fmt_money(p.get('value',0))} | "
            f"Inicio: {p.get('start_date','N/A')} Fin: {p.get('end_date','N/A')} | "
            f"Estado: {p.get('status','')} | Dep: {p.get('department','')}"
        )
    if len(proyectos) > 50:
        convenios_resumen.append(f"... y {len(proyectos)-50} convenios más")

    # Resumen de modificaciones
    mods_por_tipo = {}
    for m in modificaciones:
        t = m.get('modification_type', 'OTRO')
        mods_por_tipo[t] = mods_por_tipo.get(t, 0) + 1

    context = f"""DATOS REALES DEL SISTEMA SIEXUD — Universidad Distrital Francisco José de Caldas:

CONVENIOS CON APORTE INSTITUCIONAL:
- Total: {total_convenios} convenios
- Valor total: {fmt_money(valor_total)}
- Modificaciones registradas: {total_mods}
  {', '.join(f'{t}: {c}' for t, c in mods_por_tipo.items())}

LISTADO DE CONVENIOS:
{chr(10).join(convenios_resumen)}

ACLARACIÓN: Los convenios son proyectos donde la Universidad Distrital tiene aporte institucional.
La información es consultada del sistema SIEXUD – Oficina de Extensión IDEXUD."""

    system_prompt = """Eres el sistema SIEXUD de la Universidad Distrital Francisco José de Caldas.
Tu tarea es redactar la respuesta oficial a cada pregunta de un Derecho de Petición,
usando ÚNICAMENTE los datos reales que se te proporcionan del sistema.

REGLAS CRÍTICAS:
1. Responde SOLO con JSON, sin texto adicional ni markdown
2. Cada respuesta debe ser formal, clara y en tercera persona institucional
3. Si la pregunta pide una tabla con datos → tipo="tabla_excel" y redacta respuesta diciendo "Ver adjunto hoja PuntoX"
4. Si la pregunta es sobre algo que NO existe en los datos (ej: subcontrataciones) → tipo="texto" y redacta respuesta negativa formal
5. Si hay datos → cita números reales (total convenios, valores, fechas)
6. NO inventes datos que no estén en el contexto
7. El nombre del archivo adjunto Excel siempre es F_DP_{radicado}.xlsx"""

    preguntas_json = json.dumps(
        [{"numero": p["numero"], "texto": p["texto"], "tipo_info": p.get("tipo_info", "otro")}
         for p in preguntas],
        ensure_ascii=False
    )

    user_prompt = f"""{context}

DERECHO DE PETICIÓN DE: {entidad_remitente}
RADICADO: {radicado}

PREGUNTAS A RESPONDER:
{preguntas_json}

Genera la respuesta para CADA pregunta en este formato JSON:
[
  {{
    "numero": "1",
    "texto_pregunta": "texto original de la pregunta",
    "tipo": "tabla_excel" o "texto",
    "hoja_excel": "Punto 1" (solo si tipo=tabla_excel),
    "respuesta_texto": "texto de la respuesta redactada formalmente"
  }}
]"""

    try:
        async with httpx.AsyncClient(timeout=45.0, verify=False) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 3000,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )

        if response.status_code != 200:
            raise Exception(f"Error API: {response.text}")

        text = response.json()["content"][0]["text"].strip()
        # Limpiar markdown si viene
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        puntos = json.loads(text)
        return puntos

    except Exception as e:
        # Fallback: construir puntos básicos si Claude falla
        puntos_fallback = []
        for p in preguntas:
            tipo_info = p.get('tipo_info', 'otro')
            if tipo_info in ('convenios', 'pagos', 'avance'):
                puntos_fallback.append({
                    "numero": p["numero"],
                    "texto_pregunta": p["texto"],
                    "tipo": "tabla_excel",
                    "hoja_excel": f"Punto {p['numero']}",
                    "respuesta_texto": f"Se relaciona la información en la hoja \"Punto {p['numero']}\". Ver adjunto.",
                })
            else:
                puntos_fallback.append({
                    "numero": p["numero"],
                    "texto_pregunta": p["texto"],
                    "tipo": "texto",
                    "respuesta_texto": f"La Universidad Distrital da respuesta a lo solicitado indicando que, luego de revisar la información disponible en el sistema SIEXUD correspondiente al periodo consultado, {['no se encontró información relacionada con lo solicitado.', 'la información se encuentra en proceso de consolidación.'][0]}",
                })
        return puntos_fallback


# ── POST /derechos-peticion/generar/ ────────────────────────────────

class GenerarDPRequest(BaseModel):
    radicado:             str
    fecha_radicado:       str
    destinatario_nombre:  str
    destinatario_cargo:   str
    destinatario_entidad: str
    destinatario_correo:  str = ""
    asunto:               str
    ciudad:               str = "Bogotá, Colombia"
    firmante_nombre:      str = "GIOVANNY MAURICIO TARAZONA BERMÚDEZ"
    firmante_cargo:       str = "Rector"
    year_desde:           int = 2023
    year_hasta:           int = 2026
    preguntas:            list = []


@router.post("/generar/")
async def generar_respuesta_dp(data: GenerarDPRequest, db: Session = Depends(get_db)):
    from app.api.v1.endpoints.generador_dp import (
        generar_word_respuesta, generar_excel_adjunto
    )

    api_key = getattr(settings, 'anthropic_api_key', None)
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY no configurada")

    # ── Consultar convenios (university_contribution > 0) ────────────
    q = db.query(Project).filter(
        Project.is_active == True,
        Project.project_year >= data.year_desde,
        Project.project_year <= data.year_hasta,
        Project.university_contribution > 0,
    ).order_by(Project.project_year.asc(), Project.project_id.asc())

    proyectos_db = q.all()

    if not proyectos_db:
        raise HTTPException(404,
            f"No se encontraron convenios (proyectos con aporte UD) entre {data.year_desde} y {data.year_hasta}")

    # Cachés
    entity_cache = {}
    status_cache = {}
    dept_cache   = {}

    proyectos = []
    for p in proyectos_db:
        if p.entity_id not in entity_cache:
            entity_cache[p.entity_id] = get_entity_name(db, p.entity_id)
        if p.project_status_id not in status_cache:
            status_cache[p.project_status_id] = get_status_name(db, p.project_status_id)
        if p.executing_department_id not in dept_cache:
            dept_cache[p.executing_department_id] = get_dept_name(db, p.executing_department_id)

        proyectos.append({
            "id":                p.project_id,
            "year":              p.project_year,
            "external":          p.external_project_number or f"PY-{p.project_id}",
            "name":              p.project_name,
            "purpose":           p.project_purpose,
            "entity":            entity_cache[p.entity_id],
            "status":            status_cache[p.project_status_id],
            "department":        dept_cache[p.executing_department_id],
            "value":             float(p.project_value or 0),
            "start_date":        fmt_date(p.start_date),
            "end_date":          fmt_date(p.end_date),
            "subscription_date": fmt_date(p.subscription_date),
        })

    project_ids = [p.project_id for p in proyectos_db]
    mods_db = db.query(ProjectModification).filter(
        ProjectModification.project_id.in_(project_ids),
        ProjectModification.is_active == True,
    ).all()

    modificaciones = [{
        "project_id":        m.project_id,
        "modification_type": m.modification_type,
        "addition_value":    float(m.addition_value or 0),
        "new_end_date":      fmt_date(m.new_end_date),
        "extension_days":    m.extension_days or 0,
        "approval_date":     fmt_date(m.approval_date),
        "administrative_act": m.administrative_act or '',
    } for m in mods_db]

    # ── Claude genera las respuestas dinámicamente ───────────────────
    preguntas = data.preguntas if data.preguntas else []

    if preguntas:
        puntos_word = await generar_respuestas_con_ia(
            preguntas=preguntas,
            proyectos=proyectos,
            modificaciones=modificaciones,
            radicado=data.radicado,
            entidad_remitente=data.destinatario_entidad,
            api_key=api_key,
        )
    else:
        # Sin preguntas extraídas → respuesta genérica
        puntos_word = [{
            "numero": "1",
            "texto_pregunta": "Información solicitada sobre convenios interadministrativos",
            "tipo": "tabla_excel",
            "hoja_excel": "Punto 1",
            "respuesta_texto": "Se relaciona la información en la hoja adjunta.",
        }]

    # ── Construir Excel con los datos ────────────────────────────────
    # Mapear puntos a hojas Excel según tipo_info de cada pregunta
    puntos_excel = {}
    hoja_counter = 1

    COLS_CONVENIOS = [
        ("No. Convenio", 14), ("Entidad Contratante", 35), ("Objeto", 50),
        ("Valor Total", 18), ("Fecha Suscripción", 18), ("Fecha Fin Ejecución", 18),
        ("Dependencia Encargada", 25), ("Estado Actual", 16),
    ]
    COLS_PAGOS = [
        ("Año", 8), ("No. Convenio", 14), ("Entidad", 30), ("Localidad", 16),
        ("Fecha de Avance", 16), ("Número de Pagos Realizados", 20),
        ("Valor Total Pagado", 18), ("Estado de Pagos a la Fecha", 22),
    ]
    COLS_AVANCE = [
        ("No. Convenio Asociado", 18), ("No. Contrato", 14),
        ("%Avance Presupuestal", 18), ("%Avance Físico", 16),
        ("Actividades Ejecutadas", 30), ("Actividades Pendientes", 30),
        ("Se han presentado retrasos (SI/NO)", 20),
        ("Modificaciones o Prórrogas (SÍ/NO)", 20),
        ("Dependencia Encargada", 22), ("Valor Total Contrato", 18),
    ]

    mods_por_proyecto = {}
    for m in modificaciones:
        pid = m.get('project_id')
        mods_por_proyecto.setdefault(pid, []).append(m)

    for p_orig in preguntas:
        tipo_info = p_orig.get('tipo_info', 'otro')
        num = p_orig.get('numero', str(hoja_counter))

        # Buscar el punto generado por Claude para este número
        punto_gen = next((pt for pt in puntos_word if str(pt.get('numero')) == str(num)), None)
        if not punto_gen or punto_gen.get('tipo') != 'tabla_excel':
            continue

        rows = []
        if tipo_info == 'convenios':
            for p in proyectos:
                rows.append({
                    "No. Convenio":          p.get('external'),
                    "Entidad Contratante":   p.get('entity'),
                    "Objeto":                p.get('purpose','')[:200],
                    "Valor Total":           float(p.get('value',0)),
                    "Fecha Suscripción":     p.get('subscription_date'),
                    "Fecha Fin Ejecución":   p.get('end_date'),
                    "Dependencia Encargada": p.get('department'),
                    "Estado Actual":         p.get('status'),
                })
            puntos_excel[int(num)] = rows

        elif tipo_info == 'pagos':
            for p in proyectos:
                rows.append({
                    "Año":                         p.get('year'),
                    "No. Convenio":                p.get('external'),
                    "Entidad":                     p.get('entity'),
                    "Localidad":                   "Bogotá D.C.",
                    "Fecha de Avance":             p.get('end_date'),
                    "Número de Pagos Realizados":  "N/D",
                    "Valor Total Pagado":          float(p.get('value',0)),
                    "Estado de Pagos a la Fecha":  p.get('status'),
                })
            puntos_excel[int(num)] = rows

        elif tipo_info == 'avance':
            for p in proyectos:
                pid  = p.get('id')
                mods = mods_por_proyecto.get(pid, [])
                tiene_prorrogas = any(m.get('modification_type') in ('EXTENSION','BOTH') for m in mods)
                rows.append({
                    "No. Convenio Asociado":              p.get('external'),
                    "No. Contrato":                       p.get('external'),
                    "%Avance Presupuestal":               "N/D",
                    "%Avance Físico":                     "N/D",
                    "Actividades Ejecutadas":             "Ver sistema SIEXUD",
                    "Actividades Pendientes":             "Ver sistema SIEXUD",
                    "Se han presentado retrasos (SI/NO)": "SÍ" if tiene_prorrogas else "NO",
                    "Modificaciones o Prórrogas (SÍ/NO)": "SÍ" if len(mods)>0 else "NO",
                    "Dependencia Encargada":              p.get('department'),
                    "Valor Total Contrato":               float(p.get('value',0)),
                })
            puntos_excel[int(num)] = rows

        else:
            # Tipo genérico → tabla básica de convenios
            for p in proyectos:
                rows.append({
                    "No. Convenio":  p.get('external'),
                    "Entidad":       p.get('entity'),
                    "Objeto":        p.get('purpose','')[:200],
                    "Valor Total":   float(p.get('value',0)),
                    "Estado":        p.get('status'),
                })
            puntos_excel[int(num)] = rows

        hoja_counter += 1

    # Si no se detectaron hojas → incluir al menos la de convenios
    if not puntos_excel:
        rows = [{
            "No. Convenio":          p.get('external'),
            "Entidad Contratante":   p.get('entity'),
            "Objeto":                p.get('purpose','')[:200],
            "Valor Total":           float(p.get('value',0)),
            "Fecha Suscripción":     p.get('subscription_date'),
            "Fecha Fin Ejecución":   p.get('end_date'),
            "Dependencia Encargada": p.get('department'),
            "Estado Actual":         p.get('status'),
        } for p in proyectos]
        puntos_excel[1] = rows

    # ── Generar Word con respuestas de Claude ────────────────────────
    datos_word = {
        "radicado":              data.radicado,
        "fecha_radicado":        data.fecha_radicado,
        "destinatario_nombre":   data.destinatario_nombre,
        "destinatario_cargo":    data.destinatario_cargo,
        "destinatario_entidad":  data.destinatario_entidad,
        "destinatario_correo":   data.destinatario_correo,
        "ciudad":                data.ciudad,
        "asunto":                data.asunto,
        "firmante_nombre":       data.firmante_nombre,
        "firmante_cargo":        data.firmante_cargo,
        "puntos":                puntos_word,
    }

    try:
        word_bytes  = generar_word_respuesta(datos_word, proyectos)
        excel_bytes = generar_excel_adjunto(data.radicado, puntos_excel)
    except Exception as e:
        raise HTTPException(500, f"Error generando archivos: {str(e)}")

    # ── ZIP ──────────────────────────────────────────────────────────
    fecha_hoy  = date.today().strftime('%Y%m%d')
    rad_clean  = data.radicado.replace(' ', '_').replace('/', '_')

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"Respuesta_DP_{rad_clean}_{fecha_hoy}.docx", word_bytes)
        zf.writestr(f"F_DP_{rad_clean}_{fecha_hoy}.xlsx",         excel_bytes)
    zip_buf.seek(0)

    token = str(uuid.uuid4()).replace('-', '')[:16]
    _dp_store[token] = {
        "content":         zip_buf.read(),
        "filename":        f"RespuestaDP_{rad_clean}_{fecha_hoy}.zip",
        "mimetype":        "application/zip",
        "convenios_count": len(proyectos),
        "mods_count":      len(modificaciones),
        "puntos_count":    len(puntos_word),
    }

    if len(_dp_store) > 30:
        del _dp_store[list(_dp_store.keys())[0]]

    return {
        "token":            token,
        "download_url":     f"/api/derechos-peticion/download/{token}",
        "convenios_count":  len(proyectos),
        "mods_count":       len(modificaciones),
        "puntos_count":     len(puntos_word),
        "archivos": [
            f"Respuesta_DP_{rad_clean}_{fecha_hoy}.docx",
            f"F_DP_{rad_clean}_{fecha_hoy}.xlsx",
        ]
    }


# ── GET /derechos-peticion/download/{token} ──────────────────────────

@router.get("/download/{token}")
def download_dp(token: str):
    if token not in _dp_store:
        raise HTTPException(404, "Archivo no encontrado o expirado.")
    entry = _dp_store[token]
    return Response(
        content=entry['content'],
        media_type=entry['mimetype'],
        headers={"Content-Disposition": f'attachment; filename="{entry["filename"]}"'},
    )
