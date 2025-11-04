"""Schemas para el Dashboard del Director."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DashboardContext(BaseModel):
    term_id: int
    term_term: int | None = None
    term_year: int | None = None
    school_id: int | None = None  # Para director
    school_acronym: str | None = None
    faculty_id: int | None = None  # Para decano
    school_ids: list[int] | None = None  # Para decano (consolidado)
    school_acronyms: list[str] | None = None  # Para decano (consolidado)
    file_id_selected: int | None = None
    file_versions: list[dict] = Field(default_factory=list)


class DashboardKPIs(BaseModel):
    has_billing_report: bool = False
    total_hours: float = 0.0
    total_dollars: float = 0.0
    paid_groups_full: int = 0
    paid_groups_partial: int = 0
    paid_groups_none: int = 0
    coverage_rate: float = 0.0


class HeatmapPoint(BaseModel):
    day: str
    schedule: str
    hours: float
    dollars: float


class StackedByScheduleItem(BaseModel):
    schedule: str
    GDO: float = 0.0
    M1: float = 0.0
    M2: float = 0.0
    DR: float = 0.0
    BLG: float = 0.0


class MonthlyTrendItem(BaseModel):
    month: str
    sessions: int
    hours: float
    dollars: float


class TopBlockItem(BaseModel):
    class_days: str
    class_schedule: str
    class_duration: int
    hours: float
    dollars: float
    GDO: float = 0.0
    M1: float = 0.0
    M2: float = 0.0
    DR: float = 0.0
    BLG: float = 0.0


class RecentLoad(BaseModel):
    file_id: int
    version: int
    ingestion_status: str
    upload_date: datetime
    has_billing_report: bool


class SectionsByModalityItem(BaseModel):
    """Item para comparativo por modalidad."""

    modality: str  # "Presenciales", "En Línea", "Virtuales"
    cycle_current: int = 0  # Ciclo actual
    cycle_compare: int = 0  # Ciclo comparado


class SectionsBySchoolItem(BaseModel):
    """Item para secciones por escuela."""

    school_acronym: str
    modality: str
    cycle_current: int = 0
    cycle_compare: int = 0


class CategoryPaymentItem(BaseModel):
    """Item para tabla de categorías por estado de pago."""

    category: str  # DEC, DIR, CAT/COOR, DTC, ADM, DHC
    pag: int = 0  # PAG (professor_payment_rate = 1.0)
    no_pag: int = 0  # NO PAG (professor_payment_rate = 0.0)
    par: int = 0  # PAR (professor_payment_rate > 0.0 and < 1.0)


class MonthlyReportSchoolItem(BaseModel):
    """Item para reporte mensual por escuela."""

    school_acronym: str
    july: float = 0.0
    august: float = 0.0
    september: float = 0.0
    october: float = 0.0
    november: float = 0.0
    december: float = 0.0
    total: float = 0.0


class MonthlyReportByFaculty(BaseModel):
    """Reporte mensual agrupado por facultad."""

    faculty_id: int
    faculty_name: str
    faculty_acronym: str
    schools: list[MonthlyReportSchoolItem] = Field(default_factory=list)
    monthly_totals: dict[str, float] = Field(default_factory=dict)  # {"july": 0.0, ...}
    monthly_differences: dict[str, float] = Field(default_factory=dict)  # Diferencia vs total esperado


class GroupsComparisonBySchoolItem(BaseModel):
    """Item para comparación de grupos pagados/no pagados por escuela entre dos ciclos."""

    school_acronym: str
    school_name: str | None = None
    base_paid: float = 0.0
    base_unpaid: float = 0.0
    base_total: float = 0.0
    compare_paid: float = 0.0
    compare_unpaid: float = 0.0
    compare_total: float = 0.0


class DirectorDashboardResponse(BaseModel):
    context: DashboardContext
    kpis: DashboardKPIs
    charts: dict = Field(default_factory=dict)
    tables: dict = Field(default_factory=dict)
    comparison: dict | None = None

    class Config:
        json_encoders = {float: lambda v: float(v)}
