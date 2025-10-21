import pytest

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
            is_active=True,
        )

        assert schedule.days_array == valid_days

    def test_days_array_validation_invalid_range(self):
        """Prueba que days_array con valores fuera de rango fallen la validación."""
        from pydantic import ValidationError

        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeBase

        with pytest.raises(ValidationError):
            CatalogScheduleTimeBase(
                days_array=[0, 7],  # 7 está fuera del rango 0-6
                day_group_name="Lu-Do",
                range_text="08:00 a.m. a 10:00 a.m.",
                start_time="08:00:00",
                end_time="10:00:00",
                duration_min=120,
                is_active=True,
            )

    def test_days_array_validation_empty(self):
        """Prueba que days_array vacío falle la validación."""
        from pydantic import ValidationError

        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeBase

        with pytest.raises(ValidationError):
            CatalogScheduleTimeBase(
                days_array=[],  # Array vacío
                day_group_name="",
                range_text="08:00 a.m. a 10:00 a.m.",
                start_time="08:00:00",
                end_time="10:00:00",
                duration_min=120,
                is_active=True,
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
        from datetime import time

        from src.scripts.seed_schedule_times import parse_time_string

        # Formatos válidos
        assert parse_time_string("08:00") == time(8, 0)
        assert parse_time_string("8:30") == time(8, 30)
        assert parse_time_string("14:45") == time(14, 45)
        assert parse_time_string("23:59") == time(23, 59)

        # Con espacios
        assert parse_time_string(" 08:00 ") == time(8, 0)
        assert parse_time_string(" 8:30 ") == time(8, 30)


class TestCatalogScheduleTimeExtendedTimes:
    """Pruebas para horarios extendidos."""

    def test_schedule_with_extended_times(self):
        """Prueba que se puedan crear horarios con tiempos extendidos."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeCreate

        schedule = CatalogScheduleTimeCreate(
            days_array=[5, 6],
            start_time="13:45:00",
            end_time="16:00:00",
            start_time_ext="07:00:00",
            end_time_ext="10:00:00",
            is_active=True,
        )

        assert schedule.start_time_ext is not None
        assert schedule.end_time_ext is not None

    def test_schedule_without_extended_times(self):
        """Prueba que los tiempos extendidos sean opcionales."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeCreate

        schedule = CatalogScheduleTimeCreate(
            days_array=[0],
            start_time="08:00:00",
            end_time="10:00:00",
            is_active=True,
        )

        assert schedule.start_time_ext is None
        assert schedule.end_time_ext is None

    def test_extended_times_validation_both_required(self):
        """Prueba que start_time_ext requiera end_time_ext y viceversa."""
        from pydantic import ValidationError

        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeCreate

        # start_time_ext sin end_time_ext debe fallar
        with pytest.raises(ValidationError) as exc_info:
            CatalogScheduleTimeCreate(
                days_array=[5, 6],
                start_time="13:45:00",
                end_time="16:00:00",
                start_time_ext="07:00:00",
                # end_time_ext faltante
                is_active=True,
            )

        assert "end_time_ext" in str(exc_info.value).lower()

    def test_extended_times_validation_order(self):
        """Prueba que end_time_ext debe ser mayor que start_time_ext."""
        from pydantic import ValidationError

        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeCreate

        with pytest.raises(ValidationError) as exc_info:
            CatalogScheduleTimeCreate(
                days_array=[5, 6],
                start_time="13:45:00",
                end_time="16:00:00",
                start_time_ext="10:00:00",
                end_time_ext="07:00:00",  # Menor que start_time_ext
                is_active=True,
            )

        # La validación puede fallar primero en el check de "ambos requeridos"
        # pero debemos asegurarnos que eventualmente valide el orden
        error_message = str(exc_info.value).lower()
        assert (
            "end_time_ext" in error_message or "must be after" in error_message or "debe ser posterior" in error_message
        )


class TestCatalogScheduleTimeSoftDelete:
    """Pruebas para soft-delete de horarios."""

    def test_update_schema_accepts_deleted_fields(self):
        """Prueba que el schema CatalogScheduleTimeUpdate acepta campos deleted y deleted_at."""
        from datetime import datetime

        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeUpdate

        update_data = CatalogScheduleTimeUpdate(deleted=True, deleted_at=datetime.now())

        assert update_data.deleted is True
        assert update_data.deleted_at is not None

    def test_update_schema_deleted_optional(self):
        """Prueba que deleted sea opcional en CatalogScheduleTimeUpdate."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeUpdate

        update_data = CatalogScheduleTimeUpdate(is_active=False)

        assert update_data.deleted is None
        assert update_data.deleted_at is None

    def test_update_schema_restore_fields(self):
        """Prueba que el schema permita restaurar (deleted=False, deleted_at=None)."""
        from src.app.schemas.catalog_schedule_time import CatalogScheduleTimeUpdate

        update_data = CatalogScheduleTimeUpdate(deleted=False, deleted_at=None)

        assert update_data.deleted is False
        assert update_data.deleted_at is None
