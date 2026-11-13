import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { pool, initDatabase } from './db.js';
import {
  computeLoteoGeometry,
  DEFAULT_LOTEO_CONFIG,
  INITIAL_SOLD_LOTS,
} from '../src/utils/lotGeometry.js';

export function createApiRouter() {
  const router = express.Router();
  router.use(cors());
  router.use(express.json({ limit: '5mb' }));

  let dbAvailable = false;

  // Middleware para asegurar inicialización de la BD (con respaldo en memoria si no hay MySQL activo)
  router.use(async (_req, _res, next) => {
    try {
      await initDatabase();
      dbAvailable = true;
    } catch (err) {
      dbAvailable = false;
      console.warn('Usando modo respaldo en memoria (MySQL no disponible):', err.message);
    }
    next();
  });

  // 1. AUTENTICACIÓN (LOGIN)
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Ingresa tu usuario/correo y contraseña' });
      }

      if (!dbAvailable) {
        if ((username.trim() === 'admin' || username.trim() === 'admin@localhost') && password === 'admin123') {
          const user = {
            id: 1,
            username: 'admin',
            email: 'admin@localhost',
            nombre_completo: 'Administrador',
            cargo: 'Administración General',
            rol: 'admin',
          };
          const token = Buffer.from(
            JSON.stringify({ id: 1, username: 'admin', rol: 'admin', exp: Date.now() + 86400000 })
          ).toString('base64');
          return res.json({ token, user });
        }
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      const [rows] = await pool.query(
        'SELECT * FROM usuarios WHERE username = ? OR email = ? LIMIT 1',
        [username.trim(), username.trim()]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      const user = rows[0];
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      const valid =
        user.password_hash === password ||
        user.password_hash === sha256;

      if (!valid) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

      const token = Buffer.from(
        JSON.stringify({
          id: user.id,
          username: user.username,
          rol: user.rol,
          exp: Date.now() + 1000 * 60 * 60 * 24,
        })
      ).toString('base64');

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre_completo: user.nombre_completo,
          cargo: user.cargo,
          rol: user.rol,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. OBTENER LOTES Y CONFIGURACIÓN SATELITAL
  router.get('/lotes', async (_req, res) => {
    try {
      if (!dbAvailable) {
        const geo = computeLoteoGeometry(DEFAULT_LOTEO_CONFIG, []);
        const fallbackLots = geo.lots.map((l) => ({
          ...l,
          estado: INITIAL_SOLD_LOTS.has(Number(l.numero_lote)) ? 'vendido' : 'disponible',
          venta_activa: null,
        }));
        return res.json({
          config: geo.config,
          lots: fallbackLots,
          overlays: geo.overlays,
        });
      }

      const [[configRow]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');
      const [lotesRows] = await pool.query('SELECT * FROM lotes ORDER BY numero_lote ASC');

      // Cruzar con ventas activas para saber comprador actual si está vendido/reservado
      const [ventasRows] = await pool.query(`
        SELECT v.id AS venta_id, v.lote_id, v.codigo_contrato, v.modalidad, v.valor_total_venta,
               v.total_abonado, v.saldo_pendiente, v.numero_cuotas, v.valor_cuota_mensual,
               v.estado AS estado_venta, c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono
        FROM ventas v
        JOIN clientes c ON c.id = v.cliente_id
        WHERE v.estado != 'cancelada'
        ORDER BY v.id DESC
      `);

      const ventaPorLote = new Map();
      for (const v of ventasRows) {
        if (!ventaPorLote.has(v.lote_id)) {
          ventaPorLote.set(v.lote_id, v);
        }
      }

      const geo = computeLoteoGeometry(configRow, lotesRows);
      const enrichedLots = geo.lots.map((l) => ({
        ...l,
        venta_activa: ventaPorLote.get(l.id) || null,
      }));

      res.json({
        config: {
          ...configRow,
          ...geo.config,
        },
        lots: enrichedLots,
        overlays: geo.overlays,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. ACTUALIZAR UBICACIÓN, ROTACIÓN Y TAMAÑO DEL LOTEO DESDE EL ADMIN
  router.put('/lotes/layout', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        nombre_proyecto,
        ubicacion_texto,
        center_lat,
        center_lng,
        rotation_deg,
        default_front_m,
        default_depth_m,
        gap_lotes_m,
        road_internal_m,
        road_main_m,
        perimeter_pad_m,
        default_precio_m2,
        resetIndividualSizes = false,
        resetIndividualOffsets = false,
        updateAvailablePrices = true,
      } = req.body;

      await conn.query(
        `UPDATE configuracion_loteo
         SET nombre_proyecto = COALESCE(?, nombre_proyecto),
             ubicacion_texto = COALESCE(?, ubicacion_texto),
             center_lat = ?,
             center_lng = ?,
             rotation_deg = ?,
             default_front_m = ?,
             default_depth_m = ?,
             gap_lotes_m = ?,
             road_internal_m = ?,
             road_main_m = ?,
             perimeter_pad_m = ?,
             default_precio_m2 = ?
         WHERE id = 1`,
        [
          nombre_proyecto || null,
          ubicacion_texto || null,
          Number(center_lat),
          Number(center_lng),
          Number(rotation_deg),
          Number(default_front_m),
          Number(default_depth_m),
          Number(gap_lotes_m),
          Number(road_internal_m),
          Number(road_main_m),
          Number(perimeter_pad_m),
          Number(default_precio_m2 || 150000),
        ]
      );

      const [[updatedCfg]] = await conn.query('SELECT * FROM configuracion_loteo WHERE id = 1');
      const [existingLots] = await conn.query('SELECT * FROM lotes ORDER BY numero_lote ASC');

      const preparedLots = existingLots.map((lot) => {
        let parsedGeo = {};
        try {
          parsedGeo =
            typeof lot.coordenadas_geojson === 'string'
              ? JSON.parse(lot.coordenadas_geojson)
              : lot.coordenadas_geojson || {};
        } catch {
          parsedGeo = {};
        }
        if (resetIndividualSizes) {
          parsedGeo.customSize = false;
        }
        if (resetIndividualOffsets) {
          parsedGeo.customOffset = { dx: 0, dy: 0 };
        }

        const num = Number(lot.numero_lote);
        // Si se pide actualizar precios: si el lote es 1, 2 o 3, preservar 80M a menos que se especifique
        let precio_m2 = Number(lot.precio_m2);
        let precio_total = Number(lot.precio_total);
        if (updateAvailablePrices && lot.estado === 'disponible') {
          if (num <= 3) {
            precio_total = 80000000;
            precio_m2 = Number((80000000 / 600).toFixed(2));
          } else {
            precio_m2 = Number(default_precio_m2 || lot.precio_m2 || 150000);
            precio_total = Number((600 * precio_m2).toFixed(2));
          }
        }

        return {
          ...lot,
          precio_m2,
          precio_total,
          coordenadas_geojson: parsedGeo,
        };
      });

      const computed = computeLoteoGeometry(updatedCfg, preparedLots);

      for (const lot of computed.lots) {
        const desc = `Lote ${String(lot.numero_lote).padStart(2, '0')} (${lot.manzana}) de ${Number(lot.frente_m).toFixed(2)}m x ${Number(lot.fondo_m).toFixed(2)}m = ${Number(lot.area_m2).toFixed(2)} m².`;
        await conn.query(
          `UPDATE lotes
           SET frente_m = ?,
               fondo_m = ?,
               area_m2 = ?,
               precio_m2 = ?,
               precio_total = ?,
               latitud = ?,
               longitud = ?,
               coordenadas_geojson = ?,
               descripcion = ?
           WHERE id = ?`,
          [
            lot.frente_m,
            lot.fondo_m,
            lot.area_m2,
            lot.precio_m2,
            lot.precio_total,
            lot.latitud,
            lot.longitud,
            JSON.stringify(lot.coordenadas_geojson),
            desc,
            lot.id,
          ]
        );
      }

      await conn.commit();

      res.json({
        message: 'Distribución satelital y dimensiones actualizadas en MySQL',
        config: updatedCfg,
        lots: computed.lots,
        overlays: computed.overlays,
      });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // 4. ACTUALIZAR UN LOTE INDIVIDUAL (TAMAÑO, OFFSET, PRECIO, ESTADO, LINDEROS)
  router.put('/lotes/:id', async (req, res) => {
    try {
      const lotId = Number(req.params.id);
      const [[lot]] = await pool.query('SELECT * FROM lotes WHERE id = ?', [lotId]);
      if (!lot) {
        return res.status(404).json({ error: 'Lote no encontrado' });
      }

      const [[cfg]] = await pool.query('SELECT * FROM configuracion_loteo WHERE id = 1');

      const frente_m = Number(req.body.frente_m ?? lot.frente_m);
      const fondo_m = Number(req.body.fondo_m ?? lot.fondo_m);
      const area_m2 = Number((frente_m * fondo_m).toFixed(2));
      const precio_m2 = Number(req.body.precio_m2 ?? lot.precio_m2);
      const precio_total =
        req.body.precio_total !== undefined
          ? Number(req.body.precio_total)
          : Number((area_m2 * precio_m2).toFixed(2));
      const estado = req.body.estado || lot.estado;

      let prevGeo = {};
      try {
        prevGeo =
          typeof lot.coordenadas_geojson === 'string'
            ? JSON.parse(lot.coordenadas_geojson)
            : lot.coordenadas_geojson || {};
      } catch {
        prevGeo = {};
      }

      const dx = Number(req.body.offset_x_m ?? prevGeo?.customOffset?.dx ?? 0);
      const dy = Number(req.body.offset_y_m ?? prevGeo?.customOffset?.dy ?? 0);
      const isCustomSize =
        req.body.customSize !== undefined
          ? Boolean(req.body.customSize)
          : Math.abs(frente_m - Number(cfg.default_front_m)) > 0.01 ||
            Math.abs(fondo_m - Number(cfg.default_depth_m)) > 0.01;

      const updatedTempLot = {
        ...lot,
        frente_m,
        fondo_m,
        area_m2,
        precio_m2,
        precio_total,
        estado,
        coordenadas_geojson: {
          ...prevGeo,
          customOffset: { dx, dy },
          customSize: isCustomSize,
        },
      };

      const [allLots] = await pool.query('SELECT * FROM lotes ORDER BY numero_lote ASC');
      const mergedLots = allLots.map((l) => (l.id === lotId ? updatedTempLot : l));
      const geo = computeLoteoGeometry(cfg, mergedLots);
      const computedLot = geo.lots.find((l) => l.id === lotId);

      await pool.query(
        `UPDATE lotes
         SET frente_m = ?,
             fondo_m = ?,
             area_m2 = ?,
             precio_m2 = ?,
             precio_total = ?,
             estado = ?,
             topografia = COALESCE(?, topografia),
             orientacion = COALESCE(?, orientacion),
             lindero_norte = COALESCE(?, lindero_norte),
             lindero_sur = COALESCE(?, lindero_sur),
             lindero_oriente = COALESCE(?, lindero_oriente),
             lindero_occidente = COALESCE(?, lindero_occidente),
             matricula_inmobiliaria = COALESCE(?, matricula_inmobiliaria),
             descripcion = COALESCE(?, descripcion),
             latitud = ?,
             longitud = ?,
             coordenadas_geojson = ?
         WHERE id = ?`,
        [
          computedLot.frente_m,
          computedLot.fondo_m,
          computedLot.area_m2,
          computedLot.precio_m2,
          precio_total,
          estado,
          req.body.topografia ?? null,
          req.body.orientacion ?? null,
          req.body.lindero_norte ?? null,
          req.body.lindero_sur ?? null,
          req.body.lindero_oriente ?? null,
          req.body.lindero_occidente ?? null,
          req.body.matricula_inmobiliaria ?? null,
          req.body.descripcion ?? null,
          computedLot.latitud,
          computedLot.longitud,
          JSON.stringify(computedLot.coordenadas_geojson),
          lotId,
        ]
      );

      res.json({
        message: `Lote ${lot.codigo} actualizado correctamente`,
        lot: { ...computedLot, precio_total, estado },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. DASHBOARD Y RESUMEN GENERAL
  router.get('/dashboard', async (_req, res) => {
    try {
      if (!dbAvailable) {
        const vendidos = INITIAL_SOLD_LOTS.size;
        const disponibles = 38 - vendidos;
        // Lotes 1, 2, 3 en 80M, resto en 90M
        const valorInventario = 3 * 80000000 + 35 * 90000000;
        return res.json({
          lotes: {
            total_lotes: 38,
            disponibles,
            reservados: 0,
            vendidos,
            valor_inventario_total: valorInventario,
            valor_disponible: disponibles * 90000000,
          },
          ventas: {
            total_contratos: vendidos,
            total_vendido: vendidos * 90000000,
            total_recaudado: vendidos * 90000000,
            cartera_pendiente: 0,
          },
          contabilidad: {
            total_ingresos: vendidos * 90000000,
            total_egresos: 0,
          },
          total_clientes: vendidos,
        });
      }
      const [lotesStats] = await pool.query(`
        SELECT
          COUNT(*) AS total_lotes,
          SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) AS disponibles,
          SUM(CASE WHEN estado = 'reservado' THEN 1 ELSE 0 END) AS reservados,
          SUM(CASE WHEN estado = 'vendido' THEN 1 ELSE 0 END) AS vendidos,
          SUM(precio_total) AS valor_inventario_total,
          SUM(CASE WHEN estado = 'disponible' THEN precio_total ELSE 0 END) AS valor_disponible
        FROM lotes
      `);

      const [ventasStats] = await pool.query(`
        SELECT
          COUNT(*) AS total_contratos,
          COALESCE(SUM(valor_total_venta), 0) AS total_vendido,
          COALESCE(SUM(total_abonado), 0) AS total_recaudado,
          COALESCE(SUM(saldo_pendiente), 0) AS cartera_pendiente
        FROM ventas
        WHERE estado != 'cancelada'
      `);

      const [contabilidadStats] = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
          COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos
        FROM movimientos_contables
      `);

      const [clientesCount] = await pool.query('SELECT COUNT(*) AS total_clientes FROM clientes');

      res.json({
        lotes: lotesStats[0],
        ventas: ventasStats[0],
        contabilidad: contabilidadStats[0],
        total_clientes: clientesCount[0].total_clientes,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. CLIENTES
  router.get('/clientes', async (_req, res) => {
    try {
      if (!dbAvailable) return res.json([]);
      const [rows] = await pool.query(`
        SELECT c.*,
               COUNT(v.id) AS compras_count,
               COALESCE(SUM(v.valor_total_venta), 0) AS total_comprado,
               COALESCE(SUM(v.saldo_pendiente), 0) AS saldo_pendiente
        FROM clientes c
        LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado != 'cancelada'
        GROUP BY c.id
        ORDER BY c.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/clientes', async (req, res) => {
    try {
      const { nombre, documento, telefono, correo, ciudad, direccion, ocupacion, notas } = req.body;
      if (!nombre || !documento || !telefono) {
        return res.status(400).json({ error: 'Nombre, documento y teléfono son obligatorios' });
      }

      const [existing] = await pool.query('SELECT * FROM clientes WHERE documento = ?', [
        documento.trim(),
      ]);
      if (existing.length > 0) {
        await pool.query(
          `UPDATE clientes
           SET nombre = ?, telefono = ?, correo = COALESCE(?, correo), ciudad = COALESCE(?, ciudad),
               direccion = COALESCE(?, direccion), ocupacion = COALESCE(?, ocupacion), notas = COALESCE(?, notas)
           WHERE id = ?`,
          [
            nombre.trim(),
            telefono.trim(),
            correo || null,
            ciudad || 'Yopal, Casanare',
            direccion || null,
            ocupacion || null,
            notas || null,
            existing[0].id,
          ]
        );
        const [[updated]] = await pool.query('SELECT * FROM clientes WHERE id = ?', [existing[0].id]);
        return res.json(updated);
      }

      const [result] = await pool.query(
        `INSERT INTO clientes (nombre, documento, telefono, correo, ciudad, direccion, ocupacion, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre.trim(),
          documento.trim(),
          telefono.trim(),
          correo || null,
          ciudad || 'Yopal, Casanare',
          direccion || null,
          ocupacion || null,
          notas || null,
        ]
      );

      const [[created]] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. PROCESO DE COMPRA Y FINANCIACIÓN DE LOTES (VENTAS)
  router.get('/ventas', async (_req, res) => {
    try {
      if (!dbAvailable) return res.json([]);
      const [rows] = await pool.query(`
        SELECT v.*,
               l.numero_lote, l.codigo AS lote_codigo, l.manzana, l.area_m2, l.frente_m, l.fondo_m,
               c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono, c.correo AS cliente_correo
        FROM ventas v
        JOIN lotes l ON l.id = v.lote_id
        JOIN clientes c ON c.id = v.cliente_id
        ORDER BY v.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/ventas', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        lote_id,
        cliente_id,
        cliente_nuevo,
        modalidad = 'financiado',
        incluye_casa_3d = false,
        modelo_casa = 'Solo Lote Campestre',
        valor_lote,
        valor_casa_3d = 0,
        descuento = 0,
        cuota_inicial = 0,
        numero_cuotas = 24,
        tasa_interes_mensual = 0,
        metodo_pago_inicial = 'Transferencia Bancaria',
        referencia_pago_inicial = '',
        asesor_comercial = 'Administración Terranova',
        comision_porcentaje = 3,
        fecha_venta,
        observaciones = '',
      } = req.body;

      // 1. Verificar lote
      const [[lote]] = await conn.query('SELECT * FROM lotes WHERE id = ? FOR UPDATE', [
        Number(lote_id),
      ]);
      if (!lote) {
        throw new Error('El lote seleccionado no existe');
      }

      // 2. Resolver cliente (existente o nuevo)
      let finalClienteId = cliente_id ? Number(cliente_id) : null;
      let clienteNombre = '';
      let clienteDocumento = '';

      if (!finalClienteId && cliente_nuevo) {
        const { nombre, documento, telefono, correo, ciudad, direccion, ocupacion } = cliente_nuevo;
        if (!nombre || !documento || !telefono) {
          throw new Error('Completa nombre, documento y teléfono del comprador');
        }
        const [existCli] = await conn.query('SELECT * FROM clientes WHERE documento = ?', [
          documento.trim(),
        ]);
        if (existCli.length > 0) {
          finalClienteId = existCli[0].id;
          clienteNombre = existCli[0].nombre;
          clienteDocumento = existCli[0].documento;
          await conn.query(
            'UPDATE clientes SET nombre = ?, telefono = ?, correo = COALESCE(?, correo), ciudad = COALESCE(?, ciudad) WHERE id = ?',
            [nombre.trim(), telefono.trim(), correo || null, ciudad || 'Yopal, Casanare', finalClienteId]
          );
        } else {
          const [insCli] = await conn.query(
            `INSERT INTO clientes (nombre, documento, telefono, correo, ciudad, direccion, ocupacion)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              nombre.trim(),
              documento.trim(),
              telefono.trim(),
              correo || null,
              ciudad || 'Yopal, Casanare',
              direccion || null,
              ocupacion || null,
            ]
          );
          finalClienteId = insCli.insertId;
          clienteNombre = nombre.trim();
          clienteDocumento = documento.trim();
        }
      } else if (finalClienteId) {
        const [[cli]] = await conn.query('SELECT * FROM clientes WHERE id = ?', [finalClienteId]);
        if (!cli) throw new Error('Cliente no encontrado');
        clienteNombre = cli.nombre;
        clienteDocumento = cli.documento;
      } else {
        throw new Error('Debes seleccionar o registrar un comprador');
      }

      // 3. Cálculos financieros
      const valLote = Number(valor_lote ?? lote.precio_total);
      const valCasa = incluye_casa_3d ? Number(valor_casa_3d || 0) : 0;
      const desc = Number(descuento || 0);
      const valorTotalVenta = Math.max(0, valLote + valCasa - desc);

      const abonoInicial =
        modalidad === 'contado' ? valorTotalVenta : Number(cuota_inicial || 0);
      const saldoFinanciar = Math.max(0, valorTotalVenta - abonoInicial);
      const cuotas = modalidad === 'contado' ? 1 : Math.max(1, Number(numero_cuotas || 1));
      const tasa = modalidad === 'contado' ? 0 : Number(tasa_interes_mensual || 0);

      let valorCuotaMensual = 0;
      if (saldoFinanciar > 0) {
        if (tasa > 0) {
          const r = tasa / 100;
          valorCuotaMensual =
            (saldoFinanciar * (r * Math.pow(1 + r, cuotas))) / (Math.pow(1 + r, cuotas) - 1);
        } else {
          valorCuotaMensual = saldoFinanciar / cuotas;
        }
      }
      valorCuotaMensual = Number(valorCuotaMensual.toFixed(2));

      const fechaVentaStr = fecha_venta || new Date().toISOString().slice(0, 10);
      const proximoPagoDate = new Date(fechaVentaStr + 'T12:00:00');
      proximoPagoDate.setMonth(proximoPagoDate.getMonth() + 1);
      const fechaProximoPago =
        saldoFinanciar > 0 ? proximoPagoDate.toISOString().slice(0, 10) : null;

      const estadoVenta = saldoFinanciar <= 0 ? 'pagada' : 'activa';
      const valorComision = Number(((valorTotalVenta * Number(comision_porcentaje || 3)) / 100).toFixed(2));
      const codigoContrato = `TER-${lote.codigo}-${Date.now().toString().slice(-5)}`;

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
          modalidad,
          incluye_casa_3d ? 1 : 0,
          incluye_casa_3d ? modelo_casa : `Solo Lote ${lote.area_m2}m²`,
          valLote,
          valCasa,
          desc,
          valorTotalVenta,
          abonoInicial,
          cuotas,
          tasa,
          valorCuotaMensual,
          abonoInicial,
          saldoFinanciar,
          asesor_comercial,
          Number(comision_porcentaje || 3),
          valorComision,
          fechaVentaStr,
          fechaProximoPago,
          estadoVenta,
          observaciones,
        ]
      );

      const ventaId = ventaRes.insertId;

      // 4. Actualizar estado del lote en la tabla lotes
      const nuevoEstadoLote = modalidad === 'reserva' ? 'reservado' : 'vendido';
      await conn.query('UPDATE lotes SET estado = ? WHERE id = ?', [nuevoEstadoLote, lote.id]);

      // 5. Si hay cuota inicial o pago de contado > 0, registrar abono inicial y movimiento contable
      if (abonoInicial > 0) {
        const codigoRecibo = `REC-${lote.codigo}-00-${Date.now().toString().slice(-4)}`;
        const conceptoInicial =
          modalidad === 'contado'
            ? `Pago total de contado ${lote.codigo}`
            : modalidad === 'reserva'
            ? `Separación / Reserva de lote ${lote.codigo}`
            : `Cuota inicial financiación ${lote.codigo}`;

        await conn.query(
          `INSERT INTO abonos (
            codigo_recibo, venta_id, lote_id, numero_cuota, fecha_abono, monto,
            metodo_pago, referencia_pago, saldo_anterior, nuevo_saldo, proximo_pago, concepto, observacion
          ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigoRecibo,
            ventaId,
            lote.id,
            fechaVentaStr,
            abonoInicial,
            metodo_pago_inicial,
            referencia_pago_inicial || codigoContrato,
            valorTotalVenta,
            saldoFinanciar,
            fechaProximoPago,
            conceptoInicial,
            observaciones,
          ]
        );

        const codigoAsiento = `ING-${lote.codigo}-${Date.now().toString().slice(-5)}`;
        const categoriaContable =
          modalidad === 'reserva' ? 'RESERVA_LOTE' : 'VENTA_INICIAL';

        await conn.query(
          `INSERT INTO movimientos_contables (
            codigo_asiento, fecha, tipo, categoria, lote_id, venta_id, tercero,
            documento_tercero, concepto, metodo_pago, comprobante, monto, notas
          ) VALUES (?, ?, 'INGRESO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigoAsiento,
            fechaVentaStr,
            categoriaContable,
            lote.id,
            ventaId,
            clienteNombre,
            clienteDocumento,
            conceptoInicial,
            metodo_pago_inicial,
            codigoRecibo,
            abonoInicial,
            observaciones,
          ]
        );
      }

      await conn.commit();

      const [[ventaCreada]] = await pool.query(
        `SELECT v.*, l.codigo AS lote_codigo, l.numero_lote, c.nombre AS cliente_nombre, c.documento AS cliente_documento
         FROM ventas v
         JOIN lotes l ON l.id = v.lote_id
         JOIN clientes c ON c.id = v.cliente_id
         WHERE v.id = ?`,
        [ventaId]
      );

      res.status(201).json({
        message: 'Contrato de compraventa y financiación registrado en MySQL',
        venta: ventaCreada,
      });
    } catch (err) {
      await conn.rollback();
      res.status(400).json({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // 8. ABONOS Y PAGOS DE CUOTAS DE FINANCIACIÓN
  router.get('/abonos', async (req, res) => {
    try {
      if (!dbAvailable) return res.json([]);
      const { venta_id } = req.query;
      let sql = `
        SELECT a.*, v.codigo_contrato, l.codigo AS lote_codigo, l.numero_lote,
               c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono
        FROM abonos a
        JOIN ventas v ON v.id = a.venta_id
        JOIN lotes l ON l.id = a.lote_id
        JOIN clientes c ON c.id = v.cliente_id
      `;
      const params = [];
      if (venta_id) {
        sql += ' WHERE a.venta_id = ?';
        params.push(Number(venta_id));
      }
      sql += ' ORDER BY a.id DESC';
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/abonos', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        venta_id,
        monto,
        metodo_pago = 'Transferencia Bancaria',
        referencia_pago = '',
        fecha_abono,
        concepto,
        observacion = '',
      } = req.body;

      const [[venta]] = await conn.query(
        `SELECT v.*, l.codigo AS lote_codigo, c.nombre AS cliente_nombre, c.documento AS cliente_documento
         FROM ventas v
         JOIN lotes l ON l.id = v.lote_id
         JOIN clientes c ON c.id = v.cliente_id
         WHERE v.id = ? FOR UPDATE`,
        [Number(venta_id)]
      );

      if (!venta) {
        throw new Error('Contrato de venta no encontrado');
      }

      const montoNum = Number(monto || 0);
      if (montoNum <= 0) {
        throw new Error('El monto del abono debe ser mayor a 0');
      }

      const saldoAnterior = Number(venta.saldo_pendiente);
      if (saldoAnterior <= 0) {
        throw new Error('Este contrato ya se encuentra 100% pagado');
      }

      const nuevoSaldo = Math.max(0, Number((saldoAnterior - montoNum).toFixed(2)));
      const nuevoTotalAbonado = Number((Number(venta.total_abonado) + montoNum).toFixed(2));

      const [[countRow]] = await conn.query(
        'SELECT COUNT(*) AS cnt FROM abonos WHERE venta_id = ? AND numero_cuota > 0',
        [venta.id]
      );
      const numeroCuota = Number(countRow.cnt || 0) + 1;

      const fechaAbonoStr = fecha_abono || new Date().toISOString().slice(0, 10);
      const nextDate = new Date(fechaAbonoStr + 'T12:00:00');
      nextDate.setMonth(nextDate.getMonth() + 1);
      const proximoPago = nuevoSaldo > 0 ? nextDate.toISOString().slice(0, 10) : null;

      const codigoRecibo = `REC-${venta.lote_codigo}-C${String(numeroCuota).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      const conceptoFinal =
        concepto || `Abono cuota #${numeroCuota} de financiación — Lote ${venta.lote_codigo}`;

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
          fechaAbonoStr,
          montoNum,
          metodo_pago,
          referencia_pago || codigoRecibo,
          saldoAnterior,
          nuevoSaldo,
          proximoPago,
          conceptoFinal,
          observacion,
        ]
      );

      const nuevoEstadoVenta = nuevoSaldo <= 0 ? 'pagada' : 'activa';
      await conn.query(
        `UPDATE ventas
         SET total_abonado = ?, saldo_pendiente = ?, fecha_proximo_pago = ?, estado = ?
         WHERE id = ?`,
        [nuevoTotalAbonado, nuevoSaldo, proximoPago, nuevoEstadoVenta, venta.id]
      );

      if (nuevoSaldo <= 0) {
        await conn.query("UPDATE lotes SET estado = 'vendido' WHERE id = ?", [venta.lote_id]);
      }

      const codigoAsiento = `ABO-${venta.lote_codigo}-${Date.now().toString().slice(-5)}`;
      await conn.query(
        `INSERT INTO movimientos_contables (
          codigo_asiento, fecha, tipo, categoria, lote_id, venta_id, tercero,
          documento_tercero, concepto, metodo_pago, comprobante, monto, notas
        ) VALUES (?, ?, 'INGRESO', 'ABONO_CARTERA', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoAsiento,
          fechaAbonoStr,
          venta.lote_id,
          venta.id,
          venta.cliente_nombre,
          venta.cliente_documento,
          conceptoFinal,
          metodo_pago,
          codigoRecibo,
          montoNum,
          observacion,
        ]
      );

      await conn.commit();

      const [[nuevoAbono]] = await pool.query(
        `SELECT a.*, v.codigo_contrato, l.codigo AS lote_codigo, l.numero_lote,
                c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono
         FROM abonos a
         JOIN ventas v ON v.id = a.venta_id
         JOIN lotes l ON l.id = a.lote_id
         JOIN clientes c ON c.id = v.cliente_id
         WHERE a.id = ?`,
        [abonoRes.insertId]
      );

      res.status(201).json({
        message: `Abono registrado. Nuevo saldo pendiente: $${nuevoSaldo.toLocaleString('es-CO')}`,
        abono: nuevoAbono,
      });
    } catch (err) {
      await conn.rollback();
      res.status(400).json({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // 9. MOVIMIENTOS CONTABLES
  router.get('/contabilidad', async (_req, res) => {
    try {
      if (!dbAvailable) return res.json([]);
      const [rows] = await pool.query(`
        SELECT m.*, l.codigo AS lote_codigo
        FROM movimientos_contables m
        LEFT JOIN lotes l ON l.id = m.lote_id
        ORDER BY m.fecha DESC, m.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
