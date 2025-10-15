/**
 * Mock Service Worker - Handlers para las APIs REST
 * Este archivo define los handlers que interceptan las llamadas HTTP en las pruebas
 */

import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mock data para las pruebas
export const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    profile_image_url: 'https://avatar.iran.liara.run/public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    role: 'unauthorized',
    profile_image_url: 'https://avatar.iran.liara.run/public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockFaculties = [
  {
    id: 1,
    name: 'Facultad de Ciencias Aplicadas',
    acronym: 'FICA',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Facultad de Ingeniería',
    acronym: 'FI',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockSchools = [
  {
    id: 1,
    name: 'Escuela de Ingeniería de Sistemas',
    acronym: 'INFO',
    fk_faculty: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Escuela de Ingeniería Mecánica',
    acronym: 'MEC',
    fk_faculty: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockCourses = [
  {
    id: 1,
    course_code: 'CS101',
    course_name: 'Introducción a la Programación',
    department_code: 'CS',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schools: [
      {
        id: 1,
        school_id: 1,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 2,
    course_code: 'MATH201',
    course_name: 'Cálculo Diferencial',
    department_code: 'MATH',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schools: [
      {
        id: 2,
        school_id: 1,
        created_at: new Date().toISOString(),
      },
    ],
  },
];

export const handlers = [
  // ==================== AUTH ENDPOINTS ====================

  // Login
  http.post(`${API_URL}/api/v1/login`, async ({ request }) => {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');

    if (username === 'admin' && password === 'admin123') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
      });
    }

    return HttpResponse.json(
      { detail: 'Wrong username, email or password' },
      { status: 401 }
    );
  }),

  // Refresh token
  http.post(`${API_URL}/api/v1/refresh`, () => {
    return HttpResponse.json({
      access_token: 'mock-refreshed-token',
      token_type: 'bearer',
    });
  }),

  // Logout
  http.post(`${API_URL}/api/v1/logout`, () => {
    return HttpResponse.json(
      { message: 'Successfully logged out' },
      { status: 200 }
    );
  }),

  // Get current user
  http.get(`${API_URL}/api/v1/users/me`, () => {
    return HttpResponse.json(mockUsers[0]);
  }),

  // ==================== USER ENDPOINTS ====================

  // List users
  http.get(`${API_URL}/api/v1/users`, () => {
    return HttpResponse.json(mockUsers);
  }),

  // Get user by ID
  http.get(`${API_URL}/api/v1/users/:id`, ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === Number(id));

    if (!user) {
      return HttpResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(user);
  }),

  // Create user
  http.post(`${API_URL}/api/v1/users`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newUser = {
      id: mockUsers.length + 1,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockUsers.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // Update user
  http.patch(`${API_URL}/api/v1/users/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as Record<string, any>;
    const userIndex = mockUsers.findIndex((u) => u.id === Number(id));

    if (userIndex === -1) {
      return HttpResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      );
    }

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockUsers[userIndex]);
  }),

  // Delete user
  http.delete(`${API_URL}/api/v1/users/:id`, ({ params }) => {
    const { id } = params;
    const userIndex = mockUsers.findIndex((u) => u.id === Number(id));

    if (userIndex === -1) {
      return HttpResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      );
    }

    mockUsers.splice(userIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== FACULTY ENDPOINTS ====================

  // List faculties
  http.get(`${API_URL}/api/v1/faculties`, () => {
    return HttpResponse.json(mockFaculties);
  }),

  // Get faculty by ID
  http.get(`${API_URL}/api/v1/faculties/:id`, ({ params }) => {
    const { id } = params;
    const faculty = mockFaculties.find((f) => f.id === Number(id));

    if (!faculty) {
      return HttpResponse.json(
        { detail: 'Faculty not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(faculty);
  }),

  // Create faculty
  http.post(`${API_URL}/api/v1/faculties`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newFaculty = {
      id: mockFaculties.length + 1,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockFaculties.push(newFaculty);
    return HttpResponse.json(newFaculty, { status: 201 });
  }),

  // Update faculty
  http.patch(`${API_URL}/api/v1/faculties/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as Record<string, any>;
    const facultyIndex = mockFaculties.findIndex((f) => f.id === Number(id));

    if (facultyIndex === -1) {
      return HttpResponse.json(
        { detail: 'Faculty not found' },
        { status: 404 }
      );
    }

    mockFaculties[facultyIndex] = {
      ...mockFaculties[facultyIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockFaculties[facultyIndex]);
  }),

  // Delete faculty
  http.delete(`${API_URL}/api/v1/faculties/:id`, ({ params }) => {
    const { id } = params;
    const facultyIndex = mockFaculties.findIndex((f) => f.id === Number(id));

    if (facultyIndex === -1) {
      return HttpResponse.json(
        { detail: 'Faculty not found' },
        { status: 404 }
      );
    }

    mockFaculties.splice(facultyIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== SCHOOL ENDPOINTS ====================

  // List schools (with optional faculty filter)
  http.get(`${API_URL}/api/v1/schools`, ({ request }) => {
    const url = new URL(request.url);
    const facultyId = url.searchParams.get('fk_faculty') || url.searchParams.get('faculty_id');

    if (facultyId) {
      const filteredSchools = mockSchools.filter(
        (s) => s.fk_faculty === Number(facultyId)
      );
      return HttpResponse.json(filteredSchools);
    }

    return HttpResponse.json(mockSchools);
  }),

  // Get school by ID
  http.get(`${API_URL}/api/v1/schools/:id`, ({ params }) => {
    const { id } = params;
    const school = mockSchools.find((s) => s.id === Number(id));

    if (!school) {
      return HttpResponse.json(
        { detail: 'School not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(school);
  }),

  // Create school
  http.post(`${API_URL}/api/v1/schools`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newSchool = {
      id: mockSchools.length + 1,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockSchools.push(newSchool);
    return HttpResponse.json(newSchool, { status: 201 });
  }),

  // Update school
  http.patch(`${API_URL}/api/v1/schools/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as Record<string, any>;
    const schoolIndex = mockSchools.findIndex((s) => s.id === Number(id));

    if (schoolIndex === -1) {
      return HttpResponse.json(
        { detail: 'School not found' },
        { status: 404 }
      );
    }

    mockSchools[schoolIndex] = {
      ...mockSchools[schoolIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockSchools[schoolIndex]);
  }),

  // Delete school
  http.delete(`${API_URL}/api/v1/schools/:id`, ({ params }) => {
    const { id } = params;
    const schoolIndex = mockSchools.findIndex((s) => s.id === Number(id));

    if (schoolIndex === -1) {
      return HttpResponse.json(
        { detail: 'School not found' },
        { status: 404 }
      );
    }

    mockSchools.splice(schoolIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== TASKS ENDPOINTS ====================

  // List tasks
  http.get(`${API_URL}/api/v1/tasks`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== COURSES ENDPOINTS ====================

  // List courses
  http.get(`${API_URL}/api/v1/catalog/courses`, () => {
    return HttpResponse.json(mockCourses);
  }),

  // Get course by ID
  http.get(`${API_URL}/api/v1/catalog/courses/:id`, ({ params }) => {
    const { id } = params;
    const course = mockCourses.find((c) => c.id === Number(id));

    if (!course) {
      return HttpResponse.json(
        { detail: 'Course not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(course);
  }),

  // Create course
  http.post(`${API_URL}/api/v1/catalog/courses`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newCourse = {
      id: mockCourses.length + 1,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schools: [],
    } as any;
    mockCourses.push(newCourse);
    return HttpResponse.json(newCourse, { status: 201 });
  }),

  // Update course
  http.patch(`${API_URL}/api/v1/catalog/courses/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as Record<string, any>;
    const courseIndex = mockCourses.findIndex((c) => c.id === Number(id));

    if (courseIndex === -1) {
      return HttpResponse.json(
        { detail: 'Course not found' },
        { status: 404 }
      );
    }

    mockCourses[courseIndex] = {
      ...mockCourses[courseIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockCourses[courseIndex]);
  }),

  // Delete course
  http.delete(`${API_URL}/api/v1/catalog/courses/:id`, ({ params }) => {
    const { id } = params;
    const courseIndex = mockCourses.findIndex((c) => c.id === Number(id));

    if (courseIndex === -1) {
      return HttpResponse.json(
        { detail: 'Course not found' },
        { status: 404 }
      );
    }

    mockCourses.splice(courseIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== RECYCLE BIN ENDPOINTS ====================

  // List recycle bin items
  http.get(`${API_URL}/api/v1/recycle-bin`, () => {
    return HttpResponse.json({
      data: [],
      total: 0,
    });
  }),

  // Restore item
  http.post(`${API_URL}/api/v1/recycle-bin/:id/restore`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      message: `Item ${id} restored successfully`,
    });
  }),

  // Permanent delete
  http.delete(`${API_URL}/api/v1/recycle-bin/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      message: `Item ${id} permanently deleted`,
    });
  }),
];
