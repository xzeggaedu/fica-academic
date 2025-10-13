import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CoursesList } from './list';

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    refetchQueries: vi.fn(),
    getQueryCache: vi.fn(() => ({
      findAll: vi.fn(() => []),
    })),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}));

// Mock refine hooks used inside the page
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual<any>('@refinedev/core');

  const mkQuery = (data: any[] = [], total = data.length) => ({
    query: {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    result: { data, total },
  });

  const courses = [
    {
      id: 1,
      course_code: 'CS101',
      course_name: 'Intro',
      department_code: 'CS',
      is_active: true,
      created_at: '',
      updated_at: '',
      schools: [{ id: 11, school_id: 11, created_at: '' }],
    },
  ];
  const faculties = [{ id: 100, name: 'Ingeniería', acronym: 'ING', is_active: true, created_at: '' }];
  const schools = [{ id: 11, name: 'Computación', acronym: 'COMP', fk_faculty: 100, is_active: true, created_at: '' }];

  const useListMock = (args: any) => {
    if (args?.resource === 'courses') return mkQuery(courses, 1);
    if (args?.resource === 'faculties') return mkQuery(faculties, 1);
    if (args?.resource === 'schools') return mkQuery(schools, 1);
    return mkQuery();
  };

  const mutState = { isPending: false };
  const noopMut = { mutate: vi.fn(), mutation: mutState };

  return {
    ...actual,
    useList: vi.fn(useListMock),
    useCreate: vi.fn(() => noopMut as any),
    useUpdate: vi.fn(() => noopMut as any),
    useDelete: vi.fn(() => noopMut as any),
    useInvalidate: vi.fn(() => vi.fn()),
  };
});

describe('CoursesList view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table and shows course row', async () => {
    render(<CoursesList />);
    expect(await screen.findByText('Lista de Asignaturas (1)')).toBeInTheDocument();
    // headers
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Nombre del Curso')).toBeInTheDocument();
    // row content
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('renders delete button in actions column', async () => {
    const { container } = render(<CoursesList />);
    // Wait for the table to render with course data
    await screen.findByText('Lista de Asignaturas (1)');
    await screen.findByText('CS101');
    await screen.findByText('Intro');

    // Verify that the table has action buttons
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);

    // Find buttons in the first row
    const firstRow = rows[0];
    const rowButtons = firstRow?.querySelectorAll('button');

    // Should have at least one button (the delete button)
    expect(rowButtons).toBeDefined();
    expect(rowButtons!.length).toBeGreaterThan(0);
  });
});
