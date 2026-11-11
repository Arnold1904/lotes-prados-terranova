import { Component, Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useMaterials, worldBox, gableGeometry } from './materials';

// Estado global de iluminación (0 = día, 1 = noche), animado en <Lighting/>
export const lightState = { night: 0 };

/** Caja con UVs en metros. uv = offset para continuidad de textura entre piezas. */
export function Block({ size, position = [0, 0, 0], uv, mat, cast = true, receive = true, ...rest }) {
  const o = uv ?? position;
  const geo = worldBox(size[0], size[1], size[2], o[0], o[1], o[2]);
  return <mesh geometry={geo} material={mat} position={position} castShadow={cast} receiveShadow={receive} {...rest} />;
}

/** Paño de vidrio con marco. Origen: centro inferior. */
export function Glass({ w, h, position, rotation, mullions = 0, transoms = [], profile = 0.06, depth = 0.09, noFrameBottom = false }) {
  const m = useMaterials();
  const bars = [];
  const p = profile;
  bars.push([[w, p, depth], [0, h - p / 2, 0]]);
  if (!noFrameBottom) bars.push([[w, p, depth], [0, p / 2, 0]]);
  bars.push([[p, h, depth], [-w / 2 + p / 2, h / 2, 0]]);
  bars.push([[p, h, depth], [w / 2 - p / 2, h / 2, 0]]);
  for (let i = 1; i <= mullions; i++) {
    const x = -w / 2 + (w * i) / (mullions + 1);
    bars.push([[p * 0.8, h, depth * 0.9], [x, h / 2, 0]]);
  }
  transoms.forEach((y) => bars.push([[w, p * 0.8, depth * 0.9], [0, y, 0]]));
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} material={m.glass} renderOrder={2}>
        <boxGeometry args={[w - p, h - p, 0.02]} />
      </mesh>
      {bars.map(([s, pos], i) => (
        <mesh key={i} position={pos} material={m.frame} castShadow>
          <boxGeometry args={s} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Muro con vanos acristalados. Origen: centro inferior; el muro corre en X, espesor en Z.
 * openings: [{ x, y, w, h, mullions, transoms, glass=true }]  (x = centro, y = antepecho)
 */
export function Wall({ w, h, t = 0.3, mat, openings = [], position, rotation, uvBase = [0, 0, 0] }) {
  const pieces = [];
  const ops = [...openings].sort((a, b) => a.x - b.x);
  let cursor = -w / 2;
  const add = (x0, x1, y0, y1) => {
    if (x1 - x0 < 0.001 || y1 - y0 < 0.001) return;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    pieces.push({ size: [x1 - x0, y1 - y0, t], pos: [cx, cy, 0] });
  };
  ops.forEach((o) => {
    const l = o.x - o.w / 2;
    const r = o.x + o.w / 2;
    add(cursor, l, 0, h);
    add(l, r, 0, o.y);
    add(l, r, o.y + o.h, h);
    cursor = r;
  });
  add(cursor, w / 2, 0, h);

  return (
    <group position={position} rotation={rotation}>
      {pieces.map((p, i) => (
        <Block
          key={i}
          size={p.size}
          position={p.pos}
          uv={[p.pos[0] + uvBase[0], p.pos[1] + uvBase[1], uvBase[2]]}
          mat={mat}
        />
      ))}
      {ops
        .filter((o) => o.glass !== false)
        .map((o, i) => (
          <Glass key={i} w={o.w} h={o.h} position={[o.x, o.y, 0]} mullions={o.mullions ?? 0} transoms={o.transoms} />
        ))}
    </group>
  );
}

/** Techo a dos aguas con cumbrera en Z. */
export function GableRoof({ w, d, rise, baseY, overhang = 0.5, thickness = 0.22, mat, position = [0, 0, 0], fascia }) {
  const half = w / 2;
  const a = Math.atan2(rise, half);
  const L = (half + overhang) / Math.cos(a);
  const depth = d + overhang * 2;
  const ridge = new THREE.Vector3(0, baseY + rise, 0);
  const planes = [1, -1].map((side) => {
    const dir = new THREE.Vector3(side * Math.cos(a), -Math.sin(a), 0);
    const n = new THREE.Vector3(side * Math.sin(a), Math.cos(a), 0);
    const c = ridge.clone().addScaledVector(dir, L / 2).addScaledVector(n, thickness / 2);
    return { pos: c.toArray(), rot: [0, 0, -side * a] };
  });
  return (
    <group position={position}>
      {planes.map((p, i) => (
        <group key={i} position={p.pos} rotation={p.rot}>
          <Block size={[L, thickness, depth]} position={[0, 0, 0]} uv={[i * 50, 0, 0]} mat={mat} />
          {fascia && <Block size={[L, thickness * 1.05, 0.06]} position={[0, -0.01, depth / 2]} mat={fascia} cast={false} />}
          {fascia && <Block size={[L, thickness * 1.05, 0.06]} position={[0, -0.01, -depth / 2]} mat={fascia} cast={false} />}
        </group>
      ))}
      <Block size={[0.3, 0.12, depth]} position={[0, baseY + rise + thickness / Math.cos(a) - 0.02, 0]} mat={fascia ?? mat} />
    </group>
  );
}

/** Hastial (triángulo macizo). Origen: centro de la base. */
export function Gable({ w, rise, t = 0.3, mat, position, rotation }) {
  return (
    <mesh geometry={gableGeometry(w, rise, t)} material={mat} position={position} rotation={rotation} castShadow receiveShadow />
  );
}

/** Luz puntual cálida que sólo se enciende de noche. */
export function NightLight({ intensity = 25, distance = 14, color = '#ffbe7a', position }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.intensity = intensity * lightState.night;
  });
  return <pointLight ref={ref} color={color} distance={distance} decay={2} intensity={0} position={position} />;
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function LoadedModel({ id, ...props }) {
  const { scene } = useGLTF(`/models/${id}.glb?v=3`);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material?.map) o.material.map.anisotropy = 8;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} {...props} />;
}

