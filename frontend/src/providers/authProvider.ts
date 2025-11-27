import type { AuthProvider } from "@refinedev/core";
import { apiRequest } from "../utils/token-interceptor";
import { UserRoleEnum } from "../types/auth";

// Environment Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
const BASE_PATH = import.meta.env.VITE_BASE_PATH || "";
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";
const AVATAR_SERVICE_URL = import.meta.env.VITE_AVATAR_SERVICE_URL || "https://ui-avatars.com/api";
const AVATAR_DEFAULT_BG = import.meta.env.VITE_AVATAR_DEFAULT_BG || "random";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000");
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === "true";

// API Endpoints
const ENDPOINTS = {
  LOGIN: import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || `${API_BASE_PATH}/login`,
  LOGOUT: import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || `${API_BASE_PATH}/logout`,
  REFRESH: import.meta.env.VITE_AUTH_REFRESH_ENDPOINT || `${API_BASE_PATH}/refresh`,
  ME: import.meta.env.VITE_AUTH_ME_ENDPOINT || `${API_BASE_PATH}/me`,
  ME_PROFILE: `${API_BASE_PATH}/me/profile`,  // ✅ Endpoint para obtener perfil fresco de BD
};

interface LoginParams {
  username: string;
  password: string;
  remember_me?: boolean;
}

interface UserIdentity {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserInfoResponse {
  user_uuid: string;
  username?: string;
  username_or_email?: string;
  email: string;
  name: string;
  role: string;
  is_deleted: boolean;
}

/**
 * Decode JWT token to get user role
 */
function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.role || payload.user_role || "").toString().toLowerCase();
  } catch (error) {
    if (DEBUG_MODE) console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Get default redirect path based on user role
 */
function getDefaultRedirectPath(role: string | null): string {
  if (!role) {
    return "/";
  }

  switch (role.toLowerCase()) {
    case UserRoleEnum.ADMIN:
      return "/users";
    case UserRoleEnum.DIRECTOR:
      return "/director/dashboard";
    case UserRoleEnum.DECANO:
      return "/decano/dashboard";
    case UserRoleEnum.VICERRECTOR:
      return "/vicerrector/dashboard";
    default:
      return "/";
  }
}

export const authProvider: AuthProvider = {
  login: async ({ username, password, remember_me = false }: LoginParams) => {
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      formData.append("remember_me", remember_me.toString());

      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
        method: "POST",
        body: formData,
        credentials: "include", // Para recibir cookies (refresh_token)
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error en el inicio de sesión");
      }

      const data: LoginResponse = await response.json();

      // Guardar access token en localStorage
      localStorage.setItem(TOKEN_KEY, data.access_token);

      // Disparar evento personalizado para notificar cambio de usuario (para invalidar caché)
      window.dispatchEvent(new CustomEvent('user-login'));

      // Obtener rol del token para redirigir según el rol
      const userRole = getRoleFromToken(data.access_token);
      const redirectPath = getDefaultRedirectPath(userRole);

      return {
        success: true,
        redirectTo: redirectPath,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error instanceof Error ? error.message : "Error en el inicio de sesión",
        },
      };
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        await fetch(`${API_BASE_URL}${ENDPOINTS.LOGOUT}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      // Navegar directamente a /login sin query strings usando replace
      // Esto evita que se preserve la URL anterior con query strings
      // Incluir el base path en la ruta de login
      const loginPath = `${BASE_PATH}/login`;
      window.location.replace(loginPath);
    }

    return {
      success: true,
      redirectTo: `${BASE_PATH}/login`,
    };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // Solo disparar evento si no estamos en páginas de autenticación
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login'].includes(currentPath);

      if (!isAuthPage) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }

      return {
        authenticated: false,
        redirectTo: `${BASE_PATH}/login`,
      };
    }

    try {
      // Usar el interceptor de tokens que maneja automáticamente la renovación
      const response = await apiRequest(`${API_BASE_URL}${ENDPOINTS.ME}`, {
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (response.ok) {
        return {
          authenticated: true,
        };
      } else {
        // Si aún falla después del interceptor, la sesión ha expirado
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('session-expired'));
        return {
          authenticated: false,
          redirectTo: `${BASE_PATH}/login`,
        };
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('session-expired'));
      return {
        authenticated: false,
        redirectTo: `${BASE_PATH}/login`,
      };
    }
  },

  getPermissions: async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    try {
      const response = await apiRequest(`${API_BASE_URL}${ENDPOINTS.ME}`, {
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (response.ok) {
        const userData: UserInfoResponse = await response.json();
        return userData.role;
      }
    } catch (error) {
      if (DEBUG_MODE) console.error("Get permissions error:", error);
    }

    return null;
  },

  getIdentity: async (): Promise<UserIdentity | null> => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    try {
      const response = await apiRequest(`${API_BASE_URL}${ENDPOINTS.ME}`, {
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (response.ok) {
        const userData: UserInfoResponse = await response.json();

        return {
          id: userData.user_uuid,
          name: userData.name,
          username: userData.username_or_email || userData.username,
          email: userData.email,
          role: userData.role,
          avatar: `${AVATAR_SERVICE_URL}/?name=${encodeURIComponent(userData.name)}&background=${AVATAR_DEFAULT_BG}`,
        };
      }
    } catch (error) {
      if (DEBUG_MODE) console.error("Get identity error:", error);
    }

    return null;
  },

  onError: async (error) => {
    if (DEBUG_MODE) console.error("Auth error:", error);

    // Si es un error 401, limpiar token y mostrar modal de sesión expirada
    if (error?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);

      // Disparar evento personalizado para mostrar modal de sesión expirada
      window.dispatchEvent(new CustomEvent('session-expired'));

      return { error };
    }

    return { error };
  },
};
