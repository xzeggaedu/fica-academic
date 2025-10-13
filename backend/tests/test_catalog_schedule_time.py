import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.testclient import TestClient

from src.app.models.catalog_schedule_time import CatalogScheduleTime
from src.app.crud.crud_catalog_schedule_time import (
    create_schedule_time_with_auto_fields,
    update_schedule_time_with_auto_fields,
    get_schedule_time,
    get_schedule_times,
    get_active_schedule_times,
    delete_schedule_time,
)
from src.app.schemas.catalog_schedule_time import (
    CatalogScheduleTimeCreate,
    CatalogScheduleTimeUpdate,
)


class TestCatalogScheduleTimeCRUD:
    """Pruebas para las operaciones CRUD de CatalogScheduleTime."""

    @pytest.mark.asyncio
    async def test_create_schedule_time_with_auto_fields(self, db_session: AsyncSession):
        """Prueba la creación de un horario con campos automáticos."""
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[0, 1, 2],  # Lunes, Martes, Miércoles
            start_time="08:00:00",
            end_time="10:00:00",
            is_active=True
        )
        
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        assert schedule is not None
        assert schedule.days_array == [0, 1, 2]
        assert schedule.day_group_name == "Lu-Ma-Mi"
        assert schedule.range_text == "08:00 a.m. a 10:00 a.m."
        assert schedule.duration_min == 120
        assert schedule.is_active is True

    @pytest.mark.asyncio
    async def test_create_schedule_time_single_day(self, db_session: AsyncSession):
        """Prueba la creación de un horario para un solo día."""
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[5],  # Sábado
            start_time="09:00:00",
            end_time="12:00:00",
            is_active=True
        )
        
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        assert schedule.day_group_name == "Sá"
        assert schedule.range_text == "09:00 a.m. a 12:00 p.m."
        assert schedule.duration_min == 180

    @pytest.mark.asyncio
    async def test_create_schedule_time_non_consecutive_days(self, db_session: AsyncSession):
        """Prueba la creación de un horario para días no consecutivos."""
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[0, 4],  # Lunes y Viernes
            start_time="14:00:00",
            end_time="16:00:00",
            is_active=True
        )
        
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        assert schedule.day_group_name == "Lu-Vi"
        assert schedule.range_text == "02:00 p.m. a 04:00 p.m."
        assert schedule.duration_min == 120

    @pytest.mark.asyncio
    async def test_update_schedule_time_with_auto_fields(self, db_session: AsyncSession):
        """Prueba la actualización de un horario con campos automáticos."""
        # Crear un horario inicial
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[0, 1],
            start_time="08:00:00",
            end_time="10:00:00",
            is_active=True
        )
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        # Actualizar el horario
        update_data = CatalogScheduleTimeUpdate(
            days_array=[0, 1, 2],  # Agregar Miércoles
            start_time="09:00:00",  # Cambiar hora de inicio
            end_time="11:00:00"     # Cambiar hora de fin
        )
        
        updated_schedule = await update_schedule_time_with_auto_fields(
            db_session, schedule.id, update_data
        )
        
        assert updated_schedule.days_array == [0, 1, 2]
        assert updated_schedule.day_group_name == "Lu-Ma-Mi"
        assert updated_schedule.range_text == "09:00 a.m. a 11:00 a.m."
        assert updated_schedule.duration_min == 120

    @pytest.mark.asyncio
    async def test_get_schedule_time(self, db_session: AsyncSession):
        """Prueba obtener un horario por ID."""
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[1, 3],  # Martes y Jueves
            start_time="13:00:00",
            end_time="15:00:00",
            is_active=True
        )
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        retrieved_schedule = await get_schedule_time(db_session, schedule.id)
        
        assert retrieved_schedule is not None
        assert retrieved_schedule.id == schedule.id
        assert retrieved_schedule.day_group_name == "Ma-Ju"

    @pytest.mark.asyncio
    async def test_get_active_schedule_times(self, db_session: AsyncSession):
        """Prueba obtener solo horarios activos."""
        # Crear horarios activos e inactivos
        active_schedule = CatalogScheduleTimeCreate(
            days_array=[0],
            start_time="08:00:00",
            end_time="10:00:00",
            is_active=True
        )
        await create_schedule_time_with_auto_fields(db_session, active_schedule)
        
        inactive_schedule = CatalogScheduleTimeCreate(
            days_array=[1],
            start_time="10:00:00",
            end_time="12:00:00",
            is_active=False
        )
        await create_schedule_time_with_auto_fields(db_session, inactive_schedule)
        
        active_schedules = await get_active_schedule_times(db_session)
        
        assert len(active_schedules) == 1
        assert active_schedules[0].is_active is True

    @pytest.mark.asyncio
    async def test_delete_schedule_time(self, db_session: AsyncSession):
        """Prueba eliminar un horario."""
        schedule_data = CatalogScheduleTimeCreate(
            days_array=[6],  # Domingo
            start_time="10:00:00",
            end_time="12:00:00",
            is_active=True
        )
        schedule = await create_schedule_time_with_auto_fields(db_session, schedule_data)
        
        # Eliminar el horario
        await delete_schedule_time(db_session, schedule.id)
        
        # Verificar que ya no existe
        deleted_schedule = await get_schedule_time(db_session, schedule.id)
        assert deleted_schedule is None


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
        from src.app.scripts.seed_schedule_times import parse_days_array
        
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
        from src.app.scripts.seed_schedule_times import parse_time_string
        from datetime import time
        
        # Formatos válidos
        assert parse_time_string("08:00") == time(8, 0)
        assert parse_time_string("8:30") == time(8, 30)
        assert parse_time_string("14:45") == time(14, 45)
        assert parse_time_string("23:59") == time(23, 59)
        
        # Con espacios
        assert parse_time_string(" 08:00 ") == time(8, 0)
        assert parse_time_string(" 8:30 ") == time(8, 30)
