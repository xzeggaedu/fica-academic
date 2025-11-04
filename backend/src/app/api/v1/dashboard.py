from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, distinct, func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...core.rbac_scope import get_user_scope_filters
from ...models.academic_load_class import AcademicLoadClass
from ...models.academic_load_file import AcademicLoadFile
from ...models.billing_report import BillingReport
from ...models.role import UserRoleEnum
from ...models.school import School
from ...models.term import Term
from ...schemas.dashboard import (
    CategoryPaymentItem,
    DashboardContext,
    DashboardKPIs,
    DirectorDashboardResponse,
    HeatmapPoint,
    MonthlyReportByFaculty,
    MonthlyReportSchoolItem,
    MonthlyTrendItem,
    RecentLoad,
    SectionsByModalityItem,
    SectionsBySchoolItem,
    StackedByScheduleItem,
    TopBlockItem,
)
from ..dependencies import get_current_user

router = APIRouter()


def _weekday_label(days: str) -> str:
    # Mantener etiqueta tal cual viene (p.ej. "Lu-Vi", "Ma-Ju")
    return days


def _class_type_to_modality(class_type: str) -> str:
    """Mapea class_type a nombre de modalidad legible."""
    class_type_upper = str(class_type).strip().upper()
    if class_type_upper == "P":
        return "Presenciales"
    if class_type_upper in ["EL", "E.L."]:
        return "En Línea"
    if class_type_upper == "V":
        return "Virtuales"
    return "Otros"


