"""API endpoints for Billing Report management."""

import uuid as uuid_pkg
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.rbac_scope import get_user_scope_filters, user_has_access_to_school
from ...crud.academic_load_file import academic_load_file
from ...crud.crud_billing_report import billing_report as crud_billing_report
from ...models.academic_load_file import AcademicLoadFile
from ...models.billing_report import BillingReport
from ...models.role import UserRoleEnum
from ...schemas.billing_report import BillingReportCreate, BillingReportResponse, BillingReportUpdate

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
