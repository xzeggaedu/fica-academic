#!/bin/bash

# Script para ejecutar todas las pruebas localmente antes del push
# Este script simula lo que hará el workflow de GitHub Actions

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Función para ejecutar pruebas del backend
run_backend_tests() {
    print_step "Ejecutando pruebas del backend..."

    cd backend

    source .venv/bin/activate

    # Verificar que uv esté instalado
    if ! command -v uv &> /dev/null; then
        print_error "uv no está instalado. Instalando..."
        pip install uv
    fi

    # Instalar dependencias
    print_message "Instalando dependencias del backend..."
    uv sync --frozen

    # Ejecutar linting
    print_message "Ejecutando linting del backend..."
    uv run ruff check .
    uv run ruff format --check .

    # Ejecutar pruebas
    print_message "Ejecutando pruebas del backend..."
    export PYTHONPATH=$(pwd)/src
    uv run python -m pytest tests/ -v --tb=short --maxfail=5

    print_message "✅ Pruebas del backend completadas exitosamente"

    cd ..
}

# Función para ejecutar pruebas del frontend
run_frontend_tests() {
    print_step "Ejecutando pruebas del frontend..."

    cd frontend

    # Verificar que npm esté instalado
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado"
        exit 1
    fi

    # Instalar dependencias
    print_message "Instalando dependencias del frontend..."
    npm ci

    # Ejecutar linting
    print_message "Ejecutando linting del frontend..."
    npm run lint

    # Ejecutar pruebas
    print_message "Ejecutando pruebas del frontend..."
    npm run test

    print_message "✅ Pruebas del frontend completadas exitosamente"

    cd ..
}

# Función para mostrar resumen
show_summary() {
    print_step "Resumen de pruebas:"

    echo ""
    echo -e "${GREEN}✅ Backend:${NC}"
    echo "  - Linting: ✅"
    echo "  - Tests: ✅"

    echo ""
    echo -e "${GREEN}✅ Frontend:${NC}"
    echo "  - Linting: ✅"
    echo "  - Tests: ✅"

    echo ""
    echo -e "${YELLOW}🚀 Listo para push:${NC}"
    echo "  - Todas las pruebas pasaron"
    echo "  - El workflow de GitHub Actions debería ejecutarse exitosamente"
}

# Función principal
main() {
    print_message "🧪 Ejecutando todas las pruebas localmente..."
    echo ""

    # Ejecutar pruebas del backend
    run_backend_tests

    echo ""

    # Ejecutar pruebas del frontend
    run_frontend_tests

    echo ""

    # Mostrar resumen
    show_summary

    print_message "¡Todas las pruebas completadas exitosamente! 🎉"
}

# Ejecutar función principal
main "$@"
