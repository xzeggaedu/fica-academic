import { useEffect, useRef } from 'react';
import { refreshTokenIfNeeded } from '../utils/token-interceptor';

/**
 * Hook para manejar la renovación proactiva de tokens
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Verificar tokens cada 2 minutos
    const checkInterval = 2 * 60 * 1000; // 2 minutos

    const checkAndRefreshToken = async () => {
      try {
        await refreshTokenIfNeeded();
      } catch (error) {
        console.error('Error en renovación automática de token:', error);
      }
    };

    // Ejecutar inmediatamente
    checkAndRefreshToken();

    // Configurar intervalo
    intervalRef.current = setInterval(checkAndRefreshToken, checkInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Función para renovar manualmente
  const manualRefresh = async () => {
    return await refreshTokenIfNeeded();
  };

  return {
    manualRefresh,
  };
}
