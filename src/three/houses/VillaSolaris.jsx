import { useMaterials } from '../materials';
import { Block, Wall, Glass, NightLight, Model, Ground, Bollard } from '../parts';
import { useStore } from '../../store';

// Villa Solaris — Residencia moderna en U sobre lote de 20 × 30 m (600 m²).
// Lote: X ∈ [-10, 10] (20 m), Z ∈ [-15, 15] (30 m). Frente en +Z.
// Cuerpo en U:
//   - Ala Central (Norte): X ∈ [-8.5, 8.5], Z ∈ [-12.5, -7.2]
//   - Ala Izquierda (Oeste, suites): X ∈ [-8.5, -4.3], Z ∈ [-7.2, 3.2]
//   - Ala Derecha (Este, cocina/social): X ∈ [4.3, 8.5], Z ∈ [-7.2, 3.2]
//   - Patio central en U con piscina: X ∈ [-4.3, 4.3], Z ∈ [-7.2, 3.2]
//   - Zona verde frontal Z ∈ [3.2, 14.8]: Quincho/Parrilla, Jardín familiar y Parqueadero.

const GF = { y: 0.28, h: 3.2 };
const UF = { y: 3.78, h: 2.9 };
const POOL = [-2.5, -5.2, 2.5, 1.8]; // 5 m × 7 m en pleno centro de la U

/** Auto SUV/Sedán moderno estilizado para el parqueadero */
function ModernCar({ position, rotation = [0, 0, 0] }) {
  const m = useMaterials();
  return (
    <group position={position} rotation={rotation}>
      {/* Carrocería baja */}
      <Block size={[1.95, 0.52, 4.4]} position={[0, 0.48, 0]} mat={m.black} />
      {/* Cabina acristalada */}
      <Block size={[1.72, 0.46, 2.3]} position={[0, 0.95, -0.15]} mat={m.glass} />
      {/* Techo del auto */}
      <Block size={[1.68, 0.06, 2.15]} position={[0, 1.19, -0.15]} mat={m.black} />
      {/* Ruedas */}
      {[
        [-0.95, 0.34, 1.35],
        [0.95, 0.34, 1.35],
        [-0.95, 0.34, -1.35],
        [0.95, 0.34, -1.35],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} material={m.frame} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.24, 24]} />
        </mesh>
      ))}
      {/* Faros delanteros */}
      <Block size={[0.38, 0.08, 0.04]} position={[-0.68, 0.58, 2.21]} mat={m.lamp} cast={false} />
      <Block size={[0.38, 0.08, 0.04]} position={[0.68, 0.58, 2.21]} mat={m.lamp} cast={false} />
    </group>
  );
}

/** Estación de Parrilla / BBQ en piedra, concreto y acero con fuego cálido */
function BbqStation({ position }) {
  const m = useMaterials();
  return (
    <group position={position}>
      {/* Mesón en piedra y tapa de concreto */}
      <Block size={[3.4, 0.9, 0.75]} position={[0, 0.45, -0.8]} mat={m.stackedStone} />
      <Block size={[3.5, 0.07, 0.85]} position={[0, 0.93, -0.8]} mat={m.concrete} />
      {/* Módulo de parrilla de acero negro */}
      <Block size={[1.3, 0.55, 0.65]} position={[-0.3, 1.22, -0.8]} mat={m.black} />
      {/* Campana de extracción */}
      <Block size={[1.25, 0.95, 0.55]} position={[-0.3, 2.15, -0.82]} mat={m.metal} />
      <Block size={[0.45, 0.7, 0.45]} position={[-0.3, 2.9, -0.82]} mat={m.metal} />
      {/* Brasas encendidas */}
      <Block size={[1.05, 0.05, 0.48]} position={[-0.3, 1.02, -0.78]} mat={m.lamp} cast={false} />
      {/* Isla / barra desayunadora con taburetes */}
      <Block size={[2.6, 0.92, 0.65]} position={[0.2, 0.46, 0.55]} mat={m.woodClad} />
      <Block size={[2.75, 0.06, 0.85]} position={[0.2, 0.95, 0.55]} mat={m.slab} />
      {[-0.6, 0.2, 1.0].map((x) => (
        <group key={x} position={[x, 0, 1.25]}>
          <Block size={[0.08, 0.65, 0.08]} position={[0, 0.325, 0]} mat={m.black} />
          <Block size={[0.38, 0.06, 0.38]} position={[0, 0.67, 0]} mat={m.darkWood} />
        </group>
      ))}
      <NightLight position={[-0.3, 1.6, -0.4]} intensity={22} color="#ffaa55" distance={7} />
    </group>
  );
}

