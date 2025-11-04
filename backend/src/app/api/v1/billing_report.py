"""API endpoints for Billing Report management."""

import uuid as uuid_pkg
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.rbac_scope import get_user_scope_filters, user_has_access_to_school
from ...crud.academic_load_file import academic_load_file
from ...crud.crud_billing_report import billing_report as crud_billing_report
from ...models.academic_load_file import AcademicLoadFile
from ...models.billing_report import (
    BillingReport,
)
from ...models.role import UserRoleEnum
from ...schemas.billing_report import (
    BillingReportCreate,
    BillingReportResponse,
    BillingReportUpdate,
    ConsolidatedBillingReportResponse,
    MonthlyItemResponse,
    PaymentSummaryResponse,
    RateSnapshotResponse,
)

router = APIRouter()


@router.post("/", response_model=BillingReportResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_report(
    obj_in: BillingReportCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
) -> BillingReportResponse:
    """Crear un nuevo reporte de facturación.

    Args:
        obj_in: Datos del reporte a crear
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte creado con todos sus items

    Raises:
        HTTPException: 401 si no está autenticado
    """
    user_id = current_user.get("user_uuid", "")
    user_name = current_user.get("name", "")

    if not user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    report = await crud_billing_report.create(
        db=db,
        obj_in=obj_in,
        user_id=user_id,
        user_name=user_name,
    )

    return report


@router.get("/", response_model=dict)
async def list_billing_reports(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """Listar todos los reportes de facturación.

    Args:
        current_user: Usuario autenticado
        db: Sesión de base de datos
        skip: Número de registros a saltar
        limit: Límite de registros a retornar

    Returns:
        Lista de reportes filtrados por alcance del usuario
    """
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    # ADMIN y VICERRECTOR ven todos
    if user_role in [UserRoleEnum.ADMIN, UserRoleEnum.VICERRECTOR]:
        reports = await crud_billing_report.get_multi(db, skip=skip, limit=limit)
    else:
        # Obtener alcance del usuario
        user_uuid = uuid_pkg.UUID(user_id) if user_id else None
        scope = (
            await get_user_scope_filters(db=db, user_uuid=user_uuid, user_role=user_role)
            if user_uuid
            else {"faculty_id": None, "school_ids": None}
        )

        # Construir query con join a AcademicLoadFile para filtrar por scope
        stmt = (
            select(BillingReport)
            .join(AcademicLoadFile, BillingReport.academic_load_file_id == AcademicLoadFile.id)
            .offset(skip)
            .limit(limit)
        )

        # Aplicar filtros por alcance
        if user_role == UserRoleEnum.DECANO and scope.get("faculty_id"):
            stmt = stmt.filter(AcademicLoadFile.faculty_id == scope["faculty_id"])
        elif user_role == UserRoleEnum.DIRECTOR and scope.get("school_ids"):
            stmt = stmt.filter(AcademicLoadFile.school_id.in_(scope["school_ids"]))

        result = await db.execute(stmt)
        reports = result.scalars().all()

    # Convertir a schemas Pydantic
    reports_data = [BillingReportResponse.model_validate(r) for r in reports]
    return {"data": reports_data, "total": len(reports_data)}


@router.get("/file/{academic_load_file_id}", response_model=dict)
async def list_billing_reports_by_file(
    academic_load_file_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """Listar reportes de facturación por archivo de carga académica.

    Args:
        academic_load_file_id: ID del archivo de carga académica
        current_user: Usuario autenticado
        db: Sesión de base de datos
        skip: Número de registros a saltar
        limit: Límite de registros a retornar

    Returns:
        Lista de reportes

    Raises:
        HTTPException: 404 si el archivo no existe, 403 si no tiene acceso
    """
    # Verificar que el archivo existe
    file = await academic_load_file.get(db, id=academic_load_file_id)
    if not file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Verificar permisos: director debe tener acceso a la escuela del archivo
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role == UserRoleEnum.DIRECTOR:
        user_uuid = uuid_pkg.UUID(user_id) if user_id else None
        has_access = await user_has_access_to_school(
            db=db, user_uuid=user_uuid, user_role=user_role, school_id=file.school_id
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta escuela")

    reports = await crud_billing_report.get_by_file_id(
        db, academic_load_file_id=academic_load_file_id, skip=skip, limit=limit
    )
    reports_data = [BillingReportResponse.model_validate(r) for r in reports]
    return {"data": reports_data, "total": len(reports_data)}


@router.get("/{report_id}", response_model=BillingReportResponse)
async def get_billing_report(
    report_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
) -> BillingReportResponse:
    """Obtener un reporte de facturación por ID.

    Args:
        report_id: ID del reporte
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte con todos sus items

    Raises:
        HTTPException: 404 si el reporte no existe, 403 si no tiene acceso
    """
    report = await crud_billing_report.get(db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    # Verificar permisos: director debe tener acceso a la escuela del archivo asociado
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role == UserRoleEnum.DIRECTOR:
        # Obtener el archivo asociado al reporte
        file = await academic_load_file.get(db, id=report.academic_load_file_id)
        if not file:
            raise HTTPException(status_code=404, detail="Archivo asociado no encontrado")

        user_uuid = uuid_pkg.UUID(user_id) if user_id else None
        has_access = await user_has_access_to_school(
            db=db, user_uuid=user_uuid, user_role=user_role, school_id=file.school_id
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="No tienes acceso a este reporte")

    return report


@router.put("/{report_id}", response_model=BillingReportResponse)
async def update_billing_report(
    report_id: int,
    obj_in: BillingReportUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
) -> BillingReportResponse:
    """Actualizar un reporte de facturación existente.

    Args:
        report_id: ID del reporte
        obj_in: Datos actualizados del reporte
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte actualizado

    Raises:
        HTTPException: 404 si el reporte no existe
    """
    report = await crud_billing_report.get(db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    updated_report = await crud_billing_report.update(db=db, db_obj=report, obj_in=obj_in)
    return updated_report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_billing_report(
    report_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
) -> None:
    """Eliminar un reporte de facturación.

    Args:
        report_id: ID del reporte
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Raises:
        HTTPException: 404 si el reporte no existe
    """
    report = await crud_billing_report.get(db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    await crud_billing_report.delete(db=db, id=report_id)


@router.get("/consolidated/term/{term_id}", response_model=ConsolidatedBillingReportResponse)
async def get_consolidated_billing_reports_by_term(
    term_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    academic_load_file_ids: str = Query(..., description="Comma-separated list of academic_load_file IDs"),
    db: AsyncSession = Depends(async_get_db),
) -> ConsolidatedBillingReportResponse:
    """Obtener consolidado de planillas por ciclo académico.

    Consolida los datos de múltiples cargas académicas del mismo ciclo,
    agrupando payment_summaries y monthly_items.

    Solo accesible para DECANO, que debe tener acceso a todas las escuelas de las cargas.

    Args:
        term_id: ID del ciclo académico
        academic_load_file_ids: Comma-separated list of academic_load_file IDs
        current_user: Usuario autenticado
        db: Sesión de base de datos

    Returns:
        Reporte consolidado con datos agregados

    Raises:
        HTTPException: 403 si no tiene permisos, 404 si no hay planillas
    """
    # Parsear IDs
    try:
        file_ids = [int(id.strip()) for id in academic_load_file_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="IDs de carga académica inválidos")

    if not file_ids:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos un ID de carga académica")

    # Verificar permisos
    user_role = current_user.get("role")
    user_id = current_user.get("user_uuid")

    if isinstance(user_role, str):
        # Normalizar el rol (minúsculas para coincidir con UserRoleEnum)
        user_role = user_role.lower()
        try:
            user_role = UserRoleEnum(user_role)
        except ValueError:
            raise HTTPException(status_code=403, detail=f"Rol inválido: {user_role}")

    # Permitir DECANO, VICERRECTOR y ADMIN ver consolidados
    allowed_roles = [UserRoleEnum.DECANO, UserRoleEnum.VICERRECTOR, UserRoleEnum.ADMIN]
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403, detail="Solo los decanos, vicerrectores y administradores pueden ver consolidados"
        )

    # Verificar que el decano tiene acceso a todas las escuelas de las cargas
    user_uuid = uuid_pkg.UUID(user_id) if user_id else None
    if not user_uuid:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Para DECANO, verificar scope y facultad
    faculty_id = None
    if user_role == UserRoleEnum.DECANO:
        # Obtener scope del decano (faculty_id)
        scope = await get_user_scope_filters(db=db, user_uuid=user_uuid, user_role=user_role)
        if not scope.get("faculty_id"):
            raise HTTPException(status_code=403, detail="Decano sin facultad asignada")
        faculty_id = scope["faculty_id"]
    # Para VICERRECTOR y ADMIN, pueden ver todas las facultades (faculty_id = None)

    # Obtener todas las cargas académicas y verificar que pertenecen a la facultad del decano
    stmt = select(AcademicLoadFile).filter(AcademicLoadFile.id.in_(file_ids))
    result = await db.execute(stmt)
    files = result.scalars().all()

    if len(files) != len(file_ids):
        raise HTTPException(status_code=404, detail="Algunas cargas académicas no fueron encontradas")

    # Verificar que todas pertenecen a la facultad del decano (solo para DECANO)
    school_ids = set()
    valid_file_ids = []
    school_acronyms = []
    faculty_name = None
    term_info = None

    for file in files:
        # Para DECANO, verificar que la carga pertenece a su facultad
        if user_role == UserRoleEnum.DECANO:
            if file.faculty_id != faculty_id:
                raise HTTPException(status_code=403, detail=f"La carga académica {file.id} no pertenece a tu facultad")

        # Verificar que el término coincide
        if file.term_id != term_id:
            raise HTTPException(status_code=400, detail=f"La carga académica {file.id} no pertenece al ciclo {term_id}")

        valid_file_ids.append(file.id)
        school_ids.add(file.school_id)

        if not faculty_name and file.faculty:
            faculty_name = file.faculty.name

        if not term_info and file.term:
            term_info = file.term

        # Obtener acrónimo de la escuela
        if file.school and file.school.acronym not in school_acronyms:
            school_acronyms.append(file.school.acronym)

    # Obtener todas las planillas de los archivos válidos
    stmt = select(BillingReport).filter(BillingReport.academic_load_file_id.in_(valid_file_ids))
    result = await db.execute(stmt)
    reports = result.scalars().all()

    if not reports:
        raise HTTPException(status_code=404, detail="No se encontraron planillas para las cargas especificadas")

    # Consolidar payment_summaries
    # Agrupar por (class_days, class_schedule, class_duration) y sumar valores
    consolidated_summaries_dict: dict[tuple[str, str, int], dict] = {}

    for report in reports:
        for summary in report.payment_summaries:
            key = (summary.class_days, summary.class_schedule, summary.class_duration)
            if key not in consolidated_summaries_dict:
                consolidated_summaries_dict[key] = {
                    "class_days": summary.class_days,
                    "class_schedule": summary.class_schedule,
                    "class_duration": summary.class_duration,
                    "payment_rate_grado": Decimal("0.0"),
                    "payment_rate_maestria_1": Decimal("0.0"),
                    "payment_rate_maestria_2": Decimal("0.0"),
                    "payment_rate_doctor": Decimal("0.0"),
                    "payment_rate_bilingue": Decimal("0.0"),
                }

            consolidated_summaries_dict[key]["payment_rate_grado"] += summary.payment_rate_grado
            consolidated_summaries_dict[key]["payment_rate_maestria_1"] += summary.payment_rate_maestria_1
            consolidated_summaries_dict[key]["payment_rate_maestria_2"] += summary.payment_rate_maestria_2
            consolidated_summaries_dict[key]["payment_rate_doctor"] += summary.payment_rate_doctor
            consolidated_summaries_dict[key]["payment_rate_bilingue"] += summary.payment_rate_bilingue

    consolidated_summaries = [
        PaymentSummaryResponse(
            id=0,  # No es un item guardado
            billing_report_id=0,
            **data,
        )
        for data in consolidated_summaries_dict.values()
    ]

    # Consolidar monthly_items
    # Agrupar por (class_days, class_schedule, class_duration, year, month) y sumar valores
    consolidated_monthly_dict: dict[tuple[str, str, int, int, int], dict] = {}

    for report in reports:
        for item in report.monthly_items:
            key = (item.class_days, item.class_schedule, item.class_duration, item.year, item.month)
            if key not in consolidated_monthly_dict:
                consolidated_monthly_dict[key] = {
                    "class_days": item.class_days,
                    "class_schedule": item.class_schedule,
                    "class_duration": item.class_duration,
                    "year": item.year,
                    "month": item.month,
                    "month_name": item.month_name,
                    "sessions": 0,
                    "real_time_minutes": 0,
                    "total_class_hours": Decimal("0.0"),
                    "total_dollars": Decimal("0.0"),
                }

            consolidated_monthly_dict[key]["sessions"] += item.sessions
            consolidated_monthly_dict[key]["real_time_minutes"] += item.real_time_minutes
            consolidated_monthly_dict[key]["total_class_hours"] += item.total_class_hours
            consolidated_monthly_dict[key]["total_dollars"] += item.total_dollars

    consolidated_monthly = [
        MonthlyItemResponse(
            id=0,  # No es un item guardado
            billing_report_id=0,
            **data,
        )
        for data in consolidated_monthly_dict.values()
    ]

    # Consolidar rate_snapshots (sin duplicados, tomar el primero de cada academic_level_code)
    consolidated_snapshots_dict: dict[str, RateSnapshotResponse] = {}

    for report in reports:
        for snapshot in report.rate_snapshots:
            if snapshot.academic_level_code not in consolidated_snapshots_dict:
                consolidated_snapshots_dict[snapshot.academic_level_code] = RateSnapshotResponse(
                    id=0,  # No es un item guardado
                    billing_report_id=0,
                    academic_level_id=snapshot.academic_level_id,
                    academic_level_code=snapshot.academic_level_code,
                    academic_level_name=snapshot.academic_level_name,
                    rate_per_hour=snapshot.rate_per_hour,
                    reference_date=snapshot.reference_date,
                    created_at=snapshot.created_at,
                )

    consolidated_snapshots = list(consolidated_snapshots_dict.values())

    # Crear respuesta consolidada
    return ConsolidatedBillingReportResponse(
        id=0,  # No es un reporte guardado
        academic_load_file_id=valid_file_ids[0] if valid_file_ids else None,
        consolidated_from_file_ids=valid_file_ids,
        school_acronyms=school_acronyms,
        user_id=user_uuid,
        user_name=current_user.get("name", ""),
        is_edited=False,
        notes=f"Consolidado de {len(valid_file_ids)} cargas académicas",
        created_at=datetime.now(UTC),
        updated_at=None,
        payment_summaries=consolidated_summaries,
        monthly_items=consolidated_monthly,
        rate_snapshots=consolidated_snapshots,
        term_term=term_info.term if term_info else None,
        term_year=term_info.year if term_info else None,
        faculty_name=faculty_name,
        school_name=None,  # Se usa school_acronyms en su lugar
    )
