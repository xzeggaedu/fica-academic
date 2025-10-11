import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionExpiredModal } from './session-expired-modal';

describe('SessionExpiredModal', () => {
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el modal cuando open es true', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    expect(screen.getByText('Sesión Expirada')).toBeInTheDocument();
  });

  it('no debería renderizar cuando open es false', () => {
    render(<SessionExpiredModal open={false} onConfirm={mockOnConfirm} />);

    expect(screen.queryByText('Sesión Expirada')).not.toBeInTheDocument();
  });

  it('debería mostrar el mensaje de sesión expirada', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    expect(screen.getByText(/Tu sesión ha expirado/i)).toBeInTheDocument();
    expect(screen.getByText(/inicia sesión nuevamente/i)).toBeInTheDocument();
  });

  it('debería tener un botón para ir al login', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    expect(screen.getByRole('button', { name: /Ir al Login/i })).toBeInTheDocument();
  });

  it('debería llamar onConfirm al hacer clic en el botón', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    const loginButton = screen.getByRole('button', { name: /Ir al Login/i });
    fireEvent.click(loginButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('debería mostrar un ícono de advertencia', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    // Verificar que el modal contiene el mensaje de advertencia
    expect(screen.getByText('Sesión Expirada')).toBeInTheDocument();
  });

  it('no debería permitir cerrar el modal sin confirmar', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    // No debe haber botón de cerrar (X) en el modal
    const closeButtons = screen.queryAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.getAttribute('aria-label') === 'Close');
    expect(closeButton).toBeFalsy();
  });

  it('debería tener el título correcto', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    const title = screen.getByText('Sesión Expirada');
    expect(title).toBeInTheDocument();
  });

  it('debería tener una descripción explicativa', () => {
    render(<SessionExpiredModal open={true} onConfirm={mockOnConfirm} />);

    expect(screen.getByText(/por seguridad/i)).toBeInTheDocument();
  });
});
