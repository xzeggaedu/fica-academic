// API Types for Fica Academic Backend

export interface User {
  uuid: string;
  name: string;
  username: string;
  email: string;
  profile_image_url: string;
  role: UserRoleEnum;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
}

export interface UserCreate {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: UserRoleEnum; // ✅ Permitir especificar rol para administradores
}

export interface UserUpdate {
  name?: string;
  username?: string;
  email?: string;
  profile_image_url?: string;
  role?: UserRoleEnum; // ✅ Permitir cambiar rol para administradores
}

export interface UserRead {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image_url: string;
  role: UserRoleEnum;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
}

export enum UserRoleEnum {
  ADMIN = "admin",
  DIRECTOR = "director",
  DECANO = "decano",
  VICERRECTOR = "vicerrector",
  UNAUTHORIZED = "unauthorized",
}

export interface Faculty {
  id: number;
  name: string;
  acronym: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FacultyCreate {
  name: string;
  acronym: string;
  is_active?: boolean;
}

export interface FacultyUpdate {
  name?: string;
  acronym?: string;
  is_active?: boolean;
}

export interface School {
  id: number;
  name: string;
  acronym: string;
  fk_faculty: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SchoolCreate {
  name: string;
  acronym: string;
  fk_faculty: number;
  is_active?: boolean;
}

export interface SchoolUpdate {
  name?: string;
  acronym?: string;
  fk_faculty?: number;
  is_active?: boolean;
}

export interface Task {
  id: string;
  message: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskCreate {
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;  // ✅ Cambiar de total a total_count
  page: number;
  items_per_page: number;
  has_more: boolean;  // ✅ Agregar has_more
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfoResponse {
  user_uuid: string;
  username: string;
  email: string;
  name: string;
  role: UserRoleEnum;
  is_deleted: boolean;
}

export interface LogoutResponse {
  message: string;
}

export interface UserDeleteResponse {
  message: string;
}

// Refine-specific types
export interface RefineUserIdentity {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: "/api/v1/login",
  LOGOUT: "/api/v1/logout",
  REFRESH: "/api/v1/refresh",
  ME: "/api/v1/me",
  USERS: "/api/v1/users",
  USER: "/api/v1/user",
  FACULTIES: "/api/v1/faculties",
  FACULTY: "/api/v1/faculty",
  SCHOOLS: "/api/v1/schools",
  SCHOOL: "/api/v1/school",
  TASKS: "/api/v1/tasks/task",
} as const;
