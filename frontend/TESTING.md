# Testing Guide

Este proyecto utiliza **Vitest** y **@testing-library/react** para las pruebas unitarias del frontend.

## Configuración

### Dependencias instaladas:

- `vitest` - Framework de testing
- `@testing-library/react` - Utilidades para testing de componentes React
- `@testing-library/jest-dom` - Matchers adicionales para DOM
- `@testing-library/user-event` - Simulación de eventos de usuario
- `@testing-library/dom` - Utilidades base para testing DOM
- `jsdom` - Entorno DOM simulado
- `@vitest/coverage-v8` - Generación de reportes de cobertura

## Scripts disponibles

```bash
# Ejecutar tests en modo watch
npm run test

# Ejecutar tests una sola vez
npm run test:run

# Ejecutar tests con interfaz gráfica
npm run test:ui

# Ejecutar tests con reporte de cobertura
npm run test:coverage
```

## Estructura de archivos

```
src/
├── test/
│   └── setup.ts          # Configuración global de tests
├── components/
│   └── ui/
│       ├── button.test.tsx
│       ├── card.test.tsx
│       ├── input.test.tsx
│       └── counter.test.tsx
└── ...
```

## Configuración

### vite.config.ts

```typescript
export default defineConfig({
  // ... configuración de Vite
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

### src/test/setup.ts

Configuración global que incluye:

- Importación de `@testing-library/jest-dom`
- Mocks para APIs del navegador (matchMedia, ResizeObserver, etc.)
- Mocks para localStorage y sessionStorage

## Ejemplos de tests

### Test básico de componente

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
});
```

### Test con interacciones

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Input Component', () => {
  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test input' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test input');
  });
});
```

### Test con estado

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Counter Component', () => {
  it('increments count when button is clicked', async () => {
    render(<Counter />);
    const button = screen.getByRole('button', { name: 'Increment' });
    const countDisplay = screen.getByTestId('count');

    fireEvent.click(button);

    await waitFor(() => {
      expect(countDisplay).toHaveTextContent('1');
    });
  });
});
```

## Convenciones

1. **Naming**: Los archivos de test deben terminar en `.test.tsx` o `.test.ts`
1. **Estructura**: Usar `describe` para agrupar tests relacionados
1. **Assertions**: Usar matchers de `@testing-library/jest-dom` cuando sea apropiado
1. **Mocks**: Usar `vi.fn()` para crear mocks de funciones
1. **Async**: Usar `waitFor` para esperar cambios de estado asíncronos

## Cobertura

El proyecto está configurado para generar reportes de cobertura. Los archivos excluidos son:

- `node_modules/`
- `src/test/`
- `**/*.d.ts`
- `**/*.config.*`
- `**/coverage/**`

## Mejores prácticas

1. **Testear comportamiento, no implementación**
1. **Usar queries accesibles** (getByRole, getByLabelText, etc.)
1. **Evitar testear detalles internos** de componentes
1. **Mantener tests simples y legibles**
1. **Usar data-testid solo cuando sea necesario**

## Recursos útiles

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
