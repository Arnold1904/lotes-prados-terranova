require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const { initializeDatabase } = require('./database/init-db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool(
  process.env.MYSQL_URL || {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'root',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'prados_terranova',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
);

function parseJsonColumn(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

// ==========================================
// 1. CONFIGURACIÓN PÚBLICA Y RESUMEN LANDING
// ==========================================
app.get('/api/config', (req, res) => {
  res.json({
    projectName: 'Prados de Terranova',
    totalLots: 38,
    lotDimensions: { front: 20, depth: 30, area: 600 },
    centerLat: parseFloat(process.env.PROJECT_CENTER_LAT || '4.862450'),
    centerLng: parseFloat(process.env.PROJECT_CENTER_LNG || '-74.058320'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

app.get('/api/public/resumen', async (req, res) => {
  try {
    const [lotesRows] = await pool.query(`
      SELECT id, numero_lote, codigo, manzana, frente_m, fondo_m, area_m2,
             precio_m2, precio_total, estado, topografia, orientacion,
             latitud, longitud, coordenadas_geojson, render_config, descripcion
      FROM lotes
      ORDER BY numero_lote ASC
    `);

    const lotes = lotesRows.map((l) => ({
      ...l,
      frente_m: Number(l.frente_m),
      fondo_m: Number(l.fondo_m),
      area_m2: Number(l.area_m2),
      precio_m2: Number(l.precio_m2),
      precio_total: Number(l.precio_total),
      latitud: Number(l.latitud),
      longitud: Number(l.longitud),
      coordenadas_geojson: parseJsonColumn(l.coordenadas_geojson),
      render_config: parseJsonColumn(l.render_config)
    }));

    const stats = {
      total: lotes.length,
      disponibles: lotes.filter((l) => l.estado === 'disponible').length,
      reservados: lotes.filter((l) => l.estado === 'reservado').length,
      vendidos: lotes.filter((l) => l.estado === 'vendido').length,
      areaTotalM2: lotes.length * 600,
      precioDesde: Math.min(...lotes.map((l) => l.precio_total))
    };

    res.json({ stats, lotes });
  } catch (error) {
    console.error('Error en /api/public/resumen:', error);
    res.status(500).json({ error: 'Error consultando resumen de lotes' });
  }
});

// ==========================================
// 2. AUTENTICACIÓN / LOGIN
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Ingresa tu usuario/correo y contraseña.' });
    }

    const [rows] = await pool.query(
      `SELECT id, username, email, password_hash, nombre_completo, cargo, rol
       FROM usuarios
       WHERE (username = ? OR email = ?) AND password_hash = ?
       LIMIT 1`,
      [identifier.trim(), identifier.trim(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica usuario y contraseña.' });
    }

    const user = rows[0];
    await pool.query('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      ok: true,
      token: `terranova-session-${user.id}-${Date.now()}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre_completo: user.nombre_completo,
        cargo: user.cargo,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación.' });
  }
});

// ==========================================
// 3. DASHBOARD EJECUTIVO Y CONTABLE
// ==========================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const [loteStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_lotes,
        SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) AS disponibles,
        SUM(CASE WHEN estado = 'reservado' THEN 1 ELSE 0 END) AS reservados,
        SUM(CASE WHEN estado = 'vendido' THEN 1 ELSE 0 END) AS vendidos,
        SUM(area_m2) AS area_total_m2,
        SUM(precio_total) AS valor_inventario_lotes,
        SUM(CASE WHEN estado = 'disponible' THEN precio_total ELSE 0 END) AS valor_disponible
      FROM lotes
    `);

    const [ventaStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_contratos,
        COALESCE(SUM(valor_total_venta), 0) AS total_ventas_cerradas,
        COALESCE(SUM(total_abonado), 0) AS total_recaudado_cartera,
        COALESCE(SUM(saldo_pendiente), 0) AS total_cartera_pendiente,
        COALESCE(SUM(valor_comision), 0) AS total_comisiones
      FROM ventas
      WHERE estado != 'cancelada'
    `);

    const [contableStats] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos
      FROM movimientos_contables
    `);

    const [porManzana] = await pool.query(`
      SELECT
        manzana,
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) AS disponibles,
        SUM(CASE WHEN estado = 'reservado' THEN 1 ELSE 0 END) AS reservados,
        SUM(CASE WHEN estado = 'vendido' THEN 1 ELSE 0 END) AS vendidos,
        SUM(precio_total) AS valor_manzana
      FROM lotes
      GROUP BY manzana
      ORDER BY manzana ASC
    `);

    const [ultimosMovimientos] = await pool.query(`
      SELECT m.*, l.codigo AS lote_codigo
      FROM movimientos_contables m
      LEFT JOIN lotes l ON m.lote_id = l.id
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT 8
    `);

    const [proximosCobros] = await pool.query(`
      SELECT v.id, v.codigo_contrato, v.fecha_proximo_pago, v.valor_cuota_mensual,
             v.saldo_pendiente, l.codigo AS lote_codigo, c.nombre AS cliente_nombre, c.telefono
      FROM ventas v
      JOIN lotes l ON v.lote_id = l.id
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.saldo_pendiente > 0 AND v.estado = 'activa'
      ORDER BY v.fecha_proximo_pago ASC
      LIMIT 8
    `);

    const ls = loteStats[0];
    const vs = ventaStats[0];
    const cs = contableStats[0];

    res.json({
      lotes: {
        total: Number(ls.total_lotes),
        disponibles: Number(ls.disponibles),
        reservados: Number(ls.reservados),
        vendidos: Number(ls.vendidos),
        areaTotalM2: Number(ls.area_total_m2),
        valorInventario: Number(ls.valor_inventario_lotes),
        valorDisponible: Number(ls.valor_disponible)
      },
      finanzas: {
        totalContratos: Number(vs.total_contratos),
        totalVentasCerradas: Number(vs.total_ventas_cerradas),
        totalRecaudadoCartera: Number(vs.total_recaudado_cartera),
        totalCarteraPendiente: Number(vs.total_cartera_pendiente),
        totalIngresos: Number(cs.total_ingresos),
        totalEgresos: Number(cs.total_egresos),
        flujoCajaNeto: Number(cs.total_ingresos) - Number(cs.total_egresos)
      },
      porManzana,
      ultimosMovimientos,
      proximosCobros
    });
  } catch (error) {
    console.error('Error en /api/dashboard:', error);
    res.status(500).json({ error: 'Error cargando métricas del dashboard.' });
  }
});

// ==========================================
// 4. GESTIÓN DE LOS 38 LOTES Y RENDER 3D
// ==========================================
app.get('/api/lotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        l.*,
        v.id AS venta_id,
        v.codigo_contrato,
        v.modalidad,
        v.incluye_casa_3d,
        v.modelo_casa,
        v.valor_total_venta,
        v.total_abonado,
        v.saldo_pendiente,
        v.valor_cuota_mensual,
        v.numero_cuotas,
        v.fecha_venta,
        v.fecha_proximo_pago,
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.documento AS cliente_documento,
        c.telefono AS cliente_telefono,
        c.correo AS cliente_correo
      FROM lotes l
      LEFT JOIN ventas v ON v.lote_id = l.id AND v.estado != 'cancelada'
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY l.numero_lote ASC
    `);

    const formatted = rows.map((r) => ({
      ...r,
      frente_m: Number(r.frente_m),
      fondo_m: Number(r.fondo_m),
      area_m2: Number(r.area_m2),
      precio_m2: Number(r.precio_m2),
      precio_total: Number(r.precio_total),
      latitud: Number(r.latitud),
      longitud: Number(r.longitud),
      valor_total_venta: r.valor_total_venta ? Number(r.valor_total_venta) : null,
      total_abonado: r.total_abonado ? Number(r.total_abonado) : 0,
      saldo_pendiente: r.saldo_pendiente ? Number(r.saldo_pendiente) : 0,
      coordenadas_geojson: parseJsonColumn(r.coordenadas_geojson),
      render_config: parseJsonColumn(r.render_config)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error en GET /api/lotes:', error);
    res.status(500).json({ error: 'Error obteniendo los 38 lotes.' });
  }
});

app.get('/api/lotes/:id', async (req, res) => {
  try {
    const loteId = Number(req.params.id);
    const [loteRows] = await pool.query(
      `SELECT l.*,
              v.id AS venta_id, v.codigo_contrato, v.modalidad, v.incluye_casa_3d, v.modelo_casa,
              v.valor_lote, v.valor_casa_3d, v.descuento, v.valor_total_venta, v.cuota_inicial,
              v.numero_cuotas, v.valor_cuota_mensual, v.total_abonado, v.saldo_pendiente,
              v.asesor_comercial, v.fecha_venta, v.fecha_proximo_pago, v.estado AS venta_estado, v.observaciones AS venta_obs,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.documento AS cliente_documento,
              c.telefono AS cliente_telefono, c.correo AS cliente_correo, c.ciudad AS cliente_ciudad
       FROM lotes l
       LEFT JOIN ventas v ON v.lote_id = l.id AND v.estado != 'cancelada'
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE l.id = ?`,
      [loteId]
    );

    if (loteRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado.' });
    }

    const lote = loteRows[0];
    lote.frente_m = Number(lote.frente_m);
    lote.fondo_m = Number(lote.fondo_m);
    lote.area_m2 = Number(lote.area_m2);
    lote.precio_m2 = Number(lote.precio_m2);
    lote.precio_total = Number(lote.precio_total);
    lote.coordenadas_geojson = parseJsonColumn(lote.coordenadas_geojson);
    lote.render_config = parseJsonColumn(lote.render_config);

    const [abonos] = await pool.query(
      'SELECT * FROM abonos WHERE lote_id = ? ORDER BY fecha_abono DESC, id DESC',
      [loteId]
    );

    const [movimientos] = await pool.query(
      'SELECT * FROM movimientos_contables WHERE lote_id = ? ORDER BY fecha DESC, id DESC',
      [loteId]
    );

    res.json({
      lote,
      abonos,
      movimientos
    });
  } catch (error) {
    console.error('Error en GET /api/lotes/:id:', error);
    res.status(500).json({ error: 'Error consultando el expediente del lote.' });
  }
});

app.put('/api/lotes/:id', async (req, res) => {
  try {
    const loteId = Number(req.params.id);
    const {
      precio_m2,
      estado,
      topografia,
      orientacion,
      via_acceso,
      lindero_norte,
      lindero_sur,
      lindero_oriente,
      lindero_occidente,
      descripcion,
      render_config
    } = req.body;

    const [currentRows] = await pool.query('SELECT * FROM lotes WHERE id = ?', [loteId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado.' });
    }

    const current = currentRows[0];
    const nuevoPrecioM2 = precio_m2 !== undefined ? Number(precio_m2) : Number(current.precio_m2);
    const nuevoPrecioTotal = Number(current.area_m2) * nuevoPrecioM2;
    const nuevoEstado = estado || current.estado;
    const nuevoRenderConfig = render_config
      ? JSON.stringify(render_config)
      : (typeof current.render_config === 'string' ? current.render_config : JSON.stringify(current.render_config));

    await pool.query(
      `UPDATE lotes SET
        precio_m2 = ?,
        precio_total = ?,
        estado = ?,
        topografia = ?,
        orientacion = ?,
        via_acceso = ?,
        lindero_norte = ?,
        lindero_sur = ?,
        lindero_oriente = ?,
        lindero_occidente = ?,
        descripcion = ?,
        render_config = ?
       WHERE id = ?`,
      [
        nuevoPrecioM2,
        nuevoPrecioTotal,
        nuevoEstado,
        topografia ?? current.topografia,
        orientacion ?? current.orientacion,
        via_acceso ?? current.via_acceso,
        lindero_norte ?? current.lindero_norte,
        lindero_sur ?? current.lindero_sur,
        lindero_oriente ?? current.lindero_oriente,
        lindero_occidente ?? current.lindero_occidente,
        descripcion ?? current.descripcion,
        nuevoRenderConfig,
        loteId
      ]
    );

    res.json({ ok: true, message: `Lote ${current.codigo} actualizado en MySQL.` });
  } catch (error) {
    console.error('Error en PUT /api/lotes/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el lote.' });
  }
});

// ==========================================
// 5. CLIENTES / PROPIETARIOS
// ==========================================
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
             COUNT(v.id) AS lotes_adquiridos,
             COALESCE(SUM(v.valor_total_venta), 0) AS inversion_total,
             COALESCE(SUM(v.saldo_pendiente), 0) AS deuda_actual,
             GROUP_CONCAT(l.codigo SEPARATOR ', ') AS codigos_lotes
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado != 'cancelada'
      LEFT JOIN lotes l ON v.lote_id = l.id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /api/clientes:', error);
    res.status(500).json({ error: 'Error consultando clientes.' });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, documento, telefono, correo, ciudad, direccion, ocupacion, notas } = req.body;
    if (!nombre || !documento || !telefono) {
      return res.status(400).json({ error: 'Nombre, documento y teléfono son obligatorios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, documento, telefono, correo, ciudad, direccion, ocupacion, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, documento, telefono, correo || null, ciudad || 'Bogotá D.C.', direccion || null, ocupacion || null, notas || null]
    );

    res.json({ ok: true, id: result.insertId, message: 'Cliente registrado exitosamente.' });
  } catch (error) {
    console.error('Error en POST /api/clientes:', error);
    res.status(500).json({ error: error.code === 'ER_DUP_ENTRY' ? 'Ya existe un cliente con ese documento.' : 'Error registrando cliente.' });
  }
});

// ==========================================
// 6. VENTAS, CONTRATOS Y PLAN DE PAGOS
// ==========================================
app.get('/api/ventas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*,
             l.codigo AS lote_codigo, l.numero_lote, l.manzana, l.area_m2,
             c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono
      FROM ventas v
      JOIN lotes l ON v.lote_id = l.id
      JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.fecha_venta DESC, v.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /api/ventas:', error);
    res.status(500).json({ error: 'Error consultando ventas.' });
  }
});

app.post('/api/ventas', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      lote_id,
      cliente_id,
      nuevo_cliente,
      modalidad,
      incluye_casa_3d,
      modelo_casa,
      valor_lote,
      valor_casa_3d,
      descuento,
      cuota_inicial,
      numero_cuotas,
      tasa_interes_mensual,
      asesor_comercial,
      comision_porcentaje,
      fecha_venta,
      fecha_proximo_pago,
      metodo_pago_inicial,
      observaciones
    } = req.body;

    let finalClienteId = Number(cliente_id || 0);
    let nombreClienteTercero = 'Cliente Comprador';

    if (!finalClienteId && nuevo_cliente && nuevo_cliente.nombre) {
      const [cliRes] = await conn.query(
        `INSERT INTO clientes (nombre, documento, telefono, correo, ciudad, ocupacion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          nuevo_cliente.nombre,
          nuevo_cliente.documento,
          nuevo_cliente.telefono,
          nuevo_cliente.correo || null,
          nuevo_cliente.ciudad || 'Bogotá D.C.',
          nuevo_cliente.ocupacion || 'Inversionista'
        ]
      );
      finalClienteId = cliRes.insertId;
      nombreClienteTercero = nuevo_cliente.nombre;
    } else {
      const [cliRows] = await conn.query('SELECT nombre FROM clientes WHERE id = ?', [finalClienteId]);
      if (cliRows.length > 0) nombreClienteTercero = cliRows[0].nombre;
    }

    const [loteRows] = await conn.query('SELECT * FROM lotes WHERE id = ? FOR UPDATE', [lote_id]);
    if (loteRows.length === 0) {
      throw new Error('El lote seleccionado no existe.');
    }
    const lote = loteRows[0];

    const vLote = Number(valor_lote || lote.precio_total);
    const vCasa = Number(valor_casa_3d || 0);
    const vDesc = Number(descuento || 0);
    const valorTotalVenta = vLote + vCasa - vDesc;
    const montoInicial = modalidad === 'contado' ? valorTotalVenta : Number(cuota_inicial || 0);
    const saldoPendiente = Math.max(0, valorTotalVenta - montoInicial);
    const cuotas = modalidad === 'contado' ? 1 : Math.max(1, Number(numero_cuotas || 12));
    const valorCuotaMensual = saldoPendiente > 0 ? Math.round(saldoPendiente / cuotas) : 0;
    const pctComision = Number(comision_porcentaje || 3.0);
    const valorComision = Math.round(valorTotalVenta * (pctComision / 100));

    const codigoContrato = `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const estadoVenta = saldoPendiente === 0 ? 'pagada' : 'activa';
    const fechaVentaStr = fecha_venta || new Date().toISOString().slice(0, 10);

    const [ventaRes] = await conn.query(
      `INSERT INTO ventas (
        codigo_contrato, lote_id, cliente_id, modalidad, incluye_casa_3d, modelo_casa,
        valor_lote, valor_casa_3d, descuento, valor_total_venta, cuota_inicial,
        numero_cuotas, tasa_interes_mensual, valor_cuota_mensual, total_abonado,
        saldo_pendiente, asesor_comercial, comision_porcentaje, valor_comision,
        fecha_venta, fecha_proximo_pago, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoContrato,
        lote.id,
        finalClienteId,
        modalidad || 'financiado',
        incluye_casa_3d ? 1 : 0,
        modelo_casa || 'Solo Lote 600m² (20x30m)',
        vLote,
        vCasa,
        vDesc,
        valorTotalVenta,
        montoInicial,
        cuotas,
        Number(tasa_interes_mensual || 0),
        valorCuotaMensual,
        montoInicial,
        saldoPendiente,
        asesor_comercial || 'Administración Terranova',
        pctComision,
        valorComision,
        fechaVentaStr,
        saldoPendiente > 0 ? (fecha_proximo_pago || null) : null,
        estadoVenta,
        observaciones || ''
      ]
    );

    const ventaId = ventaRes.insertId;

    // Actualizar estado del lote en la tabla lotes
    const nuevoEstadoLote = modalidad === 'reserva' ? 'reservado' : 'vendido';
    await conn.query('UPDATE lotes SET estado = ? WHERE id = ?', [nuevoEstadoLote, lote.id]);

    // Si hay pago inicial > 0, crear recibo de abono y asiento contable de ingreso
    if (montoInicial > 0) {
      const codigoRecibo = `RC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await conn.query(
        `INSERT INTO abonos (
          codigo_recibo, venta_id, lote_id, numero_cuota, fecha_abono, monto,
          metodo_pago, referencia_pago, saldo_anterior, nuevo_saldo, proximo_pago, concepto, observacion
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoRecibo,
          ventaId,
          lote.id,
          fechaVentaStr,
          montoInicial,
          metodo_pago_inicial || 'Transferencia Bancaria',
          codigoContrato,
          valorTotalVenta,
          saldoPendiente,
          fecha_proximo_pago || null,
          modalidad === 'contado'
            ? `Pago Total de Contado Lote ${lote.codigo} (600m²)`
            : `Cuota Inicial / Separación Lote ${lote.codigo} (600m²)`,
          observaciones || ''
        ]
      );

      const codigoAsiento = `AST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await conn.query(
        `INSERT INTO movimientos_contables (
          codigo_asiento, fecha, tipo, categoria, lote_id, venta_id,
          tercero, concepto, metodo_pago, comprobante, monto, notas
        ) VALUES (?, ?, 'INGRESO', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoAsiento,
          fechaVentaStr,
          modalidad === 'reserva' ? 'RESERVA_LOTE' : 'VENTA_INICIAL',
          lote.id,
          ventaId,
          nombreClienteTercero,
          `Ingreso por ${modalidad === 'contado' ? 'Venta de Contado' : 'Cuota Inicial'} ${lote.codigo} - Contrato ${codigoContrato}`,
          metodo_pago_inicial || 'Transferencia Bancaria',
          codigoRecibo,
          montoInicial,
          observaciones || ''
        ]
      );
    }

    await conn.commit();
    res.json({
      ok: true,
      venta_id: ventaId,
      codigo_contrato: codigoContrato,
      message: `Contrato ${codigoContrato} registrado y lote ${lote.codigo} marcado como ${nuevoEstadoLote.toUpperCase()}.`
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error en POST /api/ventas:', error);
    res.status(500).json({ error: error.message || 'Error procesando la venta.' });
  } finally {
    conn.release();
  }
});

