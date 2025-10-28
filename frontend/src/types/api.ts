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

// Academic Level Types
export interface AcademicLevel {
  id: number;
  code: string;
  name: string;
  priority: number;
  description: string | null;
  is_active: boolean;
  deleted: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AcademicLevelCreate {
  code: string;
  name: string;
  priority: number;
  description?: string | null;
  is_active?: boolean;
}

export interface AcademicLevelUpdate {
  code?: string;
  name?: string;
  priority?: number;
  description?: string | null;
  is_active?: boolean;
}

// Hourly Rate History Types
export interface HourlyRateHistory {
  id: number;
  level_id: number;
  rate_per_hour: string;  // Backend devuelve como string (Decimal)
  start_date: string;
  end_date: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string | null;
  academic_level?: AcademicLevel;
}

export interface HourlyRateHistoryCreate {
  level_id: number;
  rate_per_hour: number;
  start_date: string;
}

export interface HourlyRateHistoryUpdate {
  rate_per_hour?: number;
  start_date?: string;
  end_date?: string | null;
}

export interface HourlyRateTimelineItem {
  id: number;
  rate_per_hour: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
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
  TERMS: "/api/v1/terms",
  HOLIDAYS: "/api/v1/holidays",
  FIXED_HOLIDAY_RULES: "/api/v1/fixed-holiday-rules",
} as const;

// Term Types
export interface Term {
  id: number;
  term: number;
  year: number;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface TermCreate {
  term: number;
  year: number;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description?: string;
}

export interface TermUpdate {
  term?: number;
  year?: number;
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  description?: string;
}

export interface TermRead {
  id: number;
  term: number;
  year: number;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Fixed Holiday Rules (Reglas de Asuetos Fijos)
export interface FixedHolidayRule {
  id: number;
  month: number;
  day: number;
  name: string;
  holiday_type: string; // "Asueto Nacional" | "Personalizado"
  created_at: string;
  updated_at?: string;
}

export interface FixedHolidayRuleCreate {
  month: number;
  day: number;
  name: string;
}

export interface FixedHolidayRuleUpdate {
  month?: number;
  day?: number;
  name?: string;
}

// Holiday Types (Asuetos del Año)
export interface AnnualHoliday {
  id: number;
  holiday_id: number;
  date: string; // ISO date string
  name: string;
  type: string; // "Asueto Nacional" | "Personalizado"
  created_at: string;
  updated_at?: string;
}

export interface AnnualHolidayCreate {
  holiday_id: number;
  date: string;
  name: string;
  type: string;
}

export interface AnnualHolidayUpdate {
  holiday_id?: number;
  date?: string;
  name?: string;
  type?: string;
}

export interface Holiday {
  id: number;
  year: number;
  description?: string;
  created_at: string;
  updated_at?: string;
  annual_holidays_count: number;
  annual_holidays?: AnnualHoliday[];
}

export interface HolidayCreate {
  year: number;
  description?: string;
}

export interface HolidayUpdate {
  year?: number;
  description?: string;
}

export interface HolidayRead {
  id: number;
  year: number;
  description?: string;
  created_at: string;
  updated_at?: string;
  annual_holidays_count: number;
  annual_holidays?: AnnualHoliday[];
}

// Template Generation Types
export interface TemplateGeneration {
  id: number;
  user_id: string;
  faculty_id: number;
  school_id: number;
  original_filename: string;
  original_file_path: string;
  generated_file_path: string;
  upload_date: string;
  generation_status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Relaciones
  user?: User;
  faculty?: Faculty;
  school?: School;
}

export interface TemplateGenerationCreate {
  faculty_id: number;
  school_id: number;
  notes?: string;
}

export interface TemplateGenerationUpdate {
  faculty_id?: number;
  school_id?: number;
  notes?: string;
  generation_status?: string;
}

export interface TemplateGenerationRead {
  id: number;
  faculty_name: string;
  school_name: string;
  original_filename: string;
  upload_date: string;
  generation_status: string;
  user_name: string;
  notes?: string;
  download_url?: string | null;
}

// Academic Load File Types
export interface AcademicLoadFile {
  id: number;
  user_id: string;
  user_name: string;
  faculty_id: number;
  school_id: number;
  term_id: number;
  original_filename: string;
  original_file_path: string;
  upload_date: string;
  ingestion_status: string;
  notes?: string | null;
  version?: number;
  is_active?: boolean;
  superseded_at?: string | null;
  superseded_by_id?: number | null;
  // Relaciones
  user?: User;
  faculty?: Faculty;
  school?: School;
  term?: Term;
}

export interface AcademicLoadFileCreate {
  faculty_id: number;
  school_id: number;
  term_id: number;
}

export interface AcademicLoadFileUpdate {
  faculty_id?: number;
  school_id?: number;
  term_id?: number;
  ingestion_status?: string;
}
