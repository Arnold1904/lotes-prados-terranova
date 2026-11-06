import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { useStore } from '../store';

export default function Loader() {
  const { active, progress } = useProgress();
  const loaded = useStore((s) => s.loaded);
  const setLoaded = useStore((s) => s.setLoaded);

  useEffect(() => {
    if (!active && progress >= 99) {
      const t = setTimeout(() => setLoaded(true), 400);
      return () => clearTimeout(t);
    }
  }, [active, progress, setLoaded]);

  return (
    <div className={`loader ${loaded ? 'done' : ''}`}>
      <div className="loader-inner">
        <div className="brand-mark">
          <svg viewBox="0 0 32 32" width="38" height="38" aria-hidden="true">
            <path d="M16 3 3 29h26z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.5 22h13" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="eyebrow">PRADOS DE TERRANOVA · KM 7 VÍA YOPAL - AGUAZUL</p>
        <h2>Lotes Campestres de 600 m² · Informes Cel. 311 514 8526</h2>
        <div className="loader-bar">
          <div className="loader-fill" style={{ width: `${Math.min(100, Math.round(progress))}%` }} />
        </div>
        <span className="loader-pct">{Math.min(100, Math.round(progress))}%</span>
      </div>
    </div>
  );
}
