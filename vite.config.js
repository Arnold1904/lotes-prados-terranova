import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { createApiRouter } from './server/api.js';

function expressApiPlugin() {
  const apiApp = express();
  apiApp.use(createApiRouter());
  return {
    name: 'prados-terranova-mysql-api',
    configureServer(server) {
      server.middlewares.use('/api', apiApp);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', apiApp);
    },
  };
}

export default defineConfig({
  plugins: [react(), expressApiPlugin()],
  server: { port: 5173 },
});
