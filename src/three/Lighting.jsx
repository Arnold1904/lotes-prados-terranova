import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEnvironment } from '@react-three/drei';
import { easing } from 'maath';
import { useStore } from '../store';
import { lightState } from './parts';
import { getMaterials } from './materials';

const SUN_DAY = new THREE.Color('#fff1dc');
const SUN_NIGHT = new THREE.Color('#7f95c4');
const FOG_DAY = new THREE.Color('#c4cdd3');
const FOG_NIGHT = new THREE.Color('#2b3142');

export default function Lighting() {
  const day = useEnvironment({ files: '/hdri/day.hdr' });
  const night = useEnvironment({ files: '/hdri/night.hdr' });
  const scene = useThree((s) => s.scene);
  const sun = useRef();
  const current = useRef(null);

  useFrame((_, dt) => {
    const isNight = useStore.getState().isNight;
    easing.damp(lightState, 'night', isNight ? 1 : 0, 0.5, dt);
    const n = lightState.night;

    // Cambio de HDRI con "fundido" de intensidad alrededor del punto medio
    const tex = n > 0.5 ? night : day;
    if (current.current !== tex) {
      scene.environment = tex;
      scene.background = tex;
      current.current = tex;
    }
    const dip = 0.25 + 0.75 * Math.min(1, Math.abs(n - 0.5) * 2);
    scene.environmentIntensity = (n > 0.5 ? 0.45 : 1.0) * dip;
    scene.backgroundIntensity = (n > 0.5 ? 0.7 : 1.0) * dip;

    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(3.4, 0.25, n);
      sun.current.color.lerpColors(SUN_DAY, SUN_NIGHT, n);
    }
    if (scene.fog) scene.fog.color.lerpColors(FOG_DAY, FOG_NIGHT, n);

    const m = getMaterials();
    if (m) {
      m.lightPanel.emissiveIntensity = 0.15 + n * 7;
      m.lamp.emissiveIntensity = 0.05 + n * 9;
      m.poolTile.emissiveIntensity = n * 0.35;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#c4cdd3', 45, 190]} />
      <directionalLight
        ref={sun}
        position={[18, 24, 14]}
        intensity={3.4}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
    </>
  );
}
