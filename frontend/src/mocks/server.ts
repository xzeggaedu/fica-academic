/**
 * Mock Service Worker - Server para Node.js
 * Este servidor se usa en las pruebas unitarias para interceptar llamadas HTTP
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Configurar el servidor MSW con los handlers definidos
export const server = setupServer(...handlers);
