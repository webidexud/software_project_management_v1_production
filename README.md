# SIEXUD - Sistema de Extensión Universidad Distrital

Sistema web para la gestión de proyectos de extensión universitaria de la Universidad Distrital Francisco José de Caldas.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS + Axios |
| Backend | FastAPI + Python 3.12 + Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Seguridad | JWT (python-jose) + Passlib/Bcrypt |
| Infraestructura | Docker Compose + NGINX |
| Base de datos | PostgreSQL 15 (servidor externo) |

## Estructura del proyecto

```
siexud/
├── docker-compose.yml
├── .env
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── core/         # config, security, deps
│       ├── db/           # database connection
│       ├── models/       # SQLAlchemy models
│       ├── schemas/      # Pydantic schemas
│       └── api/v1/       # endpoints
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── context/      # AuthContext
        ├── services/     # Axios services
        ├── components/   # UI + Layout
        └── pages/        # Pages + Catalogs
```

## Configuración

### 1. Variables de entorno

Editar `.env` con los datos de tu servidor:

```env
DB_HOST=10.20.100.8
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=qZVmQxZPE532qu39gGoH7F1DqrbUlW
DB_NAME=nuevo_siexud
SECRET_KEY=tu_clave_secreta_de_al_menos_32_caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
VITE_API_URL=http://localhost/api
```

> ⚠️ **Importante**: Cambia `SECRET_KEY` por una clave segura en producción.

### 2. Levantar con Docker Compose

```bash
# Construir e iniciar todos los servicios
docker compose up --build -d

# Ver logs
docker compose logs -f

# Detener
docker compose down
```

### 3. Crear primer usuario administrador

Al primer registro, el sistema asigna automáticamente rol de administrador:

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@udistrital.edu.co",
    "full_name": "Administrador SIEXUD",
    "password": "TuContraseñaSegura123"
  }'
```

O accede a `http://localhost/api/docs` para usar la documentación interactiva.

## Acceso

- **Aplicación**: http://localhost
- **API Docs (Swagger)**: http://localhost/api/docs
- **API Docs (ReDoc)**: http://localhost/api/redoc

## Módulos disponibles

### Catálogos
- ✅ **Tipos de Entidad** - CRUD completo
- ✅ **Tipos de Financiación** - CRUD completo
- ✅ **Funcionarios Ordenadores del Gasto** - CRUD completo
- ✅ **Estados de Proyecto** - CRUD completo con selector de color

### En desarrollo
- 🚧 **Proyectos** - Crear, ver, modificar, deshabilitar

## API Endpoints

### Autenticación
```
POST /auth/login     - Iniciar sesión
POST /auth/register  - Registrar usuario
```

### Catálogos (todos requieren JWT)
```
GET/POST   /entity-types/
GET/PUT    /entity-types/{id}
PATCH      /entity-types/{id}/toggle

GET/POST   /financing-types/
GET/PUT    /financing-types/{id}
PATCH      /financing-types/{id}/toggle

GET/POST   /ordering-officials/
GET/PUT    /ordering-officials/{id}
PATCH      /ordering-officials/{id}/toggle

GET/POST   /project-statuses/
GET/PUT    /project-statuses/{id}
PATCH      /project-statuses/{id}/toggle
```

## Notas importantes

- La base de datos PostgreSQL es **externa** al Docker Compose. No se levanta ningún contenedor de BD.
- El sistema crea automáticamente la tabla `app_users` al iniciar (para los usuarios del sistema). Las demás tablas ya existen en la BD externa.
- El primer usuario registrado obtiene automáticamente permisos de administrador.
