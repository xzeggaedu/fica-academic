import type { DataProvider } from "@refinedev/core";
import type {
  User,
  UserCreate,
  UserUpdate,
  Faculty,
  FacultyCreate,
  FacultyUpdate,
  School,
  SchoolCreate,
  SchoolUpdate,
  Task,
  PaginatedResponse
} from "../types/api";

// Custom error class to include status code
class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Environment Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000");
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === "true";

// API Endpoints
const ENDPOINTS = {
  USERS: `${API_BASE_PATH}/users`,
  USER: `${API_BASE_PATH}/user/id`,  // ✅ Correcto: /user/id/{user_id}
  USER_ADMIN: `${API_BASE_PATH}/user/admin`,  // ✅ Endpoint para crear usuarios como admin
  ME: `${API_BASE_PATH}/me`,
  TASKS: `${API_BASE_PATH}/tasks/task`,
  FACULTIES: `${API_BASE_PATH}/faculties`,
  FACULTY: `${API_BASE_PATH}/faculty`,
  SCHOOLS: `${API_BASE_PATH}/schools`,
  SCHOOL: `${API_BASE_PATH}/school`,
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to make API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: "include",
    signal: AbortSignal.timeout(API_TIMEOUT),
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.detail || `HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (DEBUG_MODE) {
      console.error(`API Error for ${options.method || 'GET'} ${url}:`, error);
    }
    throw error;
  }
};

// DataProvider implementation
export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    if (DEBUG_MODE) {
    }

    switch (resource) {
      case "users": {
        const current = (pagination as any)?.current || (pagination as any)?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        const response = await apiRequest<PaginatedResponse<User>>(
          `${ENDPOINTS.USERS}?page=${current}&items_per_page=${pageSize}`
        );


        return {
          data: response.data as any[],
          total: response.total_count,  // ✅ Usar total_count en lugar de total
        };
      }

      case "tasks": {
        // Tasks don't have pagination in the current API
        const response = await apiRequest<Task[]>(ENDPOINTS.TASKS);

        return {
          data: response as any[],
          total: response.length,
        };
      }

      case "faculty": {
        const current = (pagination as any)?.current || (pagination as any)?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        const response = await apiRequest<PaginatedResponse<Faculty>>(
          `${ENDPOINTS.FACULTIES}?page=${current}&items_per_page=${pageSize}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "school": {
        const current = (pagination as any)?.current || (pagination as any)?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        const response = await apiRequest<PaginatedResponse<School>>(
          `${ENDPOINTS.SCHOOLS}?page=${current}&items_per_page=${pageSize}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      default:
        throw new Error(`Resource ${resource} not supported`);
    }
  },

  getOne: async ({ resource, id, meta }) => {
    if (DEBUG_MODE) {
    }

    switch (resource) {
      case "users": {
        const response = await apiRequest<User>(`${ENDPOINTS.USER}/${id}`);
        return { data: response as any };
      }

      case "tasks": {
        const response = await apiRequest<Task>(`${ENDPOINTS.TASKS}/${id}`);
        return { data: response as any };
      }

      case "faculty": {
        const response = await apiRequest<Faculty>(`${ENDPOINTS.FACULTY}/${id}`);
        return { data: response as any };
      }

      case "school": {
        const response = await apiRequest<School>(`${ENDPOINTS.SCHOOL}/${id}`);
        return { data: response as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported`);
    }
  },

  create: async ({ resource, variables, meta }) => {
    if (DEBUG_MODE) {
    }

    switch (resource) {
      case "users": {
        const response = await apiRequest<User>(
          ENDPOINTS.USER_ADMIN,  // ✅ Usar endpoint de admin para crear usuarios
          {
            method: "POST",
            body: JSON.stringify(variables as UserCreate),
          }
        );
        return { data: response as any };
      }

      case "tasks": {
        const response = await apiRequest<Task>(
          ENDPOINTS.TASKS,
          {
            method: "POST",
            body: JSON.stringify({ message: (variables as any).message }),
          }
        );
        return { data: response as any };
      }

      case "faculty": {
        const response = await apiRequest<Faculty>(
          ENDPOINTS.FACULTY,
          {
            method: "POST",
            body: JSON.stringify(variables as FacultyCreate),
          }
        );
        return { data: response as any };
      }

      case "school": {
        const response = await apiRequest<School>(
          ENDPOINTS.SCHOOL,
          {
            method: "POST",
            body: JSON.stringify(variables as SchoolCreate),
          }
        );
        return { data: response as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported`);
    }
  },

  update: async ({ resource, id, variables, meta }) => {
    if (DEBUG_MODE) {
    }

    switch (resource) {
      case "users": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.USER}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as UserUpdate),
          }
        );

        // Return the updated user data
        const updatedUser = await apiRequest<User>(`${ENDPOINTS.USER}/${id}`);
        return { data: updatedUser as any };
      }

      case "faculty": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.FACULTY}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as FacultyUpdate),
          }
        );

        // Return the updated faculty data
        const updatedFaculty = await apiRequest<Faculty>(`${ENDPOINTS.FACULTY}/${id}`);
        return { data: updatedFaculty as any };
      }

      case "school": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.SCHOOL}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as SchoolUpdate),
          }
        );

        // Return the updated school data
        const updatedSchool = await apiRequest<School>(`${ENDPOINTS.SCHOOL}/${id}`);
        return { data: updatedSchool as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported for update`);
    }
  },

  deleteOne: async ({ resource, id, meta }) => {
    if (DEBUG_MODE) {
    }

    switch (resource) {
      case "users": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.USER}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "faculty": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.FACULTY}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "school": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.SCHOOL}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported for delete`);
    }
  },

  getMany: async ({ resource, ids, meta }) => {
    if (DEBUG_MODE) {
    }

    // For now, we'll fetch users individually
    // In a real implementation, you might want to add a bulk endpoint
    const promises = ids.map(id =>
      apiRequest<User>(`${ENDPOINTS.USER}/${id}`)
    );

    const results = await Promise.all(promises);
    return { data: results as any[] };
  },

  createMany: async ({ resource, variables, meta }) => {
    if (DEBUG_MODE) {
    }

    // For now, we'll create users individually
    // In a real implementation, you might want to add a bulk endpoint
    const promises = (variables as any[]).map(variable =>
      apiRequest<User>(
        ENDPOINTS.USER,
        {
          method: "POST",
          body: JSON.stringify(variable),
        }
      )
    );

    const results = await Promise.all(promises);
    return { data: results as any[] };
  },

  updateMany: async ({ resource, ids, variables, meta }) => {
    if (DEBUG_MODE) {
    }

    // For now, we'll update users individually
    const promises = ids.map(id =>
      apiRequest<{ message: string }>(
        `${ENDPOINTS.USER}/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(variables),
        }
      )
    );

    const results = await Promise.all(promises);
    return { data: results as any[] };
  },

  deleteMany: async ({ resource, ids, meta }) => {
    if (DEBUG_MODE) {
    }

    // For now, we'll delete users individually
    const promises = ids.map(id =>
      apiRequest<{ message: string }>(
        `${ENDPOINTS.USER}/${id}`,
        {
          method: "DELETE",
        }
      )
    );

    const results = await Promise.all(promises);
    return { data: results as any[] };
  },

  getApiUrl: () => {
    return API_BASE_URL;
  },

  custom: async ({ url, method, filters, sorters, payload, query, headers, meta }) => {
    if (DEBUG_MODE) {
    }

    let requestUrl = `${API_BASE_URL}${url}`;

    // Add query parameters if provided
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      requestUrl += `?${searchParams.toString()}`;
    }

    const response = await apiRequest(
      requestUrl,
      {
        method: method || "GET",
        headers: {
          ...getAuthHeaders(),
          ...headers,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }
    );

    return { data: response as any };
  },
};
