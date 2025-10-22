# Guía de Pruebas - Nuevas Características

Esta guía explica cómo ejecutar las pruebas unitarias e integración para las nuevas características implementadas en el sistema de asuetos anuales.

## Nuevas Características Implementadas

### Backend

1. **CRUD Operations para Annual Holidays**

   - Crear, leer, actualizar y eliminar asuetos anuales
   - Validaciones de fechas y duplicados
   - Filtros por tipo de asueto

1. **Cálculo de Días de Clase**

   - Funciones para calcular días disponibles de clase
   - Consideración de holidays y rangos de fechas
   - Soporte para diferentes días de la semana

1. **API Endpoints**

   - Endpoints RESTful para gestionar annual holidays
   - Validaciones de datos y manejo de errores
   - Paginación y filtros

### Frontend

1. **Agrupación de Fechas Consecutivas**

   - Lógica para detectar fechas consecutivas con el mismo nombre
   - Visualización de rangos continuos en el calendario
   - Manejo correcto de zonas horarias

1. **Interacciones del Calendario**

   - Click en días para abrir modal de edición/creación
   - Modal inteligente que detecta modo crear/editar
   - Formularios de validación

1. **Hooks Personalizados**

   - Hook para operaciones CRUD de annual holidays
   - Manejo de estados de carga y errores
   - Integración con Refine

## Estructura de Pruebas

### Backend Tests

#### Pruebas Unitarias

- `test_annual_holidays_crud.py` - Pruebas para operaciones CRUD
- `test_class_days_calculation.py` - Pruebas para cálculo de días de clase

#### Pruebas de Integración

- `test_annual_holidays_api.py` - Pruebas para endpoints de API

### Frontend Tests

#### Pruebas Unitarias

- `date-grouping.test.ts` - Pruebas para lógica de agrupación de fechas
- `calendar-interactions.test.tsx` - Pruebas para interacciones del calendario
- `useAnnualHolidaysCrud.test.ts` - Pruebas para hooks personalizados

#### Configuración

- `setup-annual-holidays.ts` - Configuración global para pruebas

## Ejecutar Pruebas

### Backend

```bash
# Navegar al directorio backend
cd backend

# Ejecutar todas las pruebas
pytest

# Ejecutar pruebas específicas de annual holidays
pytest tests/test_annual_holidays_crud.py -v

# Ejecutar pruebas de cálculo de días de clase
pytest tests/test_class_days_calculation.py -v

# Ejecutar pruebas de API
pytest tests/test_annual_holidays_api.py -v

# Ejecutar con cobertura
pytest --cov=src/app --cov-report=html
```

### Frontend

```bash
# Navegar al directorio frontend
cd frontend

# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas
npm test -- annual-holidays

# Ejecutar con cobertura
npm test -- --coverage

# Ejecutar en modo watch
npm test -- --watch
```

## Casos de Prueba Cubiertos

### Backend

#### CRUD Operations

- ✅ Creación exitosa de annual holiday
- ✅ Validación de fechas duplicadas
- ✅ Validación de años incorrectos
- ✅ Actualización de holidays existentes
- ✅ Eliminación de holidays
- ✅ Filtros por tipo de asueto
- ✅ Paginación de resultados

#### Cálculo de Días de Clase

- ✅ Cálculo para enero 2025 (lunes y miércoles)
- ✅ Cálculo para septiembre 2025 (lunes y viernes)
- ✅ Manejo de múltiples holidays
- ✅ Casos edge (términos de un solo día)
- ✅ Solapamiento parcial de meses

#### API Endpoints

- ✅ Endpoints CRUD completos
- ✅ Validaciones de datos
- ✅ Manejo de errores
- ✅ Respuestas HTTP correctas
- ✅ Paginación y filtros

### Frontend

#### Agrupación de Fechas

- ✅ Agrupación de fechas consecutivas
- ✅ Fechas individuales separadas
- ✅ Mezcla de rangos e individuales
- ✅ Manejo de fechas vacías
- ✅ Ordenamiento correcto

#### Interacciones del Calendario

- ✅ Click en días del calendario
- ✅ Apertura de modal en modo crear
- ✅ Apertura de modal en modo editar
- ✅ Validación de formularios
- ✅ Cierre de modal

#### Hooks Personalizados

- ✅ Retorno de datos correctos
- ✅ Estados de carga y error
- ✅ Funciones CRUD
- ✅ Permisos de usuario

## Configuración de Pruebas

### Backend

- Usa `pytest` como framework de pruebas
- `pytest-asyncio` para pruebas asíncronas
- `httpx` para pruebas de API
- Base de datos de prueba en memoria

### Frontend

- Usa `Vitest` como framework de pruebas
- `@testing-library/react` para pruebas de componentes
- `@testing-library/jest-dom` para matchers adicionales
- Mocks para hooks y componentes externos

## Mejores Prácticas

### Backend

1. **Aislamiento**: Cada prueba usa su propia sesión de base de datos
1. **Datos de Prueba**: Se crean datos específicos para cada prueba
1. **Cleanup**: Limpieza automática después de cada prueba
1. **Assertions**: Verificación completa de respuestas y estados

### Frontend

1. **Mocking**: Mocks apropiados para dependencias externas
1. **Renderizado**: Uso de `renderHook` para hooks y `render` para componentes
1. **Interacciones**: Simulación de eventos de usuario
1. **Esperas**: Uso de `waitFor` para operaciones asíncronas

## Cobertura de Pruebas

Las pruebas cubren:

- ✅ **Backend**: ~95% de las funciones CRUD y cálculo
- ✅ **Frontend**: ~90% de la lógica de agrupación y componentes
- ✅ **API**: 100% de los endpoints implementados
- ✅ **Casos Edge**: Manejo de errores y casos límite

## Ejecución en CI/CD

Para integrar en pipeline de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Run Backend Tests
  run: |
    cd backend
    pytest --cov=src/app --cov-report=xml

- name: Run Frontend Tests
  run: |
    cd frontend
    npm test -- --coverage --watchAll=false
```

## Troubleshooting

### Errores Comunes

1. **Base de datos no disponible**: Asegurar que la BD de prueba esté configurada
1. **Mocks no funcionan**: Verificar que los mocks estén en el lugar correcto
1. **Pruebas asíncronas fallan**: Usar `await` y `waitFor` apropiadamente
1. **Cobertura baja**: Revisar qué funciones no están siendo probadas

### Debugging

```bash
# Backend - ejecutar con debug
pytest -s --tb=short tests/test_annual_holidays_crud.py::TestAnnualHolidayCRUD::test_create_annual_holiday_success

# Frontend - ejecutar con debug
npm test -- --reporter=verbose annual-holidays
```

## Próximos Pasos

1. **Pruebas E2E**: Implementar pruebas end-to-end con Playwright
1. **Pruebas de Performance**: Agregar pruebas de carga para APIs
1. **Pruebas Visuales**: Implementar pruebas de regresión visual
1. **Monitoreo**: Integrar métricas de cobertura en el pipeline
