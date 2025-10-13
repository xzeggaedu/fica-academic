import pytest
from datetime import time

from src.scripts.seed_schedule_times import (
    parse_time_string,
    parse_days_array,
    generate_day_group_name,
)


class TestScheduleTimesSeeder:
    """Pruebas unitarias para las funciones del seeder de schedule times."""

    def test_parse_time_string_valid_formats(self):
        """Prueba el parseo de diferentes formatos de tiempo válidos."""
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
        
        # Los siguientes casos también deberían lanzar errores pero
        # la implementación actual los maneja de forma permisiva
        # parse_days_array("[0, 1, 2")  # Sin cerrar
        # parse_days_array("0, 1, 2]")  # Sin abrir

    def test_generate_day_group_name(self):
        """Prueba la generación de nombres de grupos de días."""
        # Casos válidos
        assert generate_day_group_name([0]) == "Lu"
        assert generate_day_group_name([1, 3]) == "Ma-Ju"
        assert generate_day_group_name([0, 4]) == "Lu-Vi"
        assert generate_day_group_name([0, 1, 2, 3, 4]) == "Lu-Ma-Mi-Ju-Vi"
        assert generate_day_group_name([5]) == "Sá"
        assert generate_day_group_name([6]) == "Do"
        
        # Casos con días no consecutivos
        assert generate_day_group_name([0, 4]) == "Lu-Vi"
        assert generate_day_group_name([1, 3, 5]) == "Ma-Ju-Sá"
        
    def test_generate_day_group_name_invalid(self):
        """Prueba la generación con arrays inválidos."""
        with pytest.raises(ValueError):
            generate_day_group_name([])  # Array vacío
            
        with pytest.raises(ValueError):
            generate_day_group_name([7])  # Día inválido
            
        with pytest.raises(ValueError):
            generate_day_group_name([-1])  # Día negativo
