# Variables
SERVICE=api

# Crear una nueva migración (usa make migrate-init m="mensaje")
migrate-init:
	docker compose run --rm $(SERVICE) alembic revision --autogenerate -m "$(m)"

# Aplicar todas las migraciones pendientes
migrate-up:
	docker compose run --rm $(SERVICE) alembic upgrade head

# Revertir la última migración
migrate-down:
	docker compose run --rm $(SERVICE) alembic downgrade -1

# Ver el historial de migraciones
migrate-history:
	docker compose run --rm $(SERVICE) alembic history

# Revisar el estado de la base de datos
migrate-current:
	docker compose run --rm $(SERVICE) alembic current
