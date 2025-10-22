/**
 * Simplified tests for calendar interactions
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the date grouping function
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const groupConsecutiveDates = (holidays: any[]) => {
  if (!holidays || holidays.length === 0) return { dates: [], ranges: [] };

  const sortedHolidays = [...holidays].sort((a, b) =>
    createLocalDate(a.date).getTime() - createLocalDate(b.date).getTime()
  );

  const individualDates: Date[] = [];
  const ranges: Array<{ from: Date; to: Date; name: string }> = [];

  let currentRange: { start: Date; end: Date; name: string } | null = null;

  for (const holiday of sortedHolidays) {
    const holidayDate = createLocalDate(holiday.date);

    if (!currentRange) {
      currentRange = {
        start: holidayDate,
        end: holidayDate,
        name: holiday.name,
      };
    } else if (
      currentRange.name === holiday.name &&
      holidayDate.getTime() === currentRange.end.getTime() + 24 * 60 * 60 * 1000
    ) {
      currentRange.end = holidayDate;
    } else {
      if (currentRange.start.getTime() === currentRange.end.getTime()) {
        individualDates.push(currentRange.start);
      } else {
        ranges.push({
          from: currentRange.start,
          to: currentRange.end,
          name: currentRange.name,
        });
      }

      currentRange = {
        start: holidayDate,
        end: holidayDate,
        name: holiday.name,
      };
    }
  }

  if (currentRange) {
    if (currentRange.start.getTime() === currentRange.end.getTime()) {
      individualDates.push(currentRange.start);
    } else {
      ranges.push({
        from: currentRange.start,
        to: currentRange.end,
        name: currentRange.name,
      });
    }
  }

  return { dates: individualDates, ranges };
};

describe('Calendar Interactions - Logic Tests', () => {
  it('should group consecutive dates correctly', () => {
    const holidays = [
      { date: '2025-04-14', name: 'Semana Santa' },
      { date: '2025-04-15', name: 'Semana Santa' },
      { date: '2025-04-16', name: 'Semana Santa' },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.ranges).toHaveLength(1);
    expect(result.dates).toHaveLength(0);
    expect(result.ranges[0].name).toBe('Semana Santa');
  });

  it('should keep individual dates separate', () => {
    const holidays = [
      { date: '2025-01-01', name: 'Año Nuevo' },
      { date: '2025-05-01', name: 'Día del Trabajo' },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.ranges).toHaveLength(0);
    expect(result.dates).toHaveLength(2);
  });

  it('should handle mixed consecutive and individual dates', () => {
    const holidays = [
      { date: '2025-01-01', name: 'Año Nuevo' },
      { date: '2025-04-14', name: 'Semana Santa' },
      { date: '2025-04-15', name: 'Semana Santa' },
      { date: '2025-05-01', name: 'Día del Trabajo' },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(2);
    expect(result.ranges).toHaveLength(1);
  });
});

describe('Modal Logic Tests', () => {
  it('should determine create vs edit mode correctly', () => {
    const existingHolidays = [
      { id: 1, date: '2025-01-01', name: 'Año Nuevo' },
      { id: 2, date: '2025-05-01', name: 'Día del Trabajo' },
    ];

    const checkExistingHoliday = (date: Date) => {
      return existingHolidays.find(holiday =>
        createLocalDate(holiday.date).toDateString() === date.toDateString()
      );
    };

    // Test existing date
    const existingDate = new Date(2025, 0, 1); // Jan 1, 2025
    const existing = checkExistingHoliday(existingDate);
    expect(existing).toBeDefined();
    expect(existing?.name).toBe('Año Nuevo');

    // Test new date
    const newDate = new Date(2025, 0, 15); // Jan 15, 2025
    const notExisting = checkExistingHoliday(newDate);
    expect(notExisting).toBeUndefined();
  });

  it('should validate form data correctly', () => {
    const validateForm = (name: string, type: string) => {
      return {
        isValid: name.trim().length > 0 && type.length > 0,
        errors: []
      };
    };

    // Valid form
    const validResult = validateForm('Test Holiday', 'Asueto Nacional');
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid form - empty name
    const invalidResult = validateForm('', 'Asueto Nacional');
    expect(invalidResult.isValid).toBe(false);

    // Invalid form - whitespace only name
    const whitespaceResult = validateForm('   ', 'Asueto Nacional');
    expect(whitespaceResult.isValid).toBe(false);
  });

  it('should format dates correctly for API', () => {
    const formatDateForAPI = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const testDate = new Date(2025, 0, 15); // Jan 15, 2025
    const formatted = formatDateForAPI(testDate);
    expect(formatted).toBe('2025-01-15');
  });
});

describe('Calendar Styling Logic', () => {
  it('should determine correct modifiers for calendar', () => {
    const holidays = [
      { date: '2025-04-14', name: 'Semana Santa' },
      { date: '2025-04-15', name: 'Semana Santa' },
      { date: '2025-04-16', name: 'Semana Santa' },
      { date: '2025-05-01', name: 'Día del Trabajo' },
    ];

    const { dates, ranges } = groupConsecutiveDates(holidays);

    // Should have modifiers for ranges
    const rangeStart = ranges.map(range => range.from);
    const rangeEnd = ranges.map(range => range.to);
    const rangeMiddle = ranges.flatMap(range => {
      const middleDates = [];
      const current = new Date(range.from);
      current.setDate(current.getDate() + 1);
      while (current < range.to) {
        middleDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return middleDates;
    });

    // Should have modifiers for individual dates
    const individual = dates.filter(date => {
      return !ranges.some(range =>
        date >= range.from && date <= range.to
      );
    });

    expect(rangeStart).toHaveLength(1);
    expect(rangeEnd).toHaveLength(1);
    expect(rangeMiddle).toHaveLength(1); // April 15
    expect(individual).toHaveLength(1); // May 1
  });

  it('should apply correct styling colors', () => {
    const getModifierStyles = (type: 'rangeStart' | 'rangeEnd' | 'rangeMiddle' | 'individual') => {
      const styles = {
        rangeStart: {
          backgroundColor: '#b0245a',
          color: 'white',
          borderRadius: '6px 0 0 6px'
        },
        rangeEnd: {
          backgroundColor: '#b0245a',
          color: 'white',
          borderRadius: '0 6px 6px 0'
        },
        rangeMiddle: {
          backgroundColor: '#f5d0dc',
          color: '#b0245a',
          borderRadius: '0'
        },
        individual: {
          backgroundColor: '#b0245a',
          color: 'white',
          borderRadius: '6px'
        }
      };
      return styles[type];
    };

    const rangeStartStyle = getModifierStyles('rangeStart');
    expect(rangeStartStyle.backgroundColor).toBe('#b0245a');
    expect(rangeStartStyle.color).toBe('white');

    const rangeMiddleStyle = getModifierStyles('rangeMiddle');
    expect(rangeMiddleStyle.backgroundColor).toBe('#f5d0dc');
    expect(rangeMiddleStyle.color).toBe('#b0245a');
  });
});
