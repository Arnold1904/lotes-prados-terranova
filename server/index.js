import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createApiRouter } from './api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const publicPath = path.resolve(__dirname, '../public');

const app = express();

// 1. Rutas de la API REST + MySQL
app.use('/api', createApiRouter());

// 2. Archivos estáticos de producción (dist) y respaldo de public
if (existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '7d', index: false }));
}
if (existsSync(publicPath)) {
  app.use(express.static(publicPath, { maxAge: '7d', index: false }));
}

// 3. Evitar devolver HTML para assets estáticos faltantes (.jpg, .glb, .hdr, etc.)
app.use((req, res, next) => {
  if (/\.(jpg|jpeg|png|webp|svg|glb|gltf|hdr|css|js|ico|woff2?)$/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

// 4. Fallback SPA hacia index.html
app.get(/.*/, (_req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res.status(404).send('Ejecuta "npm run build" para generar la versión de producción.');
});

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor Prados de Terranova activo en http://0.0.0.0:${port}`);
});
