# backend/app/api/v1/endpoints/documents.py — v5.0
# Todas las credenciales y paths vienen de app.core.config.settings
# No hay valores hardcodeados en este archivo.
import os
import io
import zipfile
import threading
import paramiko
import requests as req_lib
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.db.database import get_db
from app.models.catalogs import Project
from app.models.project_document import ProjectDocument, ProjectDocumentType

router = APIRouter(tags=["Documentos"])

# ── Nomenclatura para detección automática ────────────────────────────
NOMENCLATURE_MAP = [
    ("ACTA_INI","ACTA_INI"), ("ACTA_LIQ","ACTA_LIQ"), ("ACTA_REI","ACTA_REI"),
    ("ACTA_SUS","ACTA_SUS"), ("ACTA_COM","ACTA_COM"), ("ANEXO_TEC","ANEXO_TEC"),
    ("CERT_CUM","CERT_CUM"), ("CIERRE_F","CIERRE_F"), ("CORR_ENV","CORR_ENV"),
    ("CORR_REC","CORR_REC"), ("CREAC_FIN","CREAC_FIN"),("DOC_PRIV","DOC_PRIV"),
    ("DOC_PUB","DOC_PUB"),   ("ESTADO_CT","ESTADO_CT"),("EST_PREV","EST_PREV"),
    ("EST_TEC","EST_TEC"),   ("INCORPORAC","INCORPORAC"),("INF_EJEC","INF_EJEC"),
    ("INF_SEG","INF_SEG"),   ("INTERVENT","INTERVENT"), ("INVITACION","INVITACION"),
    ("MODIF","MODIF"),       ("ORD_GASTO","ORD_GASTO"),("ORD_PAGO","ORD_PAGO"),
    ("OTRAS_ACT","OTRAS_ACT"),("POLIZAS","POLIZAS"),   ("PRESUP","PRESUP"),
    ("PROPUESTA","PROPUESTA"),("PRORROGA","PRORROGA"),  ("RESOLUCION","RESOLUCION"),
    ("ADICION","ADICION"),   ("ANEXO","ANEXO"),         ("CESION","CESION"),
    ("FACTURAS","FACTURAS"), ("MINUTA","MINUTA"),        ("CDP","CDP"),
    ("RP","RP"),
]


# ── Helpers ───────────────────────────────────────────────────────────

def detect_type_code(filename: str) -> str:
    base  = os.path.splitext(filename.upper())[0]
    parts = set(p for p in base.replace('-','_').replace(' ','_').replace('.','_').split('_') if p)
    for code, _ in NOMENCLATURE_MAP:
        if code in parts or base.startswith(code + '_') or base == code:
            return code
    return "OTRO"


def get_type_id_by_code(code: str, db: Session) -> int:
    dt = db.query(ProjectDocumentType).filter(ProjectDocumentType.type_code == code).first()
    if dt:
        return dt.document_type_id
    otro = db.query(ProjectDocumentType).filter(ProjectDocumentType.type_code == 'OTRO').first()
    if otro:
        return otro.document_type_id
    raise HTTPException(500, "Tipo 'OTRO' no encontrado. Ejecuta la migración SQL.")


def next_doc_number(db: Session, project_id: int) -> int:
    mx = db.query(func.max(ProjectDocument.document_number)) \
        .filter(ProjectDocument.project_id == project_id).scalar()
    return (mx or 0) + 1


def build_file_url(doc: ProjectDocument) -> str:
    """Construye la URL HTTP de acceso al archivo."""
    fp = doc.file_path or ''
    if fp.startswith("new:"):
        # "new:7015/2026_7015_CDP_1.pdf" → http://.../{project_id}/{filename}
        parts = fp[4:]
        return f"{settings.http_new_base}/{parts}"
    if fp.startswith("legacy:"):
        return f"{settings.http_legacy_base}/{fp[7:]}"
    # Fallback legado
    return f"{settings.http_legacy_base}/{doc.original_filename}"


def _sftp_upload_background(file_bytes: bytes, project_id: int, filename: str):
    """
    Sube el archivo al servidor SFTP en un hilo separado.
    Crea la subcarpeta /{project_id}/ si no existe.
    No bloquea la respuesta al usuario — los errores solo se loguean.
    """
    try:
        remote_dir  = f"{settings.sftp_base_dir}/{project_id}"
        remote_path = f"{remote_dir}/{filename}"

        transport = paramiko.Transport((settings.sftp_host, settings.sftp_port))
        transport.connect(username=settings.sftp_user, password=settings.sftp_password)
        sftp = paramiko.SFTPClient.from_transport(transport)

        # Crear carpeta del proyecto si no existe
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            sftp.mkdir(remote_dir)

        sftp.putfo(io.BytesIO(file_bytes), remote_path)
        sftp.close()
        transport.close()
        print(f"[SFTP] ✅ Subido: {remote_path}")
    except Exception as e:
        print(f"[SFTP] ⚠️  Error subiendo {filename}: {e}")


