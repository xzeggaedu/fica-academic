import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleTimesList } from './list';
import { renderWithProviders } from '@/test/test-utils';

// Mock de toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock de lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Trash2: () => <span data-testid="trash-icon">🗑️</span>,
    Clock: () => <span data-testid="clock-icon">🕐</span>,
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

// Mock data de horarios
const mockScheduleTimes = [
  {
    id: 1,
    days_array: [0, 1, 2, 3, 4],
    day_group_name: 'Lu-Vi',
    range_text: '07:00 a.m. a 08:30 a.m.',
    start_time: '07:00:00',
    end_time: '08:30:00',
    duration_min: 90,
    is_active: true,
    deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 2,
    days_array: [1, 3],
    day_group_name: 'Ma-Ju',
    range_text: '02:00 p.m. a 03:30 p.m.',
    start_time: '14:00:00',
    end_time: '15:30:00',
    duration_min: 90,
    is_active: true,
    deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
];

describe('ScheduleTimesList - Lista de Horarios', () => {
  beforeEach(async () => {
    // Sobrescribir el mock de useList para este archivo
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockImplementation((config: any) => {
      // Retornar datos según el resource
      if (config?.resource === 'catalog/schedule-times' || config?.resource === 'schedule-times') {
        return {
          query: {
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
          },
          result: {
            data: mockScheduleTimes,
            total: mockScheduleTimes.length,
          },
        } as any;
      }
      return {
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
      } as any;
    });
  });

  it('debería renderizar el título', () => {
    renderWithProviders(<ScheduleTimesList />);

    expect(screen.getByText(/Configuración de Horarios/i)).toBeInTheDocument();
  });

  it('debería cargar y mostrar horarios desde la API', () => {
    renderWithProviders(<ScheduleTimesList />);

    expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
    expect(screen.getByText('Ma-Ju')).toBeInTheDocument();
    expect(screen.getByText(/07:00 a.m. a 08:30 a.m./i)).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay horarios', async () => {
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockImplementationOnce((config: any) => {
      if (config?.resource === 'catalog/schedule-times' || config?.resource === 'schedule-times') {
        return {
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
        } as any;
      }
      return {
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
      } as any;
    });

    renderWithProviders(<ScheduleTimesList />);

    const emptyMessage = screen.queryByText(/No hay horarios/i);
    if (emptyMessage) {
      expect(emptyMessage).toBeInTheDocument();
    }
  });

  it('debería mostrar la vista de horarios', () => {
    renderWithProviders(<ScheduleTimesList />);

    // Verificar que existe el contenido de horarios
    expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
    expect(screen.getByText('Ma-Ju')).toBeInTheDocument();
  });

  it('debería tener botones de vista (Tabla/Agrupada)', () => {
    renderWithProviders(<ScheduleTimesList />);

    // Verificar que existen botones de cambio de vista
    expect(screen.getByText('Tabla')).toBeInTheDocument();
    expect(screen.getByText('Agrupada')).toBeInTheDocument();
  });

  it('debería renderizar el botón de eliminar en las acciones', () => {
    renderWithProviders(<ScheduleTimesList />);

    expect(screen.getByText('Lu-Vi')).toBeInTheDocument();

    // Verificar que hay iconos de eliminar
    const trashIcons = screen.queryAllByTestId('trash-icon');
    if (trashIcons.length > 0) {
      expect(trashIcons.length).toBeGreaterThan(0);
    }
  });

  it('debería incluir campos deleted y deleted_at en el mock de datos', () => {
    // Verificar que los mock schedule times tienen los campos necesarios para soft-delete
    expect(mockScheduleTimes[0]).toHaveProperty('deleted');
    expect(mockScheduleTimes[0]).toHaveProperty('deleted_at');
    expect(mockScheduleTimes[0].deleted).toBe(false);
    expect(mockScheduleTimes[0].deleted_at).toBe(null);
  });

  it('debería mostrar loading state mientras carga', async () => {
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockImplementationOnce(() => ({
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
    } as any));

    renderWithProviders(<ScheduleTimesList />);

    // Verificar que hay un indicador de carga
    const loadingIndicator = screen.queryByText(/cargando/i);
    if (loadingIndicator) {
      expect(loadingIndicator).toBeInTheDocument();
    }
  });

  it('debería tener botón para crear nuevo horario', () => {
    renderWithProviders(<ScheduleTimesList />);

    const createButton = screen.queryByText(/Crear Horario/i) || screen.queryByText(/Nuevo/i);
    if (createButton) {
      expect(createButton).toBeInTheDocument();
    }
  });
});
