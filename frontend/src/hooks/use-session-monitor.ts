import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// Environment Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000");

export const useSessionMonitor = () => {
  const location = useLocation();
  const lastCheckRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Solo monitorear en páginas autenticadas (no en login)
  const isAuthPage = ['/login'].includes(location.pathname);

  const checkSession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // No hay token, disparar evento de sesión expirada solo si no estamos en páginas de auth
      if (!isAuthPage) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${API_BASE_PATH}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        // Token inválido, disparar evento de sesión expirada
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    } catch (error) {
      // Error de red, no hacer nada (podría ser temporal)
      console.warn('Session check failed:', error);
    }
  };

  // Solo ejecutar el monitoreo si no estamos en páginas de autenticación
  useEffect(() => {
    if (isAuthPage) {
      // Limpiar intervalos si estamos en páginas de auth
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    const now = Date.now();
    // Solo verificar si han pasado al menos 2 segundos desde la última verificación
    if (now - lastCheckRef.current > 2000) {
      checkSession();
      lastCheckRef.current = now;
    }
  }, [location.pathname, isAuthPage]);

  // Verificar sesión periódicamente cada 30 segundos (solo en páginas autenticadas)
  useEffect(() => {
    if (isAuthPage) return;

    checkIntervalRef.current = setInterval(() => {
      checkSession();
    }, 30000); // 30 segundos

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthPage]);

  // Verificar sesión cuando la ventana vuelve a tener foco (solo en páginas autenticadas)
  useEffect(() => {
    if (isAuthPage) return;

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastCheckRef.current > 5000) { // Al menos 5 segundos desde la última verificación
        checkSession();
        lastCheckRef.current = now;
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthPage]);
};
