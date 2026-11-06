// Optimiza los glTF de Poly Haven para web: simplificación + meshopt + texturas WebP.
// Uso: node scripts/optimize-models.mjs  (tras fetch-assets)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('public/models');
// ratio de simplificación (1 = sin simplificar). Los árboles vienen con millones de triángulos.
const RATIOS = {
  jacaranda_tree: 0.03,
  pine_tree_01: 0.012,
  fir_tree_01: 0.02,
  island_tree_02: 0.08,
  shrub_01: 0.25,
  shrub_02: 0.25,
  shrub_04: 0.25,
  boulder_01: 0.2,
};

const dirs = readdirSync(SRC).filter((d) => statSync(path.join(SRC, d)).isDirectory());
for (const id of dirs) {
  const input = path.join(SRC, id, `${id}.gltf`);
  const output = path.join(SRC, `${id}.glb`);
  if (!existsSync(input)) continue;
  const ratio = RATIOS[id] ?? 1;
  const args = [
    'gltf-transform', 'optimize', input, output,
    '--compress', 'meshopt',
    '--texture-compress', 'webp',
    '--texture-size', id.includes('tree') ? '1024' : '512',
  ];
  if (ratio < 1) args.push('--simplify-ratio', String(ratio), '--simplify-error', '0.03');
  else args.push('--simplify', 'false');
  console.log(`→ ${id} (ratio ${ratio})`);
  execFileSync('npx', args, { stdio: 'inherit', maxBuffer: 1 << 30 });
  rmSync(path.join(SRC, id), { recursive: true, force: true });
}
console.log('Modelos optimizados ✔');
