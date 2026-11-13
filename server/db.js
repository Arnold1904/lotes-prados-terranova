import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  computeLoteoGeometry,
  DEFAULT_LOTEO_CONFIG,
  INITIAL_SOLD_LOTS,
} from '../src/utils/lotGeometry.js';

dotenv.config();

function resolveDbConfig() {
  const urlStr = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;
  if (urlStr) {
    try {
      const parsed = new URL(urlStr);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, '') || process.env.MYSQLDATABASE || 'prados_terranova',
      };
    } catch (e) {
      console.warn('Error parsing MYSQL_URL:', e.message);
    }
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'root',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'prados_terranova',
  };
}

const resolved = resolveDbConfig();

const dbConfig = {
  ...resolved,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

let initialized = false;

export async function initDatabase() {
  if (initialized) return;

  // Asegurar que la base de datos exista (si el usuario tiene permisos para crearla)
  try {
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
  } catch (err) {
    // En entornos gestionados como Railway la BD ya existe y puede restringirse CREATE DATABASE
    console.warn('Aviso al verificar CREATE DATABASE:', err.message);
  }

  // 1. Tabla de Usuarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(60) NOT NULL UNIQUE,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nombre_completo VARCHAR(150) NOT NULL,
      cargo VARCHAR(100) DEFAULT 'Director Comercial',
      rol ENUM('admin', 'asesor', 'contador') DEFAULT 'admin',
      ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Tabla de Lotes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero_lote INT NOT NULL UNIQUE,
      codigo VARCHAR(30) NOT NULL UNIQUE,
      manzana VARCHAR(30) NOT NULL,
      frente_m DECIMAL(8,2) NOT NULL DEFAULT 20.00,
      fondo_m DECIMAL(8,2) NOT NULL DEFAULT 30.00,
      area_m2 DECIMAL(10,2) NOT NULL DEFAULT 600.00,
      precio_m2 DECIMAL(14,2) NOT NULL DEFAULT 250000.00,
      precio_total DECIMAL(16,2) NOT NULL DEFAULT 150000000.00,
      estado ENUM('disponible', 'reservado', 'vendido') DEFAULT 'disponible',
      topografia VARCHAR(80) DEFAULT 'Plano Campestre (Pendiente < 3%)',
      orientacion VARCHAR(60) DEFAULT 'Nororiente - Vista Montaña',
      servicios_agua TINYINT(1) DEFAULT 1,
      servicios_energia TINYINT(1) DEFAULT 1,
      servicios_fibra TINYINT(1) DEFAULT 1,
      via_acceso VARCHAR(100) DEFAULT 'Vía adoquinada ecológica 8m con cuneta verde',
      lindero_norte VARCHAR(160) DEFAULT NULL,
      lindero_sur VARCHAR(160) DEFAULT NULL,
      lindero_oriente VARCHAR(160) DEFAULT NULL,
      lindero_occidente VARCHAR(160) DEFAULT NULL,
      matricula_inmobiliaria VARCHAR(60) DEFAULT NULL,
      latitud DECIMAL(10,7) NOT NULL,
      longitud DECIMAL(10,7) NOT NULL,
      coordenadas_geojson JSON NOT NULL,
      render_config JSON NOT NULL,
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Tabla de Clientes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      documento VARCHAR(50) NOT NULL UNIQUE,
      telefono VARCHAR(50) NOT NULL,
      correo VARCHAR(120) DEFAULT NULL,
      ciudad VARCHAR(80) DEFAULT 'Yopal',
      direccion VARCHAR(180) DEFAULT NULL,
      ocupacion VARCHAR(100) DEFAULT NULL,
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Tabla de Ventas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo_contrato VARCHAR(50) NOT NULL UNIQUE,
      lote_id INT NOT NULL,
      cliente_id INT NOT NULL,
      modalidad ENUM('contado', 'financiado', 'reserva') DEFAULT 'financiado',
      incluye_casa_3d TINYINT(1) DEFAULT 0,
      modelo_casa VARCHAR(80) DEFAULT 'Solo Lote 600m²',
      valor_lote DECIMAL(16,2) NOT NULL,
      valor_casa_3d DECIMAL(16,2) DEFAULT 0.00,
      descuento DECIMAL(16,2) DEFAULT 0.00,
      valor_total_venta DECIMAL(16,2) NOT NULL,
      cuota_inicial DECIMAL(16,2) DEFAULT 0.00,
      numero_cuotas INT DEFAULT 1,
      tasa_interes_mensual DECIMAL(5,2) DEFAULT 0.00,
      valor_cuota_mensual DECIMAL(16,2) DEFAULT 0.00,
      total_abonado DECIMAL(16,2) DEFAULT 0.00,
      saldo_pendiente DECIMAL(16,2) NOT NULL,
      asesor_comercial VARCHAR(120) DEFAULT 'Administración Terranova',
      comision_porcentaje DECIMAL(5,2) DEFAULT 3.00,
      valor_comision DECIMAL(16,2) DEFAULT 0.00,
      fecha_venta DATE NOT NULL,
      fecha_proximo_pago DATE DEFAULT NULL,
      estado ENUM('activa', 'pagada', 'mora', 'cancelada') DEFAULT 'activa',
      observaciones TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_venta_lote FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE,
      CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Tabla de Abonos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS abonos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo_recibo VARCHAR(50) NOT NULL UNIQUE,
      venta_id INT NOT NULL,
      lote_id INT NOT NULL,
      numero_cuota INT DEFAULT 1,
      fecha_abono DATE NOT NULL,
      monto DECIMAL(16,2) NOT NULL,
      metodo_pago ENUM('Transferencia Bancaria', 'Consignación', 'Efectivo', 'Cheque Gerencia', 'PSE') DEFAULT 'Transferencia Bancaria',
      referencia_pago VARCHAR(100) DEFAULT NULL,
      saldo_anterior DECIMAL(16,2) NOT NULL,
      nuevo_saldo DECIMAL(16,2) NOT NULL,
      proximo_pago DATE DEFAULT NULL,
      concepto VARCHAR(200) DEFAULT 'Abono a capital de lote campestre',
      observacion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_abono_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
      CONSTRAINT fk_abono_lote FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Tabla de Movimientos Contables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movimientos_contables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo_asiento VARCHAR(50) NOT NULL UNIQUE,
      fecha DATE NOT NULL,
      tipo ENUM('INGRESO', 'EGRESO') NOT NULL,
      categoria ENUM(
        'VENTA_INICIAL',
        'ABONO_CARTERA',
        'RESERVA_LOTE',
        'CONSTRUCCION_CASA_3D',
        'URBANISMO_VIAS',
        'RED_ELECTRICA_ACUEDUCTO',
        'TOPOGRAFIA_LICENCIAS',
        'COMISIONES_VENTAS',
        'MARKETING_PUBLICIDAD',
        'GASTOS_LEGALES_NOTARIA',
        'MANTENIMIENTO_PORTERIA',
        'OTROS'
      ) NOT NULL,
      lote_id INT DEFAULT NULL,
      venta_id INT DEFAULT NULL,
      tercero VARCHAR(150) NOT NULL,
      documento_tercero VARCHAR(50) DEFAULT NULL,
      concepto VARCHAR(255) NOT NULL,
      metodo_pago VARCHAR(80) DEFAULT 'Transferencia Bancaria',
      comprobante VARCHAR(80) DEFAULT NULL,
      monto DECIMAL(16,2) NOT NULL,
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mov_lote FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE SET NULL,
      CONSTRAINT fk_mov_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Tabla de Configuración Satelital del Loteo
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
      default_precio_m2 DECIMAL(14,2) NOT NULL DEFAULT 150000.00,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Asegurar usuario administrador por defecto
  const [[userCount]] = await pool.query('SELECT COUNT(*) AS count FROM usuarios');
  if (Number(userCount.count) === 0) {
    await pool.query(
      `INSERT INTO usuarios (username, email, password_hash, nombre_completo, cargo, rol)
       VALUES ('admin', 'admin@localhost', 'admin123', 'Administrador', 'Administración General', 'admin')`
    );
  }

  // Asegurar configuración base del loteo
  const [cfgRows] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
  if (cfgRows.length === 0) {
    await pool.query(
      `INSERT INTO configuracion_loteo
        (id, nombre_proyecto, ubicacion_texto, center_lat, center_lng, rotation_deg, default_front_m, default_depth_m, gap_lotes_m, road_internal_m, road_main_m, perimeter_pad_m, default_precio_m2)
       VALUES (1, ?, ?, ?, ?, ?, 20, 30, 0, 9, 9, 8, 150000)`,
      [
        process.env.VITE_PROJECT_NAME || 'Condominio Campestre Prados de Terranova',
        process.env.VITE_PROJECT_LOCATION || 'Kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal',
        DEFAULT_LOTEO_CONFIG.center_lat,
        DEFAULT_LOTEO_CONFIG.center_lng,
        DEFAULT_LOTEO_CONFIG.rotation_deg,
      ]
    );
  }

  // Sembrar los 38 lotes si la tabla lotes está vacía
  const [[lotCount]] = await pool.query('SELECT COUNT(*) AS count FROM lotes');
  if (Number(lotCount.count) < 38) {
    const [[cfg]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
    const computedSeed = computeLoteoGeometry(cfg || DEFAULT_LOTEO_CONFIG, []);
    const renderConfig = JSON.stringify({
      model: 'villa_terranova_1p',
      floors: 1,
      builtAreaM2: 145,
      facadeColor: '#F4F1EA',
      roofColor: '#263238',
      hasPool: true,
      hasPergola: true,
      hasGarage: true,
      hasSolarPanels: false,
      sunHour: 15.5,
      estimatedHouseCost: 0,
    });

    for (const lot of computedSeed.lots) {
      const estado = INITIAL_SOLD_LOTS.has(Number(lot.numero_lote)) ? 'vendido' : 'disponible';
      const desc = `Lote ${String(lot.numero_lote).padStart(2, '0')} (${lot.manzana}) de 20m x 30m = 600 m².`;
      await pool.query(
        `INSERT IGNORE INTO lotes (
          numero_lote, codigo, manzana, frente_m, fondo_m, area_m2, precio_m2, precio_total,
          estado, topografia, orientacion, servicios_agua, servicios_energia, servicios_fibra,
          via_acceso, lindero_norte, lindero_sur, lindero_oriente, lindero_occidente,
          matricula_inmobiliaria, latitud, longitud, coordenadas_geojson, render_config, descripcion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Plano', 'Norte-Sur', 1, 1, 1, 'Vía interna 9m', ?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
        [
          lot.numero_lote,
          lot.codigo,
          lot.manzana,
          lot.frente_m,
          lot.fondo_m,
          lot.area_m2,
          lot.precio_m2,
          lot.precio_total,
          estado,
          lot.lindero_norte,
          lot.lindero_sur,
          lot.lindero_oriente,
          lot.lindero_occidente,
          lot.latitud,
          lot.longitud,
          JSON.stringify(lot.coordenadas_geojson),
          renderConfig,
          desc,
        ]
      );
    }
  }

  // Sincronizar configuración y geometría de los 38 lotes con el diseño oficial de Prados de Terranova
  const [[currentCfg]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
  const [lotes] = await pool.query('SELECT * FROM lotes ORDER BY numero_lote ASC');

  // Actualizar los estados (V / R) y precios según las directrices oficiales
  // Lotes 1, 2, 3: $80.000.000 COP. Lotes 4-38: $90.000.000 COP
  const [activeSales] = await pool.query(
    "SELECT lote_id, modalidad FROM ventas WHERE estado != 'cancelada'"
  );
  const saleByLotId = new Map();
  for (const s of activeSales) {
    saleByLotId.set(Number(s.lote_id), s.modalidad);
  }

  for (const l of lotes) {
    const num = Number(l.numero_lote);
    let nuevoEstado = INITIAL_SOLD_LOTS.has(num) ? 'vendido' : 'disponible';
    if (saleByLotId.has(Number(l.id))) {
      nuevoEstado = saleByLotId.get(Number(l.id)) === 'reserva' ? 'reservado' : 'vendido';
    }

    const precioObjetivo = num <= 3 ? 80000000 : (Number(l.precio_total) === 150000000 || !l.precio_total ? 90000000 : Number(l.precio_total));
    const precioM2Objetivo = Number((precioObjetivo / 600).toFixed(2));

    await pool.query(
      `UPDATE lotes
       SET estado = ?,
           precio_total = ?,
           precio_m2 = ?
       WHERE id = ?`,
      [nuevoEstado, precioObjetivo, precioM2Objetivo, l.id]
    );
  }

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
