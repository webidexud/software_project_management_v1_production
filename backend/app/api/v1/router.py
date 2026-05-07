# backend/app/api/v1/router.py — v4.5
from fastapi import APIRouter
from app.api.v1.endpoints import (
    project_emails,
    entities, entity_types, executing_departments,
    execution_modalities, financing_types,
    ordering_officials, project_statuses, projects, rup,
    modifications, documents, document_types, reportes,
    derechos_peticion,
)

api_router = APIRouter()

api_router.include_router(entities.router)
api_router.include_router(entity_types.router)
api_router.include_router(executing_departments.router)
api_router.include_router(execution_modalities.router)
api_router.include_router(financing_types.router)
api_router.include_router(ordering_officials.router)
api_router.include_router(project_statuses.router)
api_router.include_router(projects.router)
api_router.include_router(rup.router)
api_router.include_router(project_emails.router)
api_router.include_router(modifications.router)
api_router.include_router(documents.router)
api_router.include_router(document_types.router)
api_router.include_router(reportes.router)
api_router.include_router(derechos_peticion.router)
