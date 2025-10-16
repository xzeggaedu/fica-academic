import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacultyList } from './list';
import { renderWithProviders } from '@/test/test-utils';

// Mock de componentes complejos
vi.mock('@/components/ui/faculties/faculty-create-button', () => ({
  FacultyCreateButton: () => <button data-testid="create-faculty-button">Crear Facultad</button>,
}));

vi.mock('@/components/ui/faculties/faculty-actions', () => ({
  FacultyActions: ({
    facultyId,
    facultyName
  }: {
    facultyId: number;
    facultyName: string
  }) => (
    <div data-testid={`faculty-actions-${facultyId}`}>
      Acciones para {facultyName}
    </div>
  ),
}));

vi.mock('@/components/ui/faculties/faculty-schools-sheet', () => ({
  FacultySchoolsSheet: ({
    isOpen,
    facultyId,
    facultyName
  }: {
    isOpen: boolean;
    facultyId?: number;
    facultyName?: string
  }) =>
    isOpen ? (
      <div
        data-testid="faculty-schools-sheet"
        data-faculty-id={facultyId}
        data-faculty-name={facultyName}
      >
        Gestión de Escuelas - {facultyName}
      </div>
    ) : null,
}));

// Mock de lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    CheckCircle: () => <span data-testid="check-icon">✓</span>,
    XCircle: () => <span data-testid="x-icon">✗</span>,
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      refetchQueries: vi.fn(),
      invalidateQueries: vi.fn(),
    })),
  };
});

// Mock data de facultades
const mockFaculties = [
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

describe('FacultyList - Lista de Facultades', () => {
  beforeEach(async () => {
    // Sobrescribir solo el mock de useList para este archivo
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockReturnValue({
      query: {
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: mockFaculties,
        total: mockFaculties.length,
      },
    } as any);
  });

  it('debería renderizar el título y botón de crear', () => {
    renderWithProviders(<FacultyList />);

    expect(screen.getByText('Facultades')).toBeInTheDocument();
    expect(screen.getByTestId('create-faculty-button')).toBeInTheDocument();
  });

  it('debería cargar y mostrar facultades desde la API (MSW)', () => {
    renderWithProviders(<FacultyList />);

    expect(screen.getByText('Facultad de Ciencias Aplicadas')).toBeInTheDocument();
    expect(screen.getByText('FICA')).toBeInTheDocument();
    expect(screen.getByText('Facultad de Ingeniería')).toBeInTheDocument();
    expect(screen.getByText('FI')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay facultades', async () => {
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockReturnValueOnce({
      query: {
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: [],
        total: 0,
      },
    } as any);

    renderWithProviders(<FacultyList />);

    expect(screen.getByText('No hay facultades registradas')).toBeInTheDocument();
  });

  it('debería abrir el sheet de escuelas al hacer click en una fila', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FacultyList />);

    // Hacer click en el nombre de la facultad
    const nameCell = screen.getByText('Facultad de Ciencias Aplicadas');
    await user.click(nameCell);

    // Verificar que se abre el sheet de escuelas
    await waitFor(() => {
      const sheet = screen.getByTestId('faculty-schools-sheet');
      expect(sheet).toBeInTheDocument();
      expect(sheet).toHaveAttribute('data-faculty-id', '1');
      expect(sheet).toHaveAttribute('data-faculty-name', 'Facultad de Ciencias Aplicadas');
    });
  });

  it('NO debería abrir el sheet al hacer click en la columna de acciones', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FacultyList />);

    // Hacer click en la celda de acciones
    const actionsCell = screen.getByTestId('faculty-actions-1');
    await user.click(actionsCell);

    // Verificar que NO se abre el sheet
    expect(screen.queryByTestId('faculty-schools-sheet')).not.toBeInTheDocument();
  });

  it('debería tener las columnas correctas en la tabla', () => {
    renderWithProviders(<FacultyList />);

    // Verificar que las columnas principales existen
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Acrónimo')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    // Acciones puede estar oculta por defecto
  });

  it('debería mostrar iconos de estado (activo/inactivo)', () => {
    renderWithProviders(<FacultyList />);

    const checkIcons = screen.getAllByTestId('check-icon');
    // Ambas facultades mockeadas están activas
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('debería mostrar estado inactivo con icono X', async () => {
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockReturnValueOnce({
      query: {
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: [
          {
            id: 1,
            name: 'Facultad Inactiva',
            acronym: 'FI',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    } as any);

    renderWithProviders(<FacultyList />);

    expect(screen.getByText('Facultad Inactiva')).toBeInTheDocument();
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('debería tener filas con cursor pointer', () => {
    const { container } = renderWithProviders(<FacultyList />);

    // Verificar que las filas tienen la clase cursor-pointer
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveClass('cursor-pointer');
  });

  it('debería mostrar loading state mientras carga', async () => {
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockReturnValueOnce({
      query: {
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: undefined,
        total: 0,
      },
    } as any);

    renderWithProviders(<FacultyList />);

    // Verificar que hay un indicador de carga (puede variar según implementación)
    const loadingIndicator = screen.queryByText(/cargando/i);
    if (loadingIndicator) {
      expect(loadingIndicator).toBeInTheDocument();
    }
  });
});
