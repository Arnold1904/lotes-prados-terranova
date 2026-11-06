import express from 'express';
import dotenv from 'dotenv';
import { createApiRouter } from './api.js';

dotenv.config();

const app = express();
app.use('/api', createApiRouter());

const port = Number(process.env.API_PORT || 3001);
app.listen(port, () => {
  console.log(`API Prados de Terranova conectada a MySQL en http://localhost:${port}/api`);
});
