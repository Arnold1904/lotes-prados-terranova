import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatCOP, PROJECT_INFO } from '../data/houses';
import SatelliteMapCanvas from './SatelliteMapCanvas';

export default function SatelliteLotsSection() {
  const lotes = useStore((s) => s.lotes);
  const loteoConfig = useStore((s) => s.loteoConfig);
  const loteoOverlays = useStore((s) => s.loteoOverlays);
  const selectedLotNumero = useStore((s) => s.selectedLotNumero);
  const setSelectedLotNumero = useStore((s) => s.setSelectedLotNumero);
  const fetchLotes = useStore((s) => s.fetchLotes);
  const openPurchaseForLot = useStore((s) => s.openPurchaseForLot);
  const user = useStore((s) => s.user);

  // Simulador rápido en la ficha del lote
  const [cuotaInicialPct, setCuotaInicialPct] = useState(20);
  const [plazoMeses, setPlazoMeses] = useState(36);
  const [filterManzana, setFilterManzana] = useState('TODAS');
  const [showLinderos, setShowLinderos] = useState(false);
  const [showQuickGrid, setShowQuickGrid] = useState(false);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  const activeLot =
    lotes.find((l) => Number(l.numero_lote) === Number(selectedLotNumero)) || lotes[0] || null;

  const disponiblesCount = lotes.filter((l) => l.estado === 'disponible').length;
  const reservadosCount = lotes.filter((l) => l.estado === 'reservado').length;
  const vendidosCount = lotes.filter((l) => l.estado === 'vendido').length;

  const precioTotal = Number(activeLot?.precio_total || 150000000);
  const cuotaInicialVal = Math.round((precioTotal * cuotaInicialPct) / 100);
  const saldoFinanciar = Math.max(0, precioTotal - cuotaInicialVal);
  const cuotaMensual = plazoMeses > 0 ? Math.round(saldoFinanciar / plazoMeses) : 0;

  const filteredLots =
    filterManzana === 'TODAS'
      ? lotes
      : lotes.filter((l) => l.manzana === filterManzana);

  return (
    <section id="lotes" className="section section-lotes" data-section="lotes">
      <div className="lotes-wide-container reveal">
        <div className="lotes-header">
          <div>
            <span className="eyebrow">
              KM 7 VÍA YOPAL - AGUAZUL MARGEN DERECHA · A 300 METROS DE LA VÍA PRINCIPAL
            </span>
            <h2>{loteoConfig?.nombre_proyecto || 'Condominio Campestre Prados de Terranova'}</h2>
            <p className="sub lotes-sub">
              📍 <strong>Lotes campestres ubicados en el kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal.</strong>{' '}
              Área de <strong>600 m² (20 × 30 m)</strong>, dotados con <strong>servicios de agua y luz</strong> y{' '}
              <strong>escrituras legales individuales</strong>. Informes y ventas al{' '}
              <strong className="gold">Cel. {PROJECT_INFO.phoneDisplay}</strong>.
            </p>
          </div>

          <div className="lotes-kpis">
            <div className="kpi-pill disp">
              <strong>{disponiblesCount}</strong>
              <span>Disponibles</span>
            </div>
            <div className="kpi-pill res">
              <strong>{reservadosCount}</strong>
              <span>Reservados</span>
            </div>
            <div className="kpi-pill vend">
              <strong>{vendidosCount}</strong>
              <span>Vendidos</span>
            </div>
          </div>
        </div>

        <div className="lotes-grid-layout">
          {/* Columna izquierda: Mapa Satelital Interactivo */}
          <div className="lotes-map-col">
            <SatelliteMapCanvas
              config={loteoConfig}
              lots={lotes}
              overlays={loteoOverlays}
              selectedLotNumero={selectedLotNumero}
              onSelectLot={(num) => setSelectedLotNumero(num)}
              height="560px"
            />

            {/* Selector rápido por grilla de lotes L01..L38 (oculto por defecto) */}
            <div className="lotes-quick-strip">
              <div className="strip-head-row">
                <div className="strip-filters">
                  {['TODAS', 'Manzana A', 'Manzana B', 'Manzana C', 'Manzana D'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`strip-filter-btn ${filterManzana === m ? 'active' : ''}`}
                      onClick={() => {
                        setFilterManzana(m);
                        setShowQuickGrid(true);
                      }}
                    >
                      {m === 'TODAS' ? 'Todos (38)' : m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-toggle-more"
                  onClick={() => setShowQuickGrid(!showQuickGrid)}
                >
                  {showQuickGrid ? '▲ Ocultar lista' : '▼ Ver grilla L01–L38'}
                </button>
              </div>
              {showQuickGrid && (
                <div className="strip-chips">
                  {filteredLots.map((l) => {
                    const code = `L${String(l.numero_lote).padStart(2, '0')}`;
                    const active = Number(l.numero_lote) === Number(selectedLotNumero);
                    return (
                      <button
                        key={l.id || l.numero_lote}
                        type="button"
                        className={`lot-mini-chip ${l.estado} ${active ? 'active' : ''}`}
                        onClick={() => setSelectedLotNumero(l.numero_lote)}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Ficha sintetizada del lote seleccionado */}
          <div className="lotes-inspector-col">
            {activeLot ? (
              <div className="lot-detail-card">
                <div className="lot-detail-head">
                  <div>
                    <span className="lot-manzana-tag">
                      {activeLot.manzana} · {activeLot.codigo} · ESCRITURA INDIVIDUAL
                    </span>
                    <h3>
                      Lote L{String(activeLot.numero_lote).padStart(2, '0')}
                    </h3>
                  </div>
                  <span className={`lot-state-badge ${activeLot.estado}`}>
                    {activeLot.estado.toUpperCase()}
                  </span>
                </div>

                <div className="lot-price-hero">
                  <div>
                    <span>Valor total del lote (600 m²)</span>
                    <strong className="gold">{formatCOP(activeLot.precio_total)}</strong>
                  </div>
                  <div className="lot-price-m2">
                    <span>Servicios Incluidos</span>
                    <strong>Agua y Luz</strong>
                  </div>
                </div>

                <div className="lot-dimensions-grid">
                  <div className="dim-box">
                    <span className="dim-val">{Number(activeLot.frente_m).toFixed(0)} m</span>
                    <span className="dim-lbl">Frente</span>
                  </div>
                  <div className="dim-box">
                    <span className="dim-val">{Number(activeLot.fondo_m).toFixed(0)} m</span>
                    <span className="dim-lbl">Fondo</span>
                  </div>
                  <div className="dim-box">
                    <span className="dim-val">{Number(activeLot.area_m2).toFixed(0)} m²</span>
                    <span className="dim-lbl">Área Total</span>
                  </div>
                </div>

                {/* Beneficios clave del loteo */}
                <div className="config-summary-pill" style={{ marginBottom: '0.85rem' }}>
                  ✓ <strong>Km 7 vía Yopal - Aguazul margen derecha</strong> (a 300 m de la vía principal) ·{' '}
                  <strong>Agua y Luz</strong> · <strong>Escrituras legales individuales</strong> · Informes:{' '}
                  <strong>{PROJECT_INFO.phoneDisplay}</strong>
                </div>

                {/* Simulador rápido de financiación */}
                <div className="lot-sim-box">
                  <div className="sim-title-row">
                    <h4>Financiación Directa</h4>
                    <span className="sim-tag">0% Interés</span>
                  </div>

                  <div className="sim-control">
                    <div className="sim-label">
                      <span>Inicial ({cuotaInicialPct}%)</span>
                      <strong>{formatCOP(cuotaInicialVal)}</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      step="5"
                      value={cuotaInicialPct}
                      onChange={(e) => setCuotaInicialPct(Number(e.target.value))}
                    />
                  </div>

                  <div className="sim-control">
                    <div className="sim-term-pills">
                      {[12, 24, 36, 48, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`term-pill ${plazoMeses === m ? 'active' : ''}`}
                          onClick={() => setPlazoMeses(m)}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sim-result">
                    <div>
                      <span>Cuota mensual ({plazoMeses} meses):</span>
                      <strong className="gold">{formatCOP(cuotaMensual)} / mes</strong>
                    </div>
                  </div>
                </div>

                {/* Linderos y Coordenadas ocultos por defecto */}
                <div className="collapsible-block">
                  <button
                    type="button"
                    className="btn-toggle-more full"
                    onClick={() => setShowLinderos(!showLinderos)}
                  >
                    {showLinderos ? '▲ Ocultar linderos y coordenadas GPS' : '▼ Ver linderos y coordenadas GPS'}
                  </button>
                  {showLinderos && (
                    <div className="lot-linderos" style={{ marginTop: '0.5rem' }}>
                      <ul>
                        <li>
                          <span>Norte:</span>
                          <strong>{activeLot.lindero_norte || 'Vía interna'}</strong>
                        </li>
                        <li>
                          <span>Sur:</span>
                          <strong>{activeLot.lindero_sur || 'Franja ambiental'}</strong>
                        </li>
                        <li>
                          <span>Oriente:</span>
                          <strong>{activeLot.lindero_oriente || 'Lote colindante'}</strong>
                        </li>
                        <li>
                          <span>Occidente:</span>
                          <strong>{activeLot.lindero_occidente || 'Lote colindante'}</strong>
                        </li>
                        <li>
                          <span>GPS:</span>
                          <strong>
                            {Number(activeLot.latitud).toFixed(5)}, {Number(activeLot.longitud).toFixed(5)}
                          </strong>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {activeLot.venta_activa && (
                  <div className="lot-sold-info">
                    <span>Contrato: <strong>{activeLot.venta_activa.codigo_contrato}</strong></span>
                    <span>Titular: <strong>{activeLot.venta_activa.cliente_nombre}</strong></span>
                  </div>
                )}

                <div className="lot-cta-stack">
                  <button
                    type="button"
                    className="btn-primary full"
                    onClick={() => openPurchaseForLot(activeLot.numero_lote)}
                  >
                    {user
                      ? `Comprar / Financiar L${String(activeLot.numero_lote).padStart(2, '0')}`
                      : `Separar / Comprar L${String(activeLot.numero_lote).padStart(2, '0')}`}
                  </button>
                  <a
                    href={`https://wa.me/573115148526?text=${encodeURIComponent(
                      `Hola, me interesa el Lote L${String(activeLot.numero_lote).padStart(
                        2,
                        '0'
                      )} de 600 m² en Prados de Terranova (Km 7 vía Yopal - Aguazul margen derecha).`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline-full"
                    style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
                  >
                    📲 Solicitar Informes al Cel. {PROJECT_INFO.phoneDisplay}
                  </a>
                </div>
              </div>
            ) : (
              <div className="lot-detail-card">
                <p>Cargando información satelital desde MySQL...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
