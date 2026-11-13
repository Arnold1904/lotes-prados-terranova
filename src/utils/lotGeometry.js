// Motor geométrico para calcular la delimitación satelital de los 38 lotes (L01 - L38),
// Área Social central, Portería en la entrada suroriental y anillo de carreteras internas
// calibrado milimétricamente sobre las vías reales de Google Maps y la casa construida en el Lote 25.

export const DEFAULT_LOTEO_CONFIG = {
  center_lat: 5.2881652,
  center_lng: -72.4658304,
  rotation_deg: -16.5,
  default_front_m: 20,
  default_depth_m: 30,
  gap_lotes_m: 0,
  road_internal_m: 9,
  road_main_m: 9,
  perimeter_pad_m: 8,
  default_precio_m2: 150000, // $150.000/m² -> 600m² = $90.000.000 COP valor base
};

// Lotes marcados como apartados o vendidos (R - Rojo)
// Exactamente: 2, 5, 16, 19, 20, 21, 23, 24, 25, 27, 28, 29, 37, 38 (14 lotes)
// Los demás son Disponibles (V - Verde): 24 lotes
export const INITIAL_SOLD_LOTS = new Set([2, 5, 16, 19, 20, 21, 23, 24, 25, 27, 28, 29, 37, 38]);

// Precios especiales iniciales por lote
// Lotes 1, 2 y 3 tienen un valor especial de $80.000.000 COP
export const SPECIAL_LOT_PRICES = {
  1: 80000000,
  2: 80000000,
  3: 80000000,
};

// Definición de sectores / manzanas para filtros y códigos
export const ROWS_DEFINITION = [
  { rowIndex: 0, manzana: 'Manzana A', prefix: 'MA', lots: [1, 2, 3, 4, 5] },
  { rowIndex: 1, manzana: 'Manzana B', prefix: 'MB', lots: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { rowIndex: 2, manzana: 'Manzana C', prefix: 'MC', lots: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] },
  { rowIndex: 3, manzana: 'Manzana D', prefix: 'MD', lots: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38] },
];

