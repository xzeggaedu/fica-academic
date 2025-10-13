import pytest

from src.app.schemas.catalog_schedule_time import (
    CatalogScheduleTimeCreate,
    generate_day_group_name_from_array,
)


# NOTA: Las pruebas de CRUD que requieren base de datos han sido removidas
# ya que están diseñadas para ejecutarse en un entorno de integración con Docker.
# Las pruebas unitarias que validan la lógica de negocio se mantienen a continuación.


class TestCatalogScheduleTimeValidation:
    """Pruebas para la validación de datos de CatalogScheduleTime."""

    def test_days_array_validation_valid(self):
        """Prueba que days_array válidos pasen la validación."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeBase
        
        valid_days = [0, 1, 2, 3, 4, 5, 6]
        schedule = CatalogScheduleTimeBase(
            days_array=valid_days,
            day_group_name="Lu-Do",
            range_text="08:00 a.m. a 10:00 a.m.",
            start_time="08:00:00",
            end_time="10:00:00",
            duration_min=120,
            is_active=True
        )
        
        assert schedule.days_array == valid_days

    def test_days_array_validation_invalid_range(self):
        """Prueba que days_array con valores fuera de rango fallen la validación."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeBase
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            CatalogScheduleTimeBase(
                days_array=[0, 7],  # 7 está fuera del rango 0-6
                day_group_name="Lu-Do",
                range_text="08:00 a.m. a 10:00 a.m.",
                start_time="08:00:00",
                end_time="10:00:00",
                duration_min=120,
                is_active=True
            )

    def test_days_array_validation_empty(self):
        """Prueba que days_array vacío falle la validación."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeBase
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            CatalogScheduleTimeBase(
                days_array=[],  # Array vacío
                day_group_name="",
                range_text="08:00 a.m. a 10:00 a.m.",
                start_time="08:00:00",
                end_time="10:00:00",
                duration_min=120,
                is_active=True
            )


class TestScheduleTimeUtilityFunctions:
    """Pruebas para las funciones utilitarias de schedule times."""

    def test_generate_day_group_name_from_array(self):
        """Prueba la generación de nombres de grupos de días."""
        from src.app.schemas.catalog_schedule_time import generate_day_group_name_from_array
        
        # Día único
        assert generate_day_group_name_from_array([0]) == "Lu"
        assert generate_day_group_name_from_array([5]) == "Sá"
        
        # Días consecutivos
        assert generate_day_group_name_from_array([0, 1, 2, 3, 4]) == "Lu-Vi"
        
        # Días no consecutivos
        assert generate_day_group_name_from_array([0, 4]) == "Lu-Vi"
        assert generate_day_group_name_from_array([1, 3, 5]) == "Ma-Ju-Sá"
        
        # Días mezclados
        assert generate_day_group_name_from_array([0, 2, 4]) == "Lu-Mi-Vi"

    def test_parse_days_array_from_string(self):
        """Prueba el parseo de strings de days_array."""
        from src.scripts.seed_schedule_times import parse_days_array
        
        # Arrays válidos
        assert parse_days_array("[0, 1, 2]") == [0, 1, 2]
        assert parse_days_array("[0,4]") == [0, 4]
        assert parse_days_array("[5]") == [5]
        
        # Array vacío
        assert parse_days_array("[]") == []
        
        # Con espacios
        assert parse_days_array("[ 0 , 1 , 2 ]") == [0, 1, 2]

    def test_parse_time_string(self):
        """Prueba el parseo de strings de tiempo."""
        from src.scripts.seed_schedule_times import parse_time_string
        from datetime import time
        
        # Formatos válidos
        assert parse_time_string("08:00") == time(8, 0)
        assert parse_time_string("8:30") == time(8, 30)
        assert parse_time_string("14:45") == time(14, 45)
        assert parse_time_string("23:59") == time(23, 59)
        
        # Con espacios
        assert parse_time_string(" 08:00 ") == time(8, 0)
        assert parse_time_string(" 8:30 ") == time(8, 30)
