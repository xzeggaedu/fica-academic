import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...crud.academic_load_file import academic_load_file
from ...crud.crud_faculties import get_faculty_by_id
from ...crud.crud_schools import get_school_by_id
from ...crud.crud_term import get_term
from ...schemas.academic_load_file import (
    AcademicLoadFileCreate,
    AcademicLoadFileListResponse,
    AcademicLoadFileResponse,
    AcademicLoadFileUpdate,
)

router = APIRouter()

# Configuración de directorios
UPLOAD_DIR = Path("/code/uploads/academic_load")


@router.post("/upload", response_model=AcademicLoadFileResponse)
async def upload_academic_load_file(
    current_user: Annotated[dict, Depends(get_current_user)],
    file: UploadFile = File(...),
    faculty_id: int = Form(...),
    school_id: int = Form(...),
    term_id: int = Form(...),
    db: AsyncSession = Depends(async_get_db),
):
    """Subir un archivo Excel de carga académica."""
    # Validar que sea un archivo Excel
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xls)")

    # Verificar que la facultad existe
    faculty_obj = await get_faculty_by_id(db, faculty_id)
    if not faculty_obj:
        raise HTTPException(status_code=404, detail="Facultad no encontrada")

    # Verificar que la escuela existe
    school_obj = await get_school_by_id(db, school_id)
    if not school_obj:
        raise HTTPException(status_code=404, detail="Escuela no encontrada")

    # Verificar que el período existe
    term_obj = await get_term(db, term_id)
    if not term_obj:
        raise HTTPException(status_code=404, detail="Período no encontrado")

    # Generar nombres únicos para los archivos
    file_id = str(uuid.uuid4())
    original_filename = f"{file_id}_{file.filename}"

    # Rutas de archivos
    original_path = UPLOAD_DIR / original_filename

    try:
        # Guardar archivo original
        with open(original_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        print(f"✅ Archivo guardado: {original_path}")

        # LÓGICA DE VERSIONADO: Buscar versión anterior
        previous_version = await academic_load_file.get_latest_version(db, faculty_id, school_id, term_id)

        if previous_version:
            # Calcular nueva versión
            new_version = previous_version.version + 1

            # Marcar versión anterior como inactiva
            previous_version.is_active = False
            from datetime import datetime

            previous_version.superseded_at = datetime.now()
            # superseded_by_id se actualizará después de crear el nuevo registro
            await db.commit()
        else:
            new_version = 1

        # Crear registro en la base de datos
        load_data = AcademicLoadFileCreate(faculty_id=faculty_id, school_id=school_id, term_id=term_id)

        # Obtener el UUID y nombre del usuario
        user_uuid = current_user.get("user_uuid", "")
        user_name = current_user.get("name", "")

        if not user_uuid or user_uuid == "":
            raise HTTPException(status_code=400, detail="No se pudo obtener el UUID del usuario autenticado")

        # Verificar que el usuario existe en la base de datos
        from ...crud.crud_users import crud_users

        user_exists = await crud_users.get(db, uuid=user_uuid)

        if not user_exists:
            raise HTTPException(
                status_code=401, detail="User not authenticated. Your session may have expired. Please log in again."
            )

        # Si no se obtuvo el nombre del usuario, obtenerlo de la base de datos
        if not user_name:
            user_name = user_exists.name

        load_record = await academic_load_file.create(
            db=db,
            obj_in=load_data,
            user_id=user_uuid,
            user_name=user_name,
            original_filename=file.filename,
            original_file_path=str(original_path),
            ingestion_status="pending",
            version=new_version,
            is_active=True,
        )

        # Actualizar referencia de versión anterior
        if previous_version:
            previous_version.superseded_by_id = load_record.id
            await db.commit()

        # Disparar procesamiento en background
        from ...core.utils.queue import pool

        if pool:
            await pool.enqueue_job("process_academic_load_file", load_record.id)

        # Crear response
        response = AcademicLoadFileResponse(
            faculty_id=load_record.faculty_id,
            school_id=load_record.school_id,
            term_id=load_record.term_id,
            id=load_record.id,
            user_id=load_record.user_id,
            user_name=load_record.user_name,
            original_filename=load_record.original_filename,
            original_file_path=load_record.original_file_path,
            upload_date=load_record.upload_date,
            ingestion_status=load_record.ingestion_status,
            version=load_record.version,
            is_active=load_record.is_active,
            superseded_at=load_record.superseded_at,
            superseded_by_id=load_record.superseded_by_id,
        )

        # Agregar mensaje adicional en el response
        response_dict = response.model_dump()
        response_dict["message"] = "Archivo subido exitosamente. El procesamiento comenzará en breve."

        return response_dict

    except HTTPException:
        # Re-raise HTTPException sin envolverlo
        raise
    except Exception as e:
        # Limpiar archivos en caso de error
        if original_path.exists():
            original_path.unlink()

        # Log del error completo para debugging
        import traceback

        error_traceback = traceback.format_exc()
        print(f"Error completo en academic load file: {error_traceback}")

        raise HTTPException(
            status_code=500, detail=f"Error al procesar el archivo: {str(e)}. Traceback: {error_traceback}"
        )


@router.get("/", response_model=dict)
async def get_academic_load_files(
    current_user: Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(async_get_db),
):
    """Obtener lista de archivos de carga académica."""
    files = await academic_load_file.get_multi(db, skip=skip, limit=limit)

    # Obtener el total de registros
    from sqlalchemy import func, select

    from ...models.academic_load_file import AcademicLoadFile

    total_result = await db.execute(select(func.count(AcademicLoadFile.id)))
    total_count = total_result.scalar()

    response_data = [
        AcademicLoadFileListResponse(
            id=file.id,
            faculty_name=file.faculty.name,
            faculty_acronym=file.faculty.acronym,
            school_name=file.school.name,
            school_acronym=file.school.acronym,
            term_id=file.term_id,
            term_name=f"{file.term.term} {file.term.year}" if file.term else None,
            term_term=file.term.term if file.term else None,
            term_year=file.term.year if file.term else None,
            original_filename=file.original_filename,
            upload_date=file.upload_date,
            ingestion_status=file.ingestion_status,
            user_name=file.user_name,
            notes=file.notes,
            version=file.version,
            is_active=file.is_active,
        )
        for file in files
    ]

    return {"data": response_data, "total": total_count}


@router.get("/{file_id}", response_model=AcademicLoadFileResponse)
async def get_academic_load_file(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener detalles de un archivo específico."""
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return file


@router.put("/{file_id}", response_model=AcademicLoadFileResponse)
async def update_academic_load_file(
    file_id: int,
    file_update: AcademicLoadFileUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
):
    """Actualizar un archivo."""
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Solo el propietario puede actualizar
    user_uuid = current_user.get("user_uuid", "")

    # Convertir user_uuid a UUID si es string
    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    if file.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar este archivo")

    return await academic_load_file.update(db, db_obj=file, obj_in=file_update)


@router.delete("/{file_id}")
async def delete_academic_load_file(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Eliminar un archivo."""
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Solo el propietario puede eliminar
    user_uuid = current_user.get("user_uuid", "")

    # Debug: imprimir los valores para verificar
    print(f"🔍 Delete Debug: file.user_id={file.user_id}, user_uuid={user_uuid}")

    # Convertir user_uuid a UUID si es string
    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    if file.user_id != user_uuid:
        print(f"❌ Permission denied: file.user_id={file.user_id}, user_uuid={user_uuid}")
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este archivo")

    # Eliminar archivos físicos
    try:
        if os.path.exists(file.original_file_path):
            os.unlink(file.original_file_path)
    except Exception as e:
        print(f"Error al eliminar archivos: {e}")

    # Guardar si el archivo es activo antes de eliminarlo
    was_active = file.is_active
    faculty_id = file.faculty_id
    school_id = file.school_id
    term_id = file.term_id

    # Primero, eliminar todas las referencias que apuntan a este archivo como superseded_by_id
    from sqlalchemy import update as sql_update

    from ...models.academic_load_file import AcademicLoadFile

    # Eliminar referencias de superseded_by_id
    await db.execute(
        sql_update(AcademicLoadFile).where(AcademicLoadFile.superseded_by_id == file_id).values(superseded_by_id=None)
    )
    await db.commit()

    # Eliminar el archivo
    await academic_load_file.delete(db, id=file_id)

    # Si el archivo eliminado era la versión activa, buscar y activar la siguiente versión
    previous_version_activated = False
    if was_active:
        # Buscar todas las versiones restantes de este contexto
        remaining_versions = await academic_load_file.get_all_versions(db, faculty_id, school_id, term_id)

        if remaining_versions:
            # Ordenar por versión descendente
            sorted_versions = sorted(remaining_versions, key=lambda x: x.version or 1, reverse=True)
            next_version = sorted_versions[0]  # La más reciente disponible

            # Activar esta versión
            if not next_version.is_active:
                next_version.is_active = True
                next_version.superseded_at = None
                next_version.superseded_by_id = None
                await db.commit()
                previous_version_activated = True
                print(f"✅ Versión anterior (ID: {next_version.id}, versión: {next_version.version}) activada")

    message = "Archivo eliminado exitosamente"
    if previous_version_activated:
        message += ". La versión anterior ha sido establecida como activa."

    return {"message": message}


@router.get("/check-active/{faculty_id}/{school_id}/{term_id}")
async def check_active_version(
    faculty_id: int,
    school_id: int,
    term_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
):
    """Verificar si ya existe una versión activa para estos parámetros."""
    active_version = await academic_load_file.get_latest_version(db, faculty_id, school_id, term_id)

    if active_version and active_version.is_active:
        return {
            "exists": True,
            "version": active_version.version,
            "filename": active_version.original_filename,
            "upload_date": active_version.upload_date,
            "user_name": active_version.user_name,
            "ingestion_status": active_version.ingestion_status,
        }

    return {"exists": False}


@router.get("/history/{faculty_id}/{school_id}/{term_id}")
async def get_version_history(
    faculty_id: int,
    school_id: int,
    term_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
):
    """Obtener historial de versiones de un documento específico."""
    versions = await academic_load_file.get_all_versions(db, faculty_id, school_id, term_id)

    if not versions:
        return {"data": [], "total": 0}

    response_data = [
        AcademicLoadFileListResponse(
            id=v.id,
            faculty_name=v.faculty.name,
            faculty_acronym=v.faculty.acronym,
            school_name=v.school.name,
            school_acronym=v.school.acronym,
            term_id=v.term_id,
            original_filename=v.original_filename,
            upload_date=v.upload_date,
            ingestion_status=v.ingestion_status,
            user_name=v.user_name,
            notes=v.notes,
            version=v.version,
            is_active=v.is_active,
        )
        for v in versions
    ]

    return {"data": response_data, "total": len(versions)}
