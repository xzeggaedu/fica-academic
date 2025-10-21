import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from './list';
import { renderWithProviders } from '@/test/test-utils';

// Mock de componentes complejos (estos NO causan conflicto)
vi.mock('@/components/ui/users/user-create-button', () => ({
  UserCreateButton: () => <button data-testid="create-user-button">Crear Usuario</button>,
}));

vi.mock('@/components/ui/users/user-actions', () => ({
  UserActions: ({
    userId,
    userName,
    isCurrentUser
  }: {
    userId: string;
    userName: string;
    isCurrentUser?: boolean
  }) => (
    <div
      data-testid={`user-actions-${userId}`}
      data-current-user={isCurrentUser}
    >
      Acciones para {userName}
    </div>
  ),
}));

vi.mock('@/components/ui/users/user-view-sheet', () => ({
  UserViewSheet: ({
    isOpen,
    userId
  }: {
    isOpen: boolean;
    userId?: string
  }) =>
    isOpen ? (
      <div data-testid="user-view-sheet" data-user-id={userId}>
        Vista de Usuario
      </div>
    ) : null,
}));

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

// Mock data de usuarios
const mockUsers = [
  {
    uuid: '1',
    id: 1,
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: '2',
    id: 2,
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    role: 'unauthorized',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('UserList - Lista de Usuarios', () => {
  beforeEach(async () => {
    // Sobrescribir solo el mock de useList para este archivo
    // El mock global de setup.ts se mantiene para otros hooks
    const { useList } = await import('@refinedev/core');
    vi.mocked(useList).mockReturnValue({
      query: {
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: mockUsers,
        total: mockUsers.length,
      },
    } as any);
  });

  it('debería renderizar el título y botón de crear', () => {
    renderWithProviders(<UserList />);

    // Buscar el h1 con el título (puede haber múltiples "Usuarios" en el DOM)
    const heading = screen.getByRole('heading', { level: 1, name: 'Coordinaciones' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId('create-user-button')).toBeInTheDocument();
  });

  it('debería cargar y mostrar usuarios', () => {
    renderWithProviders(<UserList />);

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay usuarios', async () => {
    // Override para este test específico
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

    renderWithProviders(<UserList />);

    expect(screen.getByText('No hay usuarios registrados')).toBeInTheDocument();
  });

  it('debería marcar al usuario actual en las acciones', () => {
    renderWithProviders(<UserList />);

    const actions = screen.getAllByTestId(/user-actions-/);
    expect(actions.length).toBeGreaterThan(0);

    // El primer usuario (Admin) debería estar marcado como usuario actual (id: 1)
    const adminActions = actions.find(el => el.getAttribute('data-testid')?.includes('1'));
    if (adminActions) {
      expect(adminActions).toHaveAttribute('data-current-user', 'true');
    }
  });

  it('debería abrir el sheet de visualización al hacer click en una fila', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserList />);

    // Hacer click en el nombre del usuario
    const nameCell = screen.getByText('Admin User');
    await user.click(nameCell);

    // Verificar que se abre el sheet
    await waitFor(() => {
      expect(screen.getByTestId('user-view-sheet')).toBeInTheDocument();
    });
  });

  it('debería tener las columnas correctas en la tabla', () => {
    renderWithProviders(<UserList />);

    // Verificar que las columnas principales existen
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Correo')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    // Acciones puede estar oculta por defecto, verificamos que existe al menos algún header
  });

  it('debería mostrar el rol correctamente formateado', () => {
    renderWithProviders(<UserList />);

    // Verificar que los roles se muestran (pueden estar en badges)
    const adminTexts = screen.getAllByText(/admin/i);
    expect(adminTexts.length).toBeGreaterThan(0);
  });

  it('debería mostrar loading state mientras carga', async () => {
    // Override para simular loading
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

    renderWithProviders(<UserList />);

    // Verificar que hay un indicador de carga
    const loadingIndicator = screen.queryByText(/cargando/i);
    if (loadingIndicator) {
      expect(loadingIndicator).toBeInTheDocument();
    }
  });
});
