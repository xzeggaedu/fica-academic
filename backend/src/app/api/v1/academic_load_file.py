import os
import uuid as uuid_pkg
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.billing import (
    calculate_workable_days_for_month,
    class_days_to_weekdays,
    determine_academic_level,
    get_academic_level_ids_map,
    get_month_name,
    get_term_months,
    group_classes_by_schedule,
)
from ...core.db.database import async_get_db
from ...core.rbac_scope import get_user_scope_filters, user_has_access_to_school
from ...crud.academic_load_class import academic_load_class
from ...crud.academic_load_file import academic_load_file
from ...crud.crud_faculties import get_faculty_by_id
from ...crud.crud_schools import get_school_by_id
from ...crud.crud_term import get_term
from ...models.role import UserRoleEnum
from ...schemas.academic_load_file import (
    AcademicLoadFileCreate,
    AcademicLoadFileListResponse,
    AcademicLoadFileResponse,
    AcademicLoadFileUpdate,
)
from ...schemas.billing import BillingReportResponse, MonthlyBudgetByBlock, PaymentSummaryByBlock, ScheduleBlockResponse

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
    strict_validation: bool = Form(False),
    db: AsyncSession = Depends(async_get_db),
):
    """Subir un archivo Excel de carga académica."""
    # RBAC: Solo ADMIN o DIRECTOR pueden subir; DIRECTOR solo para sus escuelas
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role not in [UserRoleEnum.ADMIN, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="No tienes permisos para subir archivos")

    if user_role == UserRoleEnum.DIRECTOR:
        user_uuid = uuid_pkg.UUID(user_id) if user_id else None
        has_access = await user_has_access_to_school(
            db=db, user_uuid=user_uuid, user_role=user_role, school_id=school_id
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="No puedes subir archivos para una escuela no asignada")
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
    file_id = str(uuid_pkg.uuid4())
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
        load_data = AcademicLoadFileCreate(
            faculty_id=faculty_id, school_id=school_id, term_id=term_id, strict_validation=strict_validation
        )

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
            strict_validation=load_record.strict_validation,
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
    # Filtrado por rol/alcance
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        files = await academic_load_file.get_multi(db, skip=skip, limit=limit)
    else:
        # Obtener alcance del usuario
        user_uuid = uuid_pkg.UUID(user_id) if user_id else None
        scope = (
            await get_user_scope_filters(db=db, user_uuid=user_uuid, user_role=user_role)
            if user_uuid
            else {"faculty_id": None, "school_ids": None}
        )
        from sqlalchemy import desc, select
        from sqlalchemy.orm import joinedload

        from ...models.academic_load_file import AcademicLoadFile

        stmt = (
            select(AcademicLoadFile)
            .options(
                joinedload(AcademicLoadFile.user),
                joinedload(AcademicLoadFile.faculty),
                joinedload(AcademicLoadFile.school),
                joinedload(AcademicLoadFile.term),
            )
            .order_by(desc(AcademicLoadFile.upload_date))
            .offset(skip)
            .limit(limit)
        )

        if user_role == UserRoleEnum.DECANO and scope.get("faculty_id"):
            stmt = stmt.filter(AcademicLoadFile.faculty_id == scope["faculty_id"])
        if user_role == UserRoleEnum.DIRECTOR and scope.get("school_ids"):
            stmt = stmt.filter(AcademicLoadFile.school_id.in_(scope["school_ids"]))

        result = await db.execute(stmt)
        files = result.scalars().all()

    # Obtener el total de registros
    from sqlalchemy import func, select

    from ...models.academic_load_file import AcademicLoadFile

    total_result = await db.execute(select(func.count(AcademicLoadFile.id)))
    total_count = total_result.scalar()

    response_data = [
        AcademicLoadFileListResponse(
            id=file.id,
            user_id=str(file.user_id) if file.user_id else None,
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
            strict_validation=file.strict_validation,
        )
        for file in files
    ]

    return {"data": response_data, "total": total_count}


