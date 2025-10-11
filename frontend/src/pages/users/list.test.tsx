import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserList } from './list';

// Mock de Refine
vi.mock('@refinedev/core', () => ({
  useList: vi.fn(() => ({
    query: { isLoading: false, error: null },
    result: { data: [] },
  })),
  useGetIdentity: vi.fn(() => ({
    data: { id: 1, username: 'admin' },
  })),
  CanAccess: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    refetchQueries: vi.fn(),
  })),
}));

vi.mock('../../components/ui/users/user-create-button', () => ({
  UserCreateButton: () => <button>Crear Usuario</button>,
}));

vi.mock('../../components/ui/users/user-actions', () => ({
  UserActions: ({ isCurrentUser }: { isCurrentUser?: boolean }) => (
    <div data-testid="user-actions" data-current-user={isCurrentUser}>
      Acciones {isCurrentUser ? '(Usuario Actual)' : ''}
    </div>
  ),
}));

vi.mock('../../components/ui/users/user-view-sheet', () => ({
  UserViewSheet: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="user-view-sheet">Vista de Usuario</div> : null,
}));

describe('UserList - Vista Principal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el título principal', () => {
    render(<UserList />);
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('debería mostrar el botón de crear usuario', () => {
    render(<UserList />);
    expect(screen.getByText('Crear Usuario')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay usuarios', () => {
    render(<UserList />);
    expect(screen.getByText(/No hay usuarios registrados/i)).toBeInTheDocument();
  });

  it('debería marcar al usuario actual en las acciones', async () => {
    const { useList, useGetIdentity } = await import('@refinedev/core');

    (useGetIdentity as any).mockReturnValue({
      data: { id: 1, username: 'admin' },
    });

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            username: 'admin',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'ADMIN',
            is_active: true,
            created_at: '2024-01-01',
          },
          {
            id: 2,
            username: 'user2',
            name: 'User Two',
            email: 'user2@test.com',
            role: 'DIRECTOR',
            is_active: true,
            created_at: '2024-01-02',
          },
        ],
      },
    });

    render(<UserList />);

    const actions = screen.getAllByTestId('user-actions');
    expect(actions[0]).toHaveAttribute('data-current-user', 'true');
    expect(actions[1]).toHaveAttribute('data-current-user', 'false');
  });

  it('debería abrir el sheet de visualización al hacer click en una fila', async () => {
    const { useList } = await import('@refinedev/core');

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            username: 'testuser',
            name: 'Test User',
            email: 'test@test.com',
            role: 'ADMIN',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
      },
    });

    render(<UserList />);

    // Hacer click en la fila (en cualquier celda que no sea acciones)
    const nameCell = screen.getByText('Test User');
    fireEvent.click(nameCell);

    // Verificar que se abre el sheet
    expect(screen.getByTestId('user-view-sheet')).toBeInTheDocument();
  });

  it('debería tener filas con cursor pointer', async () => {
    const { useList } = await import('@refinedev/core');

    (useList as any).mockReturnValue({
      query: { isLoading: false, error: null },
      result: {
        data: [
          {
            id: 1,
            username: 'testuser',
            name: 'Test User',
            email: 'test@test.com',
            role: 'ADMIN',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
      },
    });

    const { container } = render(<UserList />);

    // Verificar que las filas tienen la clase cursor-pointer
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveClass('cursor-pointer');
  });
});
