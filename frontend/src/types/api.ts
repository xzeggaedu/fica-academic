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
  username?: string;
  username_or_email?: string;
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

// Subject types
export interface SubjectSchool {
  id: number;
  school_id: number;
  created_at: string;
}

export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  coordination_code: string;
  is_bilingual: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  schools: SubjectSchool[];
}

export interface SubjectCreate {
  subject_code: string;
  subject_name: string;
  coordination_code: string;
  is_bilingual?: boolean;
  is_active?: boolean;
  school_ids: number[];
}

export interface SubjectUpdate {
  subject_code?: string;
  subject_name?: string;
  coordination_code?: string;
  is_bilingual?: boolean;
  is_active?: boolean;
  school_ids?: number[];
}

// Professor types
export interface Professor {
  id: number;
  professor_id: string;
  professor_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  phone_number: string | null;
  professor_category: string | null;
  academic_title: string | null;
  doctorates: number;
  masters: number;
  is_bilingual: boolean;
  is_paid: boolean;
  is_active: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessorCreate {
  professor_id: string;
  professor_name: string;
  institutional_email?: string;
  personal_email?: string;
  phone_number?: string;
  professor_category?: string;
  academic_title?: string;
  doctorates?: number;
  masters?: number;
  is_bilingual?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
}

export interface ProfessorUpdate {
  professor_id?: string;
  professor_name?: string;
  institutional_email?: string;
  personal_email?: string;
  phone_number?: string;
  professor_category?: string;
  academic_title?: string;
  doctorates?: number;
  masters?: number;
  is_bilingual?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
}

// Coordination types
export interface Coordination {
  id: number;
  code: string;
  name: string;
  description: string | null;
  faculty_id: number;
  school_id: number;
  coordinator_professor_id: number | null;
  is_active: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CoordinationCreate {
  code: string;
  name: string;
  description?: string;
  faculty_id: number;
  school_id: number;
  coordinator_professor_id?: number | null;
  is_active?: boolean;
}

export interface CoordinationUpdate {
  code?: string;
  name?: string;
  description?: string;
  faculty_id?: number;
  school_id?: number;
  coordinator_professor_id?: number | null;
  is_active?: boolean;
}

// ScheduleTime types
export interface ScheduleTime {
  id: number;
  schedule_code: string;
  start_time: string;
  end_time: string;
  start_time_ext: string | null;
  end_time_ext: string | null;
  is_active: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ScheduleTimeCreate {
  schedule_code: string;
  start_time: string;
  end_time: string;
  start_time_ext?: string | null;
  end_time_ext?: string | null;
  is_active?: boolean;
}

export interface ScheduleTimeUpdate {
  schedule_code?: string;
  start_time?: string;
  end_time?: string;
  start_time_ext?: string | null;
  end_time_ext?: string | null;
  is_active?: boolean;
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
  SUBJECTS: "/api/v1/catalog/subjects",
} as const;