def doc_to_dict(d: ProjectDocument, db: Session) -> dict:
    dt = db.query(ProjectDocumentType).filter(
        ProjectDocumentType.document_type_id == d.document_type_id
    ).first()
    return {
        "document_id":          d.document_id,
        "project_id":           d.project_id,
        "document_number":      d.document_number,
        "document_type_id":     d.document_type_id,
        "type_code":            dt.type_code  if dt else None,
        "type_name":            dt.type_name  if dt else None,
        "document_name":        d.document_name,
        "document_description": d.document_description,
        "document_date":        str(d.document_date) if d.document_date else None,
        "original_filename":    d.original_filename,
        "file_extension":       d.file_extension,
        "file_size":            d.file_size,
        "document_status":      d.document_status,
        "observations":         d.observations,
        "is_confidential":      d.is_confidential,
        "is_active":            d.is_active,
        "created_at":           str(d.created_at) if d.created_at else None,
        "file_url":             build_file_url(d),
        "is_legacy":            not (d.file_path or '').startswith("new:"),
    }


# ── Endpoints ─────────────────────────────────────────────────────────

@router.get("/document-types/")
def list_document_types(db: Session = Depends(get_db)):
    return db.query(ProjectDocumentType) \
        .filter(ProjectDocumentType.is_active == True) \
        .order_by(ProjectDocumentType.type_name).all()


@router.get("/projects/{project_id}/documents/")
def list_documents(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")
    docs = db.query(ProjectDocument) \
        .filter(ProjectDocument.project_id == project_id, ProjectDocument.is_active == True) \
        .order_by(ProjectDocument.document_number).all()
    return [doc_to_dict(d, db) for d in docs]


@router.post("/projects/{project_id}/documents/upload")
async def upload_document(
    project_id:    int,
    file:          UploadFile = File(...),
    document_date: str        = Form(None),
    observations:  str        = Form(None),
    override_type: str        = Form(None),
    db:            Session    = Depends(get_db),
):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    ext = os.path.splitext(file.filename or '')[-1].lower()
    if ext != '.pdf':
        raise HTTPException(400, "Solo se permiten archivos PDF.")

    type_code = (override_type or '').upper().strip() or detect_type_code(file.filename or '')
    type_id   = get_type_id_by_code(type_code, db)
    doc_num   = next_doc_number(db, project_id)
    year      = proj.project_year or datetime.now().year

    # Nombre: {año}_{project_id}_{type_code}_{num}.pdf
    safe_filename = f"{year}_{project_id}_{type_code}_{doc_num}.pdf"

    file_bytes = await file.read()
    file_size  = len(file_bytes)

    # 1. Guardar localmente (siempre — respaldo inmediato)
    local_dir  = os.path.join(settings.upload_dir, str(project_id))
    local_path = os.path.join(local_dir, safe_filename)
    os.makedirs(local_dir, exist_ok=True)
    with open(local_path, 'wb') as f:
        f.write(file_bytes)

    # 2. Subir al SFTP en background (no bloquea la respuesta)
    if settings.sftp_enabled:
        threading.Thread(
            target=_sftp_upload_background,
            args=(file_bytes, project_id, safe_filename),
            daemon=True,
        ).start()

    # 3. Registrar en BD
    doc = ProjectDocument(
        project_id=project_id,
        document_number=doc_num,
        document_type_id=type_id,
        document_name=os.path.splitext(file.filename or safe_filename)[0],
        document_date=date.fromisoformat(document_date) if document_date else date.today(),
        file_path=f"new:{project_id}/{safe_filename}",
        original_filename=safe_filename,
        file_extension=ext,
        file_size=file_size,
        observations=observations,
        document_status='ACTIVE',
        is_active=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_to_dict(doc, db)


@router.get("/documents/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.document_id == document_id).first()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    fp = doc.file_path or ''

    if fp.startswith("new:"):
        local_path = os.path.join(settings.upload_dir, fp[4:])
        if not os.path.exists(local_path):
            raise HTTPException(404, f"Archivo no encontrado en servidor.")
        with open(local_path, 'rb') as f:
            content = f.read()
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}"'},
        )
    else:
        # Legado: descargar desde servidor HTTP legacy
        url = build_file_url(doc)
        try:
            r = req_lib.get(url, timeout=20)
            if r.status_code == 200:
                return Response(
                    content=r.content,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{doc.original_filename or doc.document_name}"'},
                )
        except Exception:
            pass
        raise HTTPException(404, f"Archivo legado no disponible: {url}")


@router.get("/projects/{project_id}/documents/zip")
def download_expediente(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    docs = db.query(ProjectDocument).filter(
        ProjectDocument.project_id == project_id,
        ProjectDocument.is_active == True,
    ).order_by(ProjectDocument.document_number).all()

    if not docs:
        raise HTTPException(404, "Este proyecto no tiene documentos.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            fp       = doc.file_path or ''
            zip_name = doc.original_filename or f"doc_{doc.document_id}.pdf"
            try:
                if fp.startswith("new:"):
                    local_path = os.path.join(settings.upload_dir, fp[4:])
                    if os.path.exists(local_path):
                        with open(local_path, 'rb') as f:
                            zf.writestr(zip_name, f.read())
                else:
                    r = req_lib.get(build_file_url(doc), timeout=15)
                    if r.status_code == 200:
                        zf.writestr(zip_name, r.content)
            except Exception as e:
                print(f"[ZIP] Omitiendo {zip_name}: {e}")

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="Expediente_{project_id}_{proj.project_year}.zip"'},
    )


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.document_id == document_id).first()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    doc.is_active  = False
    doc.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
