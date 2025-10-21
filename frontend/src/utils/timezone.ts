/**
 * Utility functions for timezone handling
 * Server stores everything in UTC, frontend displays in GMT-6 (El Salvador)
 */

/**
 * Convert UTC datetime string to GMT-6 (El Salvador) for display
 * @param utcDateTimeString - DateTime string in ISO format (UTC)
 * @returns DateTime string in ISO format (GMT-6)
 */
export const convertUTCToGMT6 = (utcDateTimeString: string): string => {
  if (!utcDateTimeString) return utcDateTimeString;

  // Create date object from UTC string
  const utcDate = new Date(utcDateTimeString);

  // Convert to GMT-6 (El Salvador timezone)
  const gmt6Date = new Date(utcDate.getTime() - (6 * 60 * 60 * 1000));

  // Return in ISO format
  return gmt6Date.toISOString();
};

/**
 * Convert GMT-6 (El Salvador) datetime string to UTC for server
 * @param gmt6DateTimeString - DateTime string in ISO format (GMT-6)
 * @returns DateTime string in ISO format (UTC)
 */
export const convertGMT6ToUTC = (gmt6DateTimeString: string): string => {
  if (!gmt6DateTimeString) return gmt6DateTimeString;

  // Create date object from GMT-6 string
  const gmt6Date = new Date(gmt6DateTimeString + 'T00:00:00.000-06:00');

  // Return in ISO format (UTC)
  return gmt6Date.toISOString();
};

/**
 * Get current date in GMT-6 (El Salvador) for date input fields
 * @returns Date string in format "YYYY-MM-DD" (GMT-6)
 */
export const getCurrentGMT6Date = (): string => {
  const now = new Date();
  // Adjust to GMT-6
  const gmt6Date = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  // Return just the date part
  return gmt6Date.toISOString().split('T')[0];
};

/**
 * Format datetime for display (shows only date part in GMT-6)
 * @param utcDateTimeString - DateTime string in ISO format (UTC)
 * @returns Date string in format "YYYY-MM-DD" (GMT-6)
 */
export const formatDateTimeForDisplay = (utcDateTimeString: string): string => {
  if (!utcDateTimeString) return utcDateTimeString;

  const gmt6DateTime = convertUTCToGMT6(utcDateTimeString);
  return gmt6DateTime.split('T')[0];
};

/**
 * Format datetime for input field (shows only date part in GMT-6)
 * @param utcDateTimeString - DateTime string in ISO format (UTC)
 * @returns Date string in format "YYYY-MM-DD" (GMT-6)
 */
export const formatDateTimeForInput = (utcDateTimeString: string): string => {
  if (!utcDateTimeString) return utcDateTimeString;

  const gmt6DateTime = convertUTCToGMT6(utcDateTimeString);
  return gmt6DateTime.split('T')[0];
};

/**
 * Convert date input to UTC datetime with current server time
 * @param dateString - Date string in format "YYYY-MM-DD" (GMT-6)
 * @returns Promise with DateTime string in ISO format (UTC, without timezone suffix)
 */
