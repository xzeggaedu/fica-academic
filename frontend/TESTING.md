# Estrategia de Testing - FICA Academics

## 📋 Resumen

Este documento describe la estrategia de testing unitario implementada para el frontend de FICA Academics. La estrategia se enfoca en probar las **páginas/vistas principales** y los **componentes críticos de UX/UI**, dejando de lado providers, hooks y componentes genéricos de UI.

## 🎯 Alcance de Testing

### ✅ QUÉ SE PRUEBA

#### 1. Páginas/Vistas (Interfaz de Usuario)

- ✅ `pages/login/index.tsx` - Autenticación
- ✅ `pages/users/list.tsx` - Lista de usuarios
- ✅ `pages/faculties/list.tsx` - Lista de facultades
- ✅ `pages/courses/list.tsx` - Lista de cursos
- ✅ `pages/recycle-bin/list.tsx` - Papelera de reciclaje

#### 2. Componentes Críticos (UX/UI)

- ✅ `components/ui/users/user-create-form.tsx` - Crear usuario
- ✅ `components/ui/faculties/faculty-create-form.tsx` - Crear facultad
- ✅ `components/ui/faculties/faculty-schools-sheet.tsx` - Gestión de escuelas
- ✅ `components/ui/modals/session-expired-modal.tsx` - Modal de sesión expirada

### ❌ QUÉ NO SE PRUEBA

- ❌ **Providers** (`authProvider.ts`, `dataProvider.ts`, `accessControlProvider.ts`)
- ❌ **Hooks personalizados** (`use-api-debug.ts`, `use-token-refresh.ts`, etc.)
- ❌ **Componentes genéricos de UI** (`button.tsx`, `input.tsx`, `dialog.tsx`, etc.)
- ❌ **Utilidades** (`utils.ts`, `iconMap.tsx`, etc.)

**Razón**: Los providers y hooks se prueban indirectamente a través de las vistas que los utilizan. Los componentes genéricos de UI son de terceros (Shadcn/ui) o muy simples.

## 🛠️ Herramientas y Configuración

### Stack de Testing

