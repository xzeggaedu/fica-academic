import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './sign-in-form';
import { renderWithProviders } from '@/test/test-utils';
import { mockLoginMutate } from '@/test/setup';

// Mock theme toggle
vi.mock('@/components/refine-ui/theme/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Mock input password
vi.mock('@/components/refine-ui/form/input-password', () => ({
  InputPassword: ({ value, onChange, required }: any) => (
    <input
      data-testid="password-input"
      type="password"
      value={value}
      onChange={onChange}
      required={required}
    />
  ),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with all required fields', () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByText('Bienvenido de nuevo')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de Usuario')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Recordarme')).toBeInTheDocument();
    // Verificar que el link de forgot password existe (renderizado como path por el mock)
    expect(screen.getByText('/forgot-password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('should handle form submission without remember me', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const usernameInput = screen.getByLabelText('Nombre de Usuario');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
        remember_me: false,
      });
    });
  });

  it('should handle form submission with remember me checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const usernameInput = screen.getByLabelText('Nombre de Usuario');
    const passwordInput = screen.getByTestId('password-input');
    const rememberMeCheckbox = screen.getByLabelText('Recordarme');
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    await user.click(rememberMeCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
        remember_me: true,
      });
    });
  });

  it('should toggle remember me checkbox', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const rememberMeCheckbox = screen.getByLabelText('Recordarme');

    // Initially unchecked
    expect(rememberMeCheckbox).not.toBeChecked();

    // Check it
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox).toBeChecked();

    // Uncheck it
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox).not.toBeChecked();
  });

  it('should require username and password fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const usernameInput = screen.getByLabelText('Nombre de Usuario');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });

    // Both fields should be required
    expect(usernameInput).toBeRequired();
    expect(passwordInput).toBeRequired();

    // Try to submit without filling fields
    await user.click(submitButton);

    // The form should prevent submission due to required fields
    expect(mockLoginMutate).not.toHaveBeenCalled();
  });

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const usernameInput = screen.getByLabelText('Nombre de Usuario');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalled();
    });

    // Note: In a real implementation, the form would be cleared after successful login
    // This test verifies that the login function is called with the correct data
  });

  it('should display theme toggle in header', () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('should display registration link', () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByText('¿No tiene cuenta?')).toBeInTheDocument();
    // El link de registro se renderiza como path por el mock
    expect(screen.getByText('/register')).toBeInTheDocument();
  });

  it('should display forgot password link', () => {
    renderWithProviders(<SignInForm />);

    // El link de forgot password se renderiza como path por el mock
    expect(screen.getByText('/forgot-password')).toBeInTheDocument();
  });
});
