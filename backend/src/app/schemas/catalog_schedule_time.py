"""Schemas de Catálogo de Horarios para validación de API."""

from datetime import datetime, time
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Constantes para los días de la semana (0=Lunes, 6=Domingo)
WEEK_DAYS_MAP = {0: "Lu", 1: "Ma", 2: "Mi", 3: "Ju", 4: "Vi", 5: "Sá", 6: "Do"}


def generate_day_group_name_from_array(days_array: list[int]) -> str:
    """Generar day_group_name a partir del array de días."""
    if not days_array:
        return ""

    # Mapear índices a abreviaciones
    day_abbrevs = [WEEK_DAYS_MAP[day] for day in sorted(days_array)]

    if len(day_abbrevs) == 1:
        return day_abbrevs[0]

    # Verificar si es un rango continuo
    is_continuous = all(days_array[i + 1] - days_array[i] == 1 for i in range(len(days_array) - 1))

    if is_continuous:
        return f"{day_abbrevs[0]}-{day_abbrevs[-1]}"
    else:
        return "-".join(day_abbrevs)


class CatalogScheduleTimeBase(BaseModel):
    """Schema base de Catálogo de Horarios."""

    days_array: Annotated[list[int], Field(min_items=1, max_items=7, examples=[[0], [0, 4], [1, 3, 5]])]
    day_group_name: Annotated[str, Field(min_length=1, max_length=50, examples=["Lu", "Lu-Vi", "Ma-Ju-Sá"])]
    range_text: Annotated[str, Field(min_length=1, max_length=50, examples=["06:30-08:00", "06:30 a 08:00 a.m."])]
    start_time: time
    end_time: time
    is_active: bool = True

    @field_validator("days_array")
    @classmethod
    def validate_days_array(cls, v):
        """Validar que days_array contenga solo índices válidos (0-6)."""
        if not v:
            raise ValueError("days_array no puede estar vacío")

        for day in v:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise ValueError(f"Índice de día inválido: {day}. Debe ser un entero entre 0 y 6 (0=Lunes, 6=Domingo)")

        # Eliminar duplicados y ordenar
        unique_days = sorted(set(v))
        return unique_days

    @field_validator("day_group_name")
    @classmethod
    def validate_day_group_name(cls, v):
        """Validar que day_group_name tenga un formato válido."""
        import re

        # Normalizar el valor (convertir formatos antiguos a nuevos)
        v_normalized = v.replace("Sab", "Sá").replace("Dom", "Do").replace("Vie", "Vi")

        # Patrón que permite abreviaciones válidas
        valid_pattern = r"^([LuMaMiJuViSáDo]+(-[LuMaMiJuViSáDo]+)*)+$"

        if re.match(valid_pattern, v_normalized):
            # Verificar que solo contenga días válidos
            valid_days = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
            parts = v_normalized.split("-")
            for part in parts:
                if part not in valid_days:
                    raise ValueError(f"Día inválido: {part}. Días válidos: {', '.join(valid_days)}")
            return v_normalized

        raise ValueError("day_group_name debe tener un formato válido (ej: Lu, Lu-Vi, Ma-Ju-Sá)")

    @field_validator("end_time")
    @classmethod
    def validate_end_time_after_start_time(cls, v, info):
        """Validar que end_time sea posterior a start_time."""
        values = info.data
        start_time = values.get("start_time")

        if start_time and v <= start_time:
            raise ValueError("end_time debe ser posterior a start_time")

        return v


class CatalogScheduleTimeCreate(BaseModel):
    """Schema para crear un nuevo horario."""

    model_config = ConfigDict(extra="forbid")

    days_array: Annotated[list[int], Field(min_items=1, max_items=7, examples=[[0], [0, 4], [1, 3, 5]])]
    start_time: time
    end_time: time
    is_active: bool = True

    @field_validator("days_array")
    @classmethod
    def validate_days_array(cls, v):
        """Validar que days_array contenga solo índices válidos (0-6)."""
        if not v:
            raise ValueError("days_array no puede estar vacío")

        for day in v:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise ValueError(f"Índice de día inválido: {day}. Debe ser un entero entre 0 y 6 (0=Lunes, 6=Domingo)")

        # Eliminar duplicados y ordenar
        unique_days = sorted(set(v))
        return unique_days

    @field_validator("end_time")
    @classmethod
    def validate_end_time_after_start_time(cls, v, info):
        """Validar que end_time sea posterior a start_time."""
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time debe ser posterior a start_time")
        return v

    def model_post_init(self, __context):
        """Generar campos automáticamente después de la validación."""
        # Los campos se generarán en el CRUD layer
        pass


class CatalogScheduleTimeUpdate(BaseModel):
    """Schema para actualizar un horario existente."""

    model_config = ConfigDict(extra="forbid")

    days_array: Annotated[
        list[int] | None, Field(min_items=1, max_items=7, examples=[[0], [0, 4], [1, 3, 5]], default=None)
    ]
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None
    deleted: bool | None = None
    deleted_at: datetime | None = None

    @field_validator("days_array")
    @classmethod
    def validate_days_array(cls, v):
        """Validar que days_array contenga solo índices válidos (0-6)."""
        if v is None:
            return v

        if not v:
            raise ValueError("days_array no puede estar vacío")

        for day in v:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise ValueError(f"Índice de día inválido: {day}. Debe ser un entero entre 0 y 6 (0=Lunes, 6=Domingo)")

        # Eliminar duplicados y ordenar
        unique_days = sorted(set(v))
        return unique_days

    @field_validator("end_time")
    @classmethod
    def validate_end_time_after_start_time(cls, v, info):
        """Validar que end_time sea posterior a start_time."""
        if v is None:
            return v

        if "start_time" in info.data and info.data["start_time"] and v <= info.data["start_time"]:
            raise ValueError("end_time debe ser posterior a start_time")
        return v


class CatalogScheduleTimeRead(CatalogScheduleTimeBase):
    """Schema para leer datos de horarios."""

    id: int
    duration_min: int
    deleted: bool
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class CatalogScheduleTimeInternal(CatalogScheduleTimeBase):
    """Schema interno con duración calculada."""

    duration_min: int

    @field_validator("duration_min", mode="before")
    @classmethod
    def calculate_duration(cls, v, info):
        """Calcular duración en minutos automáticamente."""
        values = info.data
        start_time = values.get("start_time")
        end_time = values.get("end_time")

        if start_time and end_time:
            # Convertir time a minutos desde medianoche
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute

            # Calcular diferencia (manejar caso de horario que cruza medianoche)
            if end_minutes > start_minutes:
                duration = end_minutes - start_minutes
            else:
                # Horario cruza medianoche (ej: 23:00 a 01:00)
                duration = (24 * 60) - start_minutes + end_minutes

            return duration

        return v
