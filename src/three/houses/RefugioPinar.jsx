import { useMemo } from 'react';
import * as THREE from 'three';
import { useMaterials } from '../materials';
import { Block, Wall, Glass, GableRoof, Gable, NightLight, Model, Ground, Railing } from '../parts';
import { useStore } from '../../store';

// Refugio Pinar — cabaña en A entre pinos. Frente hacia +Z.
const BASE = 0.7;
const HALF = 4.5;
const RISE = 7.8;

/** Fachada triangular de vidrio con carpintería. Origen: centro de la base. */
function TriangleGlass({ w, rise, position, transomY = 3.0 }) {
  const m = useMaterials();
  const glassGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, rise);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [w, rise]);
  const a = Math.atan2(rise, w / 2);
  const edge = Math.hypot(w / 2, rise);
  const hAt = (x) => rise * (1 - Math.abs(x) / (w / 2));
  const verts = [-w / 4, 0, w / 4];
  const tw = w * (1 - transomY / rise);
  const p = 0.08;
  return (
    <group position={position}>
      <mesh geometry={glassGeo} material={m.glass} renderOrder={2} />
      <mesh position={[0, p / 2, 0]} material={m.frame} castShadow>
        <boxGeometry args={[w, p, 0.1]} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={`e${s}`} position={[(s * w) / 4, rise / 2, 0]} rotation={[0, 0, s > 0 ? Math.PI - a : a]}>
          <mesh material={m.frame} castShadow>
            <boxGeometry args={[edge, p, 0.1]} />
          </mesh>
        </group>
      ))}
      {verts.map((x) => (
        <mesh key={x} position={[x, hAt(x) / 2, 0]} material={m.frame} castShadow>
          <boxGeometry args={[p * 0.8, hAt(x), 0.09]} />
        </mesh>
      ))}
      <mesh position={[0, transomY, 0]} material={m.frame} castShadow>
        <boxGeometry args={[tw, p * 0.8, 0.09]} />
      </mesh>
    </group>
  );
}

const TREES = [
  ['pine_tree_01', -12, -6, 0, 1], ['pine_tree_01', -16, 4, 1.2, 0.9], ['fir_tree_01', -10, -14, 2, 1],
  ['pine_tree_01', 3, -15, 0.4, 1.1], ['fir_tree_01', 13, -12, 3, 0.9], ['pine_tree_01', 17, -2, 1, 1],
  ['fir_tree_01', 18, 9, 0.7, 0.85], ['pine_tree_01', -20, 13, 2.2, 1.05], ['fir_tree_01', -7, -22, 1, 1.1],
  ['pine_tree_01', 10, -24, 2.5, 1], ['fir_tree_01', -24, -8, 0.2, 1], ['fir_tree_01', 24, 2, 1.4, 1.1],
];

