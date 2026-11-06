require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function buildDbConfig() {
  if (process.env.MYSQL_URL) {
    const parsed = new URL(process.env.MYSQL_URL);
    return {
      config: {
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        multipleStatements: true
      },
      dbName: parsed.pathname.replace(/^\//, '') || 'prados_terranova'
    };
  }
  return {
    config: {
      host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'root',
      multipleStatements: true
    },
    dbName: process.env.DB_NAME || process.env.MYSQLDATABASE || 'prados_terranova'
  };
}

const { config: DB_CONFIG, dbName: DB_NAME } = buildDbConfig();
const CENTER_LAT = parseFloat(process.env.PROJECT_CENTER_LAT || '4.862450');
const CENTER_LNG = parseFloat(process.env.PROJECT_CENTER_LNG || '-74.058320');

/**
 * Convierte metros (este, norte) desde el origen del proyecto a [lat, lng]
 */
function metersToLatLng(eastMeters, northMeters) {
  const latRad = (CENTER_LAT * Math.PI) / 180;
  const dLat = northMeters / 111320;
  const dLng = eastMeters / (111320 * Math.cos(latRad));
  return [
    Number((CENTER_LAT + dLat).toFixed(7)),
    Number((CENTER_LNG + dLng).toFixed(7))
  ];
}

/**
 * Genera la estructura base de los 38 lotes de 20m de frente x 30m de fondo = 600 m2
 * Todos en estado 'disponible' y sin datos comerciales ficticios.
 */
function generate38LotsData() {
  const lotes = [];
  const lotWidth = 20;  // 20 metros de frente
  const lotDepth = 30;  // 30 metros de fondo
  const lotGap = 2.5;

  const blocks = [
    { manzana: 'Manzana A', prefix: 'MA', count: 10, rowIdx: 0, baseNorth: 55, priceM2: 250000, orientacion: 'Norte', topo: 'Plano' },
    { manzana: 'Manzana B', prefix: 'MB', count: 10, rowIdx: 1, baseNorth: 12, priceM2: 250000, orientacion: 'Sur', topo: 'Plano' },
    { manzana: 'Manzana C', prefix: 'MC', count: 9,  rowIdx: 2, baseNorth: -32, priceM2: 250000, orientacion: 'Norte', topo: 'Plano' },
    { manzana: 'Manzana D', prefix: 'MD', count: 9,  rowIdx: 3, baseNorth: -75, priceM2: 250000, orientacion: 'Sur', topo: 'Plano' }
  ];

  let currentLotNumber = 1;

  for (const block of blocks) {
    const totalWidthMeters = block.count * lotWidth + (block.count - 1) * lotGap;
    const startEast = -totalWidthMeters / 2;

    for (let i = 0; i < block.count; i++) {
      const num = currentLotNumber;
      const paddedNum = String(num).padStart(2, '0');
      const codigo = `${block.prefix}-L${paddedNum}`;

      const eastMin = startEast + i * (lotWidth + lotGap);
      const eastMax = eastMin + lotWidth;
      const northMin = block.baseNorth;
      const northMax = northMin + lotDepth;

      const sw = metersToLatLng(eastMin, northMin);
      const se = metersToLatLng(eastMax, northMin);
      const ne = metersToLatLng(eastMax, northMax);
      const nw = metersToLatLng(eastMin, northMax);
      const center = metersToLatLng((eastMin + eastMax) / 2, (northMin + northMax) / 2);

      const precioM2 = block.priceM2;
      const areaM2 = 600.00;
      const precioTotal = areaM2 * precioM2;

      const linderoNorte = '20.00m con Vía Interna';
      const linderoSur = '20.00m con Franja del Proyecto';
      const linderoOccidente = i === 0
        ? '30.00m con Límite de Manzana'
        : `30.00m con Lote ${String(num - 1).padStart(2, '0')} (${block.manzana})`;
      const linderoOriente = i === block.count - 1
        ? '30.00m con Límite de Manzana'
        : `30.00m con Lote ${String(num + 1).padStart(2, '0')} (${block.manzana})`;

      const geojson = {
        type: 'Polygon',
        dimensions: { front: 20, depth: 30, area: 600 },
        coordinates: [sw, se, ne, nw]
      };

      const renderConfig = {
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
        estimatedHouseCost: 0
      };

      lotes.push({
        numero_lote: num,
        codigo,
        manzana: block.manzana,
        frente_m: 20.00,
        fondo_m: 30.00,
        area_m2: 600.00,
        precio_m2: precioM2,
        precio_total: precioTotal,
        estado: 'disponible',
        topografia: block.topo,
        orientacion: block.orientacion,
        servicios_agua: 1,
        servicios_energia: 1,
        servicios_fibra: 1,
        via_acceso: 'Vía interna',
        lindero_norte: linderoNorte,
        lindero_sur: linderoSur,
        lindero_oriente: linderoOriente,
        lindero_occidente: linderoOccidente,
        matricula_inmobiliaria: '',
        latitud: center[0],
        longitud: center[1],
        coordenadas_geojson: JSON.stringify(geojson),
        render_config: JSON.stringify(renderConfig),
        descripcion: `Lote ${ paddedNum } (${block.manzana}) de 20.00m x 30.00m = 600.00 m².`
      });

      currentLotNumber++;
    }
  }

  return lotes;
}

async function initializeDatabase(forceClean = false) {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    const schemaPath = path.join(__dirname, 'schema.sql');
    const rawSchemaSql = fs.readFileSync(schemaPath, 'utf8');
    const schemaSql = rawSchemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS prados_terranova/g, `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
      .replace(/USE prados_terranova;/g, `USE \`${DB_NAME}\`;`);

    await connection.query(schemaSql);
    await connection.query(`USE \`${DB_NAME}\`;`);

    if (forceClean) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      await connection.query('TRUNCATE TABLE movimientos_contables;');
      await connection.query('TRUNCATE TABLE abonos;');
      await connection.query('TRUNCATE TABLE ventas;');
      await connection.query('TRUNCATE TABLE clientes;');
      await connection.query('TRUNCATE TABLE lotes;');
      await connection.query('TRUNCATE TABLE usuarios;');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    }

    // 1. Usuario administrador base para el Login
    const [existingUsers] = await connection.query('SELECT COUNT(*) AS count FROM usuarios');
    if (existingUsers[0].count === 0) {
      await connection.query(
        `INSERT INTO usuarios (username, email, password_hash, nombre_completo, cargo, rol) VALUES
        ('admin', 'admin@localhost', 'admin123', 'Administrador', 'Administración General', 'admin')`
      );
    }

    // 2. Crear los 38 lotes de 600 m² todos disponibles y sin registros ficticios
    const [existingLots] = await connection.query('SELECT COUNT(*) AS count FROM lotes');
    if (existingLots[0].count !== 38) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      await connection.query('TRUNCATE TABLE lotes;');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

      const lotesData = generate38LotsData();
      for (const l of lotesData) {
        await connection.query(
          `INSERT INTO lotes (
            numero_lote, codigo, manzana, frente_m, fondo_m, area_m2, precio_m2, precio_total,
            estado, topografia, orientacion, servicios_agua, servicios_energia, servicios_fibra,
            via_acceso, lindero_norte, lindero_sur, lindero_oriente, lindero_occidente,
            matricula_inmobiliaria, latitud, longitud, coordenadas_geojson, render_config, descripcion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            l.numero_lote, l.codigo, l.manzana, l.frente_m, l.fondo_m, l.area_m2, l.precio_m2, l.precio_total,
            l.estado, l.topografia, l.orientacion, l.servicios_agua, l.servicios_energia, l.servicios_fibra,
            l.via_acceso, l.lindero_norte, l.lindero_sur, l.lindero_oriente, l.lindero_occidente,
            l.matricula_inmobiliaria, l.latitud, l.longitud, l.coordenadas_geojson, l.render_config, l.descripcion
          ]
        );
      }
    }

    await connection.end();
    return { ok: true, database: DB_NAME };
  } catch (error) {
    if (connection) await connection.end();
    throw error;
  }
}

if (require.main === module) {
  const cleanFlag = process.argv.includes('--clean');
  initializeDatabase(cleanFlag)
    .then((res) => {
      console.log(`Base de datos '${res.database}' lista y sin información ficticia (38 lotes de 20x30m = 600 m² disponibles).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error inicializando base de datos:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