export default function VillaSolaris() {
  const m = useMaterials();
  const facadeKey = useStore((s) => s.facades.villa);
  const f = m[facadeKey];
  const R = Math.PI / 2;

  return (
    <group>
      {/* Terreno general con hueco para la piscina */}
      <Ground mat={m.grass} holes={[POOL]} />

      {/* ==================== LOTE DE 20 × 30 m (600 m²) ==================== */}
      {/* Muro perimetral bajo y cerramiento arquitectónico del lote (X: -10..10, Z: -15..15) */}
      {/* Fondo Norte (Z = -15) */}
      <Block size={[20.2, 1.9, 0.25]} position={[0, 0.95, -15]} mat={m.stackedStone} />
      {/* Lateral Oeste (X = -10) */}
      <Block size={[0.25, 1.6, 30]} position={[-10, 0.8, 0]} mat={m.stackedStone} />
      {/* Lateral Este (X = 10) */}
      <Block size={[0.25, 1.6, 30]} position={[10, 0.8, 0]} mat={m.stackedStone} />
      {/* Frente Sur (Z = 15): murete bajo con abertura peatonal y entrada vehicular */}
      <Block size={[8.5, 0.75, 0.25]} position={[-5.75, 0.375, 15]} mat={m.stackedStone} />
      <Block size={[2.2, 0.75, 0.25]} position={[1.4, 0.375, 15]} mat={m.stackedStone} />
      {/* Pilares de pórtico en entrada peatonal */}
      <Block size={[0.45, 2.5, 0.45]} position={[-1.4, 1.25, 15]} mat={f} />
      <Block size={[0.45, 2.5, 0.45]} position={[0.3, 1.25, 15]} mat={f} />
      <Block size={[2.15, 0.22, 0.55]} position={[-0.55, 2.55, 15]} mat={m.slab} />

      {/* ==================== PLANTA EN FORMA DE U ==================== */}
      {/* Base Ala Central Norte */}
      <Block size={[17.2, 0.28, 5.5]} position={[0, 0.14, -9.85]} mat={m.slab} />
      {/* Base Ala Izquierda Oeste */}
      <Block size={[4.4, 0.28, 10.6]} position={[-6.4, 0.14, -1.9]} mat={m.slab} />
      {/* Base Ala Derecha Este */}
      <Block size={[4.4, 0.28, 10.6]} position={[6.4, 0.14, -1.9]} mat={m.slab} />

      {/* ---------- 1. ALA CENTRAL NORTE (Gran Salón + Comedor todo en vidrio) ---------- */}
      <Wall
        w={17}
        h={GF.h}
        mat={f}
        position={[0, GF.y, -12.45]}
        uvBase={[0, GF.y, 0]}
        openings={[
          { x: -5, y: 0.4, w: 3.6, h: 2.3, mullions: 1 },
          { x: 0, y: 0.4, w: 4.2, h: 2.3, mullions: 2 },
          { x: 5, y: 0.4, w: 3.6, h: 2.3, mullions: 1 },
        ]}
      />
      <Wall w={5.3} h={GF.h} mat={f} position={[-8.35, GF.y, -9.85]} rotation={[0, R, 0]} uvBase={[0, GF.y, 0]} />
      <Wall w={5.3} h={GF.h} mat={f} position={[8.35, GF.y, -9.85]} rotation={[0, R, 0]} uvBase={[0, GF.y, 0]} />
      {/* Fachada interior hacia el patio en U: 100% vidrio de piso a techo */}
      <Glass w={8.8} h={GF.h} position={[0, GF.y, -7.2]} mullions={4} />

      {/* Piso e interior del Gran Salón */}
      <Block size={[16.6, 0.04, 5.1]} position={[0, GF.y + 0.02, -9.85]} mat={m.woodFloor} cast={false} />
      <Model id="sofa_03" position={[-1.4, GF.y + 0.04, -9.8]} />
      <Model id="modern_coffee_table_01" position={[-1.4, GF.y + 0.04, -8.3]} />
      <Model id="mid_century_lounge_chair" position={[1.4, GF.y + 0.04, -8.5]} rotation={[0, -0.7, 0]} />
      <Model id="potted_plant_01" position={[-3.8, GF.y + 0.04, -8.0]} />
      <Model id="potted_plant_02" position={[3.8, GF.y + 0.04, -8.0]} />
      {[-5, -1.6, 1.6, 5].map((x) => (
        <Block key={x} size={[2.2, 0.03, 0.18]} position={[x, GF.y + GF.h - 0.02, -9.5]} mat={m.lightPanel} cast={false} receive={false} />
      ))}
      <NightLight position={[0, 2.7, -9.2]} intensity={48} />

      {/* ---------- 2. ALA IZQUIERDA OESTE (Suites familiares mirando a la piscina) ---------- */}
      <Wall
        w={10.4}
        h={GF.h}
        mat={f}
        position={[-8.35, GF.y, -2.0]}
        rotation={[0, R, 0]}
        uvBase={[0, GF.y, 0]}
        openings={[
          { x: -2.6, y: 0.7, w: 3.2, h: 1.9, mullions: 1 },
          { x: 2.6, y: 0.7, w: 3.2, h: 1.9, mullions: 1 },
        ]}
      />
      {/* Fachada interior hacia la piscina: ventanal corrido de piso a techo */}
      <Glass w={10.2} h={GF.h} position={[-4.3, GF.y, -2.0]} rotation={[0, R, 0]} mullions={4} />
      {/* Frente sur del ala izquierda: gran ventanal */}
      <Glass w={3.9} h={GF.h} position={[-6.35, GF.y, 3.15]} mullions={1} />
      <Block size={[0.35, GF.h, 0.35]} position={[-8.35, GF.y + GF.h / 2, 3.1]} mat={f} />

      {/* Interior ala izquierda */}
      <Block size={[3.9, 0.04, 10.2]} position={[-6.35, GF.y + 0.02, -2.0]} mat={m.woodFloor} cast={false} />
      <Block size={[3.8, GF.h, 0.18]} position={[-6.35, GF.y + GF.h / 2, -2.2]} mat={m.interiorWall} />
      <Model id="mid_century_lounge_chair" position={[-6.2, GF.y + 0.04, 1.2]} rotation={[0, 0.4, 0]} />
      <Block size={[0.2, 0.03, 2.6]} position={[-6.3, GF.y + GF.h - 0.02, 0.6]} mat={m.lightPanel} cast={false} receive={false} />
      <Block size={[0.2, 0.03, 2.6]} position={[-6.3, GF.y + GF.h - 0.02, -4.5]} mat={m.lightPanel} cast={false} receive={false} />
      <NightLight position={[-6.2, 2.6, 0.8]} intensity={32} />
      <NightLight position={[-6.2, 2.6, -4.6]} intensity={28} />

      {/* ---------- 3. ALA DERECHA ESTE (Cocina Gourmet + Family Room en vidrio) ---------- */}
      <Wall
        w={10.4}
        h={GF.h}
        mat={f}
        position={[8.35, GF.y, -2.0]}
        rotation={[0, R, 0]}
        uvBase={[0, GF.y, 0]}
        openings={[
          { x: -2.5, y: 0.4, w: 3.4, h: 2.3, mullions: 1 },
          { x: 2.5, y: 0.4, w: 3.4, h: 2.3, mullions: 1 },
        ]}
      />
      {/* Fachada interior hacia la piscina: 100% vidrio de piso a techo */}
      <Glass w={10.2} h={GF.h} position={[4.3, GF.y, -2.0]} rotation={[0, R, 0]} mullions={4} />
      {/* Frente sur del ala derecha (conecta directo con el quincho/parrilla): vidrio total */}
      <Glass w={3.9} h={GF.h} position={[6.35, GF.y, 3.15]} mullions={1} />
      <Block size={[0.35, GF.h, 0.35]} position={[8.35, GF.y + GF.h / 2, 3.1]} mat={f} />

      {/* Interior ala derecha: isla de cocina y muebles */}
      <Block size={[3.9, 0.04, 10.2]} position={[6.35, GF.y + 0.02, -2.0]} mat={m.woodFloor} cast={false} />
      <Block size={[1.1, 0.92, 3.2]} position={[6.1, GF.y + 0.46, -0.6]} mat={m.slab} />
      <Block size={[1.2, 0.06, 3.35]} position={[6.1, GF.y + 0.95, -0.6]} mat={m.concrete} />
      <Block size={[0.6, 2.4, 3.8]} position={[7.9, GF.y + 1.2, -4.2]} mat={m.darkWood} />
      <Block size={[0.2, 0.03, 3.2]} position={[6.2, GF.y + GF.h - 0.02, -0.6]} mat={m.lightPanel} cast={false} receive={false} />
      <NightLight position={[6.2, 2.6, -0.6]} intensity={38} />

      {/* ---------- CUBIERTAS EN U Y VOLADIZOS MODERNOS ---------- */}
      <Block size={[18.0, 0.32, 6.2]} position={[0, 3.62, -9.85]} mat={m.slab} />
      <Block size={[5.0, 0.32, 11.2]} position={[-6.4, 3.62, -1.7]} mat={m.slab} />
      <Block size={[5.0, 0.32, 11.2]} position={[6.4, 3.62, -1.7]} mat={m.slab} />
      {/* Pérgola arquitectónica que une visualmente las puntas de la U por encima */}
      {[-2.8, -1.4, 0, 1.4, 2.8].map((x) => (
        <Block key={x} size={[0.14, 0.22, 1.6]} position={[x, 3.62, 2.8]} mat={m.woodClad} />
      ))}

      {/* ---------- PLANTA ALTA (Suite Master panorámica sobre el ala norte) ---------- */}
      <Glass w={10.6} h={UF.h} position={[0, UF.y, -7.05]} mullions={4} />
      <Wall
        w={11.0}
        h={UF.h}
        mat={f}
        position={[0, UF.y, -12.35]}
        uvBase={[0, UF.y, 0]}
        openings={[
          { x: -2.8, y: 0.6, w: 2.8, h: 1.7, mullions: 1 },
          { x: 2.8, y: 0.6, w: 2.8, h: 1.7, mullions: 1 },
        ]}
      />
      <Glass w={5.2} h={UF.h} position={[-5.4, UF.y, -9.7]} rotation={[0, R, 0]} mullions={1} />
      <Glass w={5.2} h={UF.h} position={[5.4, UF.y, -9.7]} rotation={[0, R, 0]} mullions={1} />
      <Block size={[10.6, 0.04, 5.1]} position={[0, UF.y + 0.02, -9.7]} mat={m.woodFloor} cast={false} />
      <Block size={[11.8, 0.3, 6.2]} position={[0, UF.y + UF.h + 0.15, -9.7]} mat={m.slab} />
      <Block size={[4.2, 0.03, 0.2]} position={[0, UF.y + UF.h - 0.02, -9.2]} mat={m.lightPanel} cast={false} receive={false} />
      <NightLight position={[0, UF.y + 2.1, -9.0]} intensity={42} />
      {/* Barandas de vidrio en las terrazas superiores de las alas laterales */}
      <Glass w={3.8} h={0.95} position={[-6.4, 3.78, 3.2]} noFrameBottom />
      <Glass w={3.8} h={0.95} position={[6.4, 3.78, 3.2]} noFrameBottom />

      {/* ==================== PATIO CENTRAL EN U CON PISCINA ==================== */}
      <Block size={[8.4, 0.28, 2.0]} position={[0, 0.14, -6.2]} mat={m.deck} />
      <Block size={[8.4, 0.28, 1.8]} position={[0, 0.14, 2.7]} mat={m.deck} />
      <Block size={[1.7, 0.28, 7.0]} position={[-3.35, 0.14, -1.7]} mat={m.deck} />
      <Block size={[1.7, 0.28, 7.0]} position={[3.35, 0.14, -1.7]} mat={m.deck} />
      {/* Bordes atérmicos de la piscina */}
      <Block size={[5.3, 0.04, 0.22]} position={[0, 0.3, -5.2]} mat={m.pavers} />
      <Block size={[5.3, 0.04, 0.22]} position={[0, 0.3, 1.8]} mat={m.pavers} />
      <Block size={[0.22, 0.04, 7.2]} position={[-2.5, 0.3, -1.7]} mat={m.pavers} />
      <Block size={[0.22, 0.04, 7.2]} position={[2.5, 0.3, -1.7]} mat={m.pavers} />
      {/* Vaso revestido en venecita azul */}
      <Block size={[5.0, 0.1, 7.0]} position={[0, -1.35, -1.7]} mat={m.poolTile} cast={false} />
      <Block size={[5.0, 1.65, 0.1]} position={[0, -0.52, -5.15]} mat={m.poolTile} cast={false} />
      <Block size={[5.0, 1.65, 0.1]} position={[0, -0.52, 1.75]} mat={m.poolTile} cast={false} />
      <Block size={[0.1, 1.65, 7.0]} position={[-2.45, -0.52, -1.7]} mat={m.poolTile} cast={false} />
      <Block size={[0.1, 1.65, 7.0]} position={[2.45, -0.52, -1.7]} mat={m.poolTile} cast={false} />
      {/* Espejo de agua */}
      <mesh position={[0, 0.18, -1.7]} rotation={[-Math.PI / 2, 0, 0]} material={m.water} renderOrder={1}>
        <planeGeometry args={[5.0, 7.0]} />
      </mesh>
      <NightLight position={[0, -0.5, -1.7]} intensity={36} color="#5fd6ff" distance={11} />
      {/* Sillones de solárium junto a la piscina */}
      <Model id="mid_century_lounge_chair" position={[-3.35, 0.28, -3.5]} rotation={[0, 1.2, 0]} />
      <Model id="mid_century_lounge_chair" position={[3.35, 0.28, -3.5]} rotation={[0, -1.2, 0]} />

      {/* ==================== ZONA DE PARRILLA / QUINCHO BBQ ==================== */}
      <group position={[6.3, 0, 5.6]}>
        <Block size={[4.6, 0.22, 4.4]} position={[0, 0.11, 0]} mat={m.deck} />
        {[
          [-2.1, -2.0],
          [2.1, -2.0],
          [-2.1, 2.0],
          [2.1, 2.0],
        ].map(([x, z], i) => (
          <Block key={i} size={[0.12, 2.8, 0.12]} position={[x, 1.5, z]} mat={m.frame} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <Block key={i} size={[4.5, 0.16, 0.07]} position={[0, 2.95, -2.0 + i * 0.44]} mat={m.woodClad} />
        ))}
        <BbqStation position={[0, 0.22, -0.6]} />
        <Model id="outdoor_table_chair_set_01" position={[-0.2, 0.22, 1.25]} scale={0.95} />
      </group>

      {/* ==================== PARQUEADERO PARA EL AUTO (EN ZONA VERDE) ==================== */}
      <group position={[6.2, 0, 11.4]}>
        {/* Huellas ecológicas de concreto sobre el césped (eco-pavers) */}
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} position={[0, 0.03, -2.8 + i * 0.85]}>
            <Block size={[0.9, 0.05, 0.55]} position={[-0.95, 0, 0]} mat={m.pavers} cast={false} />
            <Block size={[0.9, 0.05, 0.55]} position={[0.95, 0, 0]} mat={m.pavers} cast={false} />
          </group>
        ))}
        {/* Cubierta ligera (carport moderno en voladizo) */}
        <Block size={[0.22, 2.7, 0.22]} position={[2.3, 1.35, -1.8]} mat={m.frame} />
        <Block size={[0.22, 2.7, 0.22]} position={[2.3, 1.35, 1.8]} mat={m.frame} />
        <Block size={[3.6, 0.18, 5.2]} position={[0.7, 2.75, 0]} mat={m.slab} />
        <Block size={[2.2, 0.03, 0.18]} position={[0.5, 2.64, 0]} mat={m.lightPanel} cast={false} receive={false} />
        <NightLight position={[0.5, 2.3, 0]} intensity={18} distance={7} />
        {/* Vehículo estacionado */}
        <ModernCar position={[0, 0.05, -0.2]} />
      </group>

      {/* ==================== ESPACIO VERDE FAMILIAR (JARDÍN SOCIAL) ==================== */}
      {/* Camino peatonal de losetas desde el pórtico hasta el patio en U */}
      {Array.from({ length: 9 }, (_, i) => (
        <Block key={i} size={[1.5, 0.05, 0.75]} position={[-0.55, 0.025, 4.4 + i * 1.25]} mat={m.pavers} cast={false} />
      ))}

      {/* Rincón familiar en el jardín oeste: fogón circular (firepit) y bancas de madera */}
      <group position={[-5.4, 0, 8.6]}>
        <Block size={[4.4, 0.06, 4.4]} position={[0, 0.03, 0]} mat={m.gravel} cast={false} />
        <mesh position={[0, 0.24, 0]} material={m.stackedStone} castShadow receiveShadow>
          <cylinderGeometry args={[0.85, 0.9, 0.42, 28]} />
        </mesh>
        <mesh position={[0, 0.46, 0]} material={m.lamp}>
          <cylinderGeometry args={[0.52, 0.52, 0.04, 24]} />
        </mesh>
        <Block size={[2.2, 0.42, 0.55]} position={[0, 0.24, -1.65]} mat={m.woodClad} />
        <Block size={[2.2, 0.42, 0.55]} position={[0, 0.24, 1.65]} mat={m.woodClad} />
        <Block size={[0.55, 0.42, 2.0]} position={[-1.65, 0.24, 0]} mat={m.woodClad} />
        <NightLight position={[0, 0.9, 0]} intensity={20} color="#ff9f4a" distance={7} />
      </group>

      {/* Pérgola de juegos familiar (columpio doble sobre el césped) */}
      <group position={[-5.4, 0, 12.6]}>
        <Block size={[0.14, 2.3, 0.14]} position={[-1.4, 1.15, 0]} mat={m.darkWood} />
        <Block size={[0.14, 2.3, 0.14]} position={[1.4, 1.15, 0]} mat={m.darkWood} />
        <Block size={[3.1, 0.16, 0.22]} position={[0, 2.32, 0]} mat={m.darkWood} />
        {[-0.55, 0.55].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Block size={[0.02, 1.5, 0.02]} position={[-0.2, 1.5, 0]} mat={m.black} cast={false} />
            <Block size={[0.02, 1.5, 0.02]} position={[0.2, 1.5, 0]} mat={m.black} cast={false} />
            <Block size={[0.5, 0.05, 0.25]} position={[0, 0.75, 0]} mat={m.woodClad} />
          </group>
        ))}
      </group>

      {/* Balizas de iluminación en el jardín y sendero */}
      {[5.5, 8.5, 11.5, 14.0].map((z) => (
        <Bollard key={z} position={[0.55, 0, z]} />
      ))}
      <Bollard position={[-3.2, 0, 6.2]} />
      <Bollard position={[3.6, 0, 8.2]} />

      {/* Árboles y vegetación dentro y alrededor del lote de 20 × 30 m */}
      <Model id="jacaranda_tree" position={[-8.4, 0, 5.8]} rotation={[0, 0.8, 0]} scale={0.78} />
      <Model id="island_tree_02" position={[-2.6, 0, 12.2]} rotation={[0, 1.8, 0]} scale={0.75} />
      <Model id="jacaranda_tree" position={[-13.5, 0, -9]} rotation={[0, 1.1, 0]} />
      <Model id="island_tree_02" position={[13.5, 0, -8]} rotation={[0, 2.4, 0]} />
      {[
        [-9.1, 3.8],
        [-9.1, 9.5],
        [-9.1, 13.8],
        [-2.5, 14.2],
        [2.0, 14.2],
        [9.1, 4.5],
        [9.1, 8.2],
        [-3.6, 3.8],
        [3.6, 3.8],
      ].map(([x, z], i) => (
        <Model
          key={i}
          id={['shrub_01', 'shrub_02', 'shrub_04'][i % 3]}
          position={[x, 0, z]}
          rotation={[0, i * 1.3, 0]}
          scale={1.15}
        />
      ))}
      <Model id="boulder_01" position={[-8.6, 0, 11.2]} scale={0.85} />
      <Model id="boulder_01" position={[2.2, 0, 13.6]} rotation={[0, 2, 0]} scale={0.75} />
    </group>
  );
}
