import { Html } from '@react-three/drei';
import { useStore, useHouse } from '../store';

export default function Hotspots() {
  const house = useHouse();
  const section = useStore((s) => s.section);
  const mode = useStore((s) => s.mode);
  const active = useStore((s) => s.activeHotspot);
  const setHotspot = useStore((s) => s.setHotspot);
  const fading = useStore((s) => s.fading);
  const visible = !fading && (section === 'details' || mode === 'explore');

  return house.hotspots.map((h, i) => (
    <Html key={`${house.id}-${h.id}`} position={h.pos} center zIndexRange={[20, 0]}>
      <div className={`hotspot ${visible ? 'show' : ''} ${active === h.id ? 'active' : ''}`} style={{ transitionDelay: `${i * 80}ms` }}>
        <button
          className="hotspot-dot"
          aria-label={h.title}
          onClick={(e) => {
            e.stopPropagation();
            setHotspot(active === h.id ? null : h.id);
          }}
        >
          <span>{i + 1}</span>
        </button>
        {active === h.id && mode === 'explore' && (
          <div className="hotspot-card">
            <strong>{h.title}</strong>
            <p>{h.text}</p>
          </div>
        )}
      </div>
    </Html>
  ));
}
