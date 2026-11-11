import * as THREE from 'three';

const CACHE_BUST = 'v=3';

// key -> [carpeta Poly Haven, tamaño del tile en metros, color base inicial, props extra]
const PBR = {
  concrete: ['brushed_concrete', 3, '#d9d6d0', { color: '#d9d6d0', roughness: 0.85 }],
  plaster: ['white_plaster_02', 2.5, '#f4f1ea', { color: '#f4f1ea', roughness: 0.78 }],
  whiteBrick: ['white_bricks', 1.6, '#ece8e0', { roughness: 0.82 }],
  redBrick: ['brick_wall_001', 2, '#a85a42', { roughness: 0.85 }],
  stone: ['stone_wall', 2.5, '#8c877e', { roughness: 0.88 }],
  stackedStone: ['stacked_stone_wall', 2, '#7d776d', { roughness: 0.9 }],
  woodClad: ['brown_planks_07', 2.2, '#9e6b43', { roughness: 0.75 }],
  darkWood: ['dark_wooden_planks', 2.2, '#4a3525', { roughness: 0.75 }],
  roofGrey: ['grey_roof_tiles', 2, '#4a4d50', { roughness: 0.8 }],
  roofClay: ['clay_roof_tiles', 2, '#b55d3d', { roughness: 0.8 }],
  roofSlate: ['roof_slates_02', 2, '#6f7275', { color: '#8f8f8f', roughness: 0.78 }],
  deck: ['wood_floor_deck', 2.5, '#8c5e3c', { roughness: 0.76 }],
  woodFloor: ['wood_floor', 2.5, '#a67853', { roughness: 0.7 }],
  pavers: ['concrete_pavers', 2.5, '#9e9b95', { roughness: 0.85 }],
  grass: ['leafy_grass', 3.5, '#6e854c', { color: '#c8d4b0', roughness: 0.95 }],
  forest: ['forest_ground_04', 4, '#5c6b43', { roughness: 0.95 }],
  gravel: ['gravel', 2, '#8c8982', { roughness: 0.92 }],
  poolTile: ['blue_floor_tiles_01', 1.2, '#2fb7d6', { emissive: '#2fb7d6', emissiveIntensity: 0, roughness: 0.35 }],
  metal: ['metal_plate', 1, '#9a9a9a', { metalness: 0.8, roughness: 0.35, color: '#9a9a9a' }],
};

let MATS = null;

function configureTex(t, tile, isColor) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = 8;
  t.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
}

function build() {
  const m = {};
  const loader = new THREE.TextureLoader();

  for (const [key, [dir, tile, baseColor, extra]] of Object.entries(PBR)) {
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85,
      metalness: 0,
      ...extra,
    });
    mat.name = key;
    m[key] = mat;

    // Carga asíncrona no bloqueante de cada mapa PBR
    loader.load(
      `/textures/${dir}/diff.jpg?${CACHE_BUST}`,
      (t) => {
        configureTex(t, tile, true);
        mat.map = t;
        mat.color.set(extra.color || '#ffffff');
        mat.needsUpdate = true;
        if (key === 'plaster') {
          if (m.slab) {
            m.slab.map = t;
            m.slab.needsUpdate = true;
          }
          if (m.interiorWall) {
            m.interiorWall.map = t;
            m.interiorWall.needsUpdate = true;
          }
        }
      },
      undefined,
      () => {}
    );

    loader.load(
      `/textures/${dir}/nor.jpg?${CACHE_BUST}`,
      (t) => {
        configureTex(t, tile, false);
        mat.normalMap = t;
        mat.needsUpdate = true;
        if (key === 'plaster') {
          if (m.slab) {
            m.slab.normalMap = t;
            m.slab.needsUpdate = true;
          }
          if (m.interiorWall) {
            m.interiorWall.normalMap = t;
            m.interiorWall.needsUpdate = true;
          }
        }
      },
      undefined,
      () => {}
    );

    loader.load(
      `/textures/${dir}/rough.jpg?${CACHE_BUST}`,
      (t) => {
        configureTex(t, tile, false);
        mat.roughnessMap = t;
        mat.roughness = 1;
        mat.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    loader.load(
      `/textures/${dir}/ao.jpg?${CACHE_BUST}`,
      (t) => {
        configureTex(t, tile, false);
        mat.aoMap = t;
        mat.aoMapIntensity = 1;
        mat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
  }

  // Losas y aleros (estuco más blanco)
  m.slab = m.plaster.clone();
  m.slab.color = new THREE.Color('#fbf9f4');

  // Interiores
  m.interiorWall = m.plaster.clone();
  m.interiorWall.color = new THREE.Color('#efe9df');

  // Carpintería de ventanas (color configurable)
  m.frame = new THREE.MeshStandardMaterial({ color: '#18181a', metalness: 0.65, roughness: 0.35 });

  // Vidrio arquitectónico: reflejos del HDRI con leve tinte
  m.glass = new THREE.MeshPhysicalMaterial({
    color: '#bfd3d6',
    metalness: 0,
    roughness: 0.03,
    transparent: true,
    opacity: 0.28,
    envMapIntensity: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Agua de piscina
  m.water = new THREE.MeshPhysicalMaterial({
    color: '#3aa6b9',
    roughness: 0.04,
    metalness: 0.05,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.4,
    clearcoat: 1,
    depthWrite: false,
  });

  // Paneles de luz en cielorrasos (se encienden de noche → bloom)
  m.lightPanel = new THREE.MeshStandardMaterial({
    color: '#fff6e6',
    emissive: '#ffcf8a',
    emissiveIntensity: 0.2,
    toneMapped: false,
  });

  // Luminaria exterior (faroles, apliques)
  m.lamp = new THREE.MeshStandardMaterial({
    color: '#fff0d6',
    emissive: '#ffb860',
    emissiveIntensity: 0,
    toneMapped: false,
  });

  m.black = new THREE.MeshStandardMaterial({ color: '#202022', roughness: 0.6, metalness: 0.3 });
  m.fabric = new THREE.MeshStandardMaterial({ color: '#d8d0c2', roughness: 0.95 });
  return m;
}

export function useMaterials() {
  if (!MATS) MATS = build();
  return MATS;
}

export const getMaterials = () => {
  if (!MATS) MATS = build();
  return MATS;
};

// ---------- Geometrías con UV en metros (texturas sin estirar y continuas) ----------
const boxCache = new Map();
const r = (n) => Math.round(n * 100) / 100;

export function worldBox(w, h, d, ox = 0, oy = 0, oz = 0) {
  const key = [w, h, d, ox, oy, oz].map(r).join('|');
  let g = boxCache.get(key);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const y = pos.getY(i) + oy;
    const z = pos.getZ(i) + oz;
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (nx > 0.5) uv.setXY(i, z, y);
    else if (ny > 0.5) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
  return (boxCache.set(key, g), g);
}

export function worldPlane(w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
  uv.needsUpdate = true;
  return g;
}

export function worldCircle(radius, segments = 96) {
  const g = new THREE.CircleGeometry(radius, segments);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
  uv.needsUpdate = true;
  return g;
}

// Prisma triangular (hastial) extruido: base w, altura h, espesor t
const triCache = new Map();
export function gableGeometry(w, h, t) {
  const key = [w, h, t].map(r).join('|');
  if (triCache.has(key)) return triCache.get(key);
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  triCache.set(key, g);
  return g;
}
