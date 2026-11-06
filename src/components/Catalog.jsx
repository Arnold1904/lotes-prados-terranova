import { useStore } from '../store';
import { HOUSES, PROJECT_INFO } from '../data/houses';

export default function Catalog() {
  const houseId = useStore((s) => s.houseId);
  const selectHouse = useStore((s) => s.selectHouse);
  const setMode = useStore((s) => s.setMode);

  return (
    <section id="catalog" className="section section-right" data-section="catalog">
      <div className="panel catalog-panel reveal">
        <span className="eyebrow">
          01 · LOTES CAMPESTRES DE 600 M² · KM 7 VÍA YOPAL - AGUAZUL
        </span>
        <h2>Construye tu Casa Campestre en 600 m²</h2>
        <p className="sub">
          Lotes campestres ubicados en el <strong>kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal</strong>. Área de <strong>600 m² (20 × 30 m)</strong> con <strong>servicios de agua y luz</strong> y <strong>escrituras legales individuales</strong>. Visualiza en 3D cómo luce tu futura casa campestre:
        </p>

        <div className="catalog-cards">
          {HOUSES.map((h) => {
            const active = h.id === houseId;
            return (
              <article
                key={h.id}
                className={`house-card ${active ? 'active' : ''}`}
                onClick={() => selectHouse(h.id)}
              >
                <div className="house-card-head">
                  <div>
                    <span className="card-loc">{PROJECT_INFO.locationShort}</span>
                    <h3>{h.name}</h3>
                  </div>
                  <span className="card-price">Lote 600 m²</span>
                </div>
                <p>{h.tagline}</p>
                <div className="card-specs">
                  <span>600 m² lote (20×30 m)</span>
                  <span>Agua y Luz</span>
                  <span>Escritura Individual</span>
                </div>
                <div className="card-footer">
                  <span className="status-badge">
                    {active ? '● En escena 3D · Cel. 311 514 8526' : 'Ver prototipo en lote de 600 m²'}
                  </span>
                  {active && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode('explore');
                      }}
                    >
                      Orbitar 360° →
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
