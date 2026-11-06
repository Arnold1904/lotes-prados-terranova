import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { easing } from 'maath';
import { useStore } from '../store';
import { HOUSE_BY_ID, SHOTS } from '../data/houses';

const UP = new THREE.Vector3(0, 1, 0);
const pos = new THREE.Vector3();
const target = new THREE.Vector3();
const dir = new THREE.Vector3();
const right = new THREE.Vector3();
export const rigLook = new THREE.Vector3(0, 3, 0);

export default function CameraRig() {
  const mode = useStore((s) => s.mode);
  const houseId = useStore((s) => s.houseId);
  const controls = useRef();
  const { camera, size } = useThree();

  useEffect(() => {
    if (mode === 'explore' && controls.current) {
      const c = HOUSE_BY_ID[houseId].center;
      controls.current.target.set(c[0], c[1] - 0.5, c[2]);
      controls.current.update();
    }
  }, [mode, houseId]);

  useFrame((state, dt) => {
    const s = useStore.getState();
    if (s.mode === 'explore') {
      if (controls.current) rigLook.copy(controls.current.target);
      return;
    }
    const house = HOUSE_BY_ID[s.houseId];
    const k = house.radius;
    const c = house.center;
    const mobile = size.width < 900;
    const hs = s.activeHotspot && house.hotspots.find((h) => h.id === s.activeHotspot);

    if (hs) {
      pos.set(...hs.cam);
      target.set(...hs.pos);
    } else {
      const shot = SHOTS[s.section] || SHOTS.hero;
      const zoom = mobile ? 1.35 : 1;
      pos.set(shot.pos[0] * k * zoom + c[0], shot.pos[1] * k * zoom + c[1], shot.pos[2] * k * zoom + c[2]);
      target.set(c[0], c[1], c[2]);
      dir.subVectors(target, pos).normalize();
      right.crossVectors(dir, UP).normalize();
      if (!mobile) target.addScaledVector(right, shot.shift * k);
      else target.y -= 2.5;
      // parallax sutil con el puntero
      pos.addScaledVector(right, state.pointer.x * 0.9);
      pos.y += state.pointer.y * 0.4;
    }
    easing.damp3(camera.position, pos, hs ? 0.7 : 1.0, dt);
    easing.damp3(rigLook, target, hs ? 0.6 : 0.9, dt);
    camera.lookAt(rigLook);
  });

  return mode === 'explore' ? (
    <OrbitControls
      ref={controls}
      makeDefault
      target={rigLook.toArray()}
      enableDamping
      dampingFactor={0.06}
      minDistance={7}
      maxDistance={48}
      maxPolarAngle={Math.PI / 2 - 0.06}
      enablePan={false}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
    />
  ) : null;
}
