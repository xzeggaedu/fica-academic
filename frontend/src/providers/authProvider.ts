import type { AuthProvider } from "@refinedev/core";
import { apiRequest } from "../utils/token-interceptor";

// Environment Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
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
  REGISTER: `${API_BASE_PATH}/user`,  // ✅ Endpoint de registro (sin validación de admin)
};

interface LoginParams {
  username: string;
  password: string;
  remember_me?: boolean;
}

interface RegisterParams {
  username: string;
  name: string;
  email: string;
  password: string;
}

interface UserIdentity {
  id: number;
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
  user_id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  is_deleted: boolean;
  uuid: string;
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

      return {
        success: true,
        redirectTo: "/",
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

  register: async ({ username, name, email, password }: RegisterParams) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.REGISTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          name,
          email,
          password,
        }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error en el registro");
      }

      const data = await response.json();

      return {
        success: true,
        redirectTo: "/login",
      };
    } catch (error) {
      if (DEBUG_MODE) console.error("Register error:", error);
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: error instanceof Error ? error.message : "Error en el registro",
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
    }

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // Solo disparar evento si no estamos en páginas de autenticación
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/register', '/forgot-password'].includes(currentPath);

      if (!isAuthPage) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }

      return {
        authenticated: false,
        redirectTo: "/login",
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
          redirectTo: "/login",
        };
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('session-expired'));
      return {
        authenticated: false,
        redirectTo: "/login",
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
          id: userData.user_id,
          name: userData.name,
          username: userData.username,
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