@router.get("/dashboards/director", response_model=DirectorDashboardResponse)
async def get_director_dashboard(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
    term_id: int = Query(...),
    file_id: int | None = Query(None),
    compare_term_id: int | None = Query(
        None,
        description=("Term ID para comparar; si no se envía, " "usa mismo term del año anterior si existe"),
    ),
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
            charts={
                "heatmap": [],
                "stacked_by_schedule": [],
                "monthly_trend": [],
                "top_blocks": [],
                "comparative_sections": [],
                "sections_by_school": [],
            },
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
        heatmap_map[key] = (
            prev_h + float(mi.total_class_hours),
            prev_d + float(mi.total_dollars),
        )
    charts["heatmap"] = [
        HeatmapPoint(day=k[0], schedule=k[1], hours=v[0], dollars=v[1]) for k, v in heatmap_map.items()
    ]

    # Stacked by schedule (niveles) a partir de payment_summaries
    stacked_map: dict[str, dict[str, float]] = {}
    for ps in report.payment_summaries:
        sched = ps.class_schedule
        if sched not in stacked_map:
            stacked_map[sched] = {
                "GDO": 0.0,
                "M1": 0.0,
                "M2": 0.0,
                "DR": 0.0,
                "BLG": 0.0,
            }
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
        MonthlyTrendItem(
            month=k,
            sessions=v["sessions"],
            hours=float(v["hours"]),
            dollars=float(v["dollars"]),
        )
        for k, v in sorted(trend_map.items())
    ]

    # Top blocks (por $)
    block_map: dict[tuple[str, str, int], dict[str, float]] = {}
    # base de niveles desde payment summaries
    for ps in report.payment_summaries:
        key = (ps.class_days, ps.class_schedule, ps.class_duration)
        block_map.setdefault(
            key,
            {
                "GDO": 0.0,
                "M1": 0.0,
                "M2": 0.0,
                "DR": 0.0,
                "BLG": 0.0,
                "hours": 0.0,
                "dollars": 0.0,
            },
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
            key,
            {
                "GDO": 0.0,
                "M1": 0.0,
                "M2": 0.0,
                "DR": 0.0,
                "BLG": 0.0,
                "hours": 0.0,
                "dollars": 0.0,
            },
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

    # --- Bloque de comparación ---
    comparison: dict | None = None
    try:
        # Determinar compare_term_id por defecto: mismo term del año anterior
        if compare_term_id is None and context.term_year and context.term_term:
            # buscar term con mismo term y year-1
            prev_term_stmt = select(Term).filter(Term.term == context.term_term, Term.year == context.term_year - 1)
            prev_term_obj = (await db.execute(prev_term_stmt)).scalar_one_or_none()
            compare_term_id = prev_term_obj.id if prev_term_obj else None

        if compare_term_id:
            cmp_term_obj = (await db.execute(select(Term).filter(Term.id == compare_term_id))).scalar_one_or_none()
            cmp_term_label = f"{cmp_term_obj.term:02d}/{cmp_term_obj.year}" if cmp_term_obj else None
            # archivos del ciclo de comparación para la misma escuela
            cmp_files_stmt = (
                select(AcademicLoadFile)
                .filter(
                    AcademicLoadFile.school_id == school_id,
                    AcademicLoadFile.term_id == compare_term_id,
                )
                .order_by(desc(AcademicLoadFile.is_active), desc(AcademicLoadFile.upload_date))
            )
            cmp_files = (await db.execute(cmp_files_stmt)).scalars().all()
            if cmp_files:
                cmp_file = next((f for f in cmp_files if f.is_active), None) or cmp_files[0]
                cmp_report = (
                    await db.execute(
                        select(BillingReport)
                        .filter(BillingReport.academic_load_file_id == cmp_file.id)
                        .order_by(desc(BillingReport.created_at))
                        .limit(1)
                    )
                ).scalar_one_or_none()
                # Solo si hay planilla comparable
                if cmp_report:
                    # métricas base (actual)
                    base_hours = float(kpis.total_hours)
                    base_dollars = float(kpis.total_dollars)
                    base_groups = len(report.payment_summaries)
                    base_cov = {
                        "full": int(kpis.paid_groups_full),
                        "partial": int(kpis.paid_groups_partial),
                        "none": int(kpis.paid_groups_none),
                    }
                    # métricas compare
                    cmp_monthly = cmp_report.monthly_items if hasattr(cmp_report, "monthly_items") else []
                    cmp_hours = sum(float(mi.total_class_hours) for mi in cmp_monthly)
                    cmp_dollars = sum(float(mi.total_dollars) for mi in cmp_monthly)
                    # cobertura
                    c_full = c_partial = c_none = 0
                    for ps in cmp_report.payment_summaries:
                        rsum = (
                            float(ps.payment_rate_grado)
                            + float(ps.payment_rate_maestria_1)
                            + float(ps.payment_rate_maestria_2)
                            + float(ps.payment_rate_doctor)
                            + float(ps.payment_rate_bilingue)
                        )
                        if rsum == 0:
                            c_none += 1
                        elif rsum >= 1.0:
                            c_full += 1
                        else:
                            c_partial += 1
                    cmp_groups = len(cmp_report.payment_summaries)
                    cmp_cov = {"full": c_full, "partial": c_partial, "none": c_none}

                    def _delta(a: float, b: float) -> dict:
                        abs_val = a - b
                        pct = (abs_val / b) if b else None
                        return {"abs": abs_val, "pct": pct}

                    comparison = {
                        "base": {
                            "term_id": term_id,
                            "term_label": (
                                f"{context.term_term:02d}/{context.term_year}"
                                if context.term_term and context.term_year
                                else None
                            ),
                            "total_hours": base_hours,
                            "total_dollars": base_dollars,
                            "groups_count": base_groups,
                            "coverage": base_cov,
                        },
                        "compare": {
                            "term_id": compare_term_id,
                            "term_label": cmp_term_label,
                            "total_hours": cmp_hours,
                            "total_dollars": cmp_dollars,
                            "groups_count": cmp_groups,
                            "coverage": cmp_cov,
                        },
                        "delta": {
                            "total_hours": _delta(base_hours, cmp_hours),
                            "total_dollars": _delta(base_dollars, cmp_dollars),
                            "groups_count": _delta(float(base_groups), float(cmp_groups)),
                            "coverage": {
                                "full": _delta(float(base_cov["full"]), float(cmp_cov["full"])),
                                "partial": _delta(
                                    float(base_cov["partial"]),
                                    float(cmp_cov["partial"]),
                                ),
                                "none": _delta(float(base_cov["none"]), float(cmp_cov["none"])),
                            },
                        },
                    }
    except Exception:
        comparison = None

    return DirectorDashboardResponse(context=context, kpis=kpis, charts=charts, tables=tables, comparison=comparison)


def _get_kpis_for_report(report: BillingReport | None) -> DashboardKPIs:
    """Extrae KPIs de un BillingReport."""
    kpis = DashboardKPIs()
    if not report:
        return kpis

    kpis.has_billing_report = True
    monthly_items = report.monthly_items if hasattr(report, "monthly_items") else []
    kpis.total_hours = sum(float(mi.total_class_hours) for mi in monthly_items)
    kpis.total_dollars = sum(float(mi.total_dollars) for mi in monthly_items)

    paid_full = paid_partial = paid_none = 0
    for ps in report.payment_summaries:
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
    return kpis


@router.get("/dashboards/decano", response_model=DirectorDashboardResponse)
async def get_decano_dashboard(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
    term_id: int = Query(...),
    school_id: int | None = Query(None, description="ID de escuela para filtrar; si no se envía, consolida todas"),
    compare_term_id: int | None = Query(
        None,
        description=("Term ID para comparar; si no se envía, " "usa mismo term del año anterior si existe"),
    ),
) -> DirectorDashboardResponse:
    """Dashboard para Decanos.

    - Consolida datos de todas las escuelas de la facultad del decano.
    - Si se proporciona school_id, filtra solo esa escuela.
    - Por defecto compara con el consolidado del mismo ciclo del año anterior.
    """

    user_role = current_user.get("role")
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role != UserRoleEnum.DECANO:
        raise HTTPException(status_code=403, detail="Solo disponible para decanos")

    scope = await get_user_scope_filters(db=db, user_uuid=current_user.get("user_uuid"), user_role=user_role)
    faculty_id: int | None = scope.get("faculty_id")
    if not faculty_id:
        raise HTTPException(status_code=403, detail="No tienes una facultad asignada")

    # Obtener escuelas de la facultad
    from ...models.faculty import Faculty

    faculty_obj = (await db.execute(select(Faculty).filter(Faculty.id == faculty_id))).scalar_one_or_none()
    if not faculty_obj:
        raise HTTPException(status_code=404, detail="Facultad no encontrada")

    # Si se especifica school_id, validar que pertenezca a la facultad
    target_school_ids: list[int] = []
    if school_id:
        school_obj = (
            await db.execute(select(School).filter(School.id == school_id, School.fk_faculty == faculty_id))
        ).scalar_one_or_none()
        if not school_obj:
            raise HTTPException(status_code=403, detail="Escuela no pertenece a tu facultad")
        target_school_ids = [school_id]
        school_acronyms = [school_obj.acronym]
    else:
        # Obtener todas las escuelas de la facultad
        schools_stmt = select(School).filter(School.fk_faculty == faculty_id, School.is_active.is_(True))
        schools_result = await db.execute(schools_stmt)
        schools = schools_result.scalars().all()
        target_school_ids = [s.id for s in schools]
        school_acronyms = [s.acronym for s in schools]

    # Obtener term info
    term_obj = (await db.execute(select(Term).filter(Term.id == term_id))).scalar_one_or_none()
    if not term_obj:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Obtener cargas activas más recientes por escuela
    files_stmt = (
        select(AcademicLoadFile)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .order_by(desc(AcademicLoadFile.upload_date))
    )
    files_result = await db.execute(files_stmt)
    files = files_result.scalars().all()

    if not files:
        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term,
            term_year=term_obj.year,
            faculty_id=faculty_id,
            school_ids=target_school_ids if not school_id else None,
            school_id=school_id,
            school_acronyms=school_acronyms if not school_id else None,
            school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
            file_versions=[],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []},
            tables={"recent_loads": []},
        )

    # Obtener billing reports más recientes por archivo
    file_ids = [f.id for f in files]
    reports_stmt = (
        select(BillingReport)
        .filter(BillingReport.academic_load_file_id.in_(file_ids))
        .order_by(desc(BillingReport.created_at))
    )
    reports_result = await db.execute(reports_stmt)
    all_reports = reports_result.scalars().all()

    # Agrupar por file_id y tomar el más reciente de cada uno
    reports_by_file: dict[int, BillingReport] = {}
    for r in all_reports:
        if r.academic_load_file_id not in reports_by_file:
            reports_by_file[r.academic_load_file_id] = r

    reports = list(reports_by_file.values())

    if not reports:
        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term,
            term_year=term_obj.year,
            faculty_id=faculty_id,
            school_ids=target_school_ids if not school_id else None,
            school_id=school_id,
            school_acronyms=school_acronyms if not school_id else None,
            school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
            file_versions=[
                {
                    "file_id": f.id,
                    "version": f.version,
                    "ingestion_status": f.ingestion_status,
                    "upload_date": f.upload_date,
                    "is_active": f.is_active,
                }
                for f in files
            ],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []},
            tables={"recent_loads": []},
        )

    # Consolidar KPIs
    kpis = DashboardKPIs()
    kpis.has_billing_report = True
    for r in reports:
        r_kpis = _get_kpis_for_report(r)
        kpis.total_hours += r_kpis.total_hours
        kpis.total_dollars += r_kpis.total_dollars
        kpis.paid_groups_full += r_kpis.paid_groups_full
        kpis.paid_groups_partial += r_kpis.paid_groups_partial
        kpis.paid_groups_none += r_kpis.paid_groups_none
    total_groups = kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none
    kpis.coverage_rate = (kpis.paid_groups_full + kpis.paid_groups_partial) / total_groups if total_groups else 0.0

    # Consolidar charts
    heatmap_map: dict[tuple[str, str], tuple[float, float]] = {}
    stacked_map: dict[str, dict[str, float]] = {}
    trend_map: dict[str, dict[str, float | int]] = {}

    for r in reports:
        # Heatmap
        for mi in r.monthly_items:
            key = (_weekday_label(mi.class_days), mi.class_schedule)
            prev_h, prev_d = heatmap_map.get(key, (0.0, 0.0))
            heatmap_map[key] = (
                prev_h + float(mi.total_class_hours),
                prev_d + float(mi.total_dollars),
            )

        # Stacked by schedule
        for ps in r.payment_summaries:
            sched = ps.class_schedule
            if sched not in stacked_map:
                stacked_map[sched] = {
                    "GDO": 0.0,
                    "M1": 0.0,
                    "M2": 0.0,
                    "DR": 0.0,
                    "BLG": 0.0,
                }
            stacked_map[sched]["GDO"] += float(ps.payment_rate_grado)
            stacked_map[sched]["M1"] += float(ps.payment_rate_maestria_1)
            stacked_map[sched]["M2"] += float(ps.payment_rate_maestria_2)
            stacked_map[sched]["DR"] += float(ps.payment_rate_doctor)
            stacked_map[sched]["BLG"] += float(ps.payment_rate_bilingue)

        # Monthly trend
        for mi in r.monthly_items:
            month_key = f"{mi.year}-{mi.month:02d}"
            if month_key not in trend_map:
                trend_map[month_key] = {"sessions": 0, "hours": 0.0, "dollars": 0.0}
            trend_map[month_key]["sessions"] += int(mi.sessions)
            trend_map[month_key]["hours"] += float(mi.total_class_hours)
            trend_map[month_key]["dollars"] += float(mi.total_dollars)

    charts = {
        "heatmap": [HeatmapPoint(day=k[0], schedule=k[1], hours=v[0], dollars=v[1]) for k, v in heatmap_map.items()],
        "stacked_by_schedule": [StackedByScheduleItem(schedule=s, **vals) for s, vals in stacked_map.items()],
        "monthly_trend": [
            MonthlyTrendItem(
                month=k,
                sessions=v["sessions"],
                hours=float(v["hours"]),
                dollars=float(v["dollars"]),
            )
            for k, v in sorted(trend_map.items())
        ],
        "comparative_sections": [],
        "sections_by_school": [],
    }

    # Secciones por modalidad - Ciclo actual
    current_sections_stmt = (
        select(
            AcademicLoadClass.class_type,
            func.count(distinct(tuple_(AcademicLoadClass.class_section, AcademicLoadClass.subject_code))).label(
                "count"
            ),
        )
        .join(AcademicLoadFile)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .group_by(AcademicLoadClass.class_type)
    )
    current_sections_result = await db.execute(current_sections_stmt)
    current_sections_data = current_sections_result.all()

    # Mapear resultados a modalidades
    modality_map_current: dict[str, int] = {
        "Presenciales": 0,
        "En Línea": 0,
        "Virtuales": 0,
    }
    for row in current_sections_data:
        modality = _class_type_to_modality(row.class_type)
        if modality in modality_map_current:
            modality_map_current[modality] = row.count

    # Secciones por escuela - Ciclo actual
    school_sections_stmt = (
        select(
            School.acronym,
            AcademicLoadClass.class_type,
            func.count(distinct(tuple_(AcademicLoadClass.class_section, AcademicLoadClass.subject_code))).label(
                "count"
            ),
        )
        .join(
            AcademicLoadFile,
            AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
        )
        .join(School, AcademicLoadFile.school_id == School.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .group_by(School.acronym, AcademicLoadClass.class_type)
    )
    school_sections_result = await db.execute(school_sections_stmt)
    school_sections_data = school_sections_result.all()

    # Inicializar variables para comparación (en caso de que no haya ciclo comparado)
    modality_map_compare = {"Presenciales": 0, "En Línea": 0, "Virtuales": 0}
    cmp_school_sections_data = []

    # Recent loads
    tables = {
        "recent_loads": [
            RecentLoad(
                file_id=f.id,
                version=f.version,
                ingestion_status=f.ingestion_status,
                upload_date=f.upload_date,
                has_billing_report=f.id in reports_by_file,
            )
            for f in files
        ]
    }

    # Context
    context = DashboardContext(
        term_id=term_id,
        term_term=term_obj.term,
        term_year=term_obj.year,
        faculty_id=faculty_id,
        school_ids=target_school_ids if not school_id else None,
        school_id=school_id,
        school_acronyms=school_acronyms if not school_id else None,
        school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
        file_versions=[
            {
                "file_id": f.id,
                "version": f.version,
                "ingestion_status": f.ingestion_status,
                "upload_date": f.upload_date,
                "is_active": f.is_active,
            }
            for f in files
        ],
    )

    # Comparison logic (similar a director)
    comparison = None
    try:
        if compare_term_id is None and term_obj.year:
            prev_year_term_obj = (
                await db.execute(select(Term).filter(Term.term == term_obj.term, Term.year == term_obj.year - 1))
            ).scalar_one_or_none()
            if prev_year_term_obj:
                compare_term_id = prev_year_term_obj.id

        if compare_term_id:
            # Obtener cargas y reports del ciclo comparado
            cmp_files_stmt = (
                select(AcademicLoadFile)
                .filter(
                    AcademicLoadFile.school_id.in_(target_school_ids),
                    AcademicLoadFile.term_id == compare_term_id,
                    AcademicLoadFile.is_active.is_(True),
                )
                .order_by(desc(AcademicLoadFile.upload_date))
            )
            cmp_files_result = await db.execute(cmp_files_stmt)
            cmp_files = cmp_files_result.scalars().all()

            if cmp_files:
                # Secciones por modalidad - Ciclo comparado
                cmp_sections_stmt = (
                    select(
                        AcademicLoadClass.class_type,
                        func.count(
                            distinct(
                                tuple_(
                                    AcademicLoadClass.class_section,
                                    AcademicLoadClass.subject_code,
                                )
                            )
                        ).label("count"),
                    )
                    .join(AcademicLoadFile)
                    .filter(
                        AcademicLoadFile.school_id.in_(target_school_ids),
                        AcademicLoadFile.term_id == compare_term_id,
                        AcademicLoadFile.is_active.is_(True),
                    )
                    .group_by(AcademicLoadClass.class_type)
                )
                cmp_sections_result = await db.execute(cmp_sections_stmt)
                cmp_sections_data = cmp_sections_result.all()

                modality_map_compare = {
                    "Presenciales": 0,
                    "En Línea": 0,
                    "Virtuales": 0,
                }
                for row in cmp_sections_data:
                    modality = _class_type_to_modality(row.class_type)
                    if modality in modality_map_compare:
                        modality_map_compare[modality] = row.count

                # Secciones por escuela - Ciclo comparado
                cmp_school_sections_stmt = (
                    select(
                        School.acronym,
                        AcademicLoadClass.class_type,
                        func.count(
                            distinct(
                                tuple_(
                                    AcademicLoadClass.class_section,
                                    AcademicLoadClass.subject_code,
                                )
                            )
                        ).label("count"),
                    )
                    .join(
                        AcademicLoadFile,
                        AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
                    )
                    .join(School, AcademicLoadFile.school_id == School.id)
                    .filter(
                        AcademicLoadFile.school_id.in_(target_school_ids),
                        AcademicLoadFile.term_id == compare_term_id,
                        AcademicLoadFile.is_active.is_(True),
                    )
                    .group_by(School.acronym, AcademicLoadClass.class_type)
                )
                cmp_school_sections_result = await db.execute(cmp_school_sections_stmt)
                cmp_school_sections_data = cmp_school_sections_result.all()

                cmp_file_ids = [f.id for f in cmp_files]
                cmp_reports_stmt = (
                    select(BillingReport)
                    .filter(BillingReport.academic_load_file_id.in_(cmp_file_ids))
                    .order_by(desc(BillingReport.created_at))
                )
                cmp_reports_result = await db.execute(cmp_reports_stmt)
                cmp_all_reports = cmp_reports_result.scalars().all()

                cmp_reports_by_file: dict[int, BillingReport] = {}
                for r in cmp_all_reports:
                    if r.academic_load_file_id not in cmp_reports_by_file:
                        cmp_reports_by_file[r.academic_load_file_id] = r

                cmp_reports = list(cmp_reports_by_file.values())

                if cmp_reports:
                    # Consolidar KPIs del ciclo comparado
                    cmp_kpis = DashboardKPIs()
                    cmp_kpis.has_billing_report = True
                    for r in cmp_reports:
                        r_kpis = _get_kpis_for_report(r)
                        cmp_kpis.total_hours += r_kpis.total_hours
                        cmp_kpis.total_dollars += r_kpis.total_dollars
                        cmp_kpis.paid_groups_full += r_kpis.paid_groups_full
                        cmp_kpis.paid_groups_partial += r_kpis.paid_groups_partial
                        cmp_kpis.paid_groups_none += r_kpis.paid_groups_none
                    cmp_total_groups = (
                        cmp_kpis.paid_groups_full + cmp_kpis.paid_groups_partial + cmp_kpis.paid_groups_none
                    )
                    cmp_kpis.coverage_rate = (
                        (cmp_kpis.paid_groups_full + cmp_kpis.paid_groups_partial) / cmp_total_groups
                        if cmp_total_groups
                        else 0.0
                    )

                    cmp_term_obj = (
                        await db.execute(select(Term).filter(Term.id == compare_term_id))
                    ).scalar_one_or_none()
                    cmp_term_label = f"{cmp_term_obj.term:02d}/{cmp_term_obj.year}" if cmp_term_obj else None

                    def _delta(a: float, b: float) -> dict:
                        abs_val = a - b
                        pct = (abs_val / b) if b else None
                        return {"abs": abs_val, "pct": pct}

                    comparison = {
                        "base": {
                            "term_id": term_id,
                            "term_label": f"{context.term_term:02d}/{context.term_year}"
                            if context.term_term and context.term_year
                            else None,
                            "total_hours": kpis.total_hours,
                            "total_dollars": kpis.total_dollars,
                            "groups_count": total_groups,
                            "coverage": {
                                "full": kpis.paid_groups_full,
                                "partial": kpis.paid_groups_partial,
                                "none": kpis.paid_groups_none,
                            },
                        },
                        "compare": {
                            "term_id": compare_term_id,
                            "term_label": cmp_term_label,
                            "total_hours": cmp_kpis.total_hours,
                            "total_dollars": cmp_kpis.total_dollars,
                            "groups_count": cmp_total_groups,
                            "coverage": {
                                "full": cmp_kpis.paid_groups_full,
                                "partial": cmp_kpis.paid_groups_partial,
                                "none": cmp_kpis.paid_groups_none,
                            },
                        },
                        "delta": {
                            "total_hours": _delta(kpis.total_hours, cmp_kpis.total_hours),
                            "total_dollars": _delta(kpis.total_dollars, cmp_kpis.total_dollars),
                            "groups_count": _delta(float(total_groups), float(cmp_total_groups)),
                            "coverage": {
                                "full": _delta(
                                    float(kpis.paid_groups_full),
                                    float(cmp_kpis.paid_groups_full),
                                ),
                                "partial": _delta(
                                    float(kpis.paid_groups_partial),
                                    float(cmp_kpis.paid_groups_partial),
                                ),
                                "none": _delta(
                                    float(kpis.paid_groups_none),
                                    float(cmp_kpis.paid_groups_none),
                                ),
                            },
                        },
                    }
    except Exception:
        comparison = None

    # Construir datos para gráfico comparativo por modalidad
    comparative_sections = [
        SectionsByModalityItem(
            modality=modality,
            cycle_current=modality_map_current.get(modality, 0),
            cycle_compare=modality_map_compare.get(modality, 0),
        )
        for modality in ["Presenciales", "En Línea", "Virtuales"]
    ]
    charts["comparative_sections"] = comparative_sections

    # Construir datos para gráfico por escuela
    # Agrupar por escuela y modalidad
    school_modality_map: dict[tuple[str, str], dict[str, int]] = {}
    for row in school_sections_data:
        modality = _class_type_to_modality(row.class_type)
        key = (row.acronym, modality)
        if key not in school_modality_map:
            school_modality_map[key] = {"current": 0, "compare": 0}
        school_modality_map[key]["current"] = row.count

    # Agregar datos del ciclo comparado si existen
    for row in cmp_school_sections_data:
        modality = _class_type_to_modality(row.class_type)
        key = (row.acronym, modality)
        if key not in school_modality_map:
            school_modality_map[key] = {"current": 0, "compare": 0}
        school_modality_map[key]["compare"] = row.count

    # Convertir a lista de SectionsBySchoolItem
    sections_by_school: list[SectionsBySchoolItem] = []
    for (school_acronym, modality), counts in school_modality_map.items():
        sections_by_school.append(
            SectionsBySchoolItem(
                school_acronym=school_acronym,
                modality=modality,
                cycle_current=counts["current"],
                cycle_compare=counts["compare"],
            )
        )
    charts["sections_by_school"] = sections_by_school

    # Tabla de categorías por estado de pago
    # Agrupar por escuela/facultad, categoría y estado de pago
    category_payment_stmt = (
        select(
            School.acronym,
            AcademicLoadClass.professor_category,
            AcademicLoadClass.professor_payment_rate,
            func.count(AcademicLoadClass.id).label("count"),
        )
        .join(
            AcademicLoadFile,
            AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
        )
        .join(School, AcademicLoadFile.school_id == School.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
            AcademicLoadClass.professor_category.isnot(None),
        )
        .group_by(
            School.acronym,
            AcademicLoadClass.professor_category,
            AcademicLoadClass.professor_payment_rate,
        )
    )
    category_payment_result = await db.execute(category_payment_stmt)
    category_payment_data = category_payment_result.all()

    # Agrupar por escuela y categoría
    school_category_map: dict[tuple[str, str], dict[str, int]] = {}
    for row in category_payment_data:
        category = row.professor_category.upper().strip()
        # Mapear COOR a CAT/COOR para la tabla
        if category == "COOR":
            category = "CAT/COOR"

        payment_rate = float(row.professor_payment_rate)
        key = (row.acronym, category)

        if key not in school_category_map:
            school_category_map[key] = {"pag": 0, "no_pag": 0, "par": 0}

        if payment_rate == 1.0:
            school_category_map[key]["pag"] += row.count
        elif payment_rate == 0.0:
            school_category_map[key]["no_pag"] += row.count
        elif 0.0 < payment_rate < 1.0:
            school_category_map[key]["par"] += row.count

    # Construir lista de CategoryPaymentItem por escuela
    category_payment_by_school: dict[str, list[CategoryPaymentItem]] = {}
    categories_order = ["DEC", "DIR", "CAT/COOR", "DTC", "ADM", "DHC"]

    for (school_acronym, category), counts in school_category_map.items():
        if school_acronym not in category_payment_by_school:
            category_payment_by_school[school_acronym] = []

        category_payment_by_school[school_acronym].append(
            CategoryPaymentItem(
                category=category,
                pag=counts["pag"],
                no_pag=counts["no_pag"],
                par=counts["par"],
            )
        )

    # Asegurar que todas las categorías estén presentes para cada escuela
    for school_acronym in category_payment_by_school:
        existing_categories = {item.category for item in category_payment_by_school[school_acronym]}
        for cat in categories_order:
            if cat not in existing_categories:
                category_payment_by_school[school_acronym].append(
                    CategoryPaymentItem(category=cat, pag=0, no_pag=0, par=0)
                )
        # Ordenar según el orden definido
        category_payment_by_school[school_acronym].sort(
            key=lambda x: categories_order.index(x.category) if x.category in categories_order else 999
        )

    tables["category_payment"] = category_payment_by_school

    # Reporte mensual por facultad (solo para vicerrector)
    # Obtener todos los monthly_items de los reportes de facturación para las escuelas seleccionadas
    from ...models.faculty import Faculty

    monthly_report_data: dict[int, dict[str, dict[str, float]]] = {}  # {faculty_id: {school_acronym: {month: dollars}}}
    faculty_info: dict[int, dict[str, str]] = {}  # {faculty_id: {"name": ..., "acronym": ...}}

    # Obtener reportes de facturación para las escuelas seleccionadas
    reports_stmt = (
        select(BillingReport)
        .join(AcademicLoadFile, BillingReport.academic_load_file_id == AcademicLoadFile.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .order_by(desc(BillingReport.created_at))
    )
    reports_result = await db.execute(reports_stmt)
    all_reports = reports_result.scalars().all()

    # Obtener el reporte más reciente por archivo
    reports_by_file: dict[int, BillingReport] = {}
    for r in all_reports:
        if r.academic_load_file_id not in reports_by_file:
            reports_by_file[r.academic_load_file_id] = r

    # Obtener archivos para mapear escuela -> facultad
    files_stmt = (
        select(AcademicLoadFile, School, Faculty)
        .join(School, AcademicLoadFile.school_id == School.id)
        .join(Faculty, School.fk_faculty == Faculty.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
    )
    files_result = await db.execute(files_stmt)
    files_data = files_result.all()

    # Mapeo de file_id -> (school_acronym, faculty_id, faculty_name, faculty_acronym)
    file_to_info: dict[int, tuple[str, int, str, str]] = {}
    for file_row, school_obj, faculty_obj in files_data:
        file_to_info[file_row.id] = (
            school_obj.acronym,
            faculty_obj.id,
            faculty_obj.name,
            faculty_obj.acronym,
        )

    # Procesar monthly_items
    month_map = {7: "july", 8: "august", 9: "september", 10: "october", 11: "november", 12: "december"}

    for file_id, report in reports_by_file.items():
        if file_id not in file_to_info:
            continue

        school_acronym, faculty_id, faculty_name, faculty_acronym = file_to_info[file_id]

        # Inicializar estructuras si no existen
        if faculty_id not in monthly_report_data:
            monthly_report_data[faculty_id] = {}
            faculty_info[faculty_id] = {"name": faculty_name, "acronym": faculty_acronym}

        if school_acronym not in monthly_report_data[faculty_id]:
            monthly_report_data[faculty_id][school_acronym] = {
                "july": 0.0,
                "august": 0.0,
                "september": 0.0,
                "october": 0.0,
                "november": 0.0,
                "december": 0.0,
            }

        # Sumar monthly_items
        for mi in report.monthly_items:
            if mi.month in month_map:
                month_key = month_map[mi.month]
                monthly_report_data[faculty_id][school_acronym][month_key] += float(mi.total_dollars)

    # Construir MonthlyReportByFaculty
    monthly_reports_by_faculty: list[MonthlyReportByFaculty] = []
    for faculty_id, schools_data in monthly_report_data.items():
        faculty_name = faculty_info[faculty_id]["name"]
        faculty_acronym = faculty_info[faculty_id]["acronym"]

        # Construir lista de escuelas
        school_items: list[MonthlyReportSchoolItem] = []
        for school_acronym, months_data in schools_data.items():
            total = sum(months_data.values())
            school_items.append(
                MonthlyReportSchoolItem(
                    school_acronym=school_acronym,
                    july=months_data["july"],
                    august=months_data["august"],
                    september=months_data["september"],
                    october=months_data["october"],
                    november=months_data["november"],
                    december=months_data["december"],
                    total=total,
                )
            )

        # Calcular totales mensuales para la facultad
        monthly_totals = {
            "july": sum(s.july for s in school_items),
            "august": sum(s.august for s in school_items),
            "september": sum(s.september for s in school_items),
            "october": sum(s.october for s in school_items),
            "november": sum(s.november for s in school_items),
            "december": sum(s.december for s in school_items),
        }

        # Calcular diferencias (por ahora vacío, se puede usar para comparar con otro período)
        monthly_differences = {}

        monthly_reports_by_faculty.append(
            MonthlyReportByFaculty(
                faculty_id=faculty_id,
                faculty_name=faculty_name,
                faculty_acronym=faculty_acronym,
                schools=school_items,
                monthly_totals=monthly_totals,
                monthly_differences=monthly_differences,
            )
        )

    # Ordenar por faculty_id
    monthly_reports_by_faculty.sort(key=lambda x: x.faculty_id)

    tables["monthly_report_by_faculty"] = [mr.model_dump() for mr in monthly_reports_by_faculty]

    return DirectorDashboardResponse(context=context, kpis=kpis, charts=charts, tables=tables, comparison=comparison)


@router.get("/dashboards/vicerrector", response_model=DirectorDashboardResponse)
async def get_vicerrector_dashboard(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(async_get_db),
    term_id: int = Query(...),
    faculty_id: int | None = Query(None, description="ID de facultad para filtrar; si no se envía, consolida todas"),
    school_id: int | None = Query(None, description="ID de escuela para filtrar; si no se envía, consolida todas"),
    compare_term_id: int | None = Query(
        None,
        description=("Term ID para comparar; si no se envía, " "usa mismo term del año anterior si existe"),
    ),
) -> DirectorDashboardResponse:
    """Dashboard para Vicerrectores.

    - Si faculty_id es None: consolida datos de todas las facultades.
    - Si faculty_id está especificado pero school_id es None: consolida todas las escuelas de esa facultad.
    - Si ambos están especificados: muestra solo esa escuela.
    - Por defecto compara con el consolidado del mismo ciclo del año anterior.
    """

    user_role = current_user.get("role")
    if isinstance(user_role, str):
        user_role = UserRoleEnum(user_role)

    if user_role != UserRoleEnum.VICERRECTOR:
        raise HTTPException(status_code=403, detail="Solo disponible para vicerrectores")

    # Obtener facultades y escuelas según los filtros
    from ...models.faculty import Faculty

    target_school_ids: list[int] = []
    school_acronyms: list[str] = []
    target_faculty_id: int | None = None

    if school_id:
        # Si se especifica school_id, validar que exista y obtener su facultad
        school_obj = (await db.execute(select(School).filter(School.id == school_id))).scalar_one_or_none()
        if not school_obj:
            raise HTTPException(status_code=404, detail="Escuela no encontrada")
        if faculty_id and school_obj.fk_faculty != faculty_id:
            raise HTTPException(status_code=400, detail="La escuela no pertenece a la facultad especificada")
        target_school_ids = [school_id]
        school_acronyms = [school_obj.acronym]
        target_faculty_id = school_obj.fk_faculty
    elif faculty_id:
        # Si solo se especifica faculty_id, obtener todas las escuelas de esa facultad
        faculty_obj = (await db.execute(select(Faculty).filter(Faculty.id == faculty_id))).scalar_one_or_none()
        if not faculty_obj:
            raise HTTPException(status_code=404, detail="Facultad no encontrada")
        schools_stmt = select(School).filter(School.fk_faculty == faculty_id, School.is_active.is_(True))
        schools_result = await db.execute(schools_stmt)
        schools = schools_result.scalars().all()
        target_school_ids = [s.id for s in schools]
        school_acronyms = [s.acronym for s in schools]
        target_faculty_id = faculty_id
    else:
        # Si no se especifica ninguno, obtener todas las escuelas de todas las facultades
        schools_stmt = select(School).filter(School.is_active.is_(True))
        schools_result = await db.execute(schools_stmt)
        schools = schools_result.scalars().all()
        target_school_ids = [s.id for s in schools]
        school_acronyms = [s.acronym for s in schools]
        target_faculty_id = None

    if not target_school_ids:
        # Obtener term info
        term_obj = (await db.execute(select(Term).filter(Term.id == term_id))).scalar_one_or_none()
        if not term_obj:
            raise HTTPException(status_code=404, detail="Ciclo no encontrado")

        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term,
            term_year=term_obj.year,
            faculty_id=target_faculty_id,
            school_ids=target_school_ids if not school_id else None,
            school_id=school_id,
            school_acronyms=school_acronyms if not school_id else None,
            school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
            file_versions=[],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []},
            tables={"recent_loads": []},
        )

    # Obtener term info
    term_obj = (await db.execute(select(Term).filter(Term.id == term_id))).scalar_one_or_none()
    if not term_obj:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Obtener cargas activas más recientes por escuela
    files_stmt = (
        select(AcademicLoadFile)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .order_by(desc(AcademicLoadFile.upload_date))
    )
    files_result = await db.execute(files_stmt)
    files = files_result.scalars().all()

    if not files:
        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term,
            term_year=term_obj.year,
            faculty_id=target_faculty_id,
            school_ids=target_school_ids if not school_id else None,
            school_id=school_id,
            school_acronyms=school_acronyms if not school_id else None,
            school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
            file_versions=[],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []},
            tables={"recent_loads": []},
        )

    # Obtener billing reports más recientes por archivo
    file_ids = [f.id for f in files]
    reports_stmt = (
        select(BillingReport)
        .filter(BillingReport.academic_load_file_id.in_(file_ids))
        .order_by(desc(BillingReport.created_at))
    )
    reports_result = await db.execute(reports_stmt)
    all_reports = reports_result.scalars().all()

    # Agrupar por file_id y tomar el más reciente de cada uno
    reports_by_file: dict[int, BillingReport] = {}
    for r in all_reports:
        if r.academic_load_file_id not in reports_by_file:
            reports_by_file[r.academic_load_file_id] = r

    reports = list(reports_by_file.values())

    if not reports:
        context = DashboardContext(
            term_id=term_id,
            term_term=term_obj.term,
            term_year=term_obj.year,
            faculty_id=target_faculty_id,
            school_ids=target_school_ids if not school_id else None,
            school_id=school_id,
            school_acronyms=school_acronyms if not school_id else None,
            school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
            file_versions=[
                {
                    "file_id": f.id,
                    "version": f.version,
                    "ingestion_status": f.ingestion_status,
                    "upload_date": f.upload_date,
                    "is_active": f.is_active,
                }
                for f in files
            ],
        )
        return DirectorDashboardResponse(
            context=context,
            kpis=DashboardKPIs(),
            charts={"heatmap": [], "stacked_by_schedule": [], "monthly_trend": []},
            tables={"recent_loads": []},
        )

    # Consolidar KPIs
    kpis = DashboardKPIs()
    kpis.has_billing_report = True
    for r in reports:
        r_kpis = _get_kpis_for_report(r)
        kpis.total_hours += r_kpis.total_hours
        kpis.total_dollars += r_kpis.total_dollars
        kpis.paid_groups_full += r_kpis.paid_groups_full
        kpis.paid_groups_partial += r_kpis.paid_groups_partial
        kpis.paid_groups_none += r_kpis.paid_groups_none
    total_groups = kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none
    kpis.coverage_rate = (kpis.paid_groups_full + kpis.paid_groups_partial) / total_groups if total_groups else 0.0

    # Consolidar charts
    heatmap_map: dict[tuple[str, str], tuple[float, float]] = {}
    stacked_map: dict[str, dict[str, float]] = {}
    trend_map: dict[str, dict[str, float | int]] = {}

    for r in reports:
        # Heatmap
        for mi in r.monthly_items:
            key = (_weekday_label(mi.class_days), mi.class_schedule)
            prev_h, prev_d = heatmap_map.get(key, (0.0, 0.0))
            heatmap_map[key] = (
                prev_h + float(mi.total_class_hours),
                prev_d + float(mi.total_dollars),
            )

        # Stacked by schedule
        for ps in r.payment_summaries:
            sched = ps.class_schedule
            if sched not in stacked_map:
                stacked_map[sched] = {
                    "GDO": 0.0,
                    "M1": 0.0,
                    "M2": 0.0,
                    "DR": 0.0,
                    "BLG": 0.0,
                }
            stacked_map[sched]["GDO"] += float(ps.payment_rate_grado)
            stacked_map[sched]["M1"] += float(ps.payment_rate_maestria_1)
            stacked_map[sched]["M2"] += float(ps.payment_rate_maestria_2)
            stacked_map[sched]["DR"] += float(ps.payment_rate_doctor)
            stacked_map[sched]["BLG"] += float(ps.payment_rate_bilingue)

        # Monthly trend
        for mi in r.monthly_items:
            month_key = f"{mi.year}-{mi.month:02d}"
            if month_key not in trend_map:
                trend_map[month_key] = {"sessions": 0, "hours": 0.0, "dollars": 0.0}
            trend_map[month_key]["sessions"] += int(mi.sessions)
            trend_map[month_key]["hours"] += float(mi.total_class_hours)
            trend_map[month_key]["dollars"] += float(mi.total_dollars)

    charts = {
        "heatmap": [HeatmapPoint(day=k[0], schedule=k[1], hours=v[0], dollars=v[1]) for k, v in heatmap_map.items()],
        "stacked_by_schedule": [StackedByScheduleItem(schedule=s, **vals) for s, vals in stacked_map.items()],
        "monthly_trend": [
            MonthlyTrendItem(
                month=k,
                sessions=v["sessions"],
                hours=float(v["hours"]),
                dollars=float(v["dollars"]),
            )
            for k, v in sorted(trend_map.items())
        ],
        "comparative_sections": [],
        "sections_by_school": [],
    }

    # Secciones por modalidad - Ciclo actual
    current_sections_stmt = (
        select(
            AcademicLoadClass.class_type,
            func.count(distinct(tuple_(AcademicLoadClass.class_section, AcademicLoadClass.subject_code))).label(
                "count"
            ),
        )
        .join(AcademicLoadFile)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .group_by(AcademicLoadClass.class_type)
    )
    current_sections_result = await db.execute(current_sections_stmt)
    current_sections_data = current_sections_result.all()

    # Mapear resultados a modalidades
    modality_map_current: dict[str, int] = {
        "Presenciales": 0,
        "En Línea": 0,
        "Virtuales": 0,
    }
    for row in current_sections_data:
        modality = _class_type_to_modality(row.class_type)
        if modality in modality_map_current:
            modality_map_current[modality] = row.count

    # Secciones por escuela - Ciclo actual
    school_sections_stmt = (
        select(
            School.acronym,
            AcademicLoadClass.class_type,
            func.count(distinct(tuple_(AcademicLoadClass.class_section, AcademicLoadClass.subject_code))).label(
                "count"
            ),
        )
        .join(
            AcademicLoadFile,
            AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
        )
        .join(School, AcademicLoadFile.school_id == School.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .group_by(School.acronym, AcademicLoadClass.class_type)
    )
    school_sections_result = await db.execute(school_sections_stmt)
    school_sections_data = school_sections_result.all()

    # Inicializar variables para comparación (en caso de que no haya ciclo comparado)
    modality_map_compare = {"Presenciales": 0, "En Línea": 0, "Virtuales": 0}
    cmp_school_sections_data = []

    # Recent loads
    tables = {
        "recent_loads": [
            RecentLoad(
                file_id=f.id,
                version=f.version,
                ingestion_status=f.ingestion_status,
                upload_date=f.upload_date,
                has_billing_report=f.id in reports_by_file,
            )
            for f in files
        ]
    }

    # Context
    context = DashboardContext(
        term_id=term_id,
        term_term=term_obj.term,
        term_year=term_obj.year,
        faculty_id=target_faculty_id,
        school_ids=target_school_ids if not school_id else None,
        school_id=school_id,
        school_acronyms=school_acronyms if not school_id else None,
        school_acronym=school_acronyms[0] if school_id and school_acronyms else None,
        file_versions=[
            {
                "file_id": f.id,
                "version": f.version,
                "ingestion_status": f.ingestion_status,
                "upload_date": f.upload_date,
                "is_active": f.is_active,
            }
            for f in files
        ],
    )

    # Comparison logic (similar a decano)
    comparison = None
    try:
        if compare_term_id is None and term_obj.year:
            prev_year_term_obj = (
                await db.execute(select(Term).filter(Term.term == term_obj.term, Term.year == term_obj.year - 1))
            ).scalar_one_or_none()
            if prev_year_term_obj:
                compare_term_id = prev_year_term_obj.id

        if compare_term_id:
            # Obtener cargas y reports del ciclo comparado
            cmp_files_stmt = (
                select(AcademicLoadFile)
                .filter(
                    AcademicLoadFile.school_id.in_(target_school_ids),
                    AcademicLoadFile.term_id == compare_term_id,
                    AcademicLoadFile.is_active.is_(True),
                )
                .order_by(desc(AcademicLoadFile.upload_date))
            )
            cmp_files_result = await db.execute(cmp_files_stmt)
            cmp_files = cmp_files_result.scalars().all()

            if cmp_files:
                # Secciones por modalidad - Ciclo comparado
                cmp_sections_stmt = (
                    select(
                        AcademicLoadClass.class_type,
                        func.count(
                            distinct(
                                tuple_(
                                    AcademicLoadClass.class_section,
                                    AcademicLoadClass.subject_code,
                                )
                            )
                        ).label("count"),
                    )
                    .join(AcademicLoadFile)
                    .filter(
                        AcademicLoadFile.school_id.in_(target_school_ids),
                        AcademicLoadFile.term_id == compare_term_id,
                        AcademicLoadFile.is_active.is_(True),
                    )
                    .group_by(AcademicLoadClass.class_type)
                )
                cmp_sections_result = await db.execute(cmp_sections_stmt)
                cmp_sections_data = cmp_sections_result.all()

                modality_map_compare = {
                    "Presenciales": 0,
                    "En Línea": 0,
                    "Virtuales": 0,
                }
                for row in cmp_sections_data:
                    modality = _class_type_to_modality(row.class_type)
                    if modality in modality_map_compare:
                        modality_map_compare[modality] = row.count

                # Secciones por escuela - Ciclo comparado
                cmp_school_sections_stmt = (
                    select(
                        School.acronym,
                        AcademicLoadClass.class_type,
                        func.count(
                            distinct(
                                tuple_(
                                    AcademicLoadClass.class_section,
                                    AcademicLoadClass.subject_code,
                                )
                            )
                        ).label("count"),
                    )
                    .join(
                        AcademicLoadFile,
                        AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
                    )
                    .join(School, AcademicLoadFile.school_id == School.id)
                    .filter(
                        AcademicLoadFile.school_id.in_(target_school_ids),
                        AcademicLoadFile.term_id == compare_term_id,
                        AcademicLoadFile.is_active.is_(True),
                    )
                    .group_by(School.acronym, AcademicLoadClass.class_type)
                )
                cmp_school_sections_result = await db.execute(cmp_school_sections_stmt)
                cmp_school_sections_data = cmp_school_sections_result.all()

                cmp_file_ids = [f.id for f in cmp_files]
                cmp_reports_stmt = (
                    select(BillingReport)
                    .filter(BillingReport.academic_load_file_id.in_(cmp_file_ids))
                    .order_by(desc(BillingReport.created_at))
                )
                cmp_reports_result = await db.execute(cmp_reports_stmt)
                cmp_all_reports = cmp_reports_result.scalars().all()

                cmp_reports_by_file: dict[int, BillingReport] = {}
                for r in cmp_all_reports:
                    if r.academic_load_file_id not in cmp_reports_by_file:
                        cmp_reports_by_file[r.academic_load_file_id] = r

                cmp_reports = list(cmp_reports_by_file.values())

                if cmp_reports:
                    # Consolidar KPIs del ciclo comparado
                    cmp_kpis = DashboardKPIs()
                    cmp_kpis.has_billing_report = True
                    for r in cmp_reports:
                        r_kpis = _get_kpis_for_report(r)
                        cmp_kpis.total_hours += r_kpis.total_hours
                        cmp_kpis.total_dollars += r_kpis.total_dollars
                        cmp_kpis.paid_groups_full += r_kpis.paid_groups_full
                        cmp_kpis.paid_groups_partial += r_kpis.paid_groups_partial
                        cmp_kpis.paid_groups_none += r_kpis.paid_groups_none
                    cmp_total_groups = (
                        cmp_kpis.paid_groups_full + cmp_kpis.paid_groups_partial + cmp_kpis.paid_groups_none
                    )
                    cmp_kpis.coverage_rate = (
                        (cmp_kpis.paid_groups_full + cmp_kpis.paid_groups_partial) / cmp_total_groups
                        if cmp_total_groups
                        else 0.0
                    )

                    cmp_term_obj = (
                        await db.execute(select(Term).filter(Term.id == compare_term_id))
                    ).scalar_one_or_none()
                    cmp_term_label = f"{cmp_term_obj.term:02d}/{cmp_term_obj.year}" if cmp_term_obj else None

                    def _delta(a: float, b: float) -> dict:
                        abs_val = a - b
                        pct = (abs_val / b) if b else None
                        return {"abs": abs_val, "pct": pct}

                    comparison = {
                        "base": {
                            "term_id": term_id,
                            "term_label": f"{context.term_term:02d}/{context.term_year}"
                            if context.term_term and context.term_year
                            else None,
                            "total_hours": kpis.total_hours,
                            "total_dollars": kpis.total_dollars,
                            "groups_count": total_groups,
                            "coverage": {
                                "full": kpis.paid_groups_full,
                                "partial": kpis.paid_groups_partial,
                                "none": kpis.paid_groups_none,
                            },
                        },
                        "compare": {
                            "term_id": compare_term_id,
                            "term_label": cmp_term_label,
                            "total_hours": cmp_kpis.total_hours,
                            "total_dollars": cmp_kpis.total_dollars,
                            "groups_count": cmp_total_groups,
                            "coverage": {
                                "full": cmp_kpis.paid_groups_full,
                                "partial": cmp_kpis.paid_groups_partial,
                                "none": cmp_kpis.paid_groups_none,
                            },
                        },
                        "delta": {
                            "total_hours": _delta(kpis.total_hours, cmp_kpis.total_hours),
                            "total_dollars": _delta(kpis.total_dollars, cmp_kpis.total_dollars),
                            "groups_count": _delta(float(total_groups), float(cmp_total_groups)),
                            "coverage": {
                                "full": _delta(
                                    float(kpis.paid_groups_full),
                                    float(cmp_kpis.paid_groups_full),
                                ),
                                "partial": _delta(
                                    float(kpis.paid_groups_partial),
                                    float(cmp_kpis.paid_groups_partial),
                                ),
                                "none": _delta(
                                    float(kpis.paid_groups_none),
                                    float(cmp_kpis.paid_groups_none),
                                ),
                            },
                        },
                    }
    except Exception:
        comparison = None

    # Construir datos para gráfico comparativo por modalidad
    comparative_sections = [
        SectionsByModalityItem(
            modality=modality,
            cycle_current=modality_map_current.get(modality, 0),
            cycle_compare=modality_map_compare.get(modality, 0),
        )
        for modality in ["Presenciales", "En Línea", "Virtuales"]
    ]
    charts["comparative_sections"] = comparative_sections

    # Construir datos para gráfico por escuela
    # Agrupar por escuela y modalidad
    school_modality_map: dict[tuple[str, str], dict[str, int]] = {}
    for row in school_sections_data:
        modality = _class_type_to_modality(row.class_type)
        key = (row.acronym, modality)
        if key not in school_modality_map:
            school_modality_map[key] = {"current": 0, "compare": 0}
        school_modality_map[key]["current"] = row.count

    # Agregar datos del ciclo comparado si existen
    for row in cmp_school_sections_data:
        modality = _class_type_to_modality(row.class_type)
        key = (row.acronym, modality)
        if key not in school_modality_map:
            school_modality_map[key] = {"current": 0, "compare": 0}
        school_modality_map[key]["compare"] = row.count

    # Convertir a lista de SectionsBySchoolItem
    sections_by_school: list[SectionsBySchoolItem] = []
    for (school_acronym, modality), counts in school_modality_map.items():
        sections_by_school.append(
            SectionsBySchoolItem(
                school_acronym=school_acronym,
                modality=modality,
                cycle_current=counts["current"],
                cycle_compare=counts["compare"],
            )
        )
    charts["sections_by_school"] = sections_by_school

    # Tabla de categorías por estado de pago
    # Agrupar por escuela/facultad, categoría y estado de pago
    category_payment_stmt = (
        select(
            School.acronym,
            AcademicLoadClass.professor_category,
            AcademicLoadClass.professor_payment_rate,
            func.count(AcademicLoadClass.id).label("count"),
        )
        .join(
            AcademicLoadFile,
            AcademicLoadClass.academic_load_file_id == AcademicLoadFile.id,
        )
        .join(School, AcademicLoadFile.school_id == School.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
            AcademicLoadClass.professor_category.isnot(None),
        )
        .group_by(
            School.acronym,
            AcademicLoadClass.professor_category,
            AcademicLoadClass.professor_payment_rate,
        )
    )
    category_payment_result = await db.execute(category_payment_stmt)
    category_payment_data = category_payment_result.all()

    # Agrupar por escuela y categoría
    school_category_map: dict[tuple[str, str], dict[str, int]] = {}
    for row in category_payment_data:
        category = row.professor_category.upper().strip()
        # Mapear COOR a CAT/COOR para la tabla
        if category == "COOR":
            category = "CAT/COOR"

        payment_rate = float(row.professor_payment_rate)
        key = (row.acronym, category)

        if key not in school_category_map:
            school_category_map[key] = {"pag": 0, "no_pag": 0, "par": 0}

        if payment_rate == 1.0:
            school_category_map[key]["pag"] += row.count
        elif payment_rate == 0.0:
            school_category_map[key]["no_pag"] += row.count
        elif 0.0 < payment_rate < 1.0:
            school_category_map[key]["par"] += row.count

    # Construir lista de CategoryPaymentItem por escuela
    category_payment_by_school: dict[str, list[CategoryPaymentItem]] = {}
    categories_order = ["DEC", "DIR", "CAT/COOR", "DTC", "ADM", "DHC"]

    for (school_acronym, category), counts in school_category_map.items():
        if school_acronym not in category_payment_by_school:
            category_payment_by_school[school_acronym] = []

        category_payment_by_school[school_acronym].append(
            CategoryPaymentItem(
                category=category,
                pag=counts["pag"],
                no_pag=counts["no_pag"],
                par=counts["par"],
            )
        )

    # Asegurar que todas las categorías estén presentes para cada escuela
    for school_acronym in category_payment_by_school:
        existing_categories = {item.category for item in category_payment_by_school[school_acronym]}
        for cat in categories_order:
            if cat not in existing_categories:
                category_payment_by_school[school_acronym].append(
                    CategoryPaymentItem(category=cat, pag=0, no_pag=0, par=0)
                )
        # Ordenar según el orden definido
        category_payment_by_school[school_acronym].sort(
            key=lambda x: categories_order.index(x.category) if x.category in categories_order else 999
        )

    tables["category_payment"] = category_payment_by_school

    # Reporte mensual por facultad (solo para vicerrector)
    # Obtener todos los monthly_items de los reportes de facturación para las escuelas seleccionadas
    from ...models.faculty import Faculty

    monthly_report_data: dict[int, dict[str, dict[str, float]]] = {}  # {faculty_id: {school_acronym: {month: dollars}}}
    faculty_info: dict[int, dict[str, str]] = {}  # {faculty_id: {"name": ..., "acronym": ...}}

    # Obtener reportes de facturación para las escuelas seleccionadas
    reports_stmt = (
        select(BillingReport)
        .join(AcademicLoadFile, BillingReport.academic_load_file_id == AcademicLoadFile.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
        .order_by(desc(BillingReport.created_at))
    )
    reports_result = await db.execute(reports_stmt)
    all_reports = reports_result.scalars().all()

    # Obtener el reporte más reciente por archivo
    reports_by_file: dict[int, BillingReport] = {}
    for r in all_reports:
        if r.academic_load_file_id not in reports_by_file:
            reports_by_file[r.academic_load_file_id] = r

    # Obtener archivos para mapear escuela -> facultad
    files_stmt = (
        select(AcademicLoadFile, School, Faculty)
        .join(School, AcademicLoadFile.school_id == School.id)
        .join(Faculty, School.fk_faculty == Faculty.id)
        .filter(
            AcademicLoadFile.school_id.in_(target_school_ids),
            AcademicLoadFile.term_id == term_id,
            AcademicLoadFile.is_active.is_(True),
        )
    )
    files_result = await db.execute(files_stmt)
    files_data = files_result.all()

    # Mapeo de file_id -> (school_acronym, faculty_id, faculty_name, faculty_acronym)
    file_to_info: dict[int, tuple[str, int, str, str]] = {}
    for file_row, school_obj, faculty_obj in files_data:
        file_to_info[file_row.id] = (
            school_obj.acronym,
            faculty_obj.id,
            faculty_obj.name,
            faculty_obj.acronym,
        )

    # Procesar monthly_items
    month_map = {7: "july", 8: "august", 9: "september", 10: "october", 11: "november", 12: "december"}

    for file_id, report in reports_by_file.items():
        if file_id not in file_to_info:
            continue

        school_acronym, faculty_id, faculty_name, faculty_acronym = file_to_info[file_id]

        # Inicializar estructuras si no existen
        if faculty_id not in monthly_report_data:
            monthly_report_data[faculty_id] = {}
            faculty_info[faculty_id] = {"name": faculty_name, "acronym": faculty_acronym}

        if school_acronym not in monthly_report_data[faculty_id]:
            monthly_report_data[faculty_id][school_acronym] = {
                "july": 0.0,
                "august": 0.0,
                "september": 0.0,
                "october": 0.0,
                "november": 0.0,
                "december": 0.0,
            }

        # Sumar monthly_items
        for mi in report.monthly_items:
            if mi.month in month_map:
                month_key = month_map[mi.month]
                monthly_report_data[faculty_id][school_acronym][month_key] += float(mi.total_dollars)

    # Construir MonthlyReportByFaculty
    monthly_reports_by_faculty: list[MonthlyReportByFaculty] = []
    for faculty_id, schools_data in monthly_report_data.items():
        faculty_name = faculty_info[faculty_id]["name"]
        faculty_acronym = faculty_info[faculty_id]["acronym"]

        # Construir lista de escuelas
        school_items: list[MonthlyReportSchoolItem] = []
        for school_acronym, months_data in schools_data.items():
            total = sum(months_data.values())
            school_items.append(
                MonthlyReportSchoolItem(
                    school_acronym=school_acronym,
                    july=months_data["july"],
                    august=months_data["august"],
                    september=months_data["september"],
                    october=months_data["october"],
                    november=months_data["november"],
                    december=months_data["december"],
                    total=total,
                )
            )

        # Calcular totales mensuales para la facultad
        monthly_totals = {
            "july": sum(s.july for s in school_items),
            "august": sum(s.august for s in school_items),
            "september": sum(s.september for s in school_items),
            "october": sum(s.october for s in school_items),
            "november": sum(s.november for s in school_items),
            "december": sum(s.december for s in school_items),
        }

        # Calcular diferencias (por ahora vacío, se puede usar para comparar con otro período)
        monthly_differences = {}

        monthly_reports_by_faculty.append(
            MonthlyReportByFaculty(
                faculty_id=faculty_id,
                faculty_name=faculty_name,
                faculty_acronym=faculty_acronym,
                schools=school_items,
                monthly_totals=monthly_totals,
                monthly_differences=monthly_differences,
            )
        )

    # Ordenar por faculty_id
    monthly_reports_by_faculty.sort(key=lambda x: x.faculty_id)

    tables["monthly_report_by_faculty"] = [mr.model_dump() for mr in monthly_reports_by_faculty]

    return DirectorDashboardResponse(context=context, kpis=kpis, charts=charts, tables=tables, comparison=comparison)
