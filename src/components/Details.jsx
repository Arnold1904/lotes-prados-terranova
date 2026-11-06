import { useStore, useHouse } from '../store';
import { PROJECT_INFO } from '../data/houses';

export default function Details() {
  const house = useHouse();
  const activeHotspot = useStore((s) => s.activeHotspot);
  const setHotspot = useStore((s) => s.setHotspot);

  return (
    <section id="details" className="section section-right" data-section="details">
      <div className="panel details-panel reveal">
        <span className="eyebrow">
          03 · CARACTERÍSTICAS DEL LOTEO · KM 7 VÍA YOPAL - AGUAZUL
        </span>
        <h2>Lotes Campestres de 600 m²</h2>
        <p className="sub">
          <strong>Lotes campestres ubicados en el kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal.</strong>{' '}
          Área de <strong>600 m² (20 × 30 m)</strong>, con <strong>servicios de agua y luz</strong> y{' '}
          <strong>escrituras legales individuales</strong>. Informes al{' '}
          <strong>Cel. {PROJECT_INFO.phoneDisplay}</strong>.
        </p>

        <div className="specs-grid">
          <div className="spec-box">
            <span className="spec-num">600</span>
            <span className="spec-unit">m² de área (20×30)</span>
          </div>
          <div className="spec-box">
            <span className="spec-num">300 m</span>
            <span className="spec-unit">de la vía principal</span>
          </div>
          <div className="spec-box">
            <span className="spec-num">Km 7</span>
            <span className="spec-unit">Vía Yopal - Aguazul</span>
          </div>
          <div className="spec-box">
            <span className="spec-num">100%</span>
            <span className="spec-unit">Agua y Luz</span>
          </div>
          <div className="spec-box">
            <span className="spec-num">Legal</span>
            <span className="spec-unit">Escritura individual</span>
          </div>
          <div className="spec-box">
            <span className="spec-num">38</span>
            <span className="spec-unit">Lotes campestres</span>
          </div>
        </div>

        <div className="hotspot-list-wrap">
          <div className="config-label">
            <span>Ventajas del proyecto y puntos interactivos 3D</span>
            {activeHotspot && (
              <button type="button" className="link-btn" onClick={() => setHotspot(null)}>
                Restablecer vista
              </button>
            )}
          </div>
          <div className="hotspot-list">
            {house.hotspots.map((h, i) => {
              const active = activeHotspot === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  className={`hotspot-item ${active ? 'active' : ''}`}
                  onClick={() => setHotspot(active ? null : h.id)}
                >
                  <span className="hs-index">0{i + 1}</span>
                  <div className="hs-copy">
                    <strong>{h.title}</strong>
                    <p>{h.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="price-banner">
          <div>
            <span>Informes y Ventas Directas</span>
            <strong className="gold">📞 Cel. {PROJECT_INFO.phoneDisplay}</strong>
          </div>
          <a
            href={PROJECT_INFO.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            📲 WhatsApp Directo
          </a>
        </div>
      </div>
    </section>
  );
}
