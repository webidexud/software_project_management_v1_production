#!/bin/bash
# Script de arranque rápido SIEXUD

set -e

echo "🚀 Iniciando SIEXUD..."

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker no está corriendo. Por favor inicia Docker Desktop."
  exit 1
fi

# Construir y levantar
echo "📦 Construyendo imágenes..."
docker compose up --build -d

echo "⏳ Esperando que los servicios estén listos..."
sleep 5

# Verificar estado
docker compose ps

echo ""
echo "✅ SIEXUD está corriendo!"
echo ""
echo "  🌐 Aplicación:  http://localhost"
echo "  📚 API Docs:    http://localhost/api/docs"
echo ""
echo "👤 Registra tu primer usuario admin en:"
echo "   http://localhost/api/docs#/Autenticación/register_auth_register_post"
echo ""
echo "📋 Logs: docker compose logs -f"
