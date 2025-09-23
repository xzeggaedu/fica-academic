#!/bin/bash

# FICA Academics - Production Testing Script
# This script helps you test the production images from GitHub Container Registry

set -e

echo "🚀 FICA Academics - Production Testing"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running ✓"

# Check if .env.production exists
if [ ! -f "backend/src/.env.production" ]; then
    print_error "backend/src/.env.production file not found!"
    print_status "Creating .env.production from template..."
    cp backend/src/env.production.template backend/src/.env.production
    print_warning "Please review and update backend/src/.env.production with your actual values before running again."
    print_status "You can edit backend/src/.env.production and then run this script again."
    exit 1
fi

print_status ".env.production file found ✓"

# Pull the latest production images
print_status "Pulling production images from GitHub Container Registry..."
docker pull ghcr.io/xzeggaedu/fica-academic-backend:latest
docker pull ghcr.io/xzeggaedu/fica-academic-frontend:latest

print_success "Images pulled successfully ✓"

# Stop any existing containers
print_status "Stopping any existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Start the production stack
print_status "Starting production stack..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check database
if docker exec fica_db_prod pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} > /dev/null 2>&1; then
    print_success "Database is ready ✓"
else
    print_warning "Database might still be starting..."
fi

# Check Redis
if docker exec fica_redis_prod redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready ✓"
else
    print_warning "Redis might still be starting..."
fi

# Wait a bit more for API
print_status "Waiting for API to be ready..."
sleep 20

# Check API
if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
    print_success "API is ready ✓"
else
    print_warning "API might still be starting..."
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is ready ✓"
else
    print_warning "Frontend might still be starting..."
fi

echo ""
echo "🎉 Production stack is running!"
echo "================================"
echo ""
echo "📊 Services:"
echo "  • Frontend:    http://localhost:3000"
echo "  • Backend API: http://localhost:8000"
echo "  • API Docs:    http://localhost:8000/docs"
echo "  • Database:    localhost:5432"
echo "  • Redis:       localhost:6379"
echo ""
echo "🔧 Management Commands:"
echo "  • View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  • Stop stack:   docker-compose -f docker-compose.prod.yml down"
echo "  • Restart:      docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "👤 Default Admin User:"
echo "  • Username: Check your .env.production file"
echo "  • Email:    Check your .env.production file"
echo "  • Password: Check your .env.production file"
echo ""
print_success "Ready to test! 🚀"
