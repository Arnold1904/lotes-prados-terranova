import { Component, Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import Lighting from './Lighting';
import HouseModel from './HouseModel';
import Hotspots from './Hotspots';
import CameraRig from './CameraRig';
import Effects from './Effects';
import { useMaterials } from './materials';
import { useStore } from '../store';

class EffectsErrorBoundary extends Component {
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

function Preload() {
  useMaterials();
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
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => {
        setTimeout(() => useStore.getState().setLoaded(true), 600);
      }}
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        onDecline={() => {
          setDpr(1);
          setQuality('low');
        }}
      />
      <AdaptiveDpr pixelated={false} />
      <Preload />
      <Lighting />
      <Suspense fallback={null}>
        <HouseModel />
      </Suspense>
      <Suspense fallback={null}>
        <Hotspots />
      </Suspense>
      <EffectsErrorBoundary>
        <Suspense fallback={null}>
          <Effects quality={quality} />
        </Suspense>
      </EffectsErrorBoundary>
      <CameraRig />
    </Canvas>
  );
}
