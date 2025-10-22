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
  Subject,
  SubjectCreate,
  SubjectUpdate,
  AcademicLevel,
  AcademicLevelCreate,
  AcademicLevelUpdate,
  HourlyRateHistory,
  HourlyRateHistoryCreate,
  HourlyRateHistoryUpdate,
  Term,
  TermCreate,
  TermUpdate,
  Holiday,
  HolidayCreate,
  HolidayUpdate,
  FixedHolidayRule,
  FixedHolidayRuleCreate,
  FixedHolidayRuleUpdate,
  AnnualHoliday,
  AnnualHolidayCreate,
  AnnualHolidayUpdate,
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
  SUBJECTS: `${API_BASE_PATH}/catalog/subjects`,
  PROFESSORS: `${API_BASE_PATH}/catalog/professors`,
  COORDINATIONS: `${API_BASE_PATH}/catalog/coordinations`,
  RECYCLE_BIN: `${API_BASE_PATH}/recycle-bin`,
  RESTORE_ITEM: `${API_BASE_PATH}/recycle-bin/restore`,
  SUBJECTS_ACTIVE: `${API_BASE_PATH}/catalog/subjects/active`,
  SCHEDULE_TIMES: `${API_BASE_PATH}/catalog/schedule-times`,
  SCHEDULE_TIMES_ACTIVE: `${API_BASE_PATH}/catalog/schedule-times/active`,
  ACADEMIC_LEVELS: `${API_BASE_PATH}/academic-levels`,
  HOURLY_RATES: `${API_BASE_PATH}/hourly-rates`,
  TERMS: `${API_BASE_PATH}/terms`,
  HOLIDAYS: `${API_BASE_PATH}/holidays`,
  FIXED_HOLIDAY_RULES: `${API_BASE_PATH}/fixed-holiday-rules`,
  ANNUAL_HOLIDAYS: `${API_BASE_PATH}/annual-holidays`,
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    // Prevenir cache del navegador para evitar respuestas obsoletas
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
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
  // Agregar timestamp para evitar cache del navegador en operaciones GET
  const isGetRequest = options.method === 'GET' || !options.method;
  // const url = isGetRequest
  //   ? `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`
  //   : `${API_BASE_URL}${endpoint}`;

  const url = `${API_BASE_URL}${endpoint}`;

  // Headers específicos para operaciones GET
  const getHeaders = isGetRequest ? {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  } : {};

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...getHeaders,
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

      case "subjects": {
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

        const response = await apiRequest<PaginatedResponse<Subject>>(
          `${ENDPOINTS.SUBJECTS}?${searchParams.toString()}`
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

      case "academic-levels": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de paginación
        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));  // Backend usa "skip", no "offset"
        searchParams.append("limit", String(pageSize));

        // Agregar filtros si existen
        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field === "is_active" && f.value !== undefined) {
              searchParams.append("is_active", String(f.value));
            }
            if (f.field === "priority" && f.value !== undefined) {
              searchParams.append("priority", String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: AcademicLevel[]; total: number }>(
          `${ENDPOINTS.ACADEMIC_LEVELS}/?${searchParams.toString()}`
        );

        return {
          data: response.data as any[],
          total: response.total,
        };
      }

      case "hourly-rates": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de paginación
        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));  // Backend usa "skip", no "offset"
        searchParams.append("limit", String(pageSize));

        // Agregar filtros si existen
        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field === "level_id" && f.value !== undefined) {
              searchParams.append("level_id", String(f.value));
            }
            if (f.field === "is_active" && f.value !== undefined) {
              searchParams.append("is_active", String(f.value));
            }
            if (f.field === "start_date" && f.value !== undefined) {
              searchParams.append("start_date", String(f.value));
            }
            if (f.field === "end_date" && f.value !== undefined) {
              searchParams.append("end_date", String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: HourlyRateHistory[]; total: number }>(
          `${ENDPOINTS.HOURLY_RATES}/?${searchParams.toString()}`
        );

        return {
          data: response.data as any[],
          total: response.total,
        };
      }

      case "terms": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        // Construir URL con parámetros de paginación
        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));
        searchParams.append("limit", String(pageSize));

        // Agregar filtros si existen
        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field && f.value !== undefined && f.value !== null && f.value !== "") {
              searchParams.append(f.field, String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: Term[]; total: number }>(
          `${ENDPOINTS.TERMS}/?${searchParams.toString()}`
        );
        return { data: response.data, total: response.total };
      }

      case "holidays": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));
        searchParams.append("limit", String(pageSize));

        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field && f.value !== undefined && f.value !== null && f.value !== "") {
              searchParams.append(f.field, String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: Holiday[]; total: number }>(
          `${ENDPOINTS.HOLIDAYS}/?${searchParams.toString()}`
        );
        return { data: response.data, total: response.total };
      }

      case "fixed-holiday-rules": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));
        searchParams.append("limit", String(pageSize));

        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field && f.value !== undefined && f.value !== null && f.value !== "") {
              searchParams.append(f.field, String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: FixedHolidayRule[]; total: number }>(
          `${ENDPOINTS.FIXED_HOLIDAY_RULES}/?${searchParams.toString()}`
        );
        return { data: response.data, total: response.total };
      }

      case "annual-holidays": {
        const current = (pagination as any)?.currentPage ?? (pagination as any)?.current ?? (pagination as any)?.page ?? 1;
        const pageSize = pagination?.pageSize || 10;

        const searchParams = new URLSearchParams();
        searchParams.append("skip", String((current - 1) * pageSize));
        searchParams.append("limit", String(pageSize));

        if (filters && Array.isArray(filters)) {
          filters.forEach((f: any) => {
            if (f.field && f.value !== undefined && f.value !== null && f.value !== "") {
              searchParams.append(f.field, String(f.value));
            }
          });
        }

        const response = await apiRequest<{ data: AnnualHoliday[]; total: number }>(
          `${ENDPOINTS.ANNUAL_HOLIDAYS}/?${searchParams.toString()}`
        );
        return { data: response.data, total: response.total };
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

      case "academic-levels": {
        const response = await apiRequest<AcademicLevel>(`${ENDPOINTS.ACADEMIC_LEVELS}/${id}`);
        return { data: response as any };
      }

      case "hourly-rates": {
        const response = await apiRequest<HourlyRateHistory>(`${ENDPOINTS.HOURLY_RATES}/${id}`);
        return { data: response as any };
      }

      case "terms": {
        const response = await apiRequest<Term>(`${ENDPOINTS.TERMS}/${id}`);
        return { data: response as any };
      }

      case "holidays": {
        const response = await apiRequest<Holiday>(`${ENDPOINTS.HOLIDAYS}/${id}`);
        return { data: response as any };
      }

      case "annual-holidays": {
        const response = await apiRequest<AnnualHoliday>(`${ENDPOINTS.ANNUAL_HOLIDAYS}/${id}`);
        return { data: response as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported`);
    }
  },

  create: async ({ resource, variables, meta }) => {

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

      case "subjects": {
        const response = await apiRequest<Subject>(
          ENDPOINTS.SUBJECTS,
          {
            method: "POST",
            body: JSON.stringify(variables as SubjectCreate),
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

      case "academic-levels": {
        const response = await apiRequest<AcademicLevel>(
          `${ENDPOINTS.ACADEMIC_LEVELS}/`,  // Agregar slash final para evitar 307 redirect
          {
            method: "POST",
            body: JSON.stringify(variables as AcademicLevelCreate),
          }
        );
        return { data: response as any };
      }

      case "hourly-rates": {
        const response = await apiRequest<HourlyRateHistory>(
          `${ENDPOINTS.HOURLY_RATES}/`,  // Agregar slash final para evitar 307 redirect
          {
            method: "POST",
            body: JSON.stringify(variables as HourlyRateHistoryCreate),
          }
        );
        return { data: response as any };
      }

      case "terms": {
        const response = await apiRequest<Term>(
          `${ENDPOINTS.TERMS}/`,  // Agregar slash final para evitar 307 redirect
          {
            method: "POST",
            body: JSON.stringify(variables as TermCreate),
          }
        );
        return { data: response as any };
      }

      case "holidays": {
        const response = await apiRequest<Holiday>(
          `${ENDPOINTS.HOLIDAYS}/`,
          {
            method: "POST",
            body: JSON.stringify(variables as HolidayCreate),
          }
        );
        return { data: response as any };
      }

      case "fixed-holiday-rules": {
        const response = await apiRequest<FixedHolidayRule>(
          `${ENDPOINTS.FIXED_HOLIDAY_RULES}/`,
          {
            method: "POST",
            body: JSON.stringify(variables as FixedHolidayRuleCreate),
          }
        );
        return { data: response as any };
      }

      case "annual-holidays": {
        const response = await apiRequest<AnnualHoliday>(
          `${ENDPOINTS.ANNUAL_HOLIDAYS}/`,
          {
            method: "POST",
            body: JSON.stringify(variables as AnnualHolidayCreate),
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
          const passwordUrl = `${API_BASE_PATH}/user/${userId}/password`;

          if (DEBUG_MODE) {
            console.log('Password update request:', {
              userId,
              url: passwordUrl,
              variables,
              method: "PATCH"
            });
          }

          const response = await apiRequest<{ message: string }>(
            passwordUrl,
            {
              method: "PATCH", // ✅ Forzar PATCH para password
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

      case "subjects": {
        const response = await apiRequest<Subject>(
          `${ENDPOINTS.SUBJECTS}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as SubjectUpdate),
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
        } else if (type === "catalog/subjects") {
          normalizedType = "catalog/subjects";
        } else if (type === "catalog/schedule-times") {
          normalizedType = "catalog/schedule-times";
        } else if (type === "catalog/coordinations") {
          normalizedType = "catalog/coordinations";
        } else if (type === "terms") {
          normalizedType = "terms";
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

      case "academic-levels": {
        const response = await apiRequest<AcademicLevel>(
          `${ENDPOINTS.ACADEMIC_LEVELS}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(variables as AcademicLevelUpdate),
          }
        );
        return { data: response as any };
      }

      case "hourly-rates": {
        const response = await apiRequest<HourlyRateHistory>(
          `${ENDPOINTS.HOURLY_RATES}/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(variables as HourlyRateHistoryUpdate),
          }
        );
        return { data: response as any };
      }

      case "terms": {
        const response = await apiRequest<Term>(
          `${ENDPOINTS.TERMS}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(variables as TermUpdate),
          }
        );
        return { data: response as any };
      }

      case "holidays": {
        const response = await apiRequest<Holiday>(
          `${ENDPOINTS.HOLIDAYS}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(variables as HolidayUpdate),
          }
        );
        return { data: response as any };
      }

      case "fixed-holiday-rules": {
        const response = await apiRequest<FixedHolidayRule>(
          `${ENDPOINTS.FIXED_HOLIDAY_RULES}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(variables as FixedHolidayRuleUpdate),
          }
        );
        return { data: response as any };
      }

      case "annual-holidays": {
        const response = await apiRequest<AnnualHoliday>(
          `${ENDPOINTS.ANNUAL_HOLIDAYS}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(variables as AnnualHolidayUpdate),
          }
        );
        return { data: response as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported for update`);
    }
  },

  deleteOne: async ({ resource, id, meta }) => {

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

      case "subjects": {
        const response = await apiRequest<{ message: string }>(
          `${ENDPOINTS.SUBJECTS}/${id}`,
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

      case "academic-levels": {
        const response = await apiRequest<AcademicLevel>(
          `${ENDPOINTS.ACADEMIC_LEVELS}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "hourly-rates": {
        const response = await apiRequest<HourlyRateHistory>(
          `${ENDPOINTS.HOURLY_RATES}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "terms": {
        const response = await apiRequest<Term>(
          `${ENDPOINTS.TERMS}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: response as any };
      }

      case "holidays": {
        await apiRequest(
          `${ENDPOINTS.HOLIDAYS}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: {} as any };
      }

      case "fixed-holiday-rules": {
        await apiRequest(
          `${ENDPOINTS.FIXED_HOLIDAY_RULES}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: {} as any };
      }

      case "annual-holidays": {
        await apiRequest(
          `${ENDPOINTS.ANNUAL_HOLIDAYS}/${id}`,
          {
            method: "DELETE",
          }
        );
        return { data: {} as any };
      }

      default:
        throw new Error(`Resource ${resource} not supported for delete`);
    }
  },

  getMany: async ({ resource, ids, meta }) => {

    // For now, we'll fetch users individually
    // In a real implementation, you might want to add a bulk endpoint
    const promises = ids.map(id =>
      apiRequest<User>(`${ENDPOINTS.USER}/${id}`)
    );

    const results = await Promise.all(promises);
    return { data: results as any[] };
  },

  createMany: async ({ resource, variables, meta }) => {

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
