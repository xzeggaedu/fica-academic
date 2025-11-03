from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...core.rbac_scope import get_user_scope_filters
from ...models.academic_load_file import AcademicLoadFile
from ...models.billing_report import BillingReport
from ...models.role import UserRoleEnum
from ...models.school import School
from ...models.term import Term
from ...schemas.dashboard import (
    DashboardContext,
    DashboardKPIs,
    DirectorDashboardResponse,
    HeatmapPoint,
    MonthlyTrendItem,
    RecentLoad,
    StackedByScheduleItem,
    TopBlockItem,
)
from ..dependencies import get_current_user

router = APIRouter()


def _weekday_label(days: str) -> str:
    # Mantener etiqueta tal cual viene (p.ej. "Lu-Vi", "Ma-Ju")
    return days


@router.get("/dashboards/director", response_model=DirectorDashboardResponse)
async def get_director_dashboard(
    term_id: int = Query(...),
    file_id: int | None = Query(None),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(async_get_db),
) -> DirectorDashboardResponse:
    """Dashboard para Directores.

    - Usa la escuela del director (RBAC) y el term_id proporcionado.
    - Selecciona la versión (file_id) más reciente si no se especifica.
    - Si hay planilla, construye kpis y charts a partir de payment_summaries y monthly_items.
    """

    user_role = current_user.get("role")
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role != UserRoleEnum.DIRECTOR:
        raise HTTPException(status_code=403, detail="Solo disponible para directores")

    scope = await get_user_scope_filters(db=db, user_uuid=current_user.get("user_uuid"), user_role=user_role)
    school_ids: list[int] | None = scope.get("school_ids") or []
    if not school_ids:
        raise HTTPException(status_code=403, detail="No tienes escuelas asignadas")

    # Para director asumimos una sola escuela; si hay varias, tomamos la primera
    school_id = school_ids[0]

    # Obtener versiones (cargas) del ciclo para la escuela
    files_stmt = (
        select(AcademicLoadFile)
        .filter(
            AcademicLoadFile.school_id == school_id,
            AcademicLoadFile.term_id == term_id,
        )
        .order_by(desc(AcademicLoadFile.is_active), desc(AcademicLoadFile.upload_date))
    )
    files_result = await db.execute(files_stmt)
    files = files_result.scalars().all()
    if not files:
        # Responder 200 con estructura vacía para permitir UI sin datos
        # Obtener info del term y la escuela para enriquecer el contexto
        term_obj = (await db.execute(select(Term).filter(Term.id == term_id))).scalar_one_or_none()
        school_obj = (await db.execute(select(School).filter(School.id == school_id))).scalar_one_or_none()
        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term if term_obj else None,
            term_year=term_obj.year if term_obj else None,
            school_id=school_id,
            school_acronym=school_obj.acronym if school_obj else None,
            file_id_selected=None,
            file_versions=[],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": [], "top_blocks": []},
            tables={"recent_loads": []},
        )

    # Seleccionar file_id si no se envió
    selected_file = None
    if file_id:
        selected_file = next((f for f in files if f.id == file_id), None)
        if not selected_file:
            raise HTTPException(status_code=404, detail="Carga seleccionada no encontrada en el ciclo")
    else:
        selected_file = next((f for f in files if f.is_active), None) or files[0]

    file_versions = [
        {
            "file_id": f.id,
            "version": f.version,
            "ingestion_status": f.ingestion_status,
            "upload_date": f.upload_date,
            "is_active": f.is_active,
        }
        for f in files
    ]

    # Buscar planilla del file seleccionado (más reciente)
    report_stmt = (
        select(BillingReport)
        .filter(BillingReport.academic_load_file_id == selected_file.id)
        .order_by(desc(BillingReport.created_at))
        .limit(1)
    )
    report = (await db.execute(report_stmt)).scalar_one_or_none()

    # Context
    context = DashboardContext(
        term_id=term_id,
        term_term=selected_file.term.term if selected_file.term else None,
        term_year=selected_file.term.year if selected_file.term else None,
        school_id=school_id,
        school_acronym=selected_file.school.acronym if selected_file.school else None,
        file_id_selected=selected_file.id,
        file_versions=file_versions,
    )

    # KPIs por defecto
    kpis = DashboardKPIs()

    charts: dict = {"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []}
    tables: dict = {"recent_loads": []}

    # Tabla de cargas recientes
    tables["recent_loads"] = [
        RecentLoad(
            file_id=f.id,
            version=f.version,
            ingestion_status=f.ingestion_status,
            upload_date=f.upload_date,
            has_billing_report=bool(
                (
                    await db.execute(select(BillingReport).filter(BillingReport.academic_load_file_id == f.id).limit(1))
                ).scalar_one_or_none()
            ),
        )
        for f in files
    ]

    if not report:
        return DirectorDashboardResponse(context=context, kpis=kpis, charts=charts, tables=tables)

    # Construir KPIs
    kpis.has_billing_report = True

    # monthly items
    monthly_items = report.monthly_items if hasattr(report, "monthly_items") else []
    total_hours = sum(float(mi.total_class_hours) for mi in monthly_items)
    total_dollars = sum(float(mi.total_dollars) for mi in monthly_items)
    kpis.total_hours = total_hours
    kpis.total_dollars = total_dollars

    # paid groups coverage desde payment_summaries (full=1.0, partial=0<rate<1, none=0)
    paid_full = paid_partial = paid_none = 0
    for ps in report.payment_summaries:
        # suma de rates por nivel; si alguna >0 cuenta como grupo pagado
        rates = [
            float(ps.payment_rate_grado),
            float(ps.payment_rate_maestria_1),
            float(ps.payment_rate_maestria_2),
            float(ps.payment_rate_doctor),
            float(ps.payment_rate_bilingue),
        ]
        s = sum(rates)
        if s == 0:
            paid_none += 1
        elif s >= 1.0:
            paid_full += 1
        else:
            paid_partial += 1
    total_groups = paid_full + paid_partial + paid_none
    kpis.paid_groups_full = paid_full
    kpis.paid_groups_partial = paid_partial
    kpis.paid_groups_none = paid_none
    kpis.coverage_rate = (paid_full + paid_partial) / total_groups if total_groups else 0.0

    # Heatmap: agregación por (day,schedule)
    heatmap_map: dict[tuple[str, str], tuple[float, float]] = {}
    for mi in monthly_items:
        key = (_weekday_label(mi.class_days), mi.class_schedule)
        prev_h, prev_d = heatmap_map.get(key, (0.0, 0.0))
        heatmap_map[key] = (prev_h + float(mi.total_class_hours), prev_d + float(mi.total_dollars))
    charts["heatmap"] = [
        HeatmapPoint(day=k[0], schedule=k[1], hours=v[0], dollars=v[1]) for k, v in heatmap_map.items()
    ]

    # Stacked by schedule (niveles) a partir de payment_summaries
    stacked_map: dict[str, dict[str, float]] = {}
    for ps in report.payment_summaries:
        sched = ps.class_schedule
        if sched not in stacked_map:
            stacked_map[sched] = {"GDO": 0.0, "M1": 0.0, "M2": 0.0, "DR": 0.0, "BLG": 0.0}
        stacked_map[sched]["GDO"] += float(ps.payment_rate_grado)
        stacked_map[sched]["M1"] += float(ps.payment_rate_maestria_1)
        stacked_map[sched]["M2"] += float(ps.payment_rate_maestria_2)
        stacked_map[sched]["DR"] += float(ps.payment_rate_doctor)
        stacked_map[sched]["BLG"] += float(ps.payment_rate_bilingue)
    charts["stacked_by_schedule"] = [StackedByScheduleItem(schedule=s, **vals) for s, vals in stacked_map.items()]

    # Monthly trend
    trend_map: dict[str, dict[str, float | int]] = {}
    for mi in monthly_items:
        month_key = f"{mi.year}-{mi.month:02d}"
        if month_key not in trend_map:
            trend_map[month_key] = {"sessions": 0, "hours": 0.0, "dollars": 0.0}
        trend_map[month_key]["sessions"] += int(mi.sessions)
        trend_map[month_key]["hours"] += float(mi.total_class_hours)
        trend_map[month_key]["dollars"] += float(mi.total_dollars)
    charts["monthly_trend"] = [
        MonthlyTrendItem(month=k, sessions=v["sessions"], hours=float(v["hours"]), dollars=float(v["dollars"]))
        for k, v in sorted(trend_map.items())
    ]

    # Top blocks (por $)
    block_map: dict[tuple[str, str, int], dict[str, float]] = {}
    # base de niveles desde payment summaries
    for ps in report.payment_summaries:
        key = (ps.class_days, ps.class_schedule, ps.class_duration)
        block_map.setdefault(
            key, {"GDO": 0.0, "M1": 0.0, "M2": 0.0, "DR": 0.0, "BLG": 0.0, "hours": 0.0, "dollars": 0.0}
        )
        block_map[key]["GDO"] += float(ps.payment_rate_grado)
        block_map[key]["M1"] += float(ps.payment_rate_maestria_1)
        block_map[key]["M2"] += float(ps.payment_rate_maestria_2)
        block_map[key]["DR"] += float(ps.payment_rate_doctor)
        block_map[key]["BLG"] += float(ps.payment_rate_bilingue)
    # acumular horas/$ desde monthly items
    for mi in monthly_items:
        key = (mi.class_days, mi.class_schedule, mi.class_duration)
        block_map.setdefault(
            key, {"GDO": 0.0, "M1": 0.0, "M2": 0.0, "DR": 0.0, "BLG": 0.0, "hours": 0.0, "dollars": 0.0}
        )
        block_map[key]["hours"] += float(mi.total_class_hours)
        block_map[key]["dollars"] += float(mi.total_dollars)

    top = sorted(block_map.items(), key=lambda kv: kv[1]["dollars"], reverse=True)[:10]
    charts["top_blocks"] = [
        TopBlockItem(
            class_days=k[0],
            class_schedule=k[1],
            class_duration=k[2],
            hours=v["hours"],
            dollars=v["dollars"],
            GDO=v["GDO"],
            M1=v["M1"],
            M2=v["M2"],
            DR=v["DR"],
            BLG=v["BLG"],
        )
        for k, v in top
    ]

    return DirectorDashboardResponse(context=context, kpis=kpis, charts=charts, tables=tables)
