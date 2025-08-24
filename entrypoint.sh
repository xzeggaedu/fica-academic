#!/bin/bash
set -euo pipefail

# Load environment variables from the root .env file
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Wait until the database is ready before running migrations
# You can replace this with a proper wait script like wait-for-it.sh or dockerize
echo "Waiting for database to be ready..."
until nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Run Alembic migrations if RUN_MIGRATIONS is set to true
if [ "${RUN_MIGRATIONS:-}" = "true" ]; then
  echo "Running Alembic migrations..."
  cd backend
  if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
  fi
  alembic upgrade head
  cd ..
fi

# Start the FastAPI app with Gunicorn + Uvicorn workers
echo "Starting the FastAPI application..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
