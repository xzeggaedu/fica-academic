import pytest
from unittest.mock import patch, mock_open, MagicMock
from pathlib import Path
import tempfile
import csv
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models.catalog_schedule_time import CatalogScheduleTime
from src.scripts.seed_schedule_times import (
    parse_time_string,
    parse_days_array,
    normalize_day_group_name,
    seed_schedule_times,
)


class TestScheduleTimesSeeder:
    """Pruebas para el seeder de schedule times."""

    def test_parse_time_string_valid_formats(self):
        """Prueba el parseo de diferentes formatos de tiempo válidos."""
        from datetime import time
        
        # Formato estándar
        assert parse_time_string("08:00") == time(8, 0)
        assert parse_time_string("14:30") == time(14, 30)
        assert parse_time_string("23:59") == time(23, 59)
        
        # Formato sin cero inicial
        assert parse_time_string("8:00") == time(8, 0)
        assert parse_time_string("9:30") == time(9, 30)
        
        # Con espacios
        assert parse_time_string(" 08:00 ") == time(8, 0)
        assert parse_time_string(" 8:30 ") == time(8, 30)

    def test_parse_time_string_invalid_formats(self):
        """Prueba el parseo con formatos de tiempo inválidos."""
        with pytest.raises(ValueError):
            parse_time_string("invalid")
        
        with pytest.raises(ValueError):
            parse_time_string("25:00")  # Hora inválida
        
        with pytest.raises(ValueError):
            parse_time_string("08:60")  # Minutos inválidos
        
        with pytest.raises(ValueError):
            parse_time_string("")  # String vacío

    def test_parse_days_array_valid_formats(self):
        """Prueba el parseo de diferentes formatos de arrays de días válidos."""
        # Formato estándar
        assert parse_days_array("[0, 1, 2]") == [0, 1, 2]
        assert parse_days_array("[0,4]") == [0, 4]
        assert parse_days_array("[5]") == [5]
        
        # Array vacío
        assert parse_days_array("[]") == []
        
        # Con espacios
        assert parse_days_array("[ 0 , 1 , 2 ]") == [0, 1, 2]
        assert parse_days_array("[ 0, 4 ]") == [0, 4]

    def test_parse_days_array_invalid_formats(self):
        """Prueba el parseo con formatos de arrays inválidos."""
        with pytest.raises(ValueError):
            parse_days_array("invalid")
        
        with pytest.raises(ValueError):
            parse_days_array("[0, 1, 2")  # Sin cerrar
        
        with pytest.raises(ValueError):
            parse_days_array("0, 1, 2]")  # Sin abrir
        
        with pytest.raises(ValueError):
            parse_days_array("")  # String vacío

    def test_normalize_day_group_name(self):
        """Prueba la normalización de nombres de grupos de días."""
        # Casos válidos
        assert normalize_day_group_name("Lu") == "Lu"
        assert normalize_day_group_name("Ma-Ju") == "Ma-Ju"
        assert normalize_day_group_name("Lu-Vi") == "Lu-Vi"
        assert normalize_day_group_name("Lu-Ma-Mi-Ju-Vi") == "Lu-Vi"
        assert normalize_day_group_name("Sá") == "Sá"
        assert normalize_day_group_name("Do") == "Do"
        
        # Casos con espacios
        assert normalize_day_group_name(" Lu ") == "Lu"
        assert normalize_day_group_name(" Ma - Ju ") == "Ma-Ju"
        
        # Casos con minúsculas
        assert normalize_day_group_name("lu") == "Lu"
        assert normalize_day_group_name("ma-ju") == "Ma-Ju"

    def test_normalize_day_group_name_invalid(self):
        """Prueba la normalización con nombres inválidos."""
        with pytest.raises(ValueError):
            normalize_day_group_name("Invalid")
        
        with pytest.raises(ValueError):
            normalize_day_group_name("Lu-Invalid")
        
        with pytest.raises(ValueError):
            normalize_day_group_name("")  # String vacío

    @pytest.mark.asyncio
    async def test_seed_schedule_times_with_valid_csv(self, db_session: AsyncSession):
        """Prueba el seeding con un CSV válido."""
        # Crear un CSV temporal
        csv_content = """dias,hora_inicio,hora_fin,days_array
Lu,08:00,10:00,"[0]"
Ma-Ju,14:00,16:00,"[1,3]"
Lu-Vi,09:00,11:00,"[0,4]"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = Path(f.name)
        
        try:
            with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
                mock_get_path.return_value = temp_csv_path
                
                await seed_schedule_times(db_session)
                
                # Verificar que se crearon los horarios
                schedules = await db_session.execute(
                    "SELECT * FROM catalog_schedule_time ORDER BY day_group_name"
                )
                schedules = schedules.fetchall()
                
                assert len(schedules) == 3
                
                # Verificar el primer horario (Lu)
                lu_schedule = schedules[0]
                assert lu_schedule.day_group_name == "Lu"
                assert lu_schedule.range_text == "08:00 a.m. a 10:00 a.m."
                assert lu_schedule.duration_min == 120
                
                # Verificar el segundo horario (Lu-Vi)
                lu_vi_schedule = schedules[1]
                assert lu_vi_schedule.day_group_name == "Lu-Vi"
                assert lu_vi_schedule.range_text == "09:00 a.m. a 11:00 a.m."
                
                # Verificar el tercer horario (Ma-Ju)
                ma_ju_schedule = schedules[2]
                assert ma_ju_schedule.day_group_name == "Ma-Ju"
                assert ma_ju_schedule.range_text == "02:00 p.m. a 04:00 p.m."
        
        finally:
            # Limpiar archivo temporal
            temp_csv_path.unlink()

    @pytest.mark.asyncio
    async def test_seed_schedule_times_with_duplicates(self, db_session: AsyncSession):
        """Prueba el seeding con horarios duplicados."""
        # Crear un CSV con duplicados
        csv_content = """dias,hora_inicio,hora_fin,days_array
