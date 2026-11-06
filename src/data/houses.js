// Datos de los modelos de casas campestres para construir sobre lotes de 20 × 30 m (600 m²)
// en el Condominio Campestre Prados de Terranova (Km 7 Vía Yopal - Aguazul, margen derecha).
export const PROJECT_INFO = {
  name: 'Prados de Terranova',
  fullName: 'Condominio Campestre Prados de Terranova',
  locationShort: 'Km 7 Vía Yopal - Aguazul · Margen Derecha',
  locationDetail:
    'Kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal',
  lotAreaText: '600 m² (20 × 30 m)',
  servicesText: 'Servicios de agua y luz · Escrituras legales individuales',
  phoneDisplay: '311 514 8526',
  phoneClean: '3115148526',
  whatsappUrl:
    'https://wa.me/573115148526?text=Hola%2C%20deseo%20informaci%C3%B3n%20sobre%20los%20lotes%20campestres%20de%20600%20m%C2%B2%20en%20Prados%20de%20Terranova%20(Km%207%20v%C3%ADa%20Yopal%20-%20Aguazul)',
  summaryBanner:
    'Lotes campestres ubicados en el kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal. Área de 600 m² (20 × 30 m), servicios de agua y luz, escrituras legales individuales. Informes Cel. 311 514 8526.',
};

export const FACADE_MATERIALS = {
  concrete: { label: 'Concreto pulido', swatch: '/textures/brushed_concrete/diff.jpg' },
  plaster: { label: 'Estuco blanco', swatch: '/textures/white_plaster_02/diff.jpg' },
  whiteBrick: { label: 'Ladrillo blanco', swatch: '/textures/white_bricks/diff.jpg' },
  redBrick: { label: 'Ladrillo rústico', swatch: '/textures/brick_wall_001/diff.jpg' },
  stone: { label: 'Piedra natural', swatch: '/textures/stone_wall/diff.jpg' },
  stackedStone: { label: 'Piedra laja', swatch: '/textures/stacked_stone_wall/diff.jpg' },
  woodClad: { label: 'Listón de madera', swatch: '/textures/brown_planks_07/diff.jpg' },
  darkWood: { label: 'Madera quemada', swatch: '/textures/dark_wooden_planks/diff.jpg' },
};

export const FRAME_COLORS = {
  black: { label: 'Negro mate', color: '#18181a' },
  bronze: { label: 'Bronce', color: '#6e5238' },
  white: { label: 'Blanco', color: '#e9e6df' },
};

