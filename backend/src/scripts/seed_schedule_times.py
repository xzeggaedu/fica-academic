"""Seeder para poblar horarios desde el archivo CSV revisado."""

import asyncio
import csv
import logging
from datetime import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.upload_config import get_upload_path
from src.app.models.catalog_schedule_time import CatalogScheduleTime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def parse_time_string(time_str: str) -> time:
    """Parsea un string de tiempo y retorna un objeto time.

    Args:
        time_str: String de tiempo en formato "HH:MM" o "H:MM"

    Returns:
        Objeto time
    """
    time_str = time_str.strip()

    # Manejar formato "H:MM" convirtiéndolo a "HH:MM"
    if len(time_str.split(":")[0]) == 1:
        time_str = f"0{time_str}"

    try:
        hour, minute = map(int, time_str.split(":"))
        return time(hour, minute)
    except ValueError as e:
        logger.error(f"Error parsing time '{time_str}': {e}")
        raise


def parse_days_array(days_array_str: str) -> list[int]:
    """Parsea el string de days_array y retorna la lista de enteros.

    Args:
        days_array_str: String en formato "[0, 1, 2]" o similar

    Returns:
        Lista de enteros representando los días
    """
    # Remover corchetes y espacios
    days_array_str = days_array_str.strip("[]")

    # Si el string está vacío después de remover corchetes, retornar lista vacía
    if not days_array_str.strip():
        return []

    # Dividir por comas y convertir a enteros, filtrando strings vacíos
    days = [int(day.strip()) for day in days_array_str.split(",") if day.strip()]

    # Validar que todos los días estén en el rango válido (0-6)
    for day in days:
        if not 0 <= day <= 6:
            raise ValueError(f"Día inválido: {day}. Debe estar entre 0 y 6.")

    return sorted(days)


def generate_day_group_name(days_array: list[int]) -> str:
    """Genera el nombre del grupo de días basado en el array de días.

    Args:
        days_array: Lista de índices de días (0=Lunes, 6=Domingo)

    Returns:
        Nombre del grupo de días

    Raises:
        ValueError: Si el array está vacío o contiene días inválidos
    """
    if not days_array:
        raise ValueError("El array de días no puede estar vacío")

    day_names = {0: "Lu", 1: "Ma", 2: "Mi", 3: "Ju", 4: "Vi", 5: "Sá", 6: "Do"}

    # Validar que todos los días estén en el rango válido
    for day in days_array:
        if day not in day_names:
            raise ValueError(f"Día inválido: {day}. Debe estar entre 0 y 6.")

    if len(days_array) == 1:
        return day_names[days_array[0]]
    elif len(days_array) == 2:
        return f"{day_names[days_array[0]]}-{day_names[days_array[1]]}"
    else:
        return "-".join(day_names[day] for day in days_array)


def generate_range_text(
    start_time: time, end_time: time, start_time_ext: time | None = None, end_time_ext: time | None = None
) -> str:
    """Genera el texto del rango de tiempo.

    Args:
        start_time: Hora de inicio
        end_time: Hora de fin
        start_time_ext: Hora de inicio extendida (opcional)
        end_time_ext: Hora de fin extendida (opcional)

    Returns:
        String del rango de tiempo
    """

    def format_time(t: time) -> str:
        hour = t.hour
        minute = t.minute
        period = "a.m." if hour < 12 else "p.m."

        if hour == 0:
            hour = 12
        elif hour > 12:
            hour = hour - 12

        if minute == 0:
            return f"{hour:02d}:{minute:02d} {period}"
        else:
            return f"{hour:02d}:{minute:02d} {period}"

    start_str = format_time(start_time)
    end_str = format_time(end_time)

    if start_time_ext and end_time_ext:
        start_ext_str = format_time(start_time_ext)
        end_ext_str = format_time(end_time_ext)
        return f"{start_str} a {end_str} y {start_ext_str} a {end_ext_str}"
    else:
        return f"{start_str} a {end_str}"


