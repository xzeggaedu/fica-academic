/**
 * Tests for date grouping logic in annual holidays calendar
 */

import { describe, it, expect } from 'vitest';

// Mock the AnnualHoliday type
interface AnnualHoliday {
  id: number;
  holiday_id: number;
  date: string;
  name: string;
  type: string;
}

// Function to create local date without timezone issues
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

// Function to group consecutive dates with the same name
const groupConsecutiveDates = (holidays: AnnualHoliday[]) => {
  if (!holidays || holidays.length === 0) return { dates: [], ranges: [] };

  // Sort by date
  const sortedHolidays = [...holidays].sort((a, b) =>
    createLocalDate(a.date).getTime() - createLocalDate(b.date).getTime()
  );

  const individualDates: Date[] = [];
  const ranges: Array<{ from: Date; to: Date; name: string }> = [];

  let currentRange: { start: Date; end: Date; name: string } | null = null;

  for (const holiday of sortedHolidays) {
    const holidayDate = createLocalDate(holiday.date);

    if (!currentRange) {
      // Start a new potential range
      currentRange = {
        start: holidayDate,
        end: holidayDate,
        name: holiday.name,
      };
    } else if (
      currentRange.name === holiday.name &&
      holidayDate.getTime() === currentRange.end.getTime() + 24 * 60 * 60 * 1000 // Next day
    ) {
      // Extend the current range
      currentRange.end = holidayDate;
    } else {
      // Finalize the current range and start a new one
      if (currentRange.start.getTime() === currentRange.end.getTime()) {
        // Single day range -> individual date
        individualDates.push(currentRange.start);
      } else {
        // Multi-day range
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

  // Process the last range
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

describe('Date Grouping Logic', () => {
  it('should group consecutive dates with same name into ranges', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-04-14',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 2,
        holiday_id: 1,
        date: '2025-04-15',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 3,
        holiday_id: 1,
        date: '2025-04-16',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 4,
        holiday_id: 1,
        date: '2025-04-17',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(0);
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].name).toBe('Semana Santa');
    expect(result.ranges[0].from.toISOString().split('T')[0]).toBe('2025-04-14');
    expect(result.ranges[0].to.toISOString().split('T')[0]).toBe('2025-04-17');
  });

  it('should keep individual dates separate when not consecutive', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-01-01',
        name: 'Año Nuevo',
        type: 'Asueto Nacional',
      },
      {
        id: 2,
        holiday_id: 1,
        date: '2025-05-01',
        name: 'Día del Trabajo',
        type: 'Asueto Nacional',
      },
      {
        id: 3,
        holiday_id: 1,
        date: '2025-12-25',
        name: 'Navidad',
        type: 'Asueto Nacional',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(3);
    expect(result.ranges).toHaveLength(0);
    expect(result.dates[0].toISOString().split('T')[0]).toBe('2025-01-01');
    expect(result.dates[1].toISOString().split('T')[0]).toBe('2025-05-01');
    expect(result.dates[2].toISOString().split('T')[0]).toBe('2025-12-25');
  });

  it('should handle mixed consecutive and individual dates', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-01-01',
        name: 'Año Nuevo',
        type: 'Asueto Nacional',
      },
      {
        id: 2,
        holiday_id: 1,
        date: '2025-04-14',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 3,
        holiday_id: 1,
        date: '2025-04-15',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 4,
        holiday_id: 1,
        date: '2025-05-01',
        name: 'Día del Trabajo',
        type: 'Asueto Nacional',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(2); // Año Nuevo and Día del Trabajo
    expect(result.ranges).toHaveLength(1); // Semana Santa range
    expect(result.dates[0].toISOString().split('T')[0]).toBe('2025-01-01');
    expect(result.dates[1].toISOString().split('T')[0]).toBe('2025-05-01');
    expect(result.ranges[0].name).toBe('Semana Santa');
  });

  it('should handle single-day ranges correctly', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-01-01',
        name: 'Año Nuevo',
        type: 'Asueto Nacional',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(1);
    expect(result.ranges).toHaveLength(0);
    expect(result.dates[0].toISOString().split('T')[0]).toBe('2025-01-01');
  });

  it('should handle empty holidays array', () => {
    const result = groupConsecutiveDates([]);

    expect(result.dates).toHaveLength(0);
    expect(result.ranges).toHaveLength(0);
  });

  it('should handle null holidays array', () => {
    const result = groupConsecutiveDates(null as any);

    expect(result.dates).toHaveLength(0);
    expect(result.ranges).toHaveLength(0);
  });

  it('should not group dates with same name if not consecutive', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-04-14',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 2,
        holiday_id: 1,
        date: '2025-04-16', // Skipping 15th
        name: 'Semana Santa',
        type: 'Personalizado',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.dates).toHaveLength(2); // Both should be individual dates
    expect(result.ranges).toHaveLength(0);
  });

  it('should sort holidays by date before grouping', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 2,
        holiday_id: 1,
        date: '2025-04-15',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 1,
        holiday_id: 1,
        date: '2025-04-14',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 3,
        holiday_id: 1,
        date: '2025-04-16',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].from.toISOString().split('T')[0]).toBe('2025-04-14');
    expect(result.ranges[0].to.toISOString().split('T')[0]).toBe('2025-04-16');
  });

  it('should handle different names correctly', () => {
    const holidays: AnnualHoliday[] = [
      {
        id: 1,
        holiday_id: 1,
        date: '2025-04-14',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 2,
        holiday_id: 1,
        date: '2025-04-15',
        name: 'Semana Santa',
        type: 'Personalizado',
      },
      {
        id: 3,
        holiday_id: 1,
        date: '2025-04-16',
        name: 'Otro Asueto',
        type: 'Personalizado',
      },
    ];

    const result = groupConsecutiveDates(holidays);

    expect(result.ranges).toHaveLength(1);
    expect(result.dates).toHaveLength(1);
    expect(result.ranges[0].name).toBe('Semana Santa');
    expect(result.dates[0].toISOString().split('T')[0]).toBe('2025-04-16');
  });
});

describe('createLocalDate function', () => {
  it('should create dates without timezone issues', () => {
    const date1 = createLocalDate('2025-04-14');
    const date2 = new Date(2025, 3, 14); // month is 0-indexed

    expect(date1.getFullYear()).toBe(2025);
    expect(date1.getMonth()).toBe(3); // April (0-indexed)
    expect(date1.getDate()).toBe(14);
    expect(date1.getTime()).toBe(date2.getTime());
  });

  it('should handle different date formats correctly', () => {
    const date = createLocalDate('2025-12-31');

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December (0-indexed)
    expect(date.getDate()).toBe(31);
  });
});
