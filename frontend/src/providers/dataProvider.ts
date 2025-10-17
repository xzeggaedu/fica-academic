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
  Course,
  CourseCreate,
  CourseUpdate,
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
  USER: `${API_BASE_PATH}/user`,  // ✅ Simplificado: /user/{user_uuid}
  USER_ADMIN: `${API_BASE_PATH}/user/admin`,  // ✅ Endpoint para crear usuarios como admin
  USER_SOFT_DELETE: `${API_BASE_PATH}/user`,  // Para soft delete: /user/soft-delete/{user_uuid}
  ME: `${API_BASE_PATH}/me`,
  TASKS: `${API_BASE_PATH}/tasks/task`,
  FACULTIES: `${API_BASE_PATH}/catalog/faculties`,  // ✅ Movido a catalog
  FACULTY: `${API_BASE_PATH}/catalog/faculties`,    // ✅ Movido a catalog
  SCHOOLS: `${API_BASE_PATH}/catalog/schools`,    // ✅ Movido a catalog
  SCHOOL: `${API_BASE_PATH}/catalog/schools`,     // ✅ Movido a catalog
  COURSES: `${API_BASE_PATH}/catalog/courses`,
  PROFESSORS: `${API_BASE_PATH}/catalog/professors`,
  COORDINATIONS: `${API_BASE_PATH}/catalog/coordinations`,
  RECYCLE_BIN: `${API_BASE_PATH}/recycle-bin`,
  RESTORE_ITEM: `${API_BASE_PATH}/recycle-bin/restore`,
  COURSES_ACTIVE: `${API_BASE_PATH}/catalog/courses/active`,
  SCHEDULE_TIMES: `${API_BASE_PATH}/catalog/schedule-times`,
  SCHEDULE_TIMES_ACTIVE: `${API_BASE_PATH}/catalog/schedule-times/active`,
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

      case "faculties": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 1000;

        // Construir URL con parámetros
        let url = `${ENDPOINTS.FACULTIES}?page=${current}&items_per_page=${pageSize}`;

        // Agregar filtros si existen
        if (filters && Array.isArray(filters)) {
          const isActiveFilter = filters.find((f: any) => f.field === "is_active");
          if (isActiveFilter && isActiveFilter.value !== undefined) {
            url += `&is_active=${isActiveFilter.value}`;
          }
        }

        if (DEBUG_MODE) {
          console.log('Fetching faculties from:', url);
        }

        const response = await apiRequest<PaginatedResponse<Faculty>>(url);

        if (DEBUG_MODE) {
          console.log('Faculties response:', response);
        }

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "schools": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 1000;

        // Construir URL con parámetros
        let url = `${ENDPOINTS.SCHOOLS}?page=${current}&items_per_page=${pageSize}`;

        // Agregar filtros si existen
        if (filters && Array.isArray(filters)) {
          const isActiveFilter = filters.find((f: any) => f.field === "is_active");
          if (isActiveFilter && isActiveFilter.value !== undefined) {
            url += `&is_active=${isActiveFilter.value}`;
          }

          const facultyIdFilter = filters.find((f: any) => f.field === "faculty_id");
          if (facultyIdFilter && facultyIdFilter.value !== undefined) {
            url += `&faculty_id=${facultyIdFilter.value}`;
          }
        }

        if (DEBUG_MODE) {
          console.log('Fetching schools from:', url);
        }

        const response = await apiRequest<PaginatedResponse<School>>(url);

        if (DEBUG_MODE) {
          console.log('Schools response:', response);
        }

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "faculties/active": {
        const response = await apiRequest<PaginatedResponse<Faculty>>(
          `${ENDPOINTS.FACULTIES}?is_active=true`
        );
        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "schools/active": {
        const response = await apiRequest<PaginatedResponse<School>>(
          `${ENDPOINTS.SCHOOLS}?is_active=true`
        );
        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "courses": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de búsqueda
        const searchParams = new URLSearchParams();
        searchParams.append("page", String(current));
        searchParams.append("items_per_page", String(pageSize));

        // Agregar filtro de búsqueda si existe
        if (filters && Array.isArray(filters)) {
          const searchFilter = filters.find((f: any) => f.field === "search");
          if (searchFilter && searchFilter.value) {
            searchParams.append("search", searchFilter.value);
          }
        }

        const response = await apiRequest<PaginatedResponse<Course>>(
          `${ENDPOINTS.COURSES}?${searchParams.toString()}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "professors": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de paginación
        const searchParams = new URLSearchParams();
        searchParams.append("page", String(current));
        searchParams.append("items_per_page", String(pageSize));

        // Agregar filtro de búsqueda si existe
        if (filters && Array.isArray(filters)) {
          const searchFilter = filters.find((f: any) => f.field === "search");
          if (searchFilter && searchFilter.value) {
            searchParams.append("search", searchFilter.value);
          }
        }

        const response = await apiRequest<PaginatedResponse<any>>(
          `${ENDPOINTS.PROFESSORS}?${searchParams.toString()}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "coordinations": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de paginación
        const searchParams = new URLSearchParams();
        searchParams.append("page", String(current));
        searchParams.append("items_per_page", String(pageSize));

        // Agregar filtro de búsqueda si existe
        if (filters && Array.isArray(filters)) {
          const searchFilter = filters.find((f: any) => f.field === "search");
          if (searchFilter && searchFilter.value) {
            searchParams.append("search", searchFilter.value);
          }
        }

        const response = await apiRequest<PaginatedResponse<any>>(
          `${ENDPOINTS.COORDINATIONS}?${searchParams.toString()}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "catalog/schedule-times/active": {
        const response = await apiRequest<any[]>(ENDPOINTS.SCHEDULE_TIMES_ACTIVE);
        return {
          data: response as any[],
          total: response.length,
        };
      }

      case "schedule-times": {
        // Paginación por defecto: mostrar todo (hasta 1000)
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 1000;

        const response = await apiRequest<PaginatedResponse<any>>(
          `${ENDPOINTS.SCHEDULE_TIMES}?page=${current}&items_per_page=${pageSize}`
        );

        return {
          data: response.data as any[],
          total: response.total_count,
        };
      }

      case "recycle-bin": {
        const current = (pagination as any)?.currentPage || (pagination as any)?.current || (pagination as any)?.page || 1;
        const pageSize = pagination?.pageSize || 10;
        const response = await apiRequest<PaginatedResponse<any>>(
          `${ENDPOINTS.RECYCLE_BIN}?page=${current}&items_per_page=${pageSize}`
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
        // Handle user scopes endpoint
        if (id && id.toString().includes('/scope')) {
          const userId = id.toString().replace('/scope', '');
          const response = await apiRequest<any[]>(`${API_BASE_PATH}/user/${userId}/scope`);
          // Return the array directly since the endpoint returns an array, not an object with data property
          return { data: response as any };
        }

        // Soporte para endpoint me/profile
        if (id === "me/profile") {
          const response = await apiRequest<User>(`${API_BASE_PATH}/me/profile`);
          return { data: response as any };
        }

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

      case "courses": {
        const response = await apiRequest<Course>(
          ENDPOINTS.COURSES,
          {
            method: "POST",
            body: JSON.stringify(variables as CourseCreate),
          }
        );
        return { data: response as any };
      }

      case "schedule-times": {
        const response = await apiRequest<any>(
          ENDPOINTS.SCHEDULE_TIMES,
          {
            method: "POST",
            body: JSON.stringify(variables),
          }
        );
        return { data: response as any };
      }

      case "professors": {
        const response = await apiRequest<any>(
          ENDPOINTS.PROFESSORS,
          {
            method: "POST",
            body: JSON.stringify(variables),
          }
        );
        return { data: response as any };
      }

      case "coordinations": {
        const response = await apiRequest<any>(
          ENDPOINTS.COORDINATIONS,
          {
            method: "POST",
            body: JSON.stringify(variables),
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
      console.log('Updating resource:', resource, 'with id:', id, 'and variables:', variables);
    }

    switch (resource) {
      case "users": {
        // Handle user scopes endpoint
        if (id && id.toString().includes('/scope')) {
          const userId = id.toString().replace('/scope', '');
          const response = await apiRequest<{ message: string }>(
            `${API_BASE_PATH}/user/${userId}/scope`,
            {
              method: meta?.method || "PUT",
              body: JSON.stringify(variables),
            }
          );
          return { data: response as any };
        }

        // Handle user password endpoint
        if (id && id.toString().includes('/password')) {
          const userId = id.toString().replace('/password', '');
          const response = await apiRequest<{ message: string }>(
            `${API_BASE_PATH}/user/${userId}/password`,
            {
              method: meta?.method || "PATCH",
              body: JSON.stringify(variables),
            }
          );
          return { data: response as any };
        }

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

      case "courses": {
        const response = await apiRequest<Course>(
          `${ENDPOINTS.COURSES}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as CourseUpdate),
          }
        );
        return { data: response as any };
      }

      case "schedule-times": {
        const response = await apiRequest<any>(
          `${ENDPOINTS.SCHEDULE_TIMES}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables),
          }
        );
        // Si la respuesta está vacía (204 No Content), devolver los datos enviados
        if (!response || Object.keys(response).length === 0) {
          return { data: { id, ...variables } as any };
        }
        return { data: response as any };
      }

      case "professors": {
        const response = await apiRequest<any>(
          `${ENDPOINTS.PROFESSORS}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables),
          }
        );
        return { data: response as any };
      }

      case "coordinations": {
        const response = await apiRequest<any>(
          `${ENDPOINTS.COORDINATIONS}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables),
          }
        );
        return { data: response as any };
      }

      case "soft-delete": {
        const type = variables["type"] as string;
        // Normalizar la ruta: "user/uuid" → "user", "faculty" → "catalog/faculties", etc.
        let normalizedType = type;
        if (type === "user/uuid") {
          normalizedType = "user";
        } else if (type === "faculty") {
          normalizedType = "catalog/faculties";
        } else if (type === "catalog/professors") {
          normalizedType = "catalog/professors";
        } else if (type === "catalog/courses") {
          normalizedType = "catalog/courses";
        } else if (type === "catalog/schedule-times") {
          normalizedType = "catalog/schedule-times";
        } else if (type === "catalog/coordinations") {
          normalizedType = "catalog/coordinations";
        }

        const response = await apiRequest<{ message: string }>(
          `${API_BASE_PATH}/${normalizedType}/soft-delete/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as UserUpdate),
          }
        );
        return { data: response as any };
      }

      case "recycle-bin-restore": {
        const response = await apiRequest<{ message: string }>(
          `${API_BASE_PATH}/recycle-bin/${id}/restore`,
          {
            method: "POST",
            body: JSON.stringify(variables),
          }
        );
        return { data: response as any };
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
            method: "PATCH",
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

      case "courses": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.COURSES}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "recycle-bin": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.RECYCLE_BIN}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "schedule-times": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.SCHEDULE_TIMES}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "professors": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.PROFESSORS}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "coordinations": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.COORDINATIONS}/${id}`,
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

// Export ENDPOINTS for use in components
export { ENDPOINTS };
