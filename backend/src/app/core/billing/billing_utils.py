"""Utility functions for billing and payment report calculations."""

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from ...models.academic_load_class import AcademicLoadClass

# Mapeo de abreviaturas de días a números de día de semana (0=Lunes, 6=Domingo)
DAY_ABBREV_TO_WEEKDAY = {
    "Lu": 0,  # Lunes
    "Ma": 1,  # Martes
    "Mi": 2,  # Miércoles
    "Ju": 3,  # Jueves
    "Vi": 4,  # Viernes
    "Sa": 5,  # Sábado
    "Do": 6,  # Domingo
}


def class_days_to_weekdays(class_days: str) -> list[int]:
    """Convierte string normalizado de días a lista de números de día de semana.

    Convierte formato normalizado "Lu-Ma-Mi" a lista de números donde:
    0 = Lunes, 1 = Martes, 2 = Miércoles, 3 = Jueves, 4 = Viernes, 5 = Sábado, 6 = Domingo.

    Args:
        class_days: String de días normalizado (ej: "Lu-Ma-Mi", "Lu-Vi", "Sa")

    Returns:
        Lista de números de día de semana (ej: [0, 1, 2], [0, 4], [5])

    Example:
        >>> class_days_to_weekdays("Lu-Ma-Mi")
        [0, 1, 2]
        >>> class_days_to_weekdays("Lu-Vi")
        [0, 4]
        >>> class_days_to_weekdays("")
        []
    """
    if not class_days or not isinstance(class_days, str):
        return []

    weekdays = []
    day_parts = class_days.split("-")
    for day_abbrev in day_parts:
        day_abbrev = day_abbrev.strip()
        if day_abbrev in DAY_ABBREV_TO_WEEKDAY:
            weekdays.append(DAY_ABBREV_TO_WEEKDAY[day_abbrev])

    return weekdays


def determine_academic_level(is_bilingual: bool, professor_is_doctor: bool, professor_masters: int) -> str | None:
    """Determina el nivel académico basado en las calificaciones del profesor.

    Los niveles se determinan por prioridad (menor número = mayor prioridad):
    1. Bilingüe (BLG) - priority=1 (mayor prioridad)
    2. Doctorado (DR) - priority=2
    3. Dos o más Maestrías (M2) - priority=3
    4. Una Maestría (M1) - priority=4
    5. Grado Base (GDO) - priority=5 (prioridad base)

    Args:
        is_bilingual: Si el profesor y la asignatura son bilingües
        professor_is_doctor: Si el profesor tiene título de doctor
        professor_masters: Número de maestrías del profesor

    Returns:
        Código del nivel académico correspondiente o None si no se puede determinar

    Example:
        >>> determine_academic_level(True, False, 0)
        'BLG'
        >>> determine_academic_level(False, True, 0)
        'DR'
        >>> determine_academic_level(False, False, 2)
        'M2'
        >>> determine_academic_level(False, False, 1)
        'M1'
        >>> determine_academic_level(False, False, 0)
        'GDO'
    """
    # Prioridad: BLG > DR > M2 > M1 > GDO
    if is_bilingual:
        return "BLG"
    if professor_is_doctor:
        return "DR"
    if professor_masters >= 2:
        return "M2"
    if professor_masters >= 1:
        return "M1"
    return "GDO"


async def get_academic_level_ids_map(session: AsyncSession) -> dict[str, int]:
    """Obtiene el mapeo de códigos de nivel académico a sus IDs.

    Carga todos los niveles académicos activos de la base de datos y crea un
    diccionario que mapea el código del nivel (ej: "BLG", "DR", "M2") a su
    ID numérico en la base de datos.

    Args:
        session: Sesión de base de datos asíncrona

    Returns:
        Diccionario mapeando códigos de nivel a IDs (ej: {"BLG": 5, "DR": 4, ...})

    Example:
        >>> await get_academic_level_ids_map(session)
        {
            "BLG": 5,
            "DR": 4,
            "M2": 3,
            "M1": 2,
            "GDO": 1
        }
    """
    from ...models.academic_level import AcademicLevel

    stmt = select(AcademicLevel).where(AcademicLevel.is_active.is_(True))
    result = await session.execute(stmt)
    levels = result.scalars().all()

    return {level.code: level.id for level in levels}


