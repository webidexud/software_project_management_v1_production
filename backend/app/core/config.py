# backend/app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):

    # ── Base de datos ─────────────────────────────────────────────
    db_host:     str = "10.20.100.8"
    db_port:     int = 5432
    db_user:     str = "admin"
    db_password: str = ""
    db_name:     str = "nuevo_siexud"

    # ── JWT ───────────────────────────────────────────────────────
    secret_key:                  str = "cambiar_por_clave_segura"
    algorithm:                   str = "HS256"
    access_token_expire_minutes: int = 480

    # ── Almacenamiento local ──────────────────────────────────────
    upload_dir: str = "/docs_storage"

    # ── SFTP ─────────────────────────────────────────────────────
    sftp_host:     str  = "200.69.103.17"
    sftp_port:     int  = 22
    sftp_user:     str  = "oracle"
    sftp_password: str  = ""
    sftp_base_dir: str  = "/var/www/html/idexud/siexud/actasproy"
    sftp_enabled:  bool = True

    # ── URLs HTTP ─────────────────────────────────────────────────
    http_new_base:    str = "http://200.69.103.17/idexud/siexud/actasproy"
    http_legacy_base: str = "http://siexud.udistrital.edu.co/idexud/siexud/actasproy/upload"

    # ── Anthropic IA ─────────────────────────────────────────────
    anthropic_api_key: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