// ==========================================
// 7. ABONOS Y RECAUDO DE CARTERA
// ==========================================
app.get('/api/abonos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*,
             v.codigo_contrato,
             l.codigo AS lote_codigo, l.manzana,
             c.nombre AS cliente_nombre, c.documento AS cliente_documento
      FROM abonos a
      JOIN ventas v ON a.venta_id = v.id
      JOIN lotes l ON a.lote_id = l.id
      JOIN clientes c ON v.cliente_id = c.id
      ORDER BY a.fecha_abono DESC, a.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /api/abonos:', error);
    res.status(500).json({ error: 'Error consultando historial de abonos.' });
  }
});

app.post('/api/abonos', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      venta_id,
      monto,
      fecha_abono,
      metodo_pago,
      referencia_pago,
      proximo_pago,
      concepto,
      observacion
    } = req.body;

    const montoAbono = Number(monto || 0);
    if (!venta_id || montoAbono <= 0) {
      throw new Error('Selecciona un contrato válido e ingresa un monto mayor a cero.');
    }

    const [ventaRows] = await conn.query(
      `SELECT v.*, l.codigo AS lote_codigo, c.nombre AS cliente_nombre, c.documento AS cliente_documento
       FROM ventas v
       JOIN lotes l ON v.lote_id = l.id
       JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = ? FOR UPDATE`,
      [venta_id]
    );

    if (ventaRows.length === 0) {
      throw new Error('Contrato de venta no encontrado.');
    }

    const venta = ventaRows[0];
    const saldoAnterior = Number(venta.saldo_pendiente);
    const nuevoSaldo = Math.max(0, saldoAnterior - montoAbono);
    const nuevoTotalAbonado = Number(venta.total_abonado) + montoAbono;
    const nuevoEstadoVenta = nuevoSaldo === 0 ? 'pagada' : 'activa';

    const [countAbonos] = await conn.query('SELECT COUNT(*) AS total FROM abonos WHERE venta_id = ?', [venta.id]);
    const numeroCuota = Number(countAbonos[0].total) + 1;

    const codigoRecibo = `RC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const fechaStr = fecha_abono || new Date().toISOString().slice(0, 10);

    const [abonoRes] = await conn.query(
      `INSERT INTO abonos (
        codigo_recibo, venta_id, lote_id, numero_cuota, fecha_abono, monto,
        metodo_pago, referencia_pago, saldo_anterior, nuevo_saldo, proximo_pago, concepto, observacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoRecibo,
        venta.id,
        venta.lote_id,
        numeroCuota,
        fechaStr,
        montoAbono,
        metodo_pago || 'Transferencia Bancaria',
        referencia_pago || null,
        saldoAnterior,
        nuevoSaldo,
        proximo_pago || venta.fecha_proximo_pago,
        concepto || `Abono Cuota #${numeroCuota} - Lote ${venta.lote_codigo}`,
        observacion || ''
      ]
    );

    await conn.query(
      `UPDATE ventas
       SET total_abonado = ?, saldo_pendiente = ?, fecha_proximo_pago = ?, estado = ?
       WHERE id = ?`,
      [nuevoTotalAbonado, nuevoSaldo, nuevoSaldo === 0 ? null : (proximo_pago || venta.fecha_proximo_pago), nuevoEstadoVenta, venta.id]
    );

    // Si estaba reservado y ya completó más del 20%, pasar lote a vendido
    if (nuevoTotalAbonado >= Number(venta.valor_total_venta) * 0.2) {
      await conn.query("UPDATE lotes SET estado = 'vendido' WHERE id = ?", [venta.lote_id]);
    }

    // Registrar en el Libro Contable
    const codigoAsiento = `AST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    await conn.query(
      `INSERT INTO movimientos_contables (
        codigo_asiento, fecha, tipo, categoria, lote_id, venta_id,
        tercero, documento_tercero, concepto, metodo_pago, comprobante, monto, notas
      ) VALUES (?, ?, 'INGRESO', 'ABONO_CARTERA', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoAsiento,
        fechaStr,
        venta.lote_id,
        venta.id,
        venta.cliente_nombre,
        venta.cliente_documento,
        concepto || `Abono Cartera Recibo ${codigoRecibo} - Lote ${venta.lote_codigo}`,
        metodo_pago || 'Transferencia Bancaria',
        codigoRecibo,
        montoAbono,
        observacion || ''
      ]
    );

    await conn.commit();
    res.json({
      ok: true,
      id: abonoRes.insertId,
      codigo_recibo: codigoRecibo,
      saldo_anterior: saldoAnterior,
      nuevo_saldo: nuevoSaldo,
      message: `Recibo ${codigoRecibo} registrado. Nuevo saldo pendiente: $${nuevoSaldo.toLocaleString('es-CO')}`
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error en POST /api/abonos:', error);
    res.status(500).json({ error: error.message || 'Error registrando el abono.' });
  } finally {
    conn.release();
  }
});