async def seed_schedule_times(session: AsyncSession) -> None:
    """Pobla la tabla de horarios desde el archivo CSV revisado.

    Args:
        session: Sesión de base de datos
    """
    logger.info("Starting schedule times seeding from horarios-revisados.csv...")

    # Ruta al archivo CSV usando configuración centralizada
    csv_path = get_upload_path("schedules", "horarios-revisados.csv")

    if not csv_path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return

    try:
        with open(csv_path, encoding="utf-8") as file:
            reader = csv.DictReader(file)

            total_records = 0
            created_records = 0

            for row in reader:
                total_records += 1

                try:
                    # Parsear datos del CSV
                    hora_inicio_str = row["hora_inicio"].strip()
                    hora_fin_str = row["hora_fin"].strip()
                    days_array_str = row["days_array"].strip()

                    # Parsear campos extendidos (opcionales)
                    # Manejar None y strings vacíos
                    hora_inicio_ext_raw = row.get("hora_inicio_ext", "")
                    hora_fin_ext_raw = row.get("hora_fin_ext", "")

                    hora_inicio_ext_str = hora_inicio_ext_raw.strip() if hora_inicio_ext_raw else ""
                    hora_fin_ext_str = hora_fin_ext_raw.strip() if hora_fin_ext_raw else ""

                    # Parsear times principales
                    start_time = parse_time_string(hora_inicio_str)
                    end_time = parse_time_string(hora_fin_str)

                    # Parsear times extendidos (solo si están presentes)
                    start_time_ext = None
                    end_time_ext = None
                    if hora_inicio_ext_str and hora_fin_ext_str:
                        start_time_ext = parse_time_string(hora_inicio_ext_str)
                        end_time_ext = parse_time_string(hora_fin_ext_str)

                    # Parsear days_array
                    days_array = parse_days_array(days_array_str)

                    # Generar campos automáticos
                    day_group_name = generate_day_group_name(days_array)
                    range_text = generate_range_text(start_time, end_time, start_time_ext, end_time_ext)

                    # Calcular duración en minutos
                    start_minutes = start_time.hour * 60 + start_time.minute
                    end_minutes = end_time.hour * 60 + end_time.minute
                    duration_min = abs(end_minutes - start_minutes)

                    # Si hay horarios extendidos, sumar su duración
                    if start_time_ext and end_time_ext:
                        start_ext_minutes = start_time_ext.hour * 60 + start_time_ext.minute
                        end_ext_minutes = end_time_ext.hour * 60 + end_time_ext.minute
                        duration_ext_min = abs(end_ext_minutes - start_ext_minutes)
                        duration_min += duration_ext_min

                    # Verificar si ya existe
                    existing = await session.execute(
                        select(CatalogScheduleTime).where(
                            CatalogScheduleTime.days_array == days_array,
                            CatalogScheduleTime.start_time == start_time,
                            CatalogScheduleTime.end_time == end_time,
                            CatalogScheduleTime.start_time_ext == start_time_ext,
                            CatalogScheduleTime.end_time_ext == end_time_ext,
                        )
                    )

                    if existing.scalar_one_or_none():
                        logger.info(f"Schedule already exists: {day_group_name} {range_text}")
                        continue

                    # Crear nuevo horario
                    schedule_time = CatalogScheduleTime(
                        days_array=days_array,
                        day_group_name=day_group_name,
                        range_text=range_text,
                        start_time=start_time,
                        end_time=end_time,
                        start_time_ext=start_time_ext,
                        end_time_ext=end_time_ext,
                        duration_min=duration_min,
                        is_active=True,
                    )

                    session.add(schedule_time)
                    created_records += 1

                    # Log más descriptivo para horarios extendidos
                    if start_time_ext and end_time_ext:
                        logger.info(
                            f"Created extended schedule: {day_group_name} - {range_text} ({duration_min} min total)"
                        )
                    else:
                        logger.info(f"Created schedule: {day_group_name} - {range_text} ({duration_min} min)")

                except Exception as e:
                    logger.error(f"Error processing row {total_records}: {row} - {e}")
                    continue

        await session.commit()
        logger.info(f"Schedule times seeding completed. Total records: {total_records}, Created: {created_records}")

    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        await session.rollback()
        raise


async def main():
    """Función principal para ejecutar el seeder."""
    logger.info("Starting schedule times seeder...")

    async with local_session() as session:
        await seed_schedule_times(session)

    logger.info("Schedule times seeder completed!")


if __name__ == "__main__":
    asyncio.run(main())
