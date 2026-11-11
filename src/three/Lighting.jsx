import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useStore } from '../store';
import { lightState } from './parts';
import { getMaterials } from './materials';

const SUN_DAY = new THREE.Color('#fff1dc');
const SUN_NIGHT = new THREE.Color('#7f95c4');
const FOG_DAY = new THREE.Color('#c4cdd3');
const FOG_NIGHT = new THREE.Color('#1d2230');

export default function Lighting() {
  const scene = useThree((s) => s.scene);
  const sun = useRef();
  const ambient = useRef();
  const hemi = useRef();
  const dayTex = useRef(null);
  const nightTex = useRef(null);
  const current = useRef(null);

  useEffect(() => {
    // Fondo de cielo inmediato mientras descargan los archivos HDRI
    if (!scene.background) {
      scene.background = FOG_DAY.clone();
    }

    const loader = new RGBELoader();
    loader.load(
      '/hdri/day.hdr?v=3',
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        dayTex.current = tex;
        current.current = null;
      },
      undefined,
      () => {}
    );

    loader.load(
      '/hdri/night.hdr?v=3',
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        nightTex.current = tex;
        current.current = null;
      },
      undefined,
      () => {}
    );
  }, [scene]);

  useFrame((_, dt) => {
    const isNight = useStore.getState().isNight;
    easing.damp(lightState, 'night', isNight ? 1 : 0, 0.5, dt);
    const n = lightState.night;

    const tex = n > 0.5 ? nightTex.current : dayTex.current;
    if (tex && current.current !== tex) {
      scene.environment = tex;
      scene.background = tex;
      current.current = tex;
    } else if (!tex && (!scene.background || scene.background.isColor)) {
      scene.background = FOG_DAY.clone().lerp(FOG_NIGHT, n);
    }

    const dip = 0.25 + 0.75 * Math.min(1, Math.abs(n - 0.5) * 2);
    scene.environmentIntensity = (n > 0.5 ? 0.45 : 1.0) * dip;
    scene.backgroundIntensity = (n > 0.5 ? 0.7 : 1.0) * dip;

    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(3.4, 0.35, n);
      sun.current.color.lerpColors(SUN_DAY, SUN_NIGHT, n);
    }
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.lerp(0.65, 0.22, n);
    }
    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.lerp(0.85, 0.25, n);
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
      <ambientLight ref={ambient} intensity={0.65} color="#fff8ee" />
      <hemisphereLight ref={hemi} args={['#dce8f5', '#6e7a58', 0.85]} />
      <directionalLight
        ref={sun}
        position={[18, 24, 14]}
        intensity={3.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
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