export const HOUSES = [
  {
    id: 'villa',
    name: 'Villa Solaris',
    tagline: 'Diseño campestre en U con piscina central para tu lote de 600 m² (20 × 30 m)',
    location: 'Km 7 Vía Yopal - Aguazul · Margen Derecha (A 300m de la vía principal)',
    price: 150000000,
    area: 360,
    lot: 600,
    beds: 4,
    baths: 4.5,
    parking: 2,
    year: 2026,
    description:
      'Lotes campestres ubicados en el kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal, con área de 600 m² (20 × 30 m). Cuentan con servicios de agua y luz, escrituras legales individuales, portería y área social. Informes al Cel. 311 514 8526.',
    facadeOptions: ['concrete', 'plaster', 'stone', 'whiteBrick'],
    defaultFacade: 'concrete',
    center: [0, 2.6, 0],
    radius: 1.15,
    hotspots: [
      { id: 'pool', title: 'Lote de 600 m² (20 × 30 m) & Piscina', text: 'Terreno campestre plano de 600 m² con servicios de agua y luz listos para construir tu piscina y zona social.', pos: [0, 0.6, -1.7], cam: [0, 5.5, 13] },
      { id: 'living', title: 'Escrituras Legales Individuales', text: 'Cada uno de los 38 lotes cuenta con matrícula y escritura pública individual lista para traspaso o financiación directa.', pos: [0, 1.8, -7.2], cam: [-3, 3.2, 5] },
      { id: 'bbq', title: 'Quincho & BBQ Campestre', text: 'Amplio espacio para kiosco llanero, BBQ y terraza cubierta con conexión a redes de agua y energía eléctrica.', pos: [6.3, 1.4, 5.6], cam: [12, 3.5, 13] },
      { id: 'garden', title: 'A 300 m de la Vía Principal', text: 'Ubicación estratégica en el Km 7 vía Yopal - Aguazul margen derecha, con acceso rápido, portería y área social.', pos: [-5.4, 1.0, 8.6], cam: [-12, 4.5, 18] },
    ],
  },
  {
    id: 'alameda',
    name: 'Casa Alameda',
    tagline: 'Arquitectura tradicional campestre sobre lote de 600 m² con agua y luz',
    location: 'Km 7 Vía Yopal - Aguazul · Margen Derecha (A 300m de la vía principal)',
    price: 150000000,
    area: 310,
    lot: 600,
    beds: 3,
    baths: 3.5,
    parking: 2,
    year: 2026,
    description:
      'Modelo campestre ideal para construir en tu lote de 600 m² en Prados de Terranova (Km 7 vía Yopal - Aguazul margen derecha, a 300 m de la vía principal). Con servicios de agua y luz y escrituras legales individuales. Informes Cel. 311 514 8526.',
    facadeOptions: ['whiteBrick', 'redBrick', 'plaster', 'woodClad'],
    defaultFacade: 'whiteBrick',
    center: [2.5, 3.5, 0],
    radius: 1,
    hotspots: [
      { id: 'living', title: 'Salón Campestre Doble Altura', text: 'Diseño fresco e iluminado para el clima de Yopal - Aguazul sobre lote de 600 m².', pos: [0, 2, 3.2], cam: [1, 3, 14] },
      { id: 'fireplace', title: 'Servicios de Agua y Luz', text: 'Lotes entregados con disponibilidad inmediata de servicios de agua y energía eléctrica.', pos: [-5.8, 3.5, -1], cam: [-14, 5, 8] },
      { id: 'porch', title: 'Porche Llanero Cubierto', text: 'Corredor exterior amplio conectado con los jardines de tu terreno de 20 × 30 metros.', pos: [8, 1.4, 4.6], cam: [14, 3, 14] },
      { id: 'kitchen', title: 'Escritura Legal Individual', text: 'Seguridad jurídica garantizada con escrituras legales individuales. Informes: 311 514 8526.', pos: [8, 1.6, 0], cam: [16, 4, 9] },
    ],
  },
  {
    id: 'pinar',
    name: 'Refugio Pinar',
    tagline: 'Cabaña campestre moderna en lote de 600 m² con escrituras individuales',
    location: 'Km 7 Vía Yopal - Aguazul · Margen Derecha (A 300m de la vía principal)',
    price: 150000000,
    area: 185,
    lot: 600,
    beds: 2,
    baths: 2,
    parking: 2,
    year: 2026,
    description:
      'Una cabaña campestre de descanso pensada para tu lote de 600 m² en el Km 7 vía Yopal - Aguazul margen derecha, a solo 300 metros de la vía principal. Cuenta con servicios de agua y luz y escrituras legales individuales. Informes Cel. 311 514 8526.',
    facadeOptions: ['darkWood', 'woodClad', 'stackedStone', 'plaster'],
    defaultFacade: 'darkWood',
    center: [1.5, 3.5, 0],
    radius: 0.9,
    hotspots: [
      { id: 'living', title: 'Fachada Panorámica', text: 'Vista hacia las zonas verdes de tu lote de 600 m² en Prados de Terranova.', pos: [0, 2, 3], cam: [2, 2.5, 15] },
      { id: 'mezz', title: 'Mezzanine Privado', text: 'Segundo nivel con vista a la sabana casanareña, a 300 m de la vía principal Yopal - Aguazul.', pos: [0, 5, 2], cam: [-5, 6, 14] },
      { id: 'deck', title: 'Deck & Zona Social', text: 'Terreno de 20 × 30 m con servicios de agua y luz y acceso al Área Social del condominio.', pos: [3, 1.2, 7.2], cam: [10, 3.5, 16] },
      { id: 'studio', title: 'Inversión Segura', text: 'Escrituras legales individuales y financiación directa. Informes al Cel. 311 514 8526.', pos: [6.6, 1.8, -1.5], cam: [16, 4, 6] },
    ],
  },
];

export const HOUSE_BY_ID = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

// Encuadres de cámara por sección (offset desde el centro de la casa).
export const SHOTS = {
  hero: { pos: [11, 7.5, 22], shift: -4.2 },
  lotes: { pos: [0, 19, 26], shift: 0 },
  catalog: { pos: [-17, 11, 20], shift: 4.8 },
  configurator: { pos: [3, 4.5, 21], shift: -4.8 },
  details: { pos: [17, 7, 13], shift: 4.5 },
  contact: { pos: [-14, 3.5, 18], shift: 4.5 },
};

export const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export const formatPrice = (n) => formatCOP(n);
