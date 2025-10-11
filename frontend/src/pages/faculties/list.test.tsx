import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacultyList } from './list';

// Mock completo de Refine
vi.mock('@refinedev/core', () => ({
  useList: vi.fn(() => ({
    query: { isLoading: false, error: null },
    result: { data: [] },
  })),
  CanAccess: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    refetchQueries: vi.fn(),
  })),
}));

// Mock de componentes UI
vi.mock('../../components/ui/faculties/faculty-create-button', () => ({
  FacultyCreateButton: () => <button>Crear</button>,
}));

vi.mock('../../components/ui/faculties/faculty-actions', () => ({
  FacultyActions: () => <div>Acciones</div>,
}));

vi.mock('../../components/ui/faculties/faculty-schools-sheet', () => ({
  FacultySchoolsSheet: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="schools-sheet">Sheet de Escuelas</div> : null,
}));

describe('FacultyList - Vista Principal con Escuelas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el título principal', () => {
    render(<FacultyList />);
    expect(screen.getByText('Facultades')).toBeInTheDocument();
  });

  it('debería mostrar el botón de crear', () => {
    render(<FacultyList />);
    expect(screen.getByText('Crear')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay datos', () => {
    render(<FacultyList />);
    expect(screen.getByText(/No hay facultades registradas/i)).toBeInTheDocument();
  });

  it('debería abrir el sheet de escuelas al hacer click en una fila', async () => {
    const { useList } = await import('@refinedev/core');

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            name: 'Facultad de Ciencias Aplicadas',
            acronym: 'FICA',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
      },
    });

    render(<FacultyList />);

    // Hacer click en la fila
    const nameCell = screen.getByText('Facultad de Ciencias Aplicadas');
    fireEvent.click(nameCell);

    // Verificar que se abre el sheet de escuelas
    expect(screen.getByTestId('schools-sheet')).toBeInTheDocument();
  });

  it('debería tener filas con cursor pointer', async () => {
    const { useList } = await import('@refinedev/core');

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            name: 'Facultad Test',
            acronym: 'FT',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
      },
    });

    const { container } = render(<FacultyList />);

    // Verificar que las filas tienen la clase cursor-pointer
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveClass('cursor-pointer');
  });

  it('no debería abrir el sheet al hacer click en la celda de acciones', async () => {
    const { useList } = await import('@refinedev/core');

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            name: 'Facultad Test',
            acronym: 'FT',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
      },
    });

    render(<FacultyList />);

    // Hacer click en la celda de acciones
    const actionsCell = screen.getByText('Acciones');
    fireEvent.click(actionsCell);

    // Verificar que NO se abre el sheet
    expect(screen.queryByTestId('schools-sheet')).not.toBeInTheDocument();
  });
});
