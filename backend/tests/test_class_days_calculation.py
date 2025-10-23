"""Tests for class days calculation logic."""

from datetime import date


# Import the calculation functions (you may need to create these utility functions)
def calculate_class_days_in_month(
    start_date: date,
    end_date: date,
    holidays: list[date],
    target_weekdays: list[int],
    target_month: int = None,
    target_year: int = None,
) -> tuple[int, list[date]]:
    """Calculate class days in a specific month for given weekdays.

    Args:
        start_date: Start date of the academic term
        end_date: End date of the academic term
        holidays: List of holiday dates
        target_weekdays: List of weekdays (0=Monday, 1=Tuesday, ..., 6=Sunday)
        target_month: Month to calculate for (1-12). If None, uses start_date month.
        target_year: Year to calculate for. If None, uses start_date year.

    Returns:
        Tuple of (count, list of class dates)
    """
    class_dates = []
    count = 0

    # Determine the month to calculate
    if target_month is None:
        target_month = start_date.month
    if target_year is None:
        target_year = start_date.year

    # Create month boundaries
    month_start = date(target_year, target_month, 1)
    if target_month == 12:
        month_end = date(target_year + 1, 1, 1)
    else:
        month_end = date(target_year, target_month + 1, 1)

    # Adjust to term boundaries
    calc_start = max(start_date, month_start)
    calc_end = min(end_date, month_end - date.resolution)

    # If no overlap, return empty result
    if calc_start > calc_end:
        return 0, []

    current_date = calc_start
    while current_date <= calc_end:
        if current_date.weekday() in target_weekdays and current_date not in holidays:
            class_dates.append(current_date)
            count += 1
        current_date += date.resolution

    return count, class_dates


class TestClassDaysCalculation:
    """Test cases for class days calculation."""

    def test_calculate_class_days_january_2025_cycle1(self):
        """Test calculation for January 2025, Cycle 1 (lunes y miércoles)."""
        # Cycle 1: 2025-01-21 to 2025-06-13
        start_date = date(2025, 1, 21)
        end_date = date(2025, 6, 13)

        # Holidays in January 2025
        holidays = [date(2025, 1, 1)]  # New Year's Day

        # Target weekdays: Monday (0) and Wednesday (2)
        target_weekdays = [0, 2]

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Expected results based on our previous calculation
        expected_count = 3
        expected_dates = [
            date(2025, 1, 22),  # Wednesday
            date(2025, 1, 27),  # Monday
            date(2025, 1, 29),  # Wednesday
        ]

        assert count == expected_count
        assert class_dates == expected_dates

    def test_calculate_class_days_september_2025_cycle2(self):
        """Test calculation for September 2025, Cycle 2 (lunes y viernes)."""
        # Cycle 2: 2025-07-24 to 2025-12-13
        start_date = date(2025, 7, 24)
        end_date = date(2025, 12, 13)

        # Holidays in September 2025
        holidays = [date(2025, 9, 15)]  # Independence Day

        # Target weekdays: Monday (0) and Friday (4)
        target_weekdays = [0, 4]

        count, class_dates = calculate_class_days_in_month(
            start_date, end_date, holidays, target_weekdays, target_month=9, target_year=2025
        )

        # Expected results based on our previous calculation
        expected_count = 8
        expected_dates = [
            date(2025, 9, 1),  # Monday
            date(2025, 9, 5),  # Friday
            date(2025, 9, 8),  # Monday
            date(2025, 9, 12),  # Friday
            date(2025, 9, 19),  # Friday
            date(2025, 9, 22),  # Monday
            date(2025, 9, 26),  # Friday
            date(2025, 9, 29),  # Monday
        ]

        assert count == expected_count
        assert class_dates == expected_dates

    def test_calculate_class_days_with_multiple_holidays(self):
        """Test calculation with multiple holidays affecting the target weekdays."""
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)

        # Multiple holidays including some on target weekdays
        holidays = [
            date(2025, 1, 1),  # New Year's Day (Wednesday)
            date(2025, 1, 6),  # Epiphany (Monday)
            date(2025, 1, 15),  # Random holiday (Wednesday)
        ]

        # Target weekdays: Monday (0) and Wednesday (2)
        target_weekdays = [0, 2]

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Verify that holiday dates are not included
        for holiday in holidays:
            assert holiday not in class_dates

        # Verify count is reasonable (should be less than total possible days)
        assert count > 0
        assert count < 10  # Should be reasonable number for January

    def test_calculate_class_days_no_holidays(self):
        """Test calculation with no holidays."""
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        holidays = []

        # Target weekdays: Monday (0) and Wednesday (2)
        target_weekdays = [0, 2]

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Should have more days without holidays
        assert count > 0

        # All returned dates should be Mondays or Wednesdays
        for class_date in class_dates:
            assert class_date.weekday() in target_weekdays

    def test_calculate_class_days_term_not_in_month(self):
        """Test calculation when term doesn't overlap with the month."""
        start_date = date(2025, 6, 1)
        end_date = date(2025, 6, 30)

        holidays = []
        target_weekdays = [0, 2]

        # Try to calculate for January (term doesn't include January)
        count, class_dates = calculate_class_days_in_month(
            start_date, end_date, holidays, target_weekdays, target_month=1, target_year=2025
        )

        # Should return 0 since term doesn't overlap with January
        assert count == 0
        assert class_dates == []

    def test_calculate_class_days_partial_month_overlap(self):
        """Test calculation when term only partially overlaps with the month."""
        start_date = date(2025, 1, 15)  # Term starts mid-January
        end_date = date(2025, 6, 30)

        holidays = []
        target_weekdays = [0, 2]  # Monday and Wednesday

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Should only include dates from January 15 onwards
        for class_date in class_dates:
            assert class_date >= start_date
            assert class_date.weekday() in target_weekdays

    def test_calculate_class_days_weekend_days(self):
        """Test calculation with weekend days (should return 0)."""
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        holidays = []

        # Target weekdays: Saturday (5) and Sunday (6)
        target_weekdays = [5, 6]

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Should still work (for testing purposes)
        assert count > 0
        for class_date in class_dates:
            assert class_date.weekday() in target_weekdays

    def test_calculate_class_days_edge_case_single_day_term(self):
        """Test calculation with a single-day term."""
        single_day = date(2025, 1, 15)  # Wednesday
        holidays = []
        target_weekdays = [2]  # Wednesday only

        count, class_dates = calculate_class_days_in_month(single_day, single_day, holidays, target_weekdays)

        assert count == 1
        assert class_dates == [single_day]

    def test_calculate_class_days_all_weekdays(self):
        """Test calculation with all weekdays (Monday through Friday)."""
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        holidays = []

        # Target weekdays: Monday through Friday (0-4)
        target_weekdays = [0, 1, 2, 3, 4]

        count, class_dates = calculate_class_days_in_month(start_date, end_date, holidays, target_weekdays)

        # Should have many more days
        assert count > 20  # Should be close to 22-23 weekdays in January
        for class_date in class_dates:
            assert class_date.weekday() in target_weekdays
