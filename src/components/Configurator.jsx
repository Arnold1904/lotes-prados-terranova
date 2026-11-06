import { useStore, useHouse } from '../store';
import { FACADE_MATERIALS, FRAME_COLORS, PROJECT_INFO } from '../data/houses';

export default function Configurator() {
  const house = useHouse();
  const facades = useStore((s) => s.facades);
  const setFacade = useStore((s) => s.setFacade);
  const frameColor = useStore((s) => s.frameColor);
  const setFrameColor = useStore((s) => s.setFrameColor);
  const isNight = useStore((s) => s.isNight);
  const toggleNight = useStore((s) => s.toggleNight);
  const setMode = useStore((s) => s.setMode);

  const activeFacade = facades[house.id];

  return (
    <section id="configurator" className="section section-left" data-section="configurator">
      <div className="panel config-panel reveal">
        <span className="eyebrow">02 · PERSONALIZA TU PROYECTO EN LOTE DE 600 M²</span>
        <h2>Diseña tu Casa en {PROJECT_INFO.name}</h2>
        <p className="sub">
          En tu lote campestre de <strong>600 m² (20 × 30 m)</strong> ubicado en el <strong>Km 7 vía Yopal - Aguazul margen derecha (a 300 m de la vía principal)</strong>, ya cuentas con <strong>servicios de agua y luz</strong> y <strong>escrituras legales individuales</strong>. Personaliza los acabados de tu vivienda en tiempo real:
        </p>

        <div className="config-block">
          <div className="config-label">
            <span>Revestimiento de fachada</span>
            <strong>{FACADE_MATERIALS[activeFacade]?.label}</strong>
          </div>
          <div className="swatch-grid">
            {house.facadeOptions.map((key) => {
              const item = FACADE_MATERIALS[key];
              const selected = activeFacade === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`swatch-btn ${selected ? 'active' : ''}`}
                  onClick={() => setFacade(key)}
                >
                  <span
                    className="swatch-thumb"
                    style={{ backgroundImage: `url(${item.swatch})` }}
                  />
                  <span className="swatch-name">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="config-block">
          <div className="config-label">
            <span>Carpintería y perfiles</span>
            <strong>{FRAME_COLORS[frameColor]?.label}</strong>
          </div>
          <div className="frame-row">
            {Object.entries(FRAME_COLORS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={`frame-chip ${frameColor === key ? 'active' : ''}`}
                onClick={() => setFrameColor(key)}
              >
                <span className="color-dot" style={{ background: item.color }} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="config-block">
          <div className="config-label">
            <span>Iluminación en el lote (Servicios de Agua y Luz)</span>
            <strong>{isNight ? 'Iluminación nocturna activa' : 'Sol llanero de día'}</strong>
          </div>
          <div className="lighting-toggle">
            <button
              type="button"
              className={`light-opt ${!isNight ? 'active' : ''}`}
              onClick={() => isNight && toggleNight()}
            >
              ☀ Luz natural de día
            </button>
            <button
              type="button"
              className={`light-opt ${isNight ? 'active' : ''}`}
              onClick={() => !isNight && toggleNight()}
            >
              ☾ Escena nocturna cálida
            </button>
          </div>
        </div>

        <button type="button" className="btn-outline-full" onClick={() => setMode('explore')}>
          Abrir cámara 3D libre · Informes Cel. {PROJECT_INFO.phoneDisplay}
        </button>
      </div>
    </section>
  );
}
