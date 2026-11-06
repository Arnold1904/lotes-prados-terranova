// Descarga assets CC0 de Poly Haven (https://polyhaven.com) a /public.
// Uso: node scripts/fetch-assets.mjs
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const UA = { 'User-Agent': 'AurumResidencesLanding/1.0' };
const PUB = path.resolve('public');

const HDRIS = {
  day: 'kloofendal_48d_partly_cloudy_puresky',
  night: 'qwantani_dusk_2_puresky',
};

// id -> resolución
const TEXTURES = {
  brushed_concrete: '1k',
  white_plaster_02: '1k',
  white_bricks: '1k',
  brick_wall_001: '1k',
  brown_planks_07: '1k',
  dark_wooden_planks: '1k',
  stone_wall: '1k',
  stacked_stone_wall: '1k',
  grey_roof_tiles: '1k',
  clay_roof_tiles: '1k',
  roof_slates_02: '1k',
  wood_floor_deck: '1k',
  wood_floor: '1k',
  concrete_pavers: '1k',
  leafy_grass: '2k',
  gravel: '1k',
  blue_floor_tiles_01: '1k',
  metal_plate: '1k',
  forest_ground_04: '1k',
};

const MODELS = [
  'jacaranda_tree',
  'island_tree_02',
  'pine_tree_01',
  'fir_tree_01',
  'shrub_01',
  'shrub_02',
  'shrub_04',
  'potted_plant_01',
  'potted_plant_02',
  'sofa_03',
  'modern_coffee_table_01',
  'mid_century_lounge_chair',
  'outdoor_table_chair_set_01',
  'boulder_01',
  'street_lamp_02',
];

const credits = [];

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function exists(p, size) {
  try {
    const s = await stat(p);
    return !size || s.size === size;
  } catch {
    return false;
  }
}

async function download(entry, dest) {
  if (await exists(dest, entry.size)) return 'cached';
  const r = await fetch(entry.url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${entry.url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (entry.md5) {
    const md5 = createHash('md5').update(buf).digest('hex');
    if (md5 !== entry.md5) throw new Error(`MD5 mismatch ${dest}`);
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `${(buf.length / 1e6).toFixed(1)}MB`;
}

async function fetchHdri(key, id) {
  const f = await json(`https://api.polyhaven.com/files/${id}`);
  const e = f.hdri['2k'].hdr;
  const res = await download(e, `${PUB}/hdri/${key}.hdr`);
  credits.push(`HDRI ${id}`);
  console.log(`hdri ${key} (${id}) ${res}`);
}

async function fetchTexture(id, res) {
  const f = await json(`https://api.polyhaven.com/files/${id}`);
  const maps = { diff: f.Diffuse, nor: f.nor_gl, rough: f.Rough, ao: f.AO };
  for (const [name, m] of Object.entries(maps)) {
    if (!m) continue;
    const r = m[res] || m['1k'];
    const e = r.jpg || r.png;
    const ext = r.jpg ? 'jpg' : 'png';
    await download(e, `${PUB}/textures/${id}/${name}.${ext}`);
  }
  credits.push(`Texture ${id}`);
  console.log(`texture ${id} ok`);
}

async function fetchModel(id) {
  const f = await json(`https://api.polyhaven.com/files/${id}`);
  const g = f.gltf['1k'].gltf;
  const dir = `${PUB}/models/${id}`;
  await download(g, `${dir}/${id}.gltf`);
  for (const [rel, e] of Object.entries(g.include || {})) {
    await download(e, `${dir}/${rel}`);
  }
  credits.push(`Model ${id}`);
  console.log(`model ${id} ok`);
}

async function pool(tasks, n = 6) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < tasks.length) {
        const t = tasks[i++];
        try {
          await t();
        } catch (e) {
          console.error('FAIL', e.message);
          out.push(e);
        }
      }
    })
  );
  return out;
}

const tasks = [
  ...Object.entries(HDRIS).map(([k, id]) => () => fetchHdri(k, id)),
  ...Object.entries(TEXTURES).map(([id, r]) => () => fetchTexture(id, r)),
  ...MODELS.map((id) => () => fetchModel(id)),
];

const errors = await pool(tasks);
await writeFile(
  `${PUB}/CREDITS.md`,
  `# Créditos\n\nTodos los assets 3D, texturas y HDRIs provienen de [Poly Haven](https://polyhaven.com) bajo licencia CC0.\n\n${credits
    .sort()
    .map((c) => `- ${c}`)
    .join('\n')}\n`
);
console.log(errors.length ? `\n${errors.length} errores` : '\nTodos los assets descargados ✔');
process.exit(errors.length ? 1 : 0);