/** Modelo GLB (Poly Haven) clonado con sombras, aislado en su propio Suspense/ErrorBoundary. */
export function Model({ id, ...props }) {
  return (
    <ModelErrorBoundary>
      <Suspense fallback={null}>
        <LoadedModel id={id} {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

export const MODEL_IDS = [
  'jacaranda_tree', 'island_tree_02', 'pine_tree_01', 'fir_tree_01', 'shrub_01', 'shrub_02', 'shrub_04',
  'potted_plant_01', 'potted_plant_02', 'sofa_03', 'modern_coffee_table_01', 'mid_century_lounge_chair',
  'outdoor_table_chair_set_01', 'boulder_01', 'street_lamp_02',
];

/** Terreno circular con huecos rectangulares (p.ej. piscina). holes: [[x0, z0, x1, z1]] */
export function Ground({ mat, radius = 260, holes = [] }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, radius, 0, Math.PI * 2, false);
    holes.forEach(([x0, z0, x1, z1]) => {
      const p = new THREE.Path();
      // el plano se rota -90° en X → y del shape = -z del mundo
      p.moveTo(x0, -z0);
      p.lineTo(x0, -z1);
      p.lineTo(x1, -z1);
      p.lineTo(x1, -z0);
      p.closePath();
      s.holes.push(p);
    });
    const g = new THREE.ShapeGeometry(s, 64);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i), pos.getY(i));
    }
    uv.needsUpdate = true;
    return g;
  }, [radius, JSON.stringify(holes)]);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />;
}

/** Baranda simple: postes + pasamanos. Corre en X desde -len/2 a len/2. */
export function Railing({ len, h = 1, position, rotation, spacing = 1.2, mat }) {
  const m = useMaterials();
  const n = Math.max(2, Math.round(len / spacing) + 1);
  const mt = mat ?? m.frame;
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (len * i) / (n - 1), h / 2, 0]} material={mt} castShadow>
          <boxGeometry args={[0.05, h, 0.05]} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} material={mt} castShadow>
        <boxGeometry args={[len, 0.05, 0.08]} />
      </mesh>
      <mesh position={[0, h * 0.5, 0]} material={mt}>
        <boxGeometry args={[len, 0.025, 0.025]} />
      </mesh>
    </group>
  );
}

/** Baliza de jardín (se ilumina de noche). */
export function Bollard({ position }) {
  const m = useMaterials();
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} material={m.black} castShadow>
        <boxGeometry args={[0.14, 0.7, 0.14]} />
      </mesh>
      <mesh position={[0, 0.6, 0.071]} material={m.lamp}>
        <boxGeometry args={[0.1, 0.06, 0.005]} />
      </mesh>
    </group>
  );
}