// ==========================================
// 8. CONTABILIDAD GENERAL (LIBRO DIARIO)
// ==========================================
app.get('/api/contabilidad', async (req, res) => {
  try {
    const [movimientos] = await pool.query(`
      SELECT m.*, l.codigo AS lote_codigo, l.manzana
      FROM movimientos_contables m
      LEFT JOIN lotes l ON m.lote_id = l.id
      ORDER BY m.fecha DESC, m.id DESC
    `);

    const [porCategoria] = await pool.query(`
      SELECT tipo, categoria, COUNT(*) AS cantidad, SUM(monto) AS total
      FROM movimientos_contables
      GROUP BY tipo, categoria
      ORDER BY tipo ASC, total DESC
    `);

    res.json({
      movimientos,
      porCategoria
    });
  } catch (error) {
    console.error('Error en GET /api/contabilidad:', error);
    res.status(500).json({ error: 'Error consultando libro contable.' });
  }
});

app.post('/api/contabilidad', async (req, res) => {
  try {
    const {
      fecha,
      tipo,
      categoria,
      lote_id,
      tercero,
      documento_tercero,
      concepto,
      metodo_pago,
      comprobante,
      monto,
      notas
    } = req.body;

    if (!tipo || !categoria || !tercero || !concepto || !monto) {
      return res.status(400).json({ error: 'Completa tipo, categoría, tercero, concepto y monto.' });
    }

    const codigoAsiento = `AST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const fechaStr = fecha || new Date().toISOString().slice(0, 10);

    const [result] = await pool.query(
      `INSERT INTO movimientos_contables (
        codigo_asiento, fecha, tipo, categoria, lote_id, tercero,
        documento_tercero, concepto, metodo_pago, comprobante, monto, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoAsiento,
        fechaStr,
        tipo,
        categoria,
        lote_id ? Number(lote_id) : null,
        tercero,
        documento_tercero || null,
        concepto,
        metodo_pago || 'Transferencia Bancaria',
        comprobante || codigoAsiento,
        Number(monto),
        notas || null
      ]
    );

    res.json({
      ok: true,
      id: result.insertId,
      codigo_asiento: codigoAsiento,
      message: `Asiento contable ${codigoAsiento} registrado correctamente.`
    });
  } catch (error) {
    console.error('Error en POST /api/contabilidad:', error);
    res.status(500).json({ error: 'Error guardando asiento contable.' });
  }
});

app.delete('/api/contabilidad/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM movimientos_contables WHERE id = ?', [id]);
    res.json({ ok: true, message: 'Movimiento contable eliminado.' });
  } catch (error) {
    console.error('Error en DELETE /api/contabilidad/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el movimiento.' });
  }
});

// Inicializar BD y levantar servidor
initializeDatabase(false)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`============================================================`);
      console.log(`🌿 PRADOS DE TERRANOVA - Servidor Web & MySQL Activo`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`🗄️  MySQL Conectado: ${process.env.DB_HOST}:${process.env.DB_PORT} -> BD '${process.env.DB_NAME}'`);
      console.log(`📐 38 Lotes Interactivos de 20m x 30m = 600 m² listos`);
      console.log(`============================================================`);
    });
  })
  .catch((err) => {
    console.error('Error crítico al iniciar base de datos MySQL:', err);
    process.exit(1);
  });
