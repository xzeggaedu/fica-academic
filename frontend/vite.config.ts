import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://fica_api:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      // '/devtools': TEMPORALLY DISABLED
      //   target: 'http://devtools:5001',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/devtools/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('error', (err, _req, _res) => {
      //       console.log('devtools proxy error', err);
      //     });
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log('Sending DevTools Request:', req.method, req.url);
      //       // Configurar headers como en nginx
      //       proxyReq.setHeader('Host', 'devtools.local');
      //       proxyReq.setHeader('X-Real-IP', req.headers['x-real-ip'] || req.connection.remoteAddress || '');
      //       proxyReq.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] || req.connection.remoteAddress || '');
      //       proxyReq.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto'] || 'http');
      //     });
      //     proxy.on('proxyRes', (proxyRes, req, _res) => {
      //       console.log('Received DevTools Response:', proxyRes.statusCode, req.url);
      //     });
      //   },
      // },

    },
  },
  // DevTools habilitado para desarrollo
  define: {
    __REFINE_DEVTOOLS_PORT__: JSON.stringify(null),
  },
});
