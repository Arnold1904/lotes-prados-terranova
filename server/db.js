import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  computeLoteoGeometry,
  DEFAULT_LOTEO_CONFIG,
  INITIAL_SOLD_LOTS,
} from '../src/utils/lotGeometry.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'prados_terranova',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

let initialized = false;

export async function initDatabase() {
  if (initialized) return;

  // Asegurar base de datos
  const rootConn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await rootConn.end();

  // Crear tabla de configuración satelital del loteo si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracion_loteo (
      id INT NOT NULL PRIMARY KEY DEFAULT 1,
      nombre_proyecto VARCHAR(150) NOT NULL DEFAULT 'Condominio Campestre Prados de Terranova',
      ubicacion_texto VARCHAR(220) NOT NULL DEFAULT 'Kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal',
      center_lat DECIMAL(10,7) NOT NULL DEFAULT 5.2881652,
      center_lng DECIMAL(10,7) NOT NULL DEFAULT -72.4658304,
      rotation_deg DECIMAL(6,2) NOT NULL DEFAULT -16.50,
      default_front_m DECIMAL(8,2) NOT NULL DEFAULT 20.00,
      default_depth_m DECIMAL(8,2) NOT NULL DEFAULT 30.00,
      gap_lotes_m DECIMAL(6,2) NOT NULL DEFAULT 0.00,
      road_internal_m DECIMAL(6,2) NOT NULL DEFAULT 9.00,
      road_main_m DECIMAL(6,2) NOT NULL DEFAULT 9.00,
      perimeter_pad_m DECIMAL(6,2) NOT NULL DEFAULT 8.00,
      default_precio_m2 DECIMAL(14,2) NOT NULL DEFAULT 250000.00,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [cfgRows] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');

  if (cfgRows.length === 0) {
    await pool.query(
      `INSERT INTO configuracion_loteo
        (id, nombre_proyecto, ubicacion_texto, center_lat, center_lng, rotation_deg, default_front_m, default_depth_m, gap_lotes_m, road_internal_m, road_main_m, perimeter_pad_m, default_precio_m2)
       VALUES (1, ?, ?, ?, ?, ?, 20, 30, 0, 9, 9, 8, 250000)`,
      [
        process.env.VITE_PROJECT_NAME || 'Condominio Campestre Prados de Terranova',
        process.env.VITE_PROJECT_LOCATION || 'Kilómetro 7 Vía Yopal - Aguazul, Casanare',
        DEFAULT_LOTEO_CONFIG.center_lat,
        DEFAULT_LOTEO_CONFIG.center_lng,
        DEFAULT_LOTEO_CONFIG.rotation_deg,
      ]
    );
  }

  // Sincronizar configuración y geometría de los 38 lotes con el diseño oficial de Prados de Terranova
  // (Anclado sobre las vías reales de Google Maps y la casa construida en el Lote 25)
  const [[currentCfg]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
  const [lotes] = await pool.query('SELECT * FROM lotes ORDER BY numero_lote ASC');

  const needsMasterPlanSync =
    !currentCfg ||
    Math.abs(Number(currentCfg.center_lat) - DEFAULT_LOTEO_CONFIG.center_lat) > 0.00002 ||
    Math.abs(Number(currentCfg.rotation_deg) - DEFAULT_LOTEO_CONFIG.rotation_deg) > 0.2 ||
    Number(currentCfg.gap_lotes_m) !== 0;

  if (needsMasterPlanSync) {
    await pool.query(
      `UPDATE configuracion_loteo
       SET ubicacion_texto = 'Kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal',
           center_lat = ?,
           center_lng = ?,
           rotation_deg = ?,
           default_front_m = 20.00,
           default_depth_m = 30.00,
           gap_lotes_m = 0.00,
           road_internal_m = 9.00,
           road_main_m = 9.00,
           perimeter_pad_m = 8.00
       WHERE id = 1`,
      [
        DEFAULT_LOTEO_CONFIG.center_lat,
        DEFAULT_LOTEO_CONFIG.center_lng,
        DEFAULT_LOTEO_CONFIG.rotation_deg,
      ]
    );

    const [[updatedCfg]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
    const cleanLots = lotes.map((l) => ({
      ...l,
      frente_m: 20,
      fondo_m: 30,
      area_m2: 600,
      coordenadas_geojson: { customOffset: { dx: 0, dy: 0 }, customSize: false },
    }));

    const computed = computeLoteoGeometry(updatedCfg, cleanLots);

    // Verificar qué lotes tienen contratos activos en la tabla ventas
    const [activeSales] = await pool.query(
      "SELECT lote_id, modalidad FROM ventas WHERE estado != 'cancelada'"
    );
    const saleByLotId = new Map();
    for (const s of activeSales) {
      saleByLotId.set(Number(s.lote_id), s.modalidad);
    }

    for (const lot of computed.lots) {
      let estado = 'disponible';
      if (saleByLotId.has(Number(lot.id))) {
        estado = saleByLotId.get(Number(lot.id)) === 'reserva' ? 'reservado' : 'vendido';
      } else if (INITIAL_SOLD_LOTS.has(Number(lot.numero_lote))) {
        estado = 'vendido';
      }

      const desc = `Lote ${String(lot.numero_lote).padStart(2, '0')} (${lot.manzana}) de 20m x 30m = 600 m².`;
      await pool.query(
        `UPDATE lotes
         SET codigo = ?,
             manzana = ?,
             frente_m = ?,
             fondo_m = ?,
             area_m2 = ?,
             precio_total = ?,
             estado = ?,
             lindero_norte = ?,
             lindero_sur = ?,
             lindero_oriente = ?,
             lindero_occidente = ?,
             descripcion = ?,
             latitud = ?,
             longitud = ?,
             coordenadas_geojson = ?
         WHERE numero_lote = ?`,
        [
          lot.codigo,
          lot.manzana,
          lot.frente_m,
          lot.fondo_m,
          lot.area_m2,
          lot.precio_total,
          estado,
          lot.lindero_norte,
          lot.lindero_sur,
          lot.lindero_oriente,
          lot.lindero_occidente,
          desc,
          lot.latitud,
          lot.longitud,
          JSON.stringify(lot.coordenadas_geojson),
          lot.numero_lote,
        ]
      );
    }
  }

  initialized = true;
}
