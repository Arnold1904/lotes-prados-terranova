import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import Lighting from './Lighting';
import HouseModel from './HouseModel';
import Hotspots from './Hotspots';
import CameraRig from './CameraRig';
import Effects from './Effects';
import { useMaterials } from './materials';

function Preload() {
  useMaterials(); // carga todas las texturas PBR de una vez
  return null;
}

export default function Experience() {
  const [dpr, setDpr] = useState(1.5);
  const [quality, setQuality] = useState('high');

  return (
    <Canvas
      shadows
      flat
      dpr={dpr}
      camera={{ position: [30, 12, 40], fov: 35, near: 0.1, far: 1200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        onDecline={() => {
          setDpr(1);
          setQuality('low');
        }}
      />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Preload />
        <Lighting />
        <HouseModel />
        <Hotspots />
        <Effects quality={quality} />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
