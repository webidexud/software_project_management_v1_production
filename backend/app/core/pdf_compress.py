# backend/app/core/pdf_compress.py — v1.0
# Compresión SEGURA de PDFs con Ghostscript al momento de subirlos.
#
# Principio: ante cualquier duda se conserva el ORIGINAL. El archivo comprimido
# solo reemplaza al original si pasa todas las verificaciones:
#   - No se toca un PDF con firma digital (cualquier cambio invalida la firma).
#   - No se toca un PDF cifrado, con campos de formulario o con archivos adjuntos.
#   - El resultado debe ser un PDF válido con el MISMO número de páginas.
#   - El texto extraíble no puede disminuir de forma notable.
#   - La reducción debe ser significativa (por defecto >= 10 %).
#
# Si Ghostscript no está instalado, el sistema sigue funcionando: sube el original.
import io
import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, asdict

from app.core.config import settings

log = logging.getLogger("pdf_compress")

_VALID_QUALITIES = {"/screen", "/ebook", "/printer", "/prepress"}
_TEXT_SAMPLE_PAGES = 3          # páginas usadas para comparar el texto antes/después
_TEXT_MIN_CHARS    = 50         # por debajo de esto se considera "sin texto" (escaneo)
_TEXT_MAX_LOSS     = 0.20       # si el texto baja más de 20 % se rechaza la compresión


def fmt_size(n: int) -> str:
    return f"{n / 1048576:.2f} MB" if n >= 1048576 else f"{n / 1024:.0f} KB"


@dataclass
class CompressionResult:
    data:          bytes   # bytes finales a guardar (comprimidos u originales)
    applied:       bool    # True solo si se guardó la versión comprimida
    original_size: int
    final_size:    int
    reason:        str     # código interno (ver _result)
    message:       str     # texto listo para mostrar al usuario ('' = no mostrar nada)

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("data", None)
        return d


def _result(original: bytes, reason: str, message: str = "", compressed: bytes | None = None) -> CompressionResult:
    if compressed is not None:
        return CompressionResult(compressed, True, len(original), len(compressed), reason, message)
    return CompressionResult(original, False, len(original), len(original), reason, message)


def _sample_text_len(reader) -> int:
    total = 0
    for page in list(reader.pages)[:_TEXT_SAMPLE_PAGES]:
        try:
            total += len((page.extract_text() or "").strip())
        except Exception:
            pass
    return total


def _inspect(data: bytes):
    """Devuelve (reader, motivo_para_omitir | None). Nunca lanza excepción."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data), strict=False)
    except Exception:
        return None, ("unreadable", "No se comprimió: no se pudo leer la estructura del PDF; se conservó el original.")

    if reader.is_encrypted:
        return reader, ("encrypted", "No se comprimió: el PDF está protegido o cifrado; se conservó el original.")

    # Firma digital: marcador ByteRange en el cuerpo del archivo o SigFlags en el AcroForm
    signed = b"/ByteRange" in data
    try:
        acro = reader.trailer["/Root"].get("/AcroForm")
        if acro is not None:
            acro = acro.get_object()
            if int(acro.get("/SigFlags", 0) or 0) & 1:
                signed = True
    except Exception:
        pass
    if signed:
        return reader, ("signed", "No se comprimió: el PDF tiene firma digital y comprimirlo la invalidaría; se conservó el original.")

    try:
        if reader.get_fields():
            return reader, ("form", "No se comprimió: el PDF tiene campos de formulario; se conservó el original.")
    except Exception:
        pass

    try:
        if reader.attachments:
            return reader, ("attachments", "No se comprimió: el PDF contiene archivos adjuntos; se conservó el original.")
    except Exception:
        pass

    return reader, None


def compress_pdf(data: bytes, enabled: bool = True) -> CompressionResult:
    """
    Intenta reducir el peso del PDF. Siempre devuelve un resultado utilizable:
    `result.data` son los bytes que hay que guardar (comprimidos o los originales).
    """
    size = len(data)

    if not enabled or not settings.pdf_compress_enabled:
        return _result(data, "user_skipped" if not enabled else "disabled")

    if size < settings.pdf_compress_min_bytes:
        return _result(data, "too_small")

    gs = shutil.which("gs")
    if not gs:
        log.warning("[PDF] Ghostscript no está instalado; se sube el original")
        return _result(data, "gs_missing",
                       "No se comprimió: el servicio de compresión no está disponible; se subió el original.")

    reader, skip = _inspect(data)
    if skip:
        return _result(data, skip[0], skip[1])

    quality = settings.pdf_compress_quality if settings.pdf_compress_quality in _VALID_QUALITIES else "/ebook"

    try:
        pages_before = len(reader.pages)
        text_before  = _sample_text_len(reader)
    except Exception:
        return _result(data, "unreadable",
                       "No se comprimió: no se pudo leer la estructura del PDF; se conservó el original.")

    tmp = tempfile.mkdtemp(prefix="siexud_pdf_")
    try:
        src = os.path.join(tmp, "in.pdf")
        dst = os.path.join(tmp, "out.pdf")
        with open(src, "wb") as f:
            f.write(data)

        cmd = [
            gs, "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER",
            "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5",
            f"-dPDFSETTINGS={quality}",
            "-dDetectDuplicateImages=true",
            "-dEmbedAllFonts=true", "-dSubsetFonts=true", "-dCompressFonts=true",
            f"-sOutputFile={dst}", src,
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, timeout=settings.pdf_compress_timeout)
        except subprocess.TimeoutExpired:
            log.warning("[PDF] Ghostscript excedió el tiempo límite; se sube el original")
            return _result(data, "timeout",
                           "No se comprimió: el proceso tardó demasiado; se conservó el original.")

        if proc.returncode != 0 or not os.path.exists(dst):
            log.warning("[PDF] Ghostscript falló (código %s): %s", proc.returncode, proc.stderr[-300:])
            return _result(data, "error",
                           "No se comprimió por un error del compresor; se conservó el original.")

        with open(dst, "rb") as f:
            out = f.read()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # ── Verificaciones de integridad ─────────────────────────────────
    invalid_msg = "No se comprimió: la verificación de integridad no se cumplió; se conservó el original."

    if not out.startswith(b"%PDF"):
        return _result(data, "invalid_output", invalid_msg)

    try:
        from pypdf import PdfReader
        out_reader = PdfReader(io.BytesIO(out), strict=False)
        pages_after = len(out_reader.pages)
        text_after  = _sample_text_len(out_reader)
    except Exception:
        return _result(data, "invalid_output", invalid_msg)

    if pages_after != pages_before:
        log.warning("[PDF] Páginas distintas tras comprimir (%s → %s); se descarta", pages_before, pages_after)
        return _result(data, "page_mismatch", invalid_msg)

    if text_before >= _TEXT_MIN_CHARS and text_after < text_before * (1 - _TEXT_MAX_LOSS):
        log.warning("[PDF] Pérdida de texto tras comprimir (%s → %s); se descarta", text_before, text_after)
        return _result(data, "text_loss", invalid_msg)

    gain = 1 - (len(out) / size)
    if gain < settings.pdf_compress_min_gain:
        return _result(data, "no_gain",
                       "No se comprimió: el archivo ya está optimizado (la reducción habría sido mínima); se conservó el original.")

    msg = (f"Comprimido automáticamente: {fmt_size(size)} → {fmt_size(len(out))} "
           f"(−{gain * 100:.0f} %). Se conservaron el texto y las {pages_after} páginas.")
    log.info("[PDF] %s", msg)
    return _result(data, "compressed", msg, compressed=out)
