import { useState } from 'react';

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  details?: any;
}

interface UseApiDebugReturn {
  error: ApiError | null;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  isDevelopment: boolean;
  formatErrorForDisplay: (error: ApiError) => string;
}

/**
 * Hook para manejar errores de API con información detallada en desarrollo
 */
export function useApiDebug(): UseApiDebugReturn {
  const [error, setError] = useState<ApiError | null>(null);

  // Detectar si estamos en desarrollo
  const isDevelopment = import.meta.env.DEV ||
                       import.meta.env.VITE_DEBUG_MODE === 'true' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

  const clearError = () => setError(null);

  const formatErrorForDisplay = (error: ApiError): string => {
    if (!isDevelopment) {
      // En producción, mostrar solo mensaje básico
      return error.message;
    }

    // En desarrollo, mostrar información detallada
    let details = `🔍 **Error Detallado (Desarrollo)**\n\n`;
    details += `**Mensaje:** ${error.message}\n`;

    if (error.status) {
      details += `**Status:** ${error.status}\n`;
    }

    if (error.statusText) {
      details += `**Status Text:** ${error.statusText}\n`;
    }

    if (error.url) {
      details += `**URL:** ${error.url}\n`;
    }

    if (error.method) {
      details += `**Método:** ${error.method}\n`;
    }

    if (error.details) {
      details += `**Detalles del Servidor:**\n\`\`\`json\n${JSON.stringify(error.details, null, 2)}\n\`\`\``;
    }

    return details;
  };

  return {
    error,
    setError,
    clearError,
    isDevelopment,
    formatErrorForDisplay
  };
}

// Exportar la función por separado para uso en componentes
export function formatErrorForDisplay(error: ApiError): string {
  const isDevelopment = import.meta.env.DEV ||
                       import.meta.env.VITE_DEBUG_MODE === 'true' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

  if (!isDevelopment) {
    // En producción, mostrar solo mensaje básico
    return error.message;
  }

  // En desarrollo, mostrar información detallada
  let details = `🔍 **Error Detallado (Desarrollo)**\n\n`;
  details += `**Mensaje:** ${error.message}\n`;

  if (error.status) {
    details += `**Status:** ${error.status}\n`;
  }

  if (error.statusText) {
    details += `**Status Text:** ${error.statusText}\n`;
  }

  if (error.url) {
    details += `**URL:** ${error.url}\n`;
  }

  if (error.method) {
    details += `**Método:** ${error.method}\n`;
  }

  if (error.details) {
    details += `**Detalles del Servidor:**\n\`\`\`json\n${JSON.stringify(error.details, null, 2)}\n\`\`\``;
  }

  return details;
}

/**
 * Función helper para crear errores de API consistentes
 */
export function createApiError(
  message: string,
  status?: number,
  statusText?: string,
  url?: string,
  method?: string,
  details?: any
): ApiError {
  return {
    message,
    status,
    statusText,
    url,
    method,
    details
  };
}

/**
 * Función para hacer requests con debug automático
 */
export async function apiRequestWithDebug<T>(
  url: string,
  options: RequestInit = {},
  onError?: (error: ApiError) => void
): Promise<T> {
  const isDevelopment = import.meta.env.DEV ||
                       import.meta.env.VITE_DEBUG_MODE === 'true' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let serverDetails;
      try {
        // Clonar la respuesta para poder leer el cuerpo
        const responseClone = response.clone();
        serverDetails = await responseClone.json();
      } catch {
        try {
          // Si falla JSON, intentar como texto
          const responseClone = response.clone();
          serverDetails = await responseClone.text();
        } catch {
          serverDetails = `Error ${response.status}: ${response.statusText}`;
        }
      }

      const error = createApiError(
        `Error ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        url,
        options.method || 'GET',
        serverDetails
      );

      if (isDevelopment) {
        console.error('🚨 API Error (Desarrollo):', {
          url,
          method: options.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          details: serverDetails,
          fullError: error
        });
      }

      if (onError) {
        onError(error);
      }

      throw error;
    }

    // Manejar respuestas vacías
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      // Es un error de API que ya manejamos
      throw error;
    }

    // Error de red u otro tipo de error
    const networkError = createApiError(
      `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      undefined,
      'Network Error',
      url,
      options.method || 'GET'
    );

    if (isDevelopment) {
      console.error('🌐 Network Error (Desarrollo):', {
        url,
        method: options.method || 'GET',
        error: error instanceof Error ? error.message : 'Error desconocido',
        fullError: error
      });
    }

    if (onError) {
      onError(networkError);
    }

    throw networkError;
  }
}
