import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...crud.crud_faculties import get_faculty_by_id
from ...crud.crud_schools import get_school_by_id
from ...crud.template_generation import template_generation
from ...schemas.template_generation import (
    TemplateGenerationCreate,
    TemplateGenerationListResponse,
    TemplateGenerationResponse,
    TemplateGenerationUpdate,
)

router = APIRouter()

# Configuración de directorios
UPLOAD_DIR = Path("/code/uploads/templates")
GENERATED_DIR = Path("/code/uploads/generated")


@router.post("/upload", response_model=TemplateGenerationResponse)
async def upload_template(
    current_user: Annotated[dict, Depends(get_current_user)],
    file: UploadFile = File(...),
    faculty_id: int = Form(...),
    school_id: int = Form(...),
    notes: str = Form(None),
    db: AsyncSession = Depends(async_get_db),
):
    """Subir un archivo Excel y generar una plantilla."""
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

    # Generar nombres únicos para los archivos
    file_id = str(uuid.uuid4())
    original_filename = f"{file_id}_{file.filename}"
    generated_filename = f"{file_id}_generated_{file.filename}"

    # Rutas de archivos
    original_path = UPLOAD_DIR / original_filename
    generated_path = GENERATED_DIR / generated_filename

    try:
        # Guardar archivo original
        with open(original_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        print(f"✅ Archivo guardado: {original_path}")

        # Crear registro en la base de datos
        template_data = TemplateGenerationCreate(faculty_id=faculty_id, school_id=school_id, notes=notes)

        # Obtener el UUID del usuario
        user_uuid = current_user.get("user_uuid", "")

        if not user_uuid or user_uuid == "":
            raise HTTPException(status_code=400, detail="No se pudo obtener el UUID del usuario autenticado")

        # Verificar que el usuario existe en la base de datos
        from ...crud.crud_users import crud_users

        user_exists = await crud_users.get(db, uuid=user_uuid)

        if not user_exists:
            raise HTTPException(status_code=404, detail=f"Usuario no encontrado en la base de datos. UUID: {user_uuid}")

        template_record = await template_generation.create(
            db=db,
            obj_in=template_data,
            user_id=user_uuid,
            original_filename=file.filename,
            original_file_path=str(original_path),
            generated_file_path=None,  # Se llenará cuando el worker termine
            generation_status="pending",
        )

        # Disparar procesamiento en background
        from ...core.utils.queue import pool

        if pool:
            await pool.enqueue_job("process_template_generation", template_record.id)

        # Agregar mensaje informativo de que el archivo está en cola
        response = TemplateGenerationResponse(
            faculty_id=template_record.faculty_id,
            school_id=template_record.school_id,
            notes=template_record.notes,
            id=template_record.id,
            user_id=template_record.user_id,
            original_filename=template_record.original_filename,
            original_file_path=template_record.original_file_path,
            generated_file_path=template_record.generated_file_path,
            upload_date=template_record.upload_date,
            generation_status=template_record.generation_status,
        )

        # Agregar mensaje adicional en el response
        response_dict = response.model_dump()
        response_dict["message"] = "Archivo subido exitosamente. El procesamiento comenzará en breve."

        return response_dict

    except Exception as e:
        # Limpiar archivos en caso de error
        if original_path.exists():
            original_path.unlink()
        if generated_path.exists():
            generated_path.unlink()

        # Log del error completo para debugging
        import traceback

        error_traceback = traceback.format_exc()
        print(f"Error completo en template generation: {error_traceback}")

        raise HTTPException(
            status_code=500, detail=f"Error al procesar el archivo: {str(e)}. Traceback: {error_traceback}"
        )


@router.get("/", response_model=dict)
async def get_templates(
    current_user: Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(async_get_db),
):
    """Obtener lista de plantillas generadas."""
    templates = await template_generation.get_multi(db, skip=skip, limit=limit)

    # Obtener el total de registros
    from sqlalchemy import func, select

    from ...models.template_generation import TemplateGeneration

    total_result = await db.execute(select(func.count(TemplateGeneration.id)))
    total_count = total_result.scalar()

    response_data = [
        TemplateGenerationListResponse(
            id=template.id,
            faculty_name=template.faculty.name,
            faculty_acronym=template.faculty.acronym,
            school_name=template.school.name,
            school_acronym=template.school.acronym,
            original_filename=template.original_filename,
            upload_date=template.upload_date,
            generation_status=template.generation_status,
            user_name=template.user.name,
            download_url=f"/api/v1/template-generation/{template.id}/download"
            if template.generation_status == "completed"
            else None,
        )
        for template in templates
    ]

    return {"data": response_data, "total": total_count}


@router.get("/my-templates", response_model=list[TemplateGenerationListResponse])
async def get_my_templates(
    current_user: Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(async_get_db),
):
    """Obtener plantillas generadas por el usuario actual."""
    user_uuid = current_user.get("user_uuid", "")
    templates = await template_generation.get_by_user(db, user_uuid, skip=skip, limit=limit)

    return [
        TemplateGenerationListResponse(
            id=template.id,
            faculty_name=template.faculty.name,
            faculty_acronym=template.faculty.acronym,
            school_name=template.school.name,
            school_acronym=template.school.acronym,
            original_filename=template.original_filename,
            upload_date=template.upload_date,
            generation_status=template.generation_status,
            user_name=template.user.name,
        )
        for template in templates
    ]


@router.get("/{template_id}", response_model=TemplateGenerationResponse)
async def get_template(
    template_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener detalles de una plantilla específica."""
    template = await template_generation.get(db, id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    return template


@router.put("/{template_id}", response_model=TemplateGenerationResponse)
async def update_template(
    template_id: int,
    template_update: TemplateGenerationUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
):
    """Actualizar una plantilla."""
    template = await template_generation.get(db, id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    # Solo el propietario puede actualizar
    user_uuid = current_user.get("user_uuid", "")

    # Convertir user_uuid a UUID si es string
    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    if template.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar esta plantilla")

    return await template_generation.update(db, db_obj=template, obj_in=template_update)


@router.delete("/{template_id}")
async def delete_template(
    template_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Eliminar una plantilla."""
    template = await template_generation.get(db, id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    # Solo el propietario puede eliminar
    user_uuid = current_user.get("user_uuid", "")

    # Debug: imprimir los valores para verificar
    print(f"🔍 Delete Debug: template.user_id={template.user_id}, user_uuid={user_uuid}")

    # Convertir user_uuid a UUID si es string
    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    if template.user_id != user_uuid:
        print(f"❌ Permission denied: template.user_id={template.user_id}, user_uuid={user_uuid}")
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta plantilla")

    # Eliminar archivos físicos
    try:
        if os.path.exists(template.original_file_path):
            os.unlink(template.original_file_path)
        if os.path.exists(template.generated_file_path):
            os.unlink(template.generated_file_path)
    except Exception as e:
        print(f"Error al eliminar archivos: {e}")

    await template_generation.delete(db, id=template_id)
    return {"message": "Plantilla eliminada exitosamente"}


@router.get("/{template_id}/download")
async def download_template(
    template_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Descargar archivo generado de una plantilla."""
    template = await template_generation.get(db, id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrado")

    # Verificar que el archivo esté completado
    if template.generation_status != "completed":
        raise HTTPException(status_code=400, detail="La plantilla aún está siendo procesada")

    # Verificar que el archivo existe
    generated_path = Path(template.generated_file_path)
    if not generated_path.exists():
        raise HTTPException(status_code=404, detail="Archivo generado no encontrado")

    # Verificar permisos: propietario o administrador pueden descargar
    user_uuid = current_user.get("user_uuid", "")
    user_role = current_user.get("role", "")

    # Permitir descarga si es el propietario o si es administrador
    if template.user_id != user_uuid and user_role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para descargar esta plantilla")

    from fastapi.responses import FileResponse

    # Extraer el nombre del archivo generado desde la ruta
    generated_filename = Path(template.generated_file_path).name

    return FileResponse(
        path=str(generated_path),
        filename=generated_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
