import { useMaterials } from '../materials';
import { Block, Wall, Glass, GableRoof, Gable, NightLight, Model, Ground, Bollard } from '../parts';
import { useStore } from '../../store';

// Casa Alameda — contemporánea a dos aguas con ala lateral y porche. Frente hacia +Z.
const Y0 = 0.3;
const H1 = 2.9; // planta baja
const H2 = 2.5; // planta alta
const WALL = H1 + H2; // 5.4
const RISE = 3.2;

export default function CasaAlameda() {
  const m = useMaterials();
  const facadeKey = useStore((s) => s.facades.alameda);
  const f = m[facadeKey];
  const accent = facadeKey === 'woodClad' ? m.darkWood : m.woodClad;
  const R = Math.PI / 2;

  return (
    <group>
      <Ground mat={m.grass} />
      <Block size={[16.6, 0.3, 8.6]} position={[3, 0.15, 0]} mat={m.slab} />

      {/* ---------- VOLUMEN PRINCIPAL ---------- */}
      {/* frente: doble altura acristalada */}
      <Wall w={10} h={WALL} mat={f} position={[0, Y0, 3.85]} uvBase={[0, Y0, 0]}
        openings={[{ x: 0, y: 0, w: 4.4, h: WALL, mullions: 2, transoms: [2.4] }]} />
      <Gable w={10} rise={RISE} t={0.3} mat={accent} position={[0, Y0 + WALL, 3.85]} />
      <Glass w={2.6} h={1.3} position={[0, Y0 + WALL + 0.3, 4.02]} mullions={1} />
      {/* fondo */}
      <Wall w={10} h={H1} mat={f} position={[0, Y0, -3.85]} uvBase={[0, Y0, 0]}
        openings={[{ x: -2.5, y: 0, w: 2.4, h: 2.3, mullions: 1 }, { x: 2.5, y: 0.9, w: 1.6, h: 1.4 }]} />
      <Wall w={10} h={H2} mat={f} position={[0, Y0 + H1, -3.85]} uvBase={[0, Y0 + H1, 0]}
        openings={[{ x: -2.5, y: 0.6, w: 1.6, h: 1.3 }, { x: 2.5, y: 0.6, w: 1.6, h: 1.3 }]} />
      <Gable w={10} rise={RISE} t={0.3} mat={f} position={[0, Y0 + WALL, -3.85]} />
      {/* laterales */}
      <Wall w={7.4} h={H1} mat={f} position={[-4.85, Y0, 0]} rotation={[0, R, 0]} uvBase={[0, Y0, 0]}
        openings={[{ x: 1.8, y: 0.9, w: 1.4, h: 1.5 }]} />
      <Wall w={7.4} h={H2} mat={f} position={[-4.85, Y0 + H1, 0]} rotation={[0, R, 0]} uvBase={[0, Y0 + H1, 0]}
        openings={[{ x: 1.8, y: 0.5, w: 1.4, h: 1.4 }, { x: -2, y: 0.5, w: 1.4, h: 1.4 }]} />
      <Wall w={7.4} h={WALL} mat={f} position={[4.85, Y0, 0]} rotation={[0, R, 0]} uvBase={[0, Y0, 0]}
        openings={[{ x: -1.5, y: H1 + 0.5, w: 1.4, h: 1.4 }]} />

      <GableRoof w={10} d={7.7} rise={RISE} baseY={Y0 + WALL} overhang={0.55} mat={m.roofGrey} fascia={m.slab} />

      {/* chimenea */}
      <Block size={[1.3, 9.9, 1.5]} position={[-5.6, 4.95, -1]} mat={m.stackedStone} />
      <Block size={[1.5, 0.15, 1.7]} position={[-5.6, 9.95, -1]} mat={m.slab} />

      {/* interior */}
      <Block size={[9.4, 0.04, 7.4]} position={[0, Y0 + 0.02, 0]} mat={m.woodFloor} cast={false} />
      <Block size={[9.4, 0.25, 3.6]} position={[0, Y0 + H1 + 0.1, -2]} mat={m.slab} />
      <Block size={[9.4, 0.03, 3.6]} position={[0, Y0 + H1 + 0.24, -2]} mat={m.woodFloor} cast={false} />
      <Glass w={9.2} h={1.0} position={[0, Y0 + H1 + 0.25, -0.2]} noFrameBottom />
      <Block size={[9.6, 0.1, 0.1]} position={[0, Y0 + WALL + 0.9, 0]} mat={m.darkWood} />
      {[-2.5, 2.5].map((x) => (
        <group key={x}>
          <Block size={[0.02, 1.6, 0.02]} position={[x, Y0 + WALL - 0.3, 1.6]} mat={m.black} cast={false} />
          <mesh position={[x, Y0 + WALL - 1.15, 1.6]} material={m.lamp}>
            <sphereGeometry args={[0.18, 24, 16]} />
          </mesh>
        </group>
      ))}
      <Block size={[3, 0.03, 0.2]} position={[0, Y0 + H1 - 0.03, -2]} mat={m.lightPanel} cast={false} receive={false} />
      <NightLight position={[0, 3.2, 1.5]} intensity={55} />
      <NightLight position={[0, Y0 + H1 + 1.6, -2]} intensity={30} />
      <Model id="sofa_03" position={[-1.5, Y0 + 0.04, 0.2]} />
      <Model id="modern_coffee_table_01" position={[-1.5, Y0 + 0.04, 1.8]} />
      <Model id="potted_plant_01" position={[1.9, Y0 + 0.04, 3]} />

      {/* ---------- ALA LATERAL (cocina) ---------- */}
      <Wall w={6} h={3.2} mat={accent} position={[8, Y0, 2.85]} uvBase={[0, Y0, 0]}
        openings={[{ x: 0, y: 0, w: 4.2, h: 2.6, mullions: 2 }]} />
      <Wall w={6} h={3.2} mat={accent} position={[8, Y0, -3.85]} uvBase={[0, Y0, 0]}
        openings={[{ x: 0.5, y: 1, w: 2.5, h: 1.2, mullions: 1 }]} />
      <Wall w={6.4} h={3.2} mat={accent} position={[10.85, Y0, -0.5]} rotation={[0, R, 0]} uvBase={[0, Y0, 0]}
        openings={[{ x: 0, y: 0.9, w: 2, h: 1.5, mullions: 1 }]} />
      <Block size={[6.8, 0.3, 7.6]} position={[8.1, Y0 + 3.35, -0.5]} mat={m.slab} />
      <Block size={[5.6, 0.04, 6.4]} position={[8, Y0 + 0.02, -0.5]} mat={m.woodFloor} cast={false} />
      <Block size={[2.6, 0.92, 0.95]} position={[8, Y0 + 0.46, -0.6]} mat={m.slab} />
      <Block size={[2.7, 0.05, 1.05]} position={[8, Y0 + 0.95, -0.6]} mat={m.concrete} />
      <Block size={[5.6, 2.3, 0.6]} position={[8, Y0 + 1.15, -3.4]} mat={m.darkWood} />
      <Block size={[3, 0.03, 0.2]} position={[8, Y0 + 3.17, -0.6]} mat={m.lightPanel} cast={false} receive={false} />
      <NightLight position={[8, 2.6, -0.5]} intensity={35} />

      {/* ---------- PORCHE ---------- */}
      <Block size={[6, 0.25, 2.6]} position={[8, 0.125, 4.3]} mat={m.deck} />
      <Block size={[6.4, 0.18, 2.9]} position={[8, Y0 + 3.0, 4.3]} mat={m.woodClad} />
      {[5.3, 8, 10.7].map((x) => (
        <Block key={x} size={[0.16, 3, 0.16]} position={[x, 1.75, 5.5]} mat={m.darkWood} />
      ))}
      <Model id="outdoor_table_chair_set_01" position={[8, 0.25, 4.3]} scale={0.9} />
      {[6.5, 9.5].map((x) => (
        <mesh key={x} position={[x, Y0 + 2.88, 4.3]} material={m.lamp}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 20]} />
        </mesh>
      ))}
      <NightLight position={[8, 2.6, 4.4]} intensity={14} distance={7} />

      {/* ---------- PAISAJE ---------- */}
      <Block size={[1.6, 0.04, 10]} position={[0, 0.02, 9]} mat={m.pavers} cast={false} />
      <Block size={[5, 0.03, 12]} position={[14.5, 0.015, 7]} mat={m.gravel} cast={false} />
      {[6, 9, 12].map((z) => (
        <group key={z}>
          <Bollard position={[-1.2, 0, z]} />
          <Bollard position={[1.2, 0, z]} />
        </group>
      ))}
      <Model id="jacaranda_tree" position={[-11, 0, 6]} rotation={[0, 0.5, 0]} />
      <Model id="island_tree_02" position={[-10, 0, -8]} rotation={[0, 1.3, 0]} />
      <Model id="jacaranda_tree" position={[19, 0, -6]} rotation={[0, 3, 0]} scale={0.9} />
      {[[-3.5, 5], [-5.5, 4.8], [3.5, 5], [-7, 2], [-7.2, -3], [12.5, 2], [12.4, -3]].map(([x, z], i) => (
        <Model key={i} id={['shrub_02', 'shrub_01', 'shrub_04'][i % 3]} position={[x, 0, z]} rotation={[0, i * 1.7, 0]} scale={1.2} />
      ))}
      <Model id="boulder_01" position={[-8, 0, 9]} />
    </group>
  );
}
