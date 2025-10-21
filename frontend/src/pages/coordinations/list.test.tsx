import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { CoordinationList } from './list';
import { renderWithProviders } from '@/test/test-utils';

// Mock de toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock de Refine hooks
vi.mock('@refinedev/core', () => ({
  useList: vi.fn(() => ({
    query: { isLoading: false },
    result: { data: [], total: 0 }
  })),
  useCan: vi.fn(() => ({ data: { can: true } })),
  useUpdate: vi.fn(() => ({
    mutate: vi.fn(),
    mutation: { isPending: false },
  })),
  useCreate: vi.fn(() => ({
    mutate: vi.fn(),
    mutation: { isPending: false },
  })),
  useDelete: vi.fn(() => ({
    mutate: vi.fn(),
    mutation: { isPending: false },
  })),
  useInvalidate: vi.fn(() => vi.fn()),
  CanAccess: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock data
const mockCoordinations = [
  {
    id: 1,
    code: 'RED',
    name: 'Redes',
    description: 'Coordinación de redes',
    faculty_id: 1,
    coordinator_professor_id: 1,
    is_active: true,
    deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    code: 'PROG',
    name: 'Programación',
    description: 'Coordinación de programación',
    faculty_id: 1,
    coordinator_professor_id: null,
    is_active: true,
    deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('CoordinationList - Renderizado Básico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería renderizar el título y descripción', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByText('Coordinaciones')).toBeInTheDocument();
    expect(screen.getByText('Gestiona el catálogo de coordinaciones y cátedras de la institución')).toBeInTheDocument();
  });

  it('debería renderizar el botón de crear', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByRole('button', { name: /Crear Coordinación/i })).toBeInTheDocument();
  });

  it('debería renderizar el campo de búsqueda', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByPlaceholderText('Buscar por código o nombre...')).toBeInTheDocument();
  });

  it('debería renderizar el selector de columnas', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByRole('button', { name: /Columnas/i })).toBeInTheDocument();
  });

  it('debería mostrar el contador total', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByText('0 coordinación(es) en total')).toBeInTheDocument();
  });
});

describe('CoordinationList - Estados de Carga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería mostrar mensaje cuando no hay datos', () => {
    renderWithProviders(<CoordinationList />);

    expect(screen.getByText('No se encontraron coordinaciones')).toBeInTheDocument();
  });
});