export const convertDateInputToUTCDateTime = async (dateString: string): Promise<string> => {
  if (!dateString) return dateString;

  try {
    // Get current server time in UTC
    const serverTime = await getServerTimeUTC();
    console.log('Server time:', serverTime);

    // Extract date components from the input date string
    const [year, month, day] = dateString.split('-').map(Number);

    // Get server date components
    const serverYear = serverTime.getUTCFullYear();
    const serverMonth = serverTime.getUTCMonth() + 1;
    const serverDay = serverTime.getUTCDate();

    console.log('Input date:', { year, month, day });
    console.log('Server date:', { serverYear, serverMonth, serverDay });

    // Use server date if input date is today or in the past
    // Use input date only if it's explicitly in the future
    let targetYear = year;
    let targetMonth = month;
    let targetDay = day;

    // If input date is today, use server time
    if (year === serverYear && month === serverMonth && day === serverDay) {
      targetYear = serverYear;
      targetMonth = serverMonth;
      targetDay = serverDay;
      console.log('Using server date (today)');
    } else {
      console.log('Using input date');
    }

    // Create a new date with the target date and current server time
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay,
      serverTime.getUTCHours(),
      serverTime.getUTCMinutes(),
      serverTime.getUTCSeconds()
    );

    // Format as UTC datetime string
    const yearStr = targetDate.getUTCFullYear();
    const monthStr = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(targetDate.getUTCDate()).padStart(2, '0');
    const hoursStr = String(targetDate.getUTCHours()).padStart(2, '0');
    const minutesStr = String(targetDate.getUTCMinutes()).padStart(2, '0');
    const secondsStr = String(targetDate.getUTCSeconds()).padStart(2, '0');

    const result = `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:${secondsStr}`;
    console.log('Final result:', result);

    return result;
  } catch (error) {
    console.error('Error converting date to UTC datetime:', error);
    // Fallback to midnight if server time is unavailable
    const gmt6Date = new Date(dateString + 'T00:00:00.000-06:00');
    const year = gmt6Date.getUTCFullYear();
    const month = String(gmt6Date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(gmt6Date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }
};

/**
 * Check if enough time has passed since the last rate creation for the same level
 * @param hourlyRates - Array of existing hourly rates
 * @param levelId - Academic level ID
 * @param newStartDate - New start date string (GMT-6)
 * @returns Object with isValid boolean and message
 */
export const validateMinimumTimeBetweenRates = (
  hourlyRates: any[],
  levelId: number,
  newStartDate: string
): { isValid: boolean; message?: string } => {
  try {
    // Find the most recent rate for this level (by start_date, not created_at)
    const recentRates = hourlyRates
      .filter(rate => rate.level_id === levelId)
      .sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateB - dateA; // Más reciente primero
      });

    if (recentRates.length === 0) {
      return { isValid: true };
    }

    const lastRate = recentRates[0];
    const lastStartDate = new Date(lastRate.start_date);
    const now = new Date();

    // Debug: log the dates to see what's happening
    console.log('Debug time validation:', {
      allRatesForLevel: recentRates.map(r => ({
        id: r.id,
        start_date: r.start_date,
        start_date_parsed: new Date(r.start_date).toISOString()
      })),
      lastRateId: lastRate.id,
      lastStartDate: lastStartDate.toISOString(),
      now: now.toISOString(),
      lastStartDateTime: lastStartDate.getTime(),
      nowTime: now.getTime(),
      levelId: levelId
    });

    const timeDifferenceMs = now.getTime() - lastStartDate.getTime();
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

    // Handle negative time differences (future dates)
    if (timeDifferenceMinutes < 0) {
      console.warn('Negative time difference detected in validation:', timeDifferenceMinutes);
      return {
        isValid: false,
        message: `Error: La última tarifa tiene una fecha de inicio futura. Por favor, contacte al administrador.`
      };
    }

    if (timeDifferenceMinutes < 2) {
      const remainingMinutes = Math.ceil(2 - timeDifferenceMinutes);
      return {
        isValid: false,
        message: `Debe esperar ${remainingMinutes} minuto(s) antes de crear otra tarifa para este nivel académico. Última tarifa creada hace ${Math.round(timeDifferenceMinutes)} minuto(s).`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in validateMinimumTimeBetweenRates:', error);
    return {
      isValid: false,
      message: `Error al validar tiempo entre tarifas. Por favor, contacte al administrador.`
    };
  }
};

/**
 * Check if a rate already exists for the same academic level on the same day
 * @param hourlyRates - Array of existing hourly rates
 * @param levelId - Academic level ID
 * @param newStartDate - New start date (YYYY-MM-DD format)
 * @param academicLevels - Array of academic levels to get the name
 * @returns Validation result
 */
export const validateSameDayRate = (hourlyRates: any[], levelId: number, newStartDate: string, academicLevels?: any[]): { isValid: boolean; message?: string; existingRate?: any } => {
  try {
    console.log('Validating same day rate for level:', levelId, 'date:', newStartDate);

    // Find rates for the same level
    const ratesForLevel = hourlyRates.filter(rate => rate.level_id === levelId);
    console.log('Rates for level', levelId, ':', ratesForLevel);

    // Check if any rate exists for the same day
    const sameDayRate = ratesForLevel.find(rate => {
      const rateDate = rate.start_date.split('T')[0]; // Get date part only
      console.log('Comparing dates:', rateDate, 'vs', newStartDate);
      return rateDate === newStartDate;
    });

    if (sameDayRate) {
      console.log('Found existing rate for same day:', sameDayRate);

      // Get the academic level name
      let levelName = `nivel académico ${levelId}`;
      if (academicLevels) {
        const level = academicLevels.find(l => l.id === levelId);
        if (level) {
          levelName = `${level.code}`;
        }
      }

      return {
        isValid: false,
        message: `Ya ha creado una tarifa para ${levelName} en las últimas 24 horas. Debe eliminar la tarifa existente para crear una nueva.`,
        existingRate: sameDayRate
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in validateSameDayRate:', error);
    return {
      isValid: false,
      message: `Error al validar tarifas existentes. Por favor, contacte al administrador.`
    };
  }
};

/**
 * Check if a rate can be deleted (less than 1 day old)
 * @param rate - Hourly rate object
 * @returns Object with canDelete boolean and message
 */
export const canDeleteRate = (rate: any): { canDelete: boolean; message?: string } => {
  try {
    const createdDate = new Date(rate.created_at);
    const now = new Date();
    const timeDifferenceMs = now.getTime() - createdDate.getTime();
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

    if (timeDifferenceHours >= 24) {
      return {
        canDelete: false,
        message: `No se puede eliminar esta tarifa. Ha pasado más de 24 horas desde su creación.`
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error('Error in canDeleteRate:', error);
    return {
      canDelete: false,
      message: `Error al validar si se puede eliminar la tarifa.`
    };
  }
};

/**
 * Check if a rate was created today
 * @param rate - Hourly rate object
 * @returns boolean indicating if the rate was created today
 */
export const wasCreatedToday = (rate: any): boolean => {
  try {
    const createdDate = new Date(rate.created_at);
    const today = new Date();

    // Compare only the date part (year, month, day)
    return (
      createdDate.getUTCFullYear() === today.getUTCFullYear() &&
      createdDate.getUTCMonth() === today.getUTCMonth() &&
      createdDate.getUTCDate() === today.getUTCDate()
    );
  } catch (error) {
    console.error('Error checking if rate was created today:', error);
    return false;
  }
};

/**
 * Get current server time in UTC
 * @returns Promise with server time in UTC
 */
export const getServerTimeUTC = async (): Promise<Date> => {
  try {
    const response = await fetch('/api/v1/server-time/');
    const data = await response.json();
    return new Date(data.server_time_utc);
  } catch (error) {
    console.error('Error fetching server time:', error);
    // Fallback to client time if server is unavailable
    return new Date();
  }
};