export default function RefugioPinar() {
  const m = useMaterials();
  const facadeKey = useStore((s) => s.facades.pinar);
  const f = m[facadeKey];
  const R = Math.PI / 2;
  const mezzW = HALF * 2 * (1 - 3.1 / RISE) - 0.4;

  return (
    <group>
      <Ground mat={m.forest} />

      {/* zócalo de piedra */}
      <Block size={[9.4, BASE, 10.2]} position={[0, BASE / 2, 0]} mat={m.stone} />

      {/* cubierta en A */}
      <GableRoof w={HALF * 2} d={9.6} rise={RISE} baseY={BASE} overhang={0.45} thickness={0.3} mat={m.roofSlate} fascia={m.darkWood} />

      {/* fachada de vidrio */}
      <TriangleGlass w={HALF * 2 - 0.3} rise={RISE - 0.25} position={[0, BASE, 4.7]} />
      {/* hastial trasero */}
      <Gable w={HALF * 2} rise={RISE} t={0.3} mat={f} position={[0, BASE, -4.8]} />

      {/* interior */}
      <Block size={[8.6, 0.04, 9.4]} position={[0, BASE + 0.02, 0]} mat={m.woodFloor} cast={false} />
      <Block size={[mezzW, 0.25, 5]} position={[0, BASE + 3.1, -2.1]} mat={m.woodFloor} />
      <Glass w={mezzW - 0.2} h={1} position={[0, BASE + 3.22, 0.4]} noFrameBottom />
      <Block size={[3.6, 1.6, 0.6]} position={[0, BASE + 0.8, -4.3]} mat={m.stackedStone} />
      <Block size={[0.02, 2.4, 0.02]} position={[0, BASE + 6.2, 2]} mat={m.black} cast={false} />
      <mesh position={[0, BASE + 4.95, 2]} material={m.lamp}>
        <sphereGeometry args={[0.25, 24, 16]} />
      </mesh>
      <NightLight position={[0, BASE + 2.4, 1.5]} intensity={50} />
      <NightLight position={[0, BASE + 5, -2]} intensity={25} />
      <Model id="sofa_03" position={[0, BASE + 0.04, -0.2]} />
      <Model id="modern_coffee_table_01" position={[0, BASE + 0.04, 1.5]} />
      <Model id="potted_plant_02" position={[-2.6, BASE + 0.04, 3.6]} />

      {/* ---------- ESTUDIO ANEXO ---------- */}
      <Block size={[4.4, 0.4, 5.4]} position={[7.2, 0.2, -1.5]} mat={m.stone} />
      <Wall w={4} h={2.8} mat={f} position={[7.2, 0.4, 1.05]} uvBase={[0, 0.4, 0]}
        openings={[{ x: 0, y: 0, w: 2.4, h: 2.3, mullions: 1 }]} />
      <Wall w={4} h={2.8} mat={f} position={[7.2, 0.4, -4.05]} uvBase={[0, 0.4, 0]} />
      <Wall w={4.8} h={2.8} mat={f} position={[9.05, 0.4, -1.5]} rotation={[0, R, 0]} uvBase={[0, 0.4, 0]}
        openings={[{ x: 0, y: 0.9, w: 2, h: 1.3, mullions: 1 }]} />
      <Wall w={4.8} h={2.8} mat={f} position={[5.35, 0.4, -1.5]} rotation={[0, R, 0]} uvBase={[0, 0.4, 0]} />
      <Block size={[4.8, 0.25, 5.8]} position={[7.2, 3.32, -1.5]} mat={m.roofSlate} />
      <NightLight position={[7.2, 2.4, -1.5]} intensity={22} />
      <Block size={[1.6, 0.03, 0.15]} position={[7.2, 3.17, -1.5]} mat={m.lightPanel} cast={false} receive={false} />

      {/* ---------- DECK ---------- */}
      <Block size={[11, 0.15, 4.2]} position={[0, BASE - 0.075, 7.1]} mat={m.deck} />
      {[-5, -1.7, 1.7, 5].map((x) => [5.3, 8.9].map((z) => (
        <Block key={`${x}${z}`} size={[0.18, BASE - 0.15, 0.18]} position={[x, (BASE - 0.15) / 2, z]} mat={m.darkWood} />
      )))}
      <Railing len={4.2} position={[-5.45, BASE, 7.1]} rotation={[0, R, 0]} mat={m.darkWood} />
      <Railing len={4.2} position={[5.45, BASE, 7.1]} rotation={[0, R, 0]} mat={m.darkWood} />
      <Railing len={3.6} position={[-3.6, BASE, 9.15]} mat={m.darkWood} />
      <Railing len={3.6} position={[3.6, BASE, 9.15]} mat={m.darkWood} />
      {[0, 1, 2].map((i) => (
        <Block key={i} size={[3, 0.2, 0.4]} position={[0, BASE - 0.25 - i * 0.2, 9.4 + i * 0.4]} mat={m.deck} />
      ))}
      <Model id="mid_century_lounge_chair" position={[-3, BASE, 7.3]} rotation={[0, 0.6, 0]} />
      <Model id="mid_century_lounge_chair" position={[3.2, BASE, 7.3]} rotation={[0, -0.6, 0]} />
      {[-5.45, 5.45].map((x) => (
        <mesh key={x} position={[x, BASE + 1.08, 9.1]} material={m.lamp}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
        </mesh>
      ))}
      <NightLight position={[0, BASE + 2.5, 7]} intensity={10} distance={8} />

      {/* ---------- BOSQUE ---------- */}
      {TREES.map(([id, x, z, r, s], i) => (
        <Model key={i} id={id} position={[x, 0, z]} rotation={[0, r, 0]} scale={s} />
      ))}
      {[[-7, 6, 1], [8, 6, 0.8], [-9, -3, 1.3], [11, 4, 1]].map(([x, z, s], i) => (
        <Model key={`b${i}`} id="boulder_01" position={[x, 0, z]} rotation={[0, i * 2, 0]} scale={s} />
      ))}
      {[[-6, 9], [6.5, 9.5], [-8, 1], [10.5, -5], [-4, -7]].map(([x, z], i) => (
        <Model key={`s${i}`} id={i % 2 ? 'shrub_02' : 'shrub_04'} position={[x, 0, z]} rotation={[0, i, 0]} scale={1.1} />
      ))}
    </group>
  );
}
