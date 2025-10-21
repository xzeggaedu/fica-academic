from datetime import datetime
from decimal import Decimal

import pytest


class TestHourlyRateHistoryValidation:
    """Pruebas para la validación de datos de HourlyRateHistory."""

    def test_create_hourly_rate_valid(self):
        """Prueba que se pueda crear una tarifa horaria válida."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryCreate

        rate = HourlyRateHistoryCreate(
            level_id=1,
            rate_per_hour=Decimal("15.00"),
            start_date=datetime(2025, 1, 1),
        )

        assert rate.level_id == 1
        assert rate.rate_per_hour == Decimal("15.00")
        assert rate.start_date == datetime(2025, 1, 1)

    def test_rate_positive_validation(self):
        """Prueba que la tarifa debe ser positiva."""
        from pydantic import ValidationError

        from src.app.schemas.hourly_rate_history import HourlyRateHistoryCreate

        with pytest.raises(ValidationError) as exc_info:
            HourlyRateHistoryCreate(level_id=1, rate_per_hour=Decimal("-10.00"), start_date=datetime(2025, 1, 1))

        error_msg = str(exc_info.value).lower()
        assert "greater than 0" in error_msg or "debe ser mayor que cero" in error_msg

    def test_rate_zero_validation(self):
        """Prueba que la tarifa no pueda ser cero."""
        from pydantic import ValidationError

        from src.app.schemas.hourly_rate_history import HourlyRateHistoryCreate

        with pytest.raises(ValidationError) as exc_info:
            HourlyRateHistoryCreate(level_id=1, rate_per_hour=Decimal("0.00"), start_date=datetime(2025, 1, 1))

        error_msg = str(exc_info.value).lower()
        assert "greater than 0" in error_msg or "debe ser mayor que cero" in error_msg

    def test_rate_decimal_precision(self):
        """Prueba que la tarifa valide la precisión decimal."""
        from pydantic import ValidationError

        from src.app.schemas.hourly_rate_history import HourlyRateHistoryCreate

        # Pydantic valida la precisión decimal antes de aplicar el validador
        with pytest.raises(ValidationError) as exc_info:
            HourlyRateHistoryCreate(level_id=1, rate_per_hour=Decimal("15.999"), start_date=datetime(2025, 1, 1))

        error_msg = str(exc_info.value).lower()
        assert "decimal" in error_msg and "2" in error_msg


class TestHourlyRateHistoryUpdate:
    """Pruebas para actualización de Hourly Rate History."""

    def test_update_all_fields(self):
        """Prueba que se puedan actualizar todos los campos."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryUpdate

        update = HourlyRateHistoryUpdate(
            rate_per_hour=Decimal("20.00"),
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 12, 31),
        )

        assert update.rate_per_hour == Decimal("20.00")
        assert update.start_date == datetime(2026, 1, 1)
        assert update.end_date == datetime(2026, 12, 31)

    def test_update_partial_fields(self):
        """Prueba que se pueda actualizar parcialmente."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryUpdate

        update = HourlyRateHistoryUpdate(rate_per_hour=Decimal("18.50"))

        assert update.rate_per_hour == Decimal("18.50")
        assert update.start_date is None
        assert update.end_date is None

    def test_update_date_validation(self):
        """Prueba que end_date debe ser posterior a start_date."""
        from pydantic import ValidationError

        from src.app.schemas.hourly_rate_history import HourlyRateHistoryUpdate

        with pytest.raises(ValidationError) as exc_info:
            HourlyRateHistoryUpdate(start_date=datetime(2026, 12, 31), end_date=datetime(2026, 1, 1))

        assert "no puede ser anterior" in str(exc_info.value).lower()

    def test_update_same_dates(self):
        """Prueba que end_date puede ser igual a start_date."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryUpdate

        # Ahora las fechas iguales están permitidas
        update = HourlyRateHistoryUpdate(start_date=datetime(2026, 1, 1), end_date=datetime(2026, 1, 1))

        assert update.start_date == datetime(2026, 1, 1)
        assert update.end_date == datetime(2026, 1, 1)


class TestHourlyRateHistoryBase:
    """Pruebas para el schema base de Hourly Rate History."""

    def test_base_with_end_datetime(self):
        """Prueba crear una tarifa con fecha de fin."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryBase

        rate = HourlyRateHistoryBase(
            level_id=1,
            rate_per_hour=Decimal("15.00"),
            start_date=datetime(2025, 1, 1),
            end_date=datetime(2025, 12, 31),
        )

        assert rate.end_date == datetime(2025, 12, 31)

    def test_base_without_end_datetime(self):
        """Prueba crear una tarifa sin fecha de fin (activa)."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryBase

        rate = HourlyRateHistoryBase(
            level_id=1,
            rate_per_hour=Decimal("15.00"),
            start_date=datetime(2025, 1, 1),
        )

        assert rate.end_date is None

    def test_invalid_date_range(self):
        """Prueba que se valide el rango de fechas."""
        from pydantic import ValidationError

        from src.app.schemas.hourly_rate_history import HourlyRateHistoryBase

        with pytest.raises(ValidationError) as exc_info:
            HourlyRateHistoryBase(
                level_id=1,
                rate_per_hour=Decimal("15.00"),
                start_date=datetime(2025, 12, 31),
                end_date=datetime(2025, 1, 1),
            )

        assert "no puede ser anterior" in str(exc_info.value).lower()


class TestHourlyRateTimelineItem:
    """Pruebas para HourlyRateTimelineItem."""

    def test_timeline_item_active(self):
        """Prueba que se identifique correctamente una tarifa activa."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryRead, HourlyRateTimelineItem

        rate = HourlyRateHistoryRead(
            id=1,
            level_id=1,
            rate_per_hour=Decimal("15.00"),
            start_date=datetime(2025, 1, 1),
            end_date=None,
            created_by_id=None,
            created_at=datetime.now(),
            updated_at=None,
        )

        timeline_item = HourlyRateTimelineItem.from_rate(rate)

        assert timeline_item.is_active is True
        assert timeline_item.end_date is None

    def test_timeline_item_inactive(self):
        """Prueba que se identifique correctamente una tarifa inactiva."""
        from src.app.schemas.hourly_rate_history import HourlyRateHistoryRead, HourlyRateTimelineItem

        rate = HourlyRateHistoryRead(
            id=1,
            level_id=1,
            rate_per_hour=Decimal("15.00"),
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 12, 31),
            created_by_id=None,
            created_at=datetime.now(),
            updated_at=None,
        )

        timeline_item = HourlyRateTimelineItem.from_rate(rate)

        assert timeline_item.is_active is False
        assert timeline_item.end_date == datetime(2024, 12, 31)
