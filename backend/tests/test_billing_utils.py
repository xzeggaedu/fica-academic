"""Tests for billing utility functions."""

import pytest

from src.app.core.billing.billing_utils import (
    class_days_to_weekdays,
    determine_academic_level,
    group_classes_by_schedule,
)


class TestClassDaysToWeekdays:
    """Tests for class_days_to_weekdays function."""

    def test_lu_ma_mi(self):
        """Test conversion of Lu-Ma-Mi to [0, 1, 2]."""
        result = class_days_to_weekdays("Lu-Ma-Mi")
        assert result == [0, 1, 2]

    def test_lu_vi(self):
        """Test conversion of Lu-Vi to [0, 4]."""
        result = class_days_to_weekdays("Lu-Vi")
        assert result == [0, 4]

    def test_single_day(self):
        """Test conversion of single day Sa to [5]."""
        result = class_days_to_weekdays("Sa")
        assert result == [5]

    def test_empty_string(self):
        """Test empty string returns empty list."""
        result = class_days_to_weekdays("")
        assert result == []

    def test_none_value(self):
        """Test None value returns empty list."""
        result = class_days_to_weekdays(None)  # type: ignore
        assert result == []

    def test_invalid_day_abbrev(self):
        """Test invalid day abbreviation is ignored."""
        result = class_days_to_weekdays("Lu-XX-Vi")
        assert result == [0, 4]

    def test_all_weekdays(self):
        """Test all weekdays conversion."""
        result = class_days_to_weekdays("Lu-Ma-Mi-Ju-Vi-Sa-Do")
        assert result == [0, 1, 2, 3, 4, 5, 6]


class TestDetermineAcademicLevel:
    """Tests for determine_academic_level function."""

    def test_bilingual_highest_priority(self):
        """Test bilingual has highest priority."""
        result = determine_academic_level(True, True, 5)
        assert result == "BLG"

    def test_doctor_over_masters(self):
        """Test doctor has priority over masters."""
        result = determine_academic_level(False, True, 3)
        assert result == "DR"

    def test_two_masters(self):
        """Test two or more masters returns M2."""
        result = determine_academic_level(False, False, 2)
        assert result == "M2"

    def test_three_masters(self):
        """Test three or more masters returns M2."""
        result = determine_academic_level(False, False, 3)
        assert result == "M2"

    def test_one_master(self):
        """Test one master returns M1."""
        result = determine_academic_level(False, False, 1)
        assert result == "M1"

    def test_no_qualifications(self):
        """Test no qualifications returns GDO."""
        result = determine_academic_level(False, False, 0)
        assert result == "GDO"

    def test_zero_masters_no_other(self):
        """Test zero masters with no other qualifications returns GDO."""
        result = determine_academic_level(False, False, 0)
        assert result == "GDO"


@pytest.mark.asyncio
class TestGetAcademicLevelIdsMap:
    """Tests for get_academic_level_ids_map function."""

    async def test_returns_map(self, db_session):
        """Test that function returns a dictionary mapping codes to IDs."""
        from src.app.core.billing.billing_utils import get_academic_level_ids_map

        result = await get_academic_level_ids_map(db_session)

        assert isinstance(result, dict)
        assert "BLG" in result
        assert "DR" in result
        assert "M2" in result
        assert "M1" in result
        assert "GDO" in result

        # Verify IDs are integers
        assert all(isinstance(id, int) for id in result.values())


class TestGroupClassesBySchedule:
    """Tests for group_classes_by_schedule function."""

    def test_groups_by_schedule(self):
        """Test that classes are grouped by unique schedule combination."""
        from unittest.mock import Mock

        # Create mock classes with different schedules
        class1 = Mock()
        class1.class_days = "Lu-Ma-Mi"
        class1.class_schedule = "08:00-09:30"
        class1.class_duration = 90

        class2 = Mock()
        class2.class_days = "Lu-Ma-Mi"
        class2.class_schedule = "08:00-09:30"
        class2.class_duration = 90

        class3 = Mock()
        class3.class_days = "Lu-Vi"
        class3.class_schedule = "14:00-15:30"
        class3.class_duration = 90

        classes = [class1, class2, class3]
        result = group_classes_by_schedule(classes)

        # Should have 2 groups
        assert len(result) == 2

        # First group should have 2 classes
        key1 = ("Lu-Ma-Mi", "08:00-09:30", 90)
        assert key1 in result
        assert len(result[key1]) == 2

        # Second group should have 1 class
        key2 = ("Lu-Vi", "14:00-15:30", 90)
        assert key2 in result
        assert len(result[key2]) == 1

    def test_empty_list(self):
        """Test that empty list returns empty dict."""
        result = group_classes_by_schedule([])
        assert result == {}
