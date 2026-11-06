import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

// key -> [carpeta Poly Haven, tamaño del tile en metros, props extra]
const PBR = {
  concrete: ['brushed_concrete', 3, { color: '#d9d6d0' }],
  plaster: ['white_plaster_02', 2.5, { color: '#f4f1ea' }],
  whiteBrick: ['white_bricks', 1.6, {}],
  redBrick: ['brick_wall_001', 2, {}],
  stone: ['stone_wall', 2.5, {}],
  stackedStone: ['stacked_stone_wall', 2, {}],
  woodClad: ['brown_planks_07', 2.2, {}],
  darkWood: ['dark_wooden_planks', 2.2, {}],
  roofGrey: ['grey_roof_tiles', 2, {}],
  roofClay: ['clay_roof_tiles', 2, {}],
  roofSlate: ['roof_slates_02', 2, { color: '#8f8f8f' }],
  deck: ['wood_floor_deck', 2.5, {}],
  woodFloor: ['wood_floor', 2.5, {}],
  pavers: ['concrete_pavers', 2.5, {}],
  grass: ['leafy_grass', 3.5, { color: '#c8d4b0' }],
  forest: ['forest_ground_04', 4, {}],
  gravel: ['gravel', 2, {}],
  poolTile: ['blue_floor_tiles_01', 1.2, { emissive: '#2fb7d6', emissiveIntensity: 0 }],
  metal: ['metal_plate', 1, { metalness: 0.8, color: '#9a9a9a' }],
};

const PATHS = {};
for (const [key, [dir]] of Object.entries(PBR)) {
  PATHS[`${key}_diff`] = `/textures/${dir}/diff.jpg`;
  PATHS[`${key}_nor`] = `/textures/${dir}/nor.jpg`;
  PATHS[`${key}_rough`] = `/textures/${dir}/rough.jpg`;
  PATHS[`${key}_ao`] = `/textures/${dir}/ao.jpg`;
}

let MATS = null;

function build(tex) {
  const m = {};
  for (const [key, [, tile, extra]] of Object.entries(PBR)) {
    const maps = ['diff', 'nor', 'rough', 'ao'].map((s) => tex[`${key}_${s}`]);
    maps.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / tile, 1 / tile);
      t.anisotropy = 8;
      t.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
    });
    m[key] = new THREE.MeshStandardMaterial({
      map: maps[0],
      normalMap: maps[1],
      roughnessMap: maps[2],
      aoMap: maps[3],
      aoMapIntensity: 1,
      roughness: 1,
      metalness: 0,
      ...extra,
    });
    m[key].name = key;
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
  const tex = useTexture(PATHS);
  if (!MATS) MATS = build(tex);
  return MATS;
}

export const getMaterials = () => MATS;

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
  boxCache.set(key, g);
  return g;
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