export function metersToLatLng(dxMeters, dyMeters, centerLat, centerLng, rotationDeg = 0) {
  const rad = (Number(rotationDeg) * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // Rotar en plano cartesiano local (x = Este, y = Norte)
  const rx = dxMeters * cosA - dyMeters * sinA;
  const ry = dxMeters * sinA + dyMeters * cosA;

  const metersPerDegLat = 111132.92;
  const metersPerDegLng = 111412.84 * Math.cos((Number(centerLat) * Math.PI) / 180);

  const lat = Number(centerLat) + ry / metersPerDegLat;
  const lng = Number(centerLng) + rx / metersPerDegLng;
  return [Number(lat.toFixed(7)), Number(lng.toFixed(7))];
}

function rectToLatLngPolygon(x1, y1, x2, y2, cfg) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return [
    metersToLatLng(minX, minY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    metersToLatLng(maxX, minY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    metersToLatLng(maxX, maxY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    metersToLatLng(minX, maxY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
  ];
}

// Construye las especificaciones geométricas de los 38 lotes, Área Social, Portería y Vías
// manteniendo la proporción 20m x 30m (600 m²) y alineando los corredores con las vías reales en Google Maps.
function buildStructuredMasterPlan(cfg) {
  const F = Number(cfg.default_front_m || 20); // 20m
  const D = Number(cfg.default_depth_m || 30); // 30m
  const scaleX = F / 20;
  const scaleY = D / 30;
  const rW = Number(cfg.road_internal_m || 9); // Ancho de vía (~9m en terreno real)
  const halfR = rW / 2;

  // Coordenadas base de los ejes de las 4 vías del anillo (en metros respecto al centro del anillo vial)
  // En la captura satelital real:
  // - Eje Vía Oeste: X = -65m (separa Lotes 16-19 a la izquierda y Lotes 35-38 a la derecha)
  // - Eje Vía Este (Principal): X = +65m (separa Lotes 28-31 / 27 a la izquierda y Lotes 1-5 / Portería a la derecha)
  // - Eje Vía Norte: Y = +41m (separa Lotes 15-06 arriba y Lotes 35, 34-32, 31 abajo)
  // - Eje Vía Sur: Y = -41m (separa Lotes 38, Área Social, 28 arriba y Lotes 20-27 abajo)
  const westRoadX = -65 * scaleX;
  const eastRoadX = 65 * scaleX;
  const northRoadY = 41 * scaleY;
  const southRoadY = -41 * scaleY;

  // Límites del bloque central interno (encerrado por el anillo de 4 vías)
  const innerLeftX = westRoadX + halfR;   // -60.5m
  const innerRightX = eastRoadX - halfR;  // +60.5m
  const innerTopY = northRoadY - halfR;   // +36.5m
  const innerBotY = southRoadY + halfR;   // -36.5m
  const innerHeight = innerTopY - innerBotY; // 73m divididos en 4 filas laterales

  const specs = new Map();

  // 1. FILA SUPERIOR NORTE: Lotes 15 al 06 (de izquierda a derecha, 10 lotes verticales de 20m x 30m)
  // Se extienden desde X = -100m hasta X = +100m, justo arriba de la Vía Norte (Y: +45.5m a +75.5m)
  const topRowY1 = northRoadY + halfR;
  const topRowY2 = topRowY1 + D;
  const topOrder = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6];
  topOrder.forEach((num, idx) => {
    const x1 = (-100 + idx * 20) * scaleX;
    const x2 = x1 + F;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana B',
      prefix: 'MB',
      x1,
      y1: topRowY1,
      x2,
      y2: topRowY2,
      orientation: 'vertical', // 20m frente (N-S) x 30m fondo
      lindero_norte: 'Línea perimetral norte del condominio',
      lindero_sur: 'Carretera interna norte',
      lindero_oriente: num === 6 ? 'Límite oriental del proyecto' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_occidente: num === 15 ? 'Límite occidental del proyecto' : `Lote L${String(num + 1).padStart(2, '0')}`,
    });
  });

  // 2. COLUMNA OCCIDENTAL (IZQUIERDA): Lotes 16, 17, 18, 19 (de arriba hacia abajo, 4 lotes horizontales de 30m x 20m)
  // Ubicados al occidente de la Vía Oeste (X: -99.5m a -69.5m), entre Vía Norte y Vía Sur
  const westColX2 = westRoadX - halfR;
  const westColX1 = westColX2 - D;
  const westLotStepY = innerHeight / 4;
  [16, 17, 18, 19].forEach((num, idx) => {
    const y2 = innerTopY - idx * westLotStepY;
    const y1 = y2 - westLotStepY;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana C',
      prefix: 'MC',
      x1: westColX1,
      y1,
      x2: westColX2,
      y2,
      orientation: 'horizontal', // 20m frente sobre vía oeste x 30m fondo
      lindero_norte: idx === 0 ? 'Acceso occidental / Lote L15' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_sur: idx === 3 ? 'Carretera interna sur' : `Lote L${String(num + 1).padStart(2, '0')}`,
      lindero_oriente: 'Carretera interna occidental',
      lindero_occidente: 'Reserva forestal occidental',
    });
  });

  // 3. FILA INFERIOR SUR: Lotes 20 al 27 (de izquierda a derecha, 8 lotes verticales de 20m x 30m)
  // Ubicados justo debajo de la Vía Sur (Y: -45.5m a -75.5m), desde X = -100m hasta X = +60m.
  // El Lote 25 (índice 5 -> X: 0m a +20m, Y: -75.5m a -45.5m) calza exactamente sobre la casa construida en Google Maps.
  const botRowY2 = southRoadY - halfR;
  const botRowY1 = botRowY2 - D;
  [20, 21, 22, 23, 24, 25, 26, 27].forEach((num, idx) => {
    const x1 = (-100 + idx * 20) * scaleX;
    const x2 = x1 + F;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana C',
      prefix: 'MC',
      x1,
      y1: botRowY1,
      x2,
      y2: botRowY2,
      orientation: 'vertical', // 20m frente sobre vía sur x 30m fondo
      lindero_norte: 'Carretera interna sur',
      lindero_sur: 'Cerca perimetral sur',
      lindero_oriente: num === 27 ? 'Carretera principal de acceso' : `Lote L${String(num + 1).padStart(2, '0')}`,
      lindero_occidente: num === 20 ? 'Bosque nativo suroccidental' : `Lote L${String(num - 1).padStart(2, '0')}`,
    });
  });

  // 4. BLOQUE CENTRAL INTERNO (Rodeado por las 4 carreteras):
  // 4a. Columna Interna Izquierda: Lotes 35, 36, 37, 38 (de arriba hacia abajo, 30m fondo x frente sobre Vía Oeste)
  const col35X1 = innerLeftX;
  const col35X2 = innerLeftX + D; // -60.5m a -30.5m
  [35, 36, 37, 38].forEach((num, idx) => {
    const y2 = innerTopY - idx * westLotStepY;
    const y1 = y2 - westLotStepY;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana D',
      prefix: 'MD',
      x1: col35X1,
      y1,
      x2: col35X2,
      y2,
      orientation: 'horizontal',
      lindero_norte: idx === 0 ? 'Carretera interna norte' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_sur: idx === 3 ? 'Carretera interna sur' : `Lote L${String(num + 1).padStart(2, '0')}`,
      lindero_oriente: idx === 0 ? 'Lote L34' : 'Área Social Central',
      lindero_occidente: 'Carretera interna occidental',
    });
  });

  // 4b. Columna Interna Derecha: Lotes 31, 30, 29, 28 (de arriba hacia abajo, 30m fondo x frente sobre Vía Este)
  const col31X2 = innerRightX;
  const col31X1 = innerRightX - D; // +30.5m a +60.5m
  [31, 30, 29, 28].forEach((num, idx) => {
    const y2 = innerTopY - idx * westLotStepY;
    const y1 = y2 - westLotStepY;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana D',
      prefix: 'MD',
      x1: col31X1,
      y1,
      x2: col31X2,
      y2,
      orientation: 'horizontal',
      lindero_norte: idx === 0 ? 'Carretera interna norte' : `Lote L${String(num + 1).padStart(2, '0')}`,
      lindero_sur: idx === 3 ? 'Carretera interna sur' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_oriente: 'Carretera principal oriental',
      lindero_occidente: idx === 0 ? 'Lote L32' : 'Área Social Central',
    });
  });

  // 4c. Fila Central Superior: Lotes 34, 33, 32 (de izquierda a derecha, entre Lote 35 y Lote 31)
  const centerMidSpanX = col31X1 - col35X2; // 61m divididos en 3 lotes de ~20.3m x 30m
  const lot34Width = centerMidSpanX / 3;
  const centerTopY2 = innerTopY;
  const centerTopY1 = innerTopY - D; // +36.5m a +6.5m
  [34, 33, 32].forEach((num, idx) => {
    const x1 = col35X2 + idx * lot34Width;
    const x2 = x1 + lot34Width;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana D',
      prefix: 'MD',
      x1,
      y1: centerTopY1,
      x2,
      y2: centerTopY2,
      orientation: 'vertical',
      lindero_norte: 'Carretera interna norte',
      lindero_sur: 'Área Social Central',
      lindero_oriente: num === 32 ? 'Lote L31' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_occidente: num === 34 ? 'Lote L35' : `Lote L${String(num + 1).padStart(2, '0')}`,
    });
  });

  // 4d. ÁREA SOCIAL (En toda la mitad, debajo de 34, 33 y 32, entre 36-38 y 28-30, frente a la Vía Sur)
  const socialAreaRect = {
    x1: col35X2,
    y1: innerBotY,
    x2: col31X1,
    y2: centerTopY1,
  };

  // 5. COLUMNA ORIENTAL (DERECHA): Lotes 5, 4, 3, 2, 1 + PORTERÍA (en la esquina inferior derecha)
  // Ubicados al oriente de la Vía Principal Este (X: +69.5m a +99.5m)
  // Lotes 5, 4, 3, 2 van desde innerTopY (+36.5m) hasta innerBotY (-36.5m), alineados con 31, 30, 29, 28
  const eastColX1 = eastRoadX + halfR;
  const eastColX2 = eastColX1 + D; // +69.5m a +99.5m
  [5, 4, 3, 2].forEach((num, idx) => {
    const y2 = innerTopY - idx * westLotStepY;
    const y1 = y2 - westLotStepY;
    specs.set(num, {
      numero_lote: num,
      manzana: 'Manzana A',
      prefix: 'MA',
      x1: eastColX1,
      y1,
      x2: eastColX2,
      y2,
      orientation: 'horizontal',
      lindero_norte: idx === 0 ? 'Carretera interna norte / Lote L06' : `Lote L${String(num + 1).padStart(2, '0')}`,
      lindero_sur: idx === 3 ? 'Cruce vial / Lote L01' : `Lote L${String(num - 1).padStart(2, '0')}`,
      lindero_oriente: 'Línea perimetral oriental',
      lindero_occidente: 'Carretera principal de acceso',
    });
  });

  // Lote 1: Debajo de la intersección de la Vía Sur, alineado con el borde superior de los lotes 20-27
  const lot1Y2 = botRowY2; // -45.5m
  const lot1Y1 = lot1Y2 - F; // -65.5m (20m de frente x 30m de fondo)
  specs.set(1, {
    numero_lote: 1,
    manzana: 'Manzana A',
    prefix: 'MA',
    x1: eastColX1,
    y1: lot1Y1,
    x2: eastColX2,
    y2: lot1Y2,
    orientation: 'horizontal',
    lindero_norte: 'Lote L02 / Cruce vial suroriental',
    lindero_sur: 'Portería Principal',
    lindero_oriente: 'Línea perimetral oriental',
    lindero_occidente: 'Carretera principal de acceso',
  });

  // PORTERÍA: Recuadro blanco ubicado justo debajo del Lote 1 en la entrada suroriental
  const porteriaRect = {
    x1: eastColX1,
    y1: lot1Y1 - 16 * scaleY,
    x2: eastColX2,
    y2: lot1Y1,
  };

  // 6. CARRETERAS / VÍAS DEL PROYECTO (Corredores exactos sobre las líneas viales de la captura satelital)
  const roads = {
    // Vía Norte (entre Lotes 15-06 arriba y Lotes 16, 35-31, 5 abajo)
    northPoly: rectToLatLngPolygon(westColX1, innerTopY, eastColX2, topRowY1, cfg),
    northLine: [
      metersToLatLng(westColX1, northRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
      metersToLatLng(eastColX2, northRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    ],
    // Vía Sur (entre Lotes 19, 38, Área Social, 28 arriba y Lotes 20-27 abajo)
    southPoly: rectToLatLngPolygon(westColX1, botRowY2, eastRoadX + halfR, innerBotY, cfg),
    southLine: [
      metersToLatLng(westColX1, southRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
      metersToLatLng(eastRoadX, southRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    ],
    // Vía Occidental (entre Lotes 16-19 a la izquierda y Lotes 35-38 a la derecha)
    westPoly: rectToLatLngPolygon(westColX2, botRowY2, innerLeftX, topRowY1, cfg),
    westLine: [
      metersToLatLng(westRoadX, northRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
      metersToLatLng(westRoadX, southRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    ],
    // Vía Principal Oriental (entra desde la Portería en el extremo suroriental y sube entre 27/28-31 y Portería/1-5)
    eastPoly: rectToLatLngPolygon(innerRightX, porteriaRect.y1, eastColX1, topRowY1, cfg),
    eastLine: [
      metersToLatLng(eastRoadX, porteriaRect.y1, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
      metersToLatLng(eastRoadX, northRoadY, cfg.center_lat, cfg.center_lng, cfg.rotation_deg),
    ],
  };

  // Perímetro general envolvente del condominio
  const pad = Number(cfg.perimeter_pad_m || 8);
  const minPerimX = -100 * scaleX - pad;
  const maxPerimX = eastColX2 + pad;
  const minPerimY = porteriaRect.y1 - pad;
  const maxPerimY = topRowY2 + pad;

  const perimeterCoords = rectToLatLngPolygon(minPerimX, minPerimY, maxPerimX, maxPerimY, cfg);

  return {
    specs,
    socialAreaRect,
    porteriaRect,
    roads,
    perimeterCoords,
    totalWidthM: Number((maxPerimX - minPerimX).toFixed(1)),
    totalHeightM: Number((maxPerimY - minPerimY).toFixed(1)),
  };
}

export function computeLoteoGeometry(config = {}, existingLots = []) {
  const cfg = {
    ...DEFAULT_LOTEO_CONFIG,
    ...config,
    center_lat: Number(config.center_lat ?? DEFAULT_LOTEO_CONFIG.center_lat),
    center_lng: Number(config.center_lng ?? DEFAULT_LOTEO_CONFIG.center_lng),
    rotation_deg: Number(config.rotation_deg ?? DEFAULT_LOTEO_CONFIG.rotation_deg),
    default_front_m: Number(config.default_front_m ?? DEFAULT_LOTEO_CONFIG.default_front_m),
    default_depth_m: Number(config.default_depth_m ?? DEFAULT_LOTEO_CONFIG.default_depth_m),
    gap_lotes_m: Number(config.gap_lotes_m ?? DEFAULT_LOTEO_CONFIG.gap_lotes_m),
    road_internal_m: Number(config.road_internal_m ?? DEFAULT_LOTEO_CONFIG.road_internal_m),
    road_main_m: Number(config.road_main_m ?? DEFAULT_LOTEO_CONFIG.road_main_m),
    perimeter_pad_m: Number(config.perimeter_pad_m ?? DEFAULT_LOTEO_CONFIG.perimeter_pad_m),
  };

  const lotByNumber = new Map();
  for (const l of existingLots) {
    lotByNumber.set(Number(l.numero_lote), l);
  }

  const master = buildStructuredMasterPlan(cfg);
  const computedLots = [];

  for (let numero_lote = 1; numero_lote <= 38; numero_lote++) {
    const spec = master.specs.get(numero_lote);
    const existing = lotByNumber.get(numero_lote) || {};
    const labelShort = `L${String(numero_lote).padStart(2, '0')}`;
    const codigo = `${spec.prefix}-${labelShort}`;

    let prevGeo = {};
    if (existing.coordenadas_geojson) {
      try {
        prevGeo =
          typeof existing.coordenadas_geojson === 'string'
            ? JSON.parse(existing.coordenadas_geojson)
            : existing.coordenadas_geojson;
      } catch {
        prevGeo = {};
      }
    }

    const customOffset = prevGeo.customOffset || { dx: 0, dy: 0 };
    const customSize = prevGeo.customSize || false;

    // Todos los lotes son nominalmente de 20m de frente x 30m de fondo = 600 m²
    const front = customSize && existing.frente_m ? Number(existing.frente_m) : cfg.default_front_m;
    const depth = customSize && existing.fondo_m ? Number(existing.fondo_m) : cfg.default_depth_m;
    const area = Number((front * depth).toFixed(2));
    
    // Determinación del precio total y precio por m2
    let precio_total;
    let precio_m2;
    if (existing.precio_total && Number(existing.precio_total) > 0) {
      precio_total = Number(existing.precio_total);
      precio_m2 = area > 0 ? Number((precio_total / area).toFixed(2)) : Number(existing.precio_m2 || cfg.default_precio_m2 || 150000);
    } else if (SPECIAL_LOT_PRICES[numero_lote]) {
      precio_total = SPECIAL_LOT_PRICES[numero_lote];
      precio_m2 = area > 0 ? Number((precio_total / area).toFixed(2)) : Number(cfg.default_precio_m2 || 150000);
    } else {
      precio_m2 = Number(existing.precio_m2 || cfg.default_precio_m2 || 150000);
      precio_total = Number((area * precio_m2).toFixed(2));
    }

    const dx = Number(customOffset.dx || 0);
    const dy = Number(customOffset.dy || 0);

    let x1 = spec.x1 + dx;
    let x2 = spec.x2 + dx;
    let y1 = spec.y1 + dy;
    let y2 = spec.y2 + dy;

    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    if (customSize) {
      const spanW = spec.orientation === 'horizontal' ? depth : front;
      const spanH = spec.orientation === 'horizontal' ? front : depth;
      x1 = cx - spanW / 2;
      x2 = cx + spanW / 2;
      y1 = cy - spanH / 2;
      y2 = cy + spanH / 2;
    }

    const coordinates = rectToLatLngPolygon(x1, y1, x2, y2, cfg);
    const [centerLat, centerLng] = metersToLatLng(
      cx,
      cy,
      cfg.center_lat,
      cfg.center_lng,
      cfg.rotation_deg
    );

    const defaultEstado = INITIAL_SOLD_LOTS.has(numero_lote) ? 'vendido' : 'disponible';

    computedLots.push({
      ...existing,
      numero_lote,
      labelShort,
      codigo,
      manzana: spec.manzana,
      frente_m: front,
      fondo_m: depth,
      area_m2: area,
      precio_m2,
      precio_total,
      estado: existing.estado || defaultEstado,
      lindero_norte: spec.lindero_norte,
      lindero_sur: spec.lindero_sur,
      lindero_oriente: spec.lindero_oriente,
      lindero_occidente: spec.lindero_occidente,
      latitud: centerLat,
      longitud: centerLng,
      coordenadas_geojson: {
        type: 'Polygon',
        orientation: spec.orientation,
        dimensions: { front, depth, area },
        customOffset: { dx, dy },
        customSize: Boolean(customSize),
        coordinates,
      },
    });
  }

  // Área Social (en la mitad del proyecto)
  const sRect = master.socialAreaRect;
  const socialAreaCoords = rectToLatLngPolygon(sRect.x1, sRect.y1, sRect.x2, sRect.y2, cfg);
  const socialAreaCenter = metersToLatLng(
    (sRect.x1 + sRect.x2) / 2,
    (sRect.y1 + sRect.y2) / 2,
    cfg.center_lat,
    cfg.center_lng,
    cfg.rotation_deg
  );

  // Portería (recuadro blanco debajo del Lote 1 en la esquina suroriental)
  const pRect = master.porteriaRect;
  const porteriaCoords = rectToLatLngPolygon(pRect.x1, pRect.y1, pRect.x2, pRect.y2, cfg);
  const porteriaPosition = metersToLatLng(
    (pRect.x1 + pRect.x2) / 2,
    (pRect.y1 + pRect.y2) / 2,
    cfg.center_lat,
    cfg.center_lng,
    cfg.rotation_deg
  );

  return {
    config: cfg,
    lots: computedLots,
    overlays: {
      perimeterCoords: master.perimeterCoords,
      socialAreaCoords,
      socialAreaCenter,
      porteriaCoords,
      porteriaPosition,
      roadPolygons: [
        master.roads.northPoly,
        master.roads.southPoly,
        master.roads.westPoly,
        master.roads.eastPoly,
      ],
      mainRoadLine: master.roads.eastLine,
      northInternalRoadLine: master.roads.northLine,
      southInternalRoadLine: master.roads.southLine,
      westInternalRoadLine: master.roads.westLine,
      totalWidthM: master.totalWidthM,
      totalHeightM: master.totalHeightM,
    },
  };
}