def group_classes_by_schedule(
    classes: list["AcademicLoadClass"],
) -> dict[tuple[str, str, int], list["AcademicLoadClass"]]:
    """Agrupa clases por su combinación única de días, horario y duración.

    Crea un diccionario donde las llaves son tuplas de (class_days, class_schedule, class_duration)
    y los valores son listas de objetos AcademicLoadClass que tienen esa combinación exacta.

    Args:
        classes: Lista de objetos AcademicLoadClass a agrupar

    Returns:
        Diccionario agrupando clases por su combinación única de horario

    Example:
        >>> group_classes_by_schedule(classes)
        {
            ("Lu-Ma-Mi", "08:00-09:30", 90): [class1, class2, class3],
            ("Lu-Vi", "14:00-15:30", 90): [class4, class5],
            ...
        }
    """
    grouped = {}
    for cls in classes:
        key = (cls.class_days, cls.class_schedule, cls.class_duration)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(cls)
    return grouped


def get_term_months(term_start: date, term_end: date) -> list[tuple[int, int]]:
    """Genera lista de (año, mes) para todos los meses dentro del rango del término.

    Args:
        term_start: Fecha de inicio del término
        term_end: Fecha de fin del término

    Returns:
        Lista de tuplas (año, mes) ordenadas cronológicamente

    Example:
        >>> get_term_months(date(2025, 6, 1), date(2025, 8, 31))
        [(2025, 6), (2025, 7), (2025, 8)]
    """
    months = []
    current = date(term_start.year, term_start.month, 1)

    while current <= term_end:
        months.append((current.year, current.month))

        # Avanzar al siguiente mes
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    return months


def get_month_name(month: int) -> str:
    """Retorna el nombre del mes en español.

    Args:
        month: Número del mes (1-12)

    Returns:
        Nombre del mes en español

    Example:
        >>> get_month_name(7)
        'Julio'
    """
    month_names = {
        1: "Enero",
        2: "Febrero",
        3: "Marzo",
        4: "Abril",
        5: "Mayo",
        6: "Junio",
        7: "Julio",
        8: "Agosto",
        9: "Septiembre",
        10: "Octubre",
        11: "Noviembre",
        12: "Diciembre",
    }
    return month_names.get(month, "Desconocido")


async def calculate_workable_days_for_month(session: AsyncSession, term, month: int, weekdays: list[int]) -> int:
    """Calcula días hábiles en un mes para días específicos dentro del término.

    Esta función extrae la lógica de calculate_workdays para reutilización interna.

    Args:
        session: Sesión de base de datos asíncrona
        term: Objeto Term con start_date y end_date
        month: Número del mes (1-12)
        weekdays: Lista de días de la semana (0=Lunes, 6=Domingo)

    Returns:
        Número de días hábiles (workable_days)
    """
    from datetime import timedelta

    # Get the Holiday record for the term's year
    from sqlalchemy import select

    from ...models.annual_holiday import AnnualHoliday
    from ...models.holiday import Holiday

    holiday_result = await session.execute(select(Holiday).where(Holiday.year == term.year))
    holiday = holiday_result.scalar_one_or_none()

    # Get all annual holidays for this year
    holiday_dates_set = set()
    if holiday:
        annual_holidays_result = await session.execute(
            select(AnnualHoliday).where(AnnualHoliday.holiday_id == holiday.id)
        )
        annual_holidays = annual_holidays_result.scalars().all()
        holiday_dates_set = {ah.date for ah in annual_holidays}

    # Calculate the date range for this month within the term
    first_day_of_month = date(term.year, month, 1)

    # Last day of month
    if month == 12:
        last_day_of_month = date(term.year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day_of_month = date(term.year, month + 1, 1) - timedelta(days=1)

    # Adjust range based on term boundaries
    calculation_start = max(first_day_of_month, term.start_date)
    calculation_end = min(last_day_of_month, term.end_date)

    # Validate that the month is within the term
    if calculation_start > calculation_end:
        return 0

    # Iterate through days in the calculated range
    matching_weekdays_count = 0
    holidays_on_matching_days_count = 0

    current_date = calculation_start
    while current_date <= calculation_end:
        # Check if this day's weekday matches any of the requested weekdays
        if current_date.weekday() in weekdays:
            matching_weekdays_count += 1

            # Check if this day is a holiday
            if current_date in holiday_dates_set:
                holidays_on_matching_days_count += 1

        current_date += timedelta(days=1)

    # Calculate workable days
    workable_days = matching_weekdays_count - holidays_on_matching_days_count

    return workable_days
