# Guía para Crear Migraciones de Base de Datos

Esta guía documenta el proceso exitoso para crear y aplicar migraciones automáticas usando Alembic.

## Prerrequisitos

- Docker containers ejecutándose (`fica_api` y `fica-academics-v10-db-1`)
- Modelo ya modificado en `backend/src/app/models/`
- Alembic instalado y configurado

## Proceso Paso a Paso

### 1. Crear Migración Automática

Ejecutar desde el directorio raíz del proyecto:

```bash
docker exec fica_api sh -c "cd /code/src && alembic revision --autogenerate -m 'descripcion_de_la_migracion'"
```

### 2. Limpiar Migración Autogenerada

Editar el archivo de migración generado de ser necesario en `backend/src/migrations/versions/`:

- **Agregar `server_default`** para campos `NOT NULL`:

  ```python
  op.add_column("tabla", sa.Column("campo", sa.Boolean(), nullable=False, server_default=sa.false()))
  ```

- **Mantener solo los cambios necesarios** en las funciones `upgrade()` y `downgrade()`

### 3. Aplicar Migración

```bash
docker exec fica_api sh -c "cd /code/src && alembic upgrade head"
```

### 4. Verificar Cambios

Obtener credenciales del archivo `.env`:

```bash
cat backend/src/.env
```

Luego usar las credenciales para verificar:

```bash
docker exec fica-academics-v10-db-1 psql -U USUARIO -d BASE_DATOS -c "\d nombre_tabla"
```

## Estructura de Directorios

```
backend/src/
├── migrations/
│   ├── versions/          # Archivos de migración
│   ├── env.py            # Configuración de Alembic
│   └── README.md         # Esta guía
├── app/models/           # Modelos de SQLAlchemy
└── .env                  # Variables de entorno
```

## Notas Importantes

- **Siempre usar Docker** para ejecutar comandos de Alembic (el environment local no tiene acceso a la BD)
- **Limpiar migraciones autogeneradas** antes de aplicarlas
- **Verificar cambios** después de aplicar migraciones
- **Usar nombres descriptivos** para los mensajes de migración
