import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Login } from './index';

// Mock del componente SignInForm
vi.mock('@/components/refine-ui/form/sign-in-form', () => ({
  SignInForm: () => <div data-testid="sign-in-form">Formulario de Inicio de Sesión</div>,
}));

describe('Login', () => {
  it('debería renderizar la página de login', () => {
    render(<Login />);

    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
  });

  it('debería renderizar el componente SignInForm', () => {
    render(<Login />);

    expect(screen.getByText('Formulario de Inicio de Sesión')).toBeInTheDocument();
  });
});
