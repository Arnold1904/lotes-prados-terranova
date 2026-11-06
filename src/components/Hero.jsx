import { useStore } from '../store';
import { PROJECT_INFO } from '../data/houses';

export default function Hero() {
  const setMode = useStore((s) => s.setMode);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="hero" className="section section-hero" data-section="hero">
      <div className="panel hero-panel reveal">
        <span className="eyebrow">
          PRADOS DE TERRANOVA · KM 7 VÍA YOPAL - AGUAZUL (MARGEN DERECHA)
        </span>
        <h1>Lotes Campestres de 600 m² a 300 m de la Vía Principal</h1>
        <p className="lead">
          <strong>Lotes campestres ubicados en el kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal.</strong>{' '}
          Área de <strong>600 m² (20 × 30 m)</strong>, con <strong>servicios de agua y luz</strong> y{' '}
          <strong>escrituras legales individuales</strong>. Condominio con Portería y Área Social central.
        </p>

        <div className="hero-stats">
          <div>
            <span className="stat-label">Área de cada lote</span>
            <strong>600 m² (20×30)</strong>
          </div>
          <div>
            <span className="stat-label">Servicios y Legalidad</span>
            <strong>Agua, Luz y Escritura</strong>
          </div>
          <div>
            <span className="stat-label">Informes y Ventas</span>
            <strong className="gold">📞 {PROJECT_INFO.phoneDisplay}</strong>
          </div>
        </div>

        <div className="cta-row">
          <button className="btn-primary" onClick={() => scrollTo('lotes')}>
            🛰️ Ver Lotes Disponibles (600 m²)
          </button>
          <a
            href={PROJECT_INFO.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            📲 WhatsApp {PROJECT_INFO.phoneDisplay}
          </a>
          <button className="btn-ghost" onClick={() => setMode('explore')}>
            Explorar Casa 3D
          </button>
        </div>
      </div>

      <div className="scroll-hint">
        <span>Km 7 Vía Yopal - Aguazul · Informes Cel. 311 514 8526</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