@router.get("/{file_id}")
async def get_academic_load_file(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener detalles de un archivo específico."""
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Convertir a dict y agregar las relaciones
    response_dict = AcademicLoadFileResponse.model_validate(file).model_dump()
    response_dict["faculty_name"] = file.faculty.name if file.faculty else None
    response_dict["faculty_acronym"] = file.faculty.acronym if file.faculty else None
    response_dict["school_name"] = file.school.name if file.school else None
    response_dict["school_acronym"] = file.school.acronym if file.school else None
    response_dict["term_name"] = f"{file.term.term} {file.term.year}" if file.term else None
    response_dict["term_term"] = file.term.term if file.term else None
    response_dict["term_year"] = file.term.year if file.term else None

    return response_dict


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
            user_uuid = uuid_pkg.UUID(user_uuid)
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

    # El propietario, un ADMIN, o un director de la escuela pueden eliminar
    user_uuid = current_user.get("user_uuid", "")
    user_role = current_user.get("role")

    # Debug: imprimir los valores para verificar
    print(f"🔍 Delete Debug: file.user_id={file.user_id}, user_uuid={user_uuid}, user_role={user_role}")

    # Convertir user_uuid a UUID si es string
    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid_pkg.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    # Verificar permisos: propietario, ADMIN o director de la escuela pueden eliminar
    is_owner = file.user_id == user_uuid

    # Convertir user_role a UserRoleEnum si es string
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    is_admin = user_role == UserRoleEnum.ADMIN

    # Verificar si es director de la escuela del archivo
    is_director_of_school = False
    if user_role == UserRoleEnum.DIRECTOR:
        is_director_of_school = await user_has_access_to_school(db, user_uuid, user_role, file.school_id)

    if not is_owner and not is_admin and not is_director_of_school:
        print(
            f"❌ Permission denied: file.user_id={file.user_id}, "
            f"user_uuid={user_uuid}, user_role={user_role}, school_id={file.school_id}"
        )
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
            strict_validation=v.strict_validation,
        )
        for v in versions
    ]

    return {"data": response_data, "total": len(versions)}


@router.get("/{file_id}/download")
async def download_academic_load_file(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Descargar archivo original de carga académica."""
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Verificar permisos
    user_uuid = current_user.get("user_uuid", "")
    user_role = current_user.get("role", "")

    if isinstance(user_uuid, str):
        try:
            user_uuid = uuid_pkg.UUID(user_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="User UUID inválido")

    # Permitir descarga si es el propietario o si es admin/vicerrector
    from ...models.role import UserRoleEnum

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if file.user_id != user_uuid and user_role not in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        raise HTTPException(status_code=403, detail="No tienes permisos para descargar este archivo")

    # Verificar que el archivo existe
    file_path = Path(file.original_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")

    from fastapi.responses import FileResponse

    return FileResponse(
        path=str(file_path),
        filename=file.original_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/{file_id}/classes", response_model=dict)
async def get_academic_load_classes(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener todas las clases de un archivo de carga académica."""
    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener todas las clases (sin paginación para el detalle completo)
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Convertir a response model
    from ...schemas.academic_load_class import AcademicLoadClassResponse

    response_data = [AcademicLoadClassResponse.model_validate(cls) for cls in classes]

    return {"data": response_data, "total": len(response_data)}


@router.get("/{file_id}/statistics")
async def get_academic_load_statistics(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener estadísticas de un archivo de carga académica."""
    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener todas las clases
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Calcular estadísticas
    total_classes = len(classes)
    valid_classes = len([c for c in classes if c.validation_status == "valid"])
    warning_classes = len([c for c in classes if c.validation_status == "warning"])
    error_classes = len([c for c in classes if c.validation_status == "error"])

    # Profesores únicos
    unique_professors = len({c.professor_name for c in classes if c.professor_name})

    # Asignaturas únicas
    unique_subjects = len({c.subject_code for c in classes if c.subject_code})

    return {
        "total_classes": total_classes,
        "valid_classes": valid_classes,
        "warning_classes": warning_classes,
        "error_classes": error_classes,
        "unique_professors": unique_professors,
        "unique_subjects": unique_subjects,
    }


@router.get("/{file_id}/billing-schedule-blocks", response_model=dict)
async def get_billing_schedule_blocks(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener bloques únicos de horarios para la planilla de facturación.

    Devuelve una lista de bloques únicos agrupados por combinación de:
    - Días de la clase (class_days)
    - Horario (class_schedule)
    - Duración (class_duration)

    Args:
        file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Diccionario con lista de bloques de horarios únicos

    Raises:
        HTTPException: 404 si el archivo no existe
    """
    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener todas las clases del archivo
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Agrupar clases por horario único (días, horario, duración)
    grouped_classes = group_classes_by_schedule(classes)

    # Convertir a lista de bloques únicos
    schedule_blocks = []
    for (class_days, class_schedule, class_duration), _ in grouped_classes.items():
        schedule_blocks.append(
            ScheduleBlockResponse(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
            )
        )

    return {"data": schedule_blocks, "total": len(schedule_blocks)}


@router.get("/{file_id}/billing-payment-summary", response_model=dict)
async def get_billing_payment_summary(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener resumen de tasas de pago agrupadas por nivel académico y bloque de horario.

    Devuelve un resumen consolidado de las tasas de pago (professor_payment_rate)
    agrupadas por nivel académico para cada bloque único de horario.

    Args:
        file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Diccionario con lista de resúmenes de tasas por bloque de horario

    Raises:
        HTTPException: 404 si el archivo no existe
    """
    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener todas las clases del archivo
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Agrupar clases por horario único
    grouped_classes = group_classes_by_schedule(classes)

    # Calcular resumen de tasas por bloque
    payment_summaries = []
    for (class_days, class_schedule, class_duration), class_list in grouped_classes.items():
        # Inicializar contadores por nivel académico
        rates_by_level = {
            "GDO": 0.0,
            "M1": 0.0,
            "M2": 0.0,
            "DR": 0.0,
            "BLG": 0.0,
        }

        # Sumar tasas de pago por nivel
        for cls in class_list:
            # Determinar nivel académico del profesor
            academic_level = determine_academic_level(
                is_bilingual=cls.is_bilingual,
                professor_is_doctor=cls.professor_is_doctor,
                professor_masters=cls.professor_masters,
            )

            if academic_level:
                # Sumar la tasa de pago para este nivel
                rates_by_level[academic_level] += float(cls.professor_payment_rate)

        # Crear objeto de respuesta con nombres en español
        from ...schemas.billing import PaymentRateByLevel

        payment_summaries.append(
            PaymentSummaryByBlock(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
                payment_rates_by_level=PaymentRateByLevel(
                    grado=rates_by_level["GDO"],
                    maestria_1=rates_by_level["M1"],
                    maestria_2=rates_by_level["M2"],
                    doctor=rates_by_level["DR"],
                    bilingue=rates_by_level["BLG"],
                ),
            )
        )

    return {"data": payment_summaries, "total": len(payment_summaries)}


@router.get("/{file_id}/billing-monthly-budget", response_model=dict)
async def get_billing_monthly_budget(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener presupuesto mensual para la planilla de facturación.

    Calcula para cada bloque único de horario y mes del término:
    - Número de sesiones (usando calculate_workdays)
    - Tiempo real en minutos (sesiones × duración)
    - Total de horas clase (tiempo real / 50)
    - Total en dólares (basado en tasas y tarifas)

    Args:
        file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Diccionario con lista de presupuestos mensuales por bloque

    Raises:
        HTTPException: 404 si el archivo no existe
    """
    from decimal import Decimal

    from ...crud.crud_hourly_rate_history import get_current_rate
    from ...schemas.billing import MonthlyBudgetItem

    # Verificar que el archivo existe y obtener información del término
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener el término asociado
    term = await get_term(db, term_id=file.term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Término no encontrado")

    # Obtener mapeo de códigos de nivel a IDs
    level_ids_map = await get_academic_level_ids_map(db)

    # Obtener todas las clases del archivo
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Agrupar clases por horario único
    grouped_classes = group_classes_by_schedule(classes)

    # Obtener lista de meses del término
    term_months = get_term_months(term.start_date, term.end_date)

    # Calcular presupuesto mensual por bloque
    monthly_budgets = []
    for (class_days, class_schedule, class_duration), class_list in grouped_classes.items():
        # Calcular resumen de tasas de pago por nivel para este bloque
        rates_by_level = {
            "GDO": 0.0,
            "M1": 0.0,
            "M2": 0.0,
            "DR": 0.0,
            "BLG": 0.0,
        }

        for cls in class_list:
            academic_level = determine_academic_level(
                is_bilingual=cls.is_bilingual,
                professor_is_doctor=cls.professor_is_doctor,
                professor_masters=cls.professor_masters,
            )

            if academic_level:
                rates_by_level[academic_level] += float(cls.professor_payment_rate)

        # Convertir class_days a weekdays para calculate_workdays
        weekdays = class_days_to_weekdays(class_days)

        # Calcular presupuesto para cada mes
        monthly_items = []
        for year, month in term_months:
            # Calcular número de sesiones
            sessions = await calculate_workable_days_for_month(session=db, term=term, month=month, weekdays=weekdays)

            # Calcular tiempo real en minutos
            real_time_minutes = sessions * class_duration

            # Calcular total de horas clase (dividir entre 50)
            total_class_hours = Decimal(real_time_minutes) / Decimal(50)

            # Calcular total en dólares
            total_dollars = Decimal(0.0)
            for level_code, payment_rate_sum in rates_by_level.items():
                if payment_rate_sum > 0 and level_code in level_ids_map:
                    level_id = level_ids_map[level_code]

                    # Obtener tarifa vigente para este nivel y fecha (primer día del mes)
                    month_date = date(year, month, 1)
                    hourly_rate = await get_current_rate(session=db, level_id=level_id, reference_date=month_date)

                    if hourly_rate:
                        # Calcular: (suma de tasas de pago) × tarifa por hora × total de horas clase
                        total_dollars += (
                            Decimal(payment_rate_sum) * Decimal(hourly_rate.rate_per_hour) * total_class_hours
                        )

            monthly_items.append(
                MonthlyBudgetItem(
                    year=year,
                    month=month,
                    month_name=get_month_name(month),
                    sessions=sessions,
                    real_time_minutes=real_time_minutes,
                    total_class_hours=total_class_hours,
                    total_dollars=total_dollars,
                )
            )

        monthly_budgets.append(
            MonthlyBudgetByBlock(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
                months=monthly_items,
            )
        )

    return {"data": monthly_budgets, "total": len(monthly_budgets)}


@router.get("/{file_id}/billing-report", response_model=BillingReportResponse)
async def get_billing_report(
    file_id: int, current_user: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(async_get_db)
):
    """Obtener reporte completo de facturación inmutable para la planilla mensual.

    Este endpoint integra todos los bloques del reporte:
    - Bloques únicos de horarios (días, horario, duración)
    - Resumen de tasas de pago por nivel académico
    - Presupuesto mensual con cálculos completos

    Este reporte es inmutable y representa un snapshot de la carga académica en el momento de la generación.

    Args:
        file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte completo de facturación con todos los bloques integrados

    Raises:
        HTTPException: 404 si el archivo o término no existen
    """
    from decimal import Decimal

    from ...crud.crud_hourly_rate_history import get_current_rate

    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener el término asociado
    term = await get_term(db, term_id=file.term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Término no encontrado")

    # Obtener mapeo de códigos de nivel a IDs
    level_ids_map = await get_academic_level_ids_map(db)

    # Obtener todas las clases del archivo
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Agrupar clases por horario único
    grouped_classes = group_classes_by_schedule(classes)

    # Obtener lista de meses del término
    term_months = get_term_months(term.start_date, term.end_date)

    # BLOQUE 1: Horarios únicos
    schedule_blocks = []
    for (class_days, class_schedule, class_duration), _ in grouped_classes.items():
        schedule_blocks.append(
            ScheduleBlockResponse(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
            )
        )

    # BLOQUE 2: Resumen de tasas por nivel
    payment_summaries = []
    # BLOQUE 3: Presupuesto mensual
    monthly_budgets = []

    for (class_days, class_schedule, class_duration), class_list in grouped_classes.items():
        # Calcular resumen de tasas de pago por nivel para este bloque
        rates_by_level = {
            "GDO": 0.0,
            "M1": 0.0,
            "M2": 0.0,
            "DR": 0.0,
            "BLG": 0.0,
        }

        for cls in class_list:
            academic_level = determine_academic_level(
                is_bilingual=cls.is_bilingual,
                professor_is_doctor=cls.professor_is_doctor,
                professor_masters=cls.professor_masters,
            )

            if academic_level:
                rates_by_level[academic_level] += float(cls.professor_payment_rate)

        # Agregar a BLOQUE 2
        from ...schemas.billing import PaymentRateByLevel

        payment_summaries.append(
            PaymentSummaryByBlock(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
                payment_rates_by_level=PaymentRateByLevel(
                    grado=rates_by_level["GDO"],
                    maestria_1=rates_by_level["M1"],
                    maestria_2=rates_by_level["M2"],
                    doctor=rates_by_level["DR"],
                    bilingue=rates_by_level["BLG"],
                ),
            )
        )

        # Convertir class_days a weekdays para calculate_workdays
        weekdays = class_days_to_weekdays(class_days)

        # Calcular presupuesto para cada mes
        monthly_items = []
        for year, month in term_months:
            # Calcular número de sesiones
            sessions = await calculate_workable_days_for_month(session=db, term=term, month=month, weekdays=weekdays)

            # Calcular tiempo real en minutos
            real_time_minutes = sessions * class_duration

            # Calcular total de horas clase (dividir entre 50)
            total_class_hours = Decimal(real_time_minutes) / Decimal(50)

            # Calcular total en dólares
            total_dollars = Decimal(0.0)
            for level_code, payment_rate_sum in rates_by_level.items():
                if payment_rate_sum > 0 and level_code in level_ids_map:
                    level_id = level_ids_map[level_code]

                    # Obtener tarifa vigente para este nivel y fecha (primer día del mes)
                    month_date = date(year, month, 1)
                    hourly_rate = await get_current_rate(session=db, level_id=level_id, reference_date=month_date)

                    if hourly_rate:
                        # Calcular: (suma de tasas de pago) × tarifa por hora × total de horas clase
                        total_dollars += (
                            Decimal(payment_rate_sum) * Decimal(hourly_rate.rate_per_hour) * total_class_hours
                        )

            from ...schemas.billing import MonthlyBudgetItem

            monthly_items.append(
                MonthlyBudgetItem(
                    year=year,
                    month=month,
                    month_name=get_month_name(month),
                    sessions=sessions,
                    real_time_minutes=real_time_minutes,
                    total_class_hours=total_class_hours,
                    total_dollars=total_dollars,
                )
            )

        # Agregar a BLOQUE 3
        monthly_budgets.append(
            MonthlyBudgetByBlock(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
                months=monthly_items,
            )
        )

    return BillingReportResponse(
        schedule_blocks=schedule_blocks,
        payment_summary=payment_summaries,
        monthly_budget=monthly_budgets,
    )


@router.post(
    "/{file_id}/billing-report/generate", response_model=BillingReportResponse, status_code=status.HTTP_201_CREATED
)
async def generate_and_save_billing_report(
    file_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
) -> BillingReportResponse:
    """Generar y guardar un reporte de facturación para una carga académica.

    Este endpoint genera un reporte completo de facturación calculando todos los bloques
    desde los datos de la carga académica, y luego lo guarda en la base de datos como
    un snapshot inmutable que puede ser posteriormente editado.

    Args:
        file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte creado con todos sus items

    Raises:
        HTTPException: 404 si el archivo o término no existen
    """
    from decimal import Decimal

    from ...crud.crud_billing_report import billing_report as crud_billing_report
    from ...crud.crud_hourly_rate_history import get_current_rate
    from ...schemas.billing_report import (
        BillingReportCreate,
        MonthlyItemCreate,
        PaymentSummaryCreate,
    )

    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Obtener el término asociado
    term = await get_term(db, term_id=file.term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Término no encontrado")

    # Obtener mapeo de códigos de nivel a IDs
    level_ids_map = await get_academic_level_ids_map(db)

    # Obtener todas las clases del archivo
    classes = await academic_load_class.get_by_file_id(db, file_id=file_id, skip=0, limit=10000)

    # Agrupar clases por horario único
    grouped_classes = group_classes_by_schedule(classes)

    # Obtener lista de meses del término
    term_months = get_term_months(term.start_date, term.end_date)

    # Preparar datos para el reporte
    payment_summaries = []
    monthly_items = []

    for (class_days, class_schedule, class_duration), class_list in grouped_classes.items():
        # Calcular resumen de tasas de pago por nivel para este bloque
        rates_by_level = {
            "GDO": 0.0,
            "M1": 0.0,
            "M2": 0.0,
            "DR": 0.0,
            "BLG": 0.0,
        }

        for cls in class_list:
            academic_level = determine_academic_level(
                is_bilingual=cls.is_bilingual,
                professor_is_doctor=cls.professor_is_doctor,
                professor_masters=cls.professor_masters,
            )

            if academic_level:
                rates_by_level[academic_level] += float(cls.professor_payment_rate)

        # Agregar resumen de tasas de pago

        payment_summaries.append(
            PaymentSummaryCreate(
                class_days=class_days,
                class_schedule=class_schedule,
                class_duration=class_duration,
                payment_rate_grado=Decimal(rates_by_level["GDO"]),
                payment_rate_maestria_1=Decimal(rates_by_level["M1"]),
                payment_rate_maestria_2=Decimal(rates_by_level["M2"]),
                payment_rate_doctor=Decimal(rates_by_level["DR"]),
                payment_rate_bilingue=Decimal(rates_by_level["BLG"]),
            )
        )

        # Convertir class_days a weekdays para calculate_workdays
        weekdays = class_days_to_weekdays(class_days)

        # Calcular presupuesto para cada mes
        for year, month in term_months:
            # Calcular número de sesiones
            sessions = await calculate_workable_days_for_month(session=db, term=term, month=month, weekdays=weekdays)

            # Calcular tiempo real en minutos
            real_time_minutes = sessions * class_duration

            # Calcular total de horas clase
            total_class_hours = Decimal(real_time_minutes) / Decimal(50)

            # Calcular total en dólares
            total_dollars = Decimal(0.0)
            for level_code, payment_rate_sum in rates_by_level.items():
                if payment_rate_sum > 0 and level_code in level_ids_map:
                    level_id = level_ids_map[level_code]

                    # Obtener tarifa vigente para este nivel y fecha (primer día del mes)
                    month_date = date(year, month, 1)
                    hourly_rate = await get_current_rate(session=db, level_id=level_id, reference_date=month_date)

                    if hourly_rate:
                        # Calcular: (suma de tasas de pago) × tarifa por hora × total de horas clase
                        total_dollars += (
                            Decimal(payment_rate_sum) * Decimal(hourly_rate.rate_per_hour) * total_class_hours
                        )

            monthly_items.append(
                MonthlyItemCreate(
                    class_days=class_days,
                    class_schedule=class_schedule,
                    class_duration=class_duration,
                    year=year,
                    month=month,
                    month_name=get_month_name(month),
                    sessions=sessions,
                    real_time_minutes=real_time_minutes,
                    total_class_hours=total_class_hours,
                    total_dollars=total_dollars,
                )
            )

    # Crear el reporte en la base de datos
    report_create = BillingReportCreate(
        academic_load_file_id=file_id,
        payment_summaries=payment_summaries,
        monthly_items=monthly_items,
    )

    user_id = current_user.get("user_uuid", "")
    user_name = current_user.get("name", "")

    if not user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    report = await crud_billing_report.create(
        db=db,
        obj_in=report_create,
        user_id=user_id,
        user_name=user_name,
    )

    # Recargar el reporte con todas las relaciones
    saved_report = await crud_billing_report.get(db, id=report.id)
    return saved_report