Lu,08:00,10:00,"[0]"
Lu,08:00,10:00,"[0]"
Ma,09:00,11:00,"[1]"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = Path(f.name)
        
        try:
            with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
                mock_get_path.return_value = temp_csv_path
                
                await seed_schedule_times(db_session)
                
                # Verificar que solo se crearon 2 horarios (sin duplicados)
                schedules = await db_session.execute(
                    "SELECT * FROM catalog_schedule_time ORDER BY day_group_name"
                )
                schedules = schedules.fetchall()
                
                assert len(schedules) == 2
        
        finally:
            temp_csv_path.unlink()

    @pytest.mark.asyncio
    async def test_seed_schedule_times_file_not_found(self, db_session: AsyncSession):
        """Prueba el seeding cuando el archivo CSV no existe."""
        with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
            mock_get_path.return_value = Path("nonexistent.csv")
            
            # No debería lanzar excepción, solo loggear error
            await seed_schedule_times(db_session)
            
            # Verificar que no se crearon horarios
            schedules = await db_session.execute(
                "SELECT * FROM catalog_schedule_time"
            )
            schedules = schedules.fetchall()
            
            assert len(schedules) == 0

    @pytest.mark.asyncio
    async def test_seed_schedule_times_invalid_csv_format(self, db_session: AsyncSession):
        """Prueba el seeding con formato de CSV inválido."""
        # CSV con columnas faltantes
        csv_content = """dias,hora_inicio
Lu,08:00
Ma,09:00
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = Path(f.name)
        
        try:
            with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
                mock_get_path.return_value = temp_csv_path
                
                # No debería lanzar excepción, solo saltar filas inválidas
                await seed_schedule_times(db_session)
                
                # Verificar que no se crearon horarios
                schedules = await db_session.execute(
                    "SELECT * FROM catalog_schedule_time"
                )
                schedules = schedules.fetchall()
                
                assert len(schedules) == 0
        
        finally:
            temp_csv_path.unlink()

    @pytest.mark.asyncio
    async def test_seed_schedule_times_invalid_data_in_csv(self, db_session: AsyncSession):
        """Prueba el seeding con datos inválidos en el CSV."""
        # CSV con datos inválidos
        csv_content = """dias,hora_inicio,hora_fin,days_array
Lu,invalid_time,10:00,"[0]"
Ma,09:00,invalid_time,"[1]"
Valid,09:00,11:00,"[2]"
Invalid_Day,09:00,11:00,"[0]"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = Path(f.name)
        
        try:
            with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
                mock_get_path.return_value = temp_csv_path
                
                # No debería lanzar excepción, solo saltar filas inválidas
                await seed_schedule_times(db_session)
                
                # Verificar que solo se creó el horario válido
                schedules = await db_session.execute(
                    "SELECT * FROM catalog_schedule_time"
                )
                schedules = schedules.fetchall()
                
                assert len(schedules) == 1
                assert schedules[0].day_group_name == "Mi"  # Valid day
        
        finally:
            temp_csv_path.unlink()


class TestScheduleTimesSeederIntegration:
    """Pruebas de integración para el seeder de schedule times."""

    @pytest.mark.asyncio
    async def test_full_seeding_process(self, db_session: AsyncSession):
        """Prueba el proceso completo de seeding con datos realistas."""
        # CSV con datos similares a los reales
        csv_content = """dias,hora_inicio,hora_fin,days_array
Lu-Vi,06:30,08:00,"[0,4]"
Lu-Vi,08:00,09:30,"[0,4]"
Ma-Ju,14:00,16:00,"[1,3]"
Sá,09:00,12:00,"[5]"
Do,10:00,13:00,"[6]"
Lu-Ma-Mi-Ju-Vi,08:00,10:00,"[0,1,2,3,4]"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = Path(f.name)
        
        try:
            with patch('src.scripts.seed_schedule_times.get_upload_path') as mock_get_path:
                mock_get_path.return_value = temp_csv_path
                
                await seed_schedule_times(db_session)
                
                # Verificar que se crearon todos los horarios
                schedules = await db_session.execute(
                    "SELECT * FROM catalog_schedule_time ORDER BY day_group_name, start_time"
                )
                schedules = schedules.fetchall()
                
                assert len(schedules) == 6
                
                # Verificar horarios específicos
                day_groups = [s.day_group_name for s in schedules]
                assert "Do" in day_groups
                assert "Lu-Vi" in day_groups
                assert "Lu-Vi" in day_groups  # Debería aparecer dos veces
                assert "Ma-Ju" in day_groups
                assert "Sá" in day_groups
                assert "Lu-Vi" in day_groups  # Para el rango completo
        
        finally:
            temp_csv_path.unlink()