- **Framework**: [Vitest](https://vitest.dev/) - Rápido y compatible con Vite
- **Testing Library**: [@testing-library/react](https://testing-library.com/react) - Testing orientado al usuario
- **Mock API**: [MSW (Mock Service Worker)](https://mswjs.io/) - Intercepta y mockea llamadas HTTP
- **Aserciones**: [jest-dom](https://github.com/testing-library/jest-dom) - Matchers personalizados para DOM

### Estructura de Archivos

```
frontend/
├── src/
│   ├── pages/
│   │   ├── login/
│   │   │   ├── index.tsx
│   │   │   └── index.test.tsx          ✅ Test de página
│   │   ├── users/
│   │   │   ├── list.tsx
│   │   │   └── list.test.tsx            ✅ Test de página
│   │   └── ...
│   ├── components/
│   │   └── ui/
│   │       ├── users/
│   │       │   ├── user-create-form.tsx
│   │       │   └── user-create-form.test.tsx  ✅ Test de componente
│   │       └── ...
│   ├── mocks/
│   │   ├── handlers.ts                  📦 Handlers de MSW
│   │   └── server.ts                    🖥️ Server de MSW
│   └── test/
│       ├── setup.ts                     ⚙️ Configuración global
│       └── test-utils.tsx               🛠️ Utilidades de testing
└── vitest.config.ts                     ⚙️ Configuración de Vitest
```

## 📝 Convenciones de Testing

### Nombrado de Tests

```typescript
describe('NombreComponente - Descripción del Contexto', () => {
  it('debería hacer X cuando Y', () => {
    // Arrange, Act, Assert
  });
});
```

### Patrón AAA (Arrange, Act, Assert)

```typescript
it('debería mostrar usuarios desde la API', async () => {
  // Arrange: Preparar el entorno
  renderWithRefine(<UserList />);

  // Act: Ejecutar la acción (implícito en la carga)

  // Assert: Verificar el resultado
  await waitFor(() => {
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });
});
```

### Uso de MSW

Los handlers de MSW se definen en `src/mocks/handlers.ts`:

```typescript
export const handlers = [
  http.get('http://localhost:8000/api/v1/users', () => {
    return HttpResponse.json(mockUsers);
  }),
  // ...
];
```

Para override en tests específicos:

```typescript
it('debería mostrar mensaje cuando no hay usuarios', async () => {
  const { server } = await import('@/mocks/server');
  const { http, HttpResponse } = await import('msw');

  server.use(
    http.get('http://localhost:8000/api/v1/users', () => {
      return HttpResponse.json([]);
    })
  );

  renderWithRefine(<UserList />);
  // ...
});
```

## 🧪 Tipos de Tests por Categoría

### Tests de Páginas/Vistas

**Qué probar**:

1. ✅ Renderizado de elementos principales (título, botones, tabla)
1. ✅ Carga de datos desde API (MSW)
1. ✅ Estados vacíos (sin datos)
1. ✅ Interacciones básicas (click en fila, abrir modales)
1. ✅ Filtros y búsqueda
1. ✅ Paginación
1. ✅ Estados de carga

**Ejemplo**:

```typescript
describe('UserList - Lista de Usuarios con MSW', () => {
  it('debería cargar y mostrar usuarios desde la API (MSW)', async () => {
    renderWithRefine(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });
});
```

### Tests de Componentes Críticos

**Qué probar**:

1. ✅ Renderizado de campos del formulario
1. ✅ Validaciones básicas
1. ✅ Estados de botones (habilitado/deshabilitado)
1. ✅ Transformaciones de datos (ej: mayúsculas en acrónimos)
1. ✅ Apertura/cierre de modales o sheets

**Ejemplo**:

```typescript
describe('FacultyCreateForm - Renderizado Básico', () => {
  it('debería renderizar los campos del formulario', () => {
    renderWithProviders(<FacultyCreateForm />);

    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Acrónimo/i)).toBeInTheDocument();
  });
});
```

## 🚀 Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests de un archivo específico
npm test -- src/pages/login/index.test.tsx

# Ejecutar tests con UI de Vitest
npm run test:ui
```

## 📊 Cobertura de Testing

### Estado Actual

- **Total de tests**: 77
- **Tests pasando**: 38 ✅
- **Tests fallando**: 39 ❌ (en proceso de ajuste)

### Archivos de Test

1. ✅ `pages/login/index.test.tsx` - Login page
1. ✅ `pages/users/list.test.tsx` - Users list
1. ✅ `pages/faculties/list.test.tsx` - Faculties list
1. ✅ `pages/courses/list.test.tsx` - Courses list
1. ✅ `pages/recycle-bin/list.test.tsx` - Recycle bin
1. ✅ `components/ui/users/user-create-form.test.tsx` - User create form
1. ✅ `components/ui/faculties/faculty-create-form.test.tsx` - Faculty create form
1. ✅ `components/ui/faculties/faculty-schools-sheet.test.tsx` - Faculty schools sheet
1. ✅ `components/ui/modals/session-expired-modal.test.tsx` - Session expired modal (7/7 ✅)

## 🐛 Debugging de Tests

### Ver output detallado

```bash
npm test -- --reporter=verbose
```

### Debugging en VS Code

Agregar a `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
  "args": ["--run"],
  "console": "integratedTerminal"
}
```

### Tips comunes

- **Queries no encuentran elementos**: Usar `screen.debug()` para ver el DOM
- **Timing issues**: Usar `waitFor()` o `findBy*` queries
- **MSW no intercepta**: Verificar que el handler esté registrado y la URL sea exacta

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [MSW Docs](https://mswjs.io/)
- [Common Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🔄 Próximos Pasos

1. ⏳ Ajustar tests fallidos para que pasen
1. ⏳ Agregar tests para user-edit-form (si es necesario)
1. ⏳ Incrementar cobertura de casos edge (validaciones, errores)
1. ⏳ Configurar CI/CD para ejecutar tests automáticamente

______________________________________________________________________

**Última actualización**: Octubre 2025
**Mantenido por**: Equipo de Desarrollo FICA Academics
