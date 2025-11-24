/**
 * Token Interceptor para manejo automático de renovación de tokens
 */

// Environment Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000");

interface RefreshResponse {
  access_token: string;
  token_type: string;
}

class TokenInterceptor {
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Intercepta las peticiones HTTP y maneja automáticamente la renovación de tokens
   */
  async interceptRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem(TOKEN_KEY);

    // Si hay token, agregarlo a los headers
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    // Agregar credentials para cookies (refresh_token)
    options.credentials = 'include';

    try {
      const response = await fetch(url, options);

      // Si la respuesta es 401, intentar renovar el token
      if (response.status === 401 && token) {
        console.log('🔄 Token expirado, intentando renovar...');

        const newToken = await this.refreshToken();

        if (newToken) {
          // Reintentar la petición original con el nuevo token
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          };

          return fetch(url, options);
        } else {
          // Si no se pudo renovar, disparar evento de sesión expirada
          this.handleSessionExpired();
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Error en interceptor de tokens:', error);
      throw error;
    }
  }

  /**
   * Renueva el access token usando el refresh token
   */
  private async refreshToken(): Promise<string | null> {
    // Evitar múltiples llamadas simultáneas de refresh
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Realiza la petición de renovación de token
   */
  private async performTokenRefresh(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_BASE_PATH}/refresh`, {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (response.ok) {
        const data: RefreshResponse = await response.json();

        // Guardar el nuevo access token
        localStorage.setItem(TOKEN_KEY, data.access_token);

        console.log('✅ Token renovado exitosamente');
        return data.access_token;
      } else {
        console.error('❌ Error al renovar token:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error en renovación de token:', error);
      return null;
    }
  }

  /**
   * Maneja la expiración de sesión
   */
  private handleSessionExpired(): void {
    console.log('🚨 Sesión expirada, limpiando tokens...');

    // Limpiar token del localStorage
    localStorage.removeItem(TOKEN_KEY);

    // Disparar evento personalizado para mostrar modal de sesión expirada
    window.dispatchEvent(new CustomEvent('session-expired'));
  }

  /**
   * Verifica si el token actual está próximo a expirar
   */
  isTokenNearExpiry(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir a milisegundos
      const now = Date.now();
      const timeUntilExpiry = exp - now;

      // Renovar si queda menos de 5 minutos
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      console.error('Error al verificar expiración del token:', error);
      return true; // Si hay error, asumir que está expirado
    }
  }

  /**
   * Renueva proactivamente el token si está próximo a expirar
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    // Si el token está próximo a expirar, renovarlo proactivamente
    if (this.isTokenNearExpiry(token)) {
      console.log('🔄 Token próximo a expirar, renovando proactivamente...');
      return await this.refreshToken();
    }

    return token;
  }
}

// Instancia singleton del interceptor
export const tokenInterceptor = new TokenInterceptor();

/**
 * Función helper para hacer peticiones HTTP con manejo automático de tokens
 */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  return tokenInterceptor.interceptRequest(url, options);
}

/**
 * Función helper para renovar tokens proactivamente
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  return tokenInterceptor.refreshTokenIfNeeded();
}
