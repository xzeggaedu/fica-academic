/**
 * Utilidades para pruebas
 * Provee wrappers y helpers para facilitar las pruebas de componentes
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Crear una instancia de QueryClient para tests
 * Configuración según React Query testing docs
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity, // v5: cacheTime → gcTime
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper simple que solo provee QueryClient y Router
 * Usado cuando los hooks de Refine están mockeados directamente
 */
function createWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

/**
 * Función helper para renderizar componentes con providers mínimos
 * Usa un nuevo QueryClient por test para aislamiento completo
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: createWrapper(), ...options });
};

/**
 * Re-exportar todo de @testing-library/react
 */
export * from '@testing-library/react';

/**
 * Exportar helper para crear QueryClient en tests específicos
 */
export { createTestQueryClient };
