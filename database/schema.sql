-- Esquema Base de Datos: prados_terranova
-- Proyecto: Loteo Campestre Prados de Terranova (38 Lotes de 20m x 30m = 600 m2)

CREATE DATABASE IF NOT EXISTS prados_terranova CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prados_terranova;

-- 1. Tabla de Usuarios (Login y Control de Acceso)
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

-- 2. Tabla de los 38 Lotes (20m frente x 30m fondo = 600 m2)
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

-- 3. Tabla de Clientes / Propietarios
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  documento VARCHAR(50) NOT NULL UNIQUE,
  telefono VARCHAR(50) NOT NULL,
  correo VARCHAR(120) DEFAULT NULL,
  ciudad VARCHAR(80) DEFAULT 'Bogotá D.C.',
  direccion VARCHAR(180) DEFAULT NULL,
  ocupacion VARCHAR(100) DEFAULT NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Ventas y Contratos de Adjudicación
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

-- 5. Tabla de Abonos y Recaudos de Cartera
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

-- 6. Tabla de Movimientos Contables (Libro Diario Ingresos y Egresos)
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
