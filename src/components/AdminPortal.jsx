import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { formatCOP, HOUSES } from '../data/houses';
import { computeLoteoGeometry } from '../utils/lotGeometry';
import { generateAmortizationSchedule } from '../utils/finance';
import SatelliteMapCanvas from './SatelliteMapCanvas';
import ReceiptModal from './ReceiptModal';

export default function AdminPortal() {
  const user = useStore((s) => s.user);
  const adminOpen = useStore((s) => s.adminOpen);
  const setAdminOpen = useStore((s) => s.setAdminOpen);
  const adminTab = useStore((s) => s.adminTab);
  const setAdminTab = useStore((s) => s.setAdminTab);
  const logout = useStore((s) => s.logout);

  const lotes = useStore((s) => s.lotes);
  const loteoConfig = useStore((s) => s.loteoConfig);
  const selectedLotNumero = useStore((s) => s.selectedLotNumero);
  const setSelectedLotNumero = useStore((s) => s.setSelectedLotNumero);
  const fetchLotes = useStore((s) => s.fetchLotes);

  const [dashboard, setDashboard] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contabilidad, setContabilidad] = useState([]);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);

  // Estados para ocultar información secundaria y mostrar solo lo importante
  const [showMoreCliente, setShowMoreCliente] = useState(false);
  const [showMoreVenta, setShowMoreVenta] = useState(false);
  const [showAmortTable, setShowAmortTable] = useState(false);
  const [showLotChips, setShowLotChips] = useState(false);
  const [showAbonosHistory, setShowAbonosHistory] = useState(false);
  const [showAdvancedSat, setShowAdvancedSat] = useState(false);
  const [showIndividualLotEdit, setShowIndividualLotEdit] = useState(false);
  const [showContabilidad, setShowContabilidad] = useState(false);

  // --- Estado Formulario de Compra y Financiación ---
  const [modoCliente, setModoCliente] = useState('nuevo'); // 'nuevo' | 'existente'
  const [clienteExistenteId, setClienteExistenteId] = useState('');
  const [clienteForm, setClienteForm] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    correo: '',
    ciudad: 'Yopal, Casanare',
    direccion: '',
    ocupacion: '',
  });
  const [ventaForm, setVentaForm] = useState({
    modalidad: 'financiado',
    incluye_casa_3d: false,
    modelo_casa: 'Villa Solaris',
    valor_casa_3d: 280000000,
    descuento: 0,
    cuota_inicial: 27000000, // 30% de 90M
    numero_cuotas: 36, // Entre 24 y 58 meses
    tasa_interes_mensual: 2.0, // Tasa sugerida del Excel, 100% editable
    metodo_pago_inicial: 'Transferencia Bancaria',
    referencia_pago_inicial: '',
    asesor_comercial: 'Administración Terranova',
    comision_porcentaje: 3,
    fecha_venta: new Date().toISOString().slice(0, 10),
    observaciones: '',
  });

  // --- Estado Formulario de Abono de Cartera ---
  const [selectedVentaIdForAbono, setSelectedVentaIdForAbono] = useState('');
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    metodo_pago: 'Transferencia Bancaria',
    referencia_pago: '',
    fecha_abono: new Date().toISOString().slice(0, 10),
    concepto: '',
    observacion: '',
  });

  // --- Estado Editor Satelital (Geometría Global + Lote Individual) ---
  const [draftConfig, setDraftConfig] = useState(loteoConfig);
  const [resetSizesOnSave, setResetSizesOnSave] = useState(false);
  const [resetOffsetsOnSave, setResetOffsetsOnSave] = useState(false);
  const [lotEditForm, setLotEditForm] = useState({
    frente_m: 20,
    fondo_m: 30,
    precio_m2: 250000,
    precio_total: 150000000,
    estado: 'disponible',
    offset_x_m: 0,
    offset_y_m: 0,
    lindero_norte: '',
    lindero_sur: '',
    lindero_oriente: '',
    lindero_occidente: '',
  });

  const showNotice = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadAllAdminData = async () => {
    try {
      await fetchLotes();
      const [dRes, vRes, aRes, cRes, mRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/ventas'),
        fetch('/api/abonos'),
        fetch('/api/clientes'),
        fetch('/api/contabilidad'),
      ]);
      if (dRes.ok) setDashboard(await dRes.json());
      if (vRes.ok) setVentas(await vRes.json());
      if (aRes.ok) setAbonos(await aRes.json());
      if (cRes.ok) setClientes(await cRes.json());
      if (mRes.ok) setContabilidad(await mRes.json());
    } catch (err) {
      console.error('Error cargando datos administrativos:', err);
    }
  };

  useEffect(() => {
    if (adminOpen && user) {
      loadAllAdminData();
    }
  }, [adminOpen, user]);

  useEffect(() => {
    setDraftConfig(loteoConfig);
  }, [loteoConfig]);

  const activeLot = useMemo(
    () => lotes.find((l) => Number(l.numero_lote) === Number(selectedLotNumero)) || lotes[0] || null,
    [lotes, selectedLotNumero]
  );

  // Sincronizar formulario de lote individual cuando cambia el lote seleccionado
  useEffect(() => {
    if (!activeLot) return;
    setLotEditForm({
      frente_m: Number(activeLot.frente_m || 20),
      fondo_m: Number(activeLot.fondo_m || 30),
      precio_m2: Number(activeLot.precio_m2 || 250000),
      precio_total: Number(activeLot.precio_total || 150000000),
      estado: activeLot.estado || 'disponible',
      offset_x_m: Number(activeLot.coordenadas_geojson?.customOffset?.dx || 0),
      offset_y_m: Number(activeLot.coordenadas_geojson?.customOffset?.dy || 0),
      lindero_norte: activeLot.lindero_norte || '',
      lindero_sur: activeLot.lindero_sur || '',
      lindero_oriente: activeLot.lindero_oriente || '',
      lindero_occidente: activeLot.lindero_occidente || '',
    });
  }, [activeLot]);

  // Previsualización en tiempo real de la geometría satelital mientras se ajustan los sliders
  const livePreviewGeo = useMemo(() => {
    if (!lotes.length) return { lots: [], overlays: null };
    const previewLots = lotes.map((l) => {
      if (Number(l.numero_lote) !== Number(selectedLotNumero)) return l;
      return {
        ...l,
        frente_m: Number(lotEditForm.frente_m || l.frente_m),
        fondo_m: Number(lotEditForm.fondo_m || l.fondo_m),
        estado: lotEditForm.estado || l.estado,
        coordenadas_geojson: {
          ...(l.coordenadas_geojson || {}),
          customSize: true,
          customOffset: {
            dx: Number(lotEditForm.offset_x_m || 0),
            dy: Number(lotEditForm.offset_y_m || 0),
          },
        },
      };
    });
    return computeLoteoGeometry(draftConfig, previewLots);
  }, [draftConfig, lotes, selectedLotNumero, lotEditForm]);

  // Cálculos del proceso de compra y tabla de amortización basada en el modelo de Excel
  const financialSummary = useMemo(() => {
    const valLote = Number(activeLot?.precio_total || (Number(activeLot?.numero_lote) <= 3 ? 80000000 : 90000000));
    const valCasa = ventaForm.incluye_casa_3d ? Number(ventaForm.valor_casa_3d || 0) : 0;
    const desc = Number(ventaForm.descuento || 0);
    const totalVenta = Math.max(0, valLote + valCasa - desc);
    const inicial =
      ventaForm.modalidad === 'contado' ? totalVenta : Number(ventaForm.cuota_inicial || 0);
    const saldoFinanciar = Math.max(0, totalVenta - inicial);
    const cuotas =
      ventaForm.modalidad === 'contado' ? 1 : Math.max(1, Number(ventaForm.numero_cuotas || 1));
    const tasa =
      ventaForm.modalidad === 'contado' ? 0 : Number(ventaForm.tasa_interes_mensual || 0);

    const amort = generateAmortizationSchedule({
      montoFinanciar: saldoFinanciar,
      plazoMeses: cuotas,
      tasaInteresMensualPct: tasa,
      fechaInicio: ventaForm.fecha_venta || new Date().toISOString().slice(0, 10),
    });

    return {
      valLote,
      valCasa,
      desc,
      totalVenta,
      inicial,
      saldoFinanciar,
      cuotas,
      tasa,
      cuotaMensual: amort.cuotaFija,
      totalIntereses: amort.totalIntereses,
      costoTotalFinanciado: amort.costoTotalFinanciado,
      schedule: amort.cronograma,
    };
  }, [activeLot, ventaForm]);

  if (!adminOpen || !user) return null;

  // --- Handlers de Compra y Financiación ---
  const handleConfirmPurchase = async (e) => {
    e.preventDefault();
    if (!activeLot) return;
    setSaving(true);
    try {
      const payload = {
        lote_id: activeLot.id,
        cliente_id: modoCliente === 'existente' ? Number(clienteExistenteId) : null,
        cliente_nuevo: modoCliente === 'nuevo' ? clienteForm : null,
        ...ventaForm,
        valor_lote: activeLot.precio_total,
      };

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar la venta');

      showNotice(
        `¡Venta registrada! Contrato ${data.venta.codigo_contrato} guardado en MySQL.`
      );
      await loadAllAdminData();
      setAdminTab('cartera');
    } catch (err) {
      showNotice(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  // --- Handler de Registro de Abono ---
  const handleRegisterAbono = async (e) => {
    e.preventDefault();
    if (!selectedVentaIdForAbono) {
      showNotice('Selecciona un contrato para registrar el abono', 'err');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: Number(selectedVentaIdForAbono),
          ...abonoForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando abono');

      showNotice(data.message);
      if (data.abono) {
        setActiveReceiptModal(data.abono);
      }
      setAbonoForm({
        ...abonoForm,
        monto: '',
        referencia_pago: '',
        observacion: '',
      });
      await loadAllAdminData();
    } catch (err) {
      showNotice(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  // --- Handler para guardar Ubicación, Rotación y Dimensiones Globales en MySQL ---
  const handleSaveGlobalLayout = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/lotes/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draftConfig,
          resetIndividualSizes: resetSizesOnSave,
          resetIndividualOffsets: resetOffsetsOnSave,
          updateAvailablePrices: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando distribución satelital');

      showNotice('Ubicación satelital y tamaño de lotes actualizados en MySQL.');
      await fetchLotes();
    } catch (err) {
      showNotice(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  // --- Handler para guardar cambios de un Lote Individual en MySQL ---
  const handleSaveSingleLot = async (e) => {
    e.preventDefault();
    if (!activeLot) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/lotes/${activeLot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lotEditForm,
          customSize: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando lote');

      showNotice(data.message);
      await fetchLotes();
      await loadAllAdminData();
    } catch (err) {
      showNotice(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  // Desplazar centro en metros (Norte/Sur/Este/Oeste)
  const nudgeCenterMeters = (dxMeters, dyMeters) => {
    const lat = Number(draftConfig.center_lat || 5.29668);
    const lng = Number(draftConfig.center_lng || -72.41842);
    const dLat = dyMeters / 111132.92;
    const dLng = dxMeters / (111412.84 * Math.cos((lat * Math.PI) / 180));
    setDraftConfig({
      ...draftConfig,
      center_lat: Number((lat + dLat).toFixed(7)),
      center_lng: Number((lng + dLng).toFixed(7)),
    });
  };

  return (
    <div className="admin-portal-overlay">
      <div className="admin-portal-container">
        {toast && (
          <div className={`admin-toast ${toast.type === 'err' ? 'err' : 'ok'}`}>
            {toast.msg}
          </div>
        )}

        {/* Resumen Sintetizado (KPIs Esenciales) */}
        {dashboard && (
          <div className="admin-kpi-row compact">
            <div className="admin-kpi-card">
              <span>Lotes (38)</span>
              <strong>
                {dashboard.lotes?.disponibles || 0} Disp · {dashboard.lotes?.reservados || 0} Res ·{' '}
                {dashboard.lotes?.vendidos || 0} Vend
              </strong>
            </div>
            <div className="admin-kpi-card">
              <span>Ventas ({dashboard.ventas?.total_contratos || 0})</span>
              <strong className="gold">{formatCOP(dashboard.ventas?.total_vendido)}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>Recaudado</span>
              <strong className="text-green">{formatCOP(dashboard.ventas?.total_recaudado)}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>Cartera por Cobrar</span>
              <strong className="text-amber">{formatCOP(dashboard.ventas?.cartera_pendiente)}</strong>
            </div>
          </div>
        )}

        {/* ==================== MÓDULO 1: COMPRA Y FINANCIACIÓN DE LOTES ==================== */}
        {adminTab === 'compra' && (
          <div className="admin-module-grid">
            <form className="admin-card" onSubmit={handleConfirmPurchase}>
              <h3>Compra y Financiación de Lotes</h3>

              {/* Selección de Lote */}
              <div className="admin-section-box">
                <div className="box-title-bar">
                  <h4>1. Lote Seleccionado</h4>
                  <button
                    type="button"
                    className="btn-toggle-more"
                    onClick={() => setShowLotChips(!showLotChips)}
                  >
                    {showLotChips ? '▲ Ocultar grilla' : '▼ Elegir en grilla L01–L38'}
                  </button>
                </div>

                <label className="full-label" style={{ marginBottom: showLotChips ? '0.6rem' : 0 }}>
                  <select
                    value={selectedLotNumero}
                    onChange={(e) => setSelectedLotNumero(Number(e.target.value))}
                  >
                    {lotes.map((l) => (
                      <option key={l.id} value={l.numero_lote}>
                        L{String(l.numero_lote).padStart(2, '0')} ({l.manzana}) —{' '}
                        {Number(l.area_m2).toFixed(0)} m² — {formatCOP(l.precio_total)} [{l.estado.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </label>

                {showLotChips && (
                  <div className="mini-lot-selector">
                    {lotes.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className={`lot-mini-chip ${l.estado} ${
                          Number(l.numero_lote) === Number(selectedLotNumero) ? 'active' : ''
                        }`}
                        onClick={() => setSelectedLotNumero(l.numero_lote)}
                      >
                        L{String(l.numero_lote).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Datos del Comprador (Sintetizados) */}
              <div className="admin-section-box">
                <div className="box-title-bar">
                  <h4>2. Comprador</h4>
                  <div className="toggle-pills">
                    <button
                      type="button"
                      className={`mini-tab ${modoCliente === 'nuevo' ? 'active' : ''}`}
                      onClick={() => setModoCliente('nuevo')}
                    >
                      + Nuevo
                    </button>
                    <button
                      type="button"
                      className={`mini-tab ${modoCliente === 'existente' ? 'active' : ''}`}
                      onClick={() => setModoCliente('existente')}
                    >
                      Existente ({clientes.length})
                    </button>
                  </div>
                </div>

                {modoCliente === 'existente' ? (
                  <label className="full-label" style={{ marginBottom: 0 }}>
                    <select
                      value={clienteExistenteId}
                      onChange={(e) => setClienteExistenteId(e.target.value)}
                      required
                    >
                      <option value="">-- Selecciona un comprador --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} — CC: {c.documento} — Tel: {c.telefono}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <div className="admin-field-grid">
                      <label>
                        <span>Nombre completo *</span>
                        <input
                          type="text"
                          placeholder="Ej. Carlos Salamanca"
                          value={clienteForm.nombre}
                          onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        <span>Cédula / NIT *</span>
                        <input
                          type="text"
                          placeholder="Ej. 1118540219"
                          value={clienteForm.documento}
                          onChange={(e) =>
                            setClienteForm({ ...clienteForm, documento: e.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Teléfono / WhatsApp *</span>
                        <input
                          type="text"
                          placeholder="Ej. 310 456 7890"
                          value={clienteForm.telefono}
                          onChange={(e) =>
                            setClienteForm({ ...clienteForm, telefono: e.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Correo (Opcional)</span>
                        <input
                          type="email"
                          placeholder="cliente@correo.com"
                          value={clienteForm.correo}
                          onChange={(e) => setClienteForm({ ...clienteForm, correo: e.target.value })}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn-toggle-more"
                      style={{ marginTop: '0.55rem' }}
                      onClick={() => setShowMoreCliente(!showMoreCliente)}
                    >
                      {showMoreCliente ? '▲ Ocultar datos adicionales' : '▼ Más datos (Ciudad, Dirección)'}
                    </button>

                    {showMoreCliente && (
                      <div className="admin-field-grid" style={{ marginTop: '0.55rem' }}>
                        <label>
                          <span>Ciudad</span>
                          <input
                            type="text"
                            value={clienteForm.ciudad}
                            onChange={(e) => setClienteForm({ ...clienteForm, ciudad: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Dirección / Ocupación</span>
                          <input
                            type="text"
                            placeholder="Dirección o actividad"
                            value={clienteForm.direccion}
                            onChange={(e) =>
                              setClienteForm({ ...clienteForm, direccion: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Condiciones de Financiación (Sintetizadas) */}
              <div className="admin-section-box">
                <div className="box-title-bar">
                  <h4>3. Plan de Pago</h4>
                  <button
                    type="button"
                    className="btn-toggle-more"
                    onClick={() => setShowMoreVenta(!showMoreVenta)}
                  >
                    {showMoreVenta ? '▲ Ocultar opciones avanzadas' : '▼ Opciones extra (Casa 3D, Descuento, Notas)'}
                  </button>
                </div>

                <div className="admin-field-grid">
                  <label>
                    <span>Modalidad</span>
                    <select
                      value={ventaForm.modalidad}
                      onChange={(e) =>
                        setVentaForm({ ...ventaForm, modalidad: e.target.value })
                      }
                    >
                      <option value="financiado">Financiado a Cuotas</option>
                      <option value="contado">Pago de Contado (100%)</option>
                      <option value="reserva">Reserva / Separación</option>
                    </select>
                  </label>

                  <label>
                    <span>Método de Pago</span>
                    <select
                      value={ventaForm.metodo_pago_inicial}
                      onChange={(e) =>
                        setVentaForm({ ...ventaForm, metodo_pago_inicial: e.target.value })
                      }
                    >
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="Consignación">Consignación</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="PSE">PSE</option>
                    </select>
                  </label>

                  {ventaForm.modalidad !== 'contado' && (
                    <>
                      <label>
                        <span>Cuota Inicial (Mínimo 30%: {formatCOP(Math.round(financialSummary.totalVenta * 0.3))})</span>
                        <input
                          type="number"
                          min={Math.round(financialSummary.totalVenta * 0.3)}
                          step="any"
                          value={ventaForm.cuota_inicial}
                          onChange={(e) =>
                            setVentaForm({ ...ventaForm, cuota_inicial: Number(e.target.value) })
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>Plazo (24 a 58 Meses)</span>
                        <input
                          type="number"
                          min="24"
                          max="58"
                          value={ventaForm.numero_cuotas}
                          onChange={(e) =>
                            setVentaForm({ ...ventaForm, numero_cuotas: Number(e.target.value) })
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>Interés Mensual (%) [Editable]</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={ventaForm.tasa_interes_mensual}
                          onChange={(e) =>
                            setVentaForm({
                              ...ventaForm,
                              tasa_interes_mensual: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </div>

                {showMoreVenta && (
                  <div className="admin-extra-panel">
                    <div className="admin-field-grid">
                      <label>
                        <span>¿Incluir Casa 3D?</span>
                        <select
                          value={ventaForm.incluye_casa_3d ? 'si' : 'no'}
                          onChange={(e) =>
                            setVentaForm({
                              ...ventaForm,
                              incluye_casa_3d: e.target.value === 'si',
                            })
                          }
                        >
                          <option value="no">No — Solo Lote</option>
                          <option value="si">Sí — Lote + Casa 3D</option>
                        </select>
                      </label>

                      {ventaForm.incluye_casa_3d && (
                        <>
                          <label>
                            <span>Modelo 3D</span>
                            <select
                              value={ventaForm.modelo_casa}
                              onChange={(e) =>
                                setVentaForm({ ...ventaForm, modelo_casa: e.target.value })
                              }
                            >
                              {HOUSES.map((h) => (
                                <option key={h.id} value={h.name}>
                                  {h.name} ({h.area} m²)
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Valor Casa 3D (COP)</span>
                            <input
                              type="number"
                              step="any"
                              value={ventaForm.valor_casa_3d}
                              onChange={(e) =>
                                setVentaForm({ ...ventaForm, valor_casa_3d: Number(e.target.value) })
                              }
                            />
                          </label>
                        </>
                      )}

                      <label>
                        <span>Descuento (COP)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={ventaForm.descuento}
                          onChange={(e) =>
                            setVentaForm({ ...ventaForm, descuento: Number(e.target.value) })
                          }
                        />
                      </label>

                      {ventaForm.modalidad !== 'contado' && (
                        <label>
                          <span>Interés Mensual (%)</span>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={ventaForm.tasa_interes_mensual}
                            onChange={(e) =>
                              setVentaForm({
                                ...ventaForm,
                                tasa_interes_mensual: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      )}

                      <label>
                        <span>Comprobante / Ref.</span>
                        <input
                          type="text"
                          placeholder="Ej. #994821"
                          value={ventaForm.referencia_pago_inicial}
                          onChange={(e) =>
                            setVentaForm({ ...ventaForm, referencia_pago_inicial: e.target.value })
                          }
                        />
                      </label>

                      <label>
                        <span>Fecha</span>
                        <input
                          type="date"
                          value={ventaForm.fecha_venta}
                          onChange={(e) =>
                            setVentaForm({ ...ventaForm, fecha_venta: e.target.value })
                          }
                        />
                      </label>
                    </div>

                    <label className="full-label" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                      <span>Observaciones</span>
                      <input
                        type="text"
                        placeholder="Acuerdos especiales..."
                        value={ventaForm.observaciones}
                        onChange={(e) =>
                          setVentaForm({ ...ventaForm, observaciones: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary full" disabled={saving}>
                {saving
                  ? 'Guardando en MySQL...'
                  : `Confirmar Compra L${String(activeLot?.numero_lote || 1).padStart(2, '0')} (${formatCOP(
                      financialSummary.totalVenta
                    )})`}
              </button>
            </form>

            {/* Columna derecha: Resumen Ejecutivo (Amortización oculta por defecto) */}
            <div className="admin-card">
              <h3>Resumen de Liquidación</h3>
              {activeLot && (
                <div className="summary-banner-box">
                  <div>
                    <span>Lote L{String(activeLot.numero_lote).padStart(2, '0')} ({activeLot.manzana})</span>
                    <strong>
                      {Number(activeLot.frente_m).toFixed(0)}m × {Number(activeLot.fondo_m).toFixed(0)}m ({Number(activeLot.area_m2).toFixed(0)} m²)
                    </strong>
                  </div>
                  <span className={`lot-state-badge ${activeLot.estado}`}>
                    {activeLot.estado.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="fin-breakdown">
                <div className="fin-line">
                  <span>Valor Lote:</span>
                  <strong>{formatCOP(financialSummary.valLote)}</strong>
                </div>
                {ventaForm.incluye_casa_3d && (
                  <div className="fin-line">
                    <span>Casa 3D ({ventaForm.modelo_casa}):</span>
                    <strong>+ {formatCOP(financialSummary.valCasa)}</strong>
                  </div>
                )}
                {financialSummary.desc > 0 && (
                  <div className="fin-line">
                    <span>Descuento:</span>
                    <strong className="text-green">- {formatCOP(financialSummary.desc)}</strong>
                  </div>
                )}
                <div className="fin-line total">
                  <span>Total Contrato:</span>
                  <strong className="gold">{formatCOP(financialSummary.totalVenta)}</strong>
                </div>
                <div className="fin-line">
                  <span>Cuota Inicial ({((financialSummary.inicial / (financialSummary.totalVenta || 1)) * 100).toFixed(0)}%):</span>
                  <strong className="text-green">{formatCOP(financialSummary.inicial)}</strong>
                </div>
                <div className="fin-line">
                  <span>Monto Neto a Financiar:</span>
                  <strong className="text-amber">{formatCOP(financialSummary.saldoFinanciar)}</strong>
                </div>
                <div className="fin-line">
                  <span>Total Intereses ({financialSummary.tasa}% mes):</span>
                  <strong>{formatCOP(financialSummary.totalIntereses)}</strong>
                </div>
                <div className="fin-line">
                  <span>Costo Total Proyecto:</span>
                  <strong>{formatCOP(financialSummary.costoTotalFinanciado + financialSummary.inicial)}</strong>
                </div>
                <div className="fin-line highlight">
                  <span>Cuota Fija Mensual ({financialSummary.cuotas} meses):</span>
                  <strong className="gold">{formatCOP(financialSummary.cuotaMensual)} / mes</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.9rem' }}>
                <button
                  type="button"
                  className="btn-toggle-more full"
                  onClick={() => setShowAmortTable(!showAmortTable)}
                >
                  {showAmortTable
                    ? '▲ Ocultar cronograma de cuotas'
                    : `▼ Ver tabla de amortización tipo Excel (${financialSummary.schedule.length} meses)`}
                </button>

                {showAmortTable && (
                  <div className="amort-table-wrap" style={{ marginTop: '0.6rem', maxHeight: '340px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th>Saldo Inicial</th>
                          <th>Cuota Fija</th>
                          <th>Interés ({financialSummary.tasa}%)</th>
                          <th>Abono Capital</th>
                          <th>Saldo Final</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialSummary.schedule.map((row) => (
                          <tr key={row.mes}>
                            <td><strong>Mes {row.mes}</strong></td>
                            <td>{formatCOP(row.saldoInicial)}</td>
                            <td className="gold">{formatCOP(row.cuotaMensual)}</td>
                            <td>{formatCOP(row.interes)}</td>
                            <td>{formatCOP(row.abonoCapital)}</td>
                            <td>{formatCOP(row.saldoFinal)}</td>
                            <td>
                              <span className={`status-pill ${row.estado === 'PAGADO' ? 'disp' : 'vend'}`}>
                                {row.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== MÓDULO 2: CARTERA Y REGISTRO DE ABONOS ==================== */}
        {adminTab === 'cartera' && (
          <div className="admin-module-grid">
            <div className="admin-card">
              <h3>Contratos Activos ({ventas.length})</h3>

              <div className="amort-table-wrap" style={{ maxHeight: '420px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Comprador</th>
                      <th>Total</th>
                      <th>Abonado</th>
                      <th>Saldo</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => {
                      const pct =
                        Number(v.valor_total_venta) > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (Number(v.total_abonado) / Number(v.valor_total_venta)) * 100
                              )
                            )
                          : 100;
                      return (
                        <tr
                          key={v.id}
                          className={
                            Number(selectedVentaIdForAbono) === Number(v.id) ? 'selected-row' : ''
                          }
                        >
                          <td>
                            <span className="badge-lot">{v.lote_codigo}</span>
                            <small style={{ display: 'block', color: 'var(--muted)' }}>
                              {v.codigo_contrato}
                            </small>
                          </td>
                          <td>
                            <strong>{v.cliente_nombre}</strong>
                          </td>
                          <td>{formatCOP(v.valor_total_venta)}</td>
                          <td className="text-green">
                            {formatCOP(v.total_abonado)} ({pct}%)
                          </td>
                          <td className="text-amber">{formatCOP(v.saldo_pendiente)}</td>
                          <td>
                            {Number(v.saldo_pendiente) > 0 ? (
                              <button
                                type="button"
                                className="btn-primary compact"
                                onClick={() => {
                                  setSelectedVentaIdForAbono(String(v.id));
                                  setAbonoForm({
                                    ...abonoForm,
                                    monto: String(Math.round(Number(v.valor_cuota_mensual || v.saldo_pendiente))),
                                  });
                                }}
                              >
                                + Abonar
                              </button>
                            ) : (
                              <span className="lot-state-badge disponible">PAGADO</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {ventas.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                          No hay contratos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card">
              <h3>Registrar Abono</h3>
              <form onSubmit={handleRegisterAbono} className="admin-section-box">
                <label className="full-label">
                  <span>Contrato *</span>
                  <select
                    value={selectedVentaIdForAbono}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVentaIdForAbono(id);
                      const found = ventas.find((v) => String(v.id) === String(id));
                      if (found) {
                        setAbonoForm({
                          ...abonoForm,
                          monto: String(Math.round(Number(found.valor_cuota_mensual || found.saldo_pendiente))),
                        });
                      }
                    }}
                    required
                  >
                    <option value="">-- Selecciona un contrato --</option>
                    {ventas
                      .filter((v) => Number(v.saldo_pendiente) > 0)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.lote_codigo} · {v.cliente_nombre} (Saldo: {formatCOP(v.saldo_pendiente)})
                        </option>
                      ))}
                  </select>
                </label>

                <div className="admin-field-grid">
                  <label>
                    <span>Valor Abono (COP) *</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={abonoForm.monto}
                      onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>Método de Pago</span>
                    <select
                      value={abonoForm.metodo_pago}
                      onChange={(e) => setAbonoForm({ ...abonoForm, metodo_pago: e.target.value })}
                    >
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="Consignación">Consignación</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="PSE">PSE</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary full"
                  style={{ marginTop: '0.75rem' }}
                  disabled={saving}
                >
                  {saving ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </form>

              <button
                type="button"
                className="btn-toggle-more full"
                onClick={() => setShowAbonosHistory(!showAbonosHistory)}
              >
                {showAbonosHistory
                  ? '▲ Ocultar historial de recibos'
                  : `▼ Ver historial de recibos (${abonos.length})`}
              </button>

              {showAbonosHistory && (
                <div className="amort-table-wrap" style={{ maxHeight: '220px', marginTop: '0.6rem' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Recibo</th>
                        <th>Lote</th>
                        <th>Cliente</th>
                        <th>Monto</th>
                        <th>Saldo</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abonos.map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.codigo_recibo}</strong></td>
                          <td>{a.lote_codigo}</td>
                          <td>{a.cliente_nombre}</td>
                          <td className="text-green">{formatCOP(a.monto)}</td>
                          <td>{formatCOP(a.nuevo_saldo)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-print-action"
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              onClick={() => setActiveReceiptModal(a)}
                            >
                              🖨️ Ver Recibo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MÓDULO 3: EDITOR SATELITAL DE UBICACIÓN Y TAMAÑO DE LOTES ==================== */}
        {adminTab === 'satelital' && (
          <div className="admin-sat-editor-layout">
            <div className="admin-sat-map-panel">
              <SatelliteMapCanvas
                config={draftConfig}
                lots={livePreviewGeo.lots}
                overlays={livePreviewGeo.overlays}
                selectedLotNumero={selectedLotNumero}
                onSelectLot={(num) => setSelectedLotNumero(num)}
                editable={true}
                onMoveCenter={(lat, lng) =>
                  setDraftConfig({ ...draftConfig, center_lat: lat, center_lng: lng })
                }
                height="560px"
              />
            </div>

            <div className="admin-sat-controls-panel">
              {/* Controles Esenciales de Ubicación y Tamaño Global */}
              <div className="admin-card compact-card">
                <h3>Ubicación y Tamaño Global (38 Lotes)</h3>

                <div className="nudge-toolbar">
                  <span>Mover loteo:</span>
                  <div className="nudge-btns">
                    <button type="button" onClick={() => nudgeCenterMeters(0, 10)}>
                      ▲ Norte
                    </button>
                    <button type="button" onClick={() => nudgeCenterMeters(0, -10)}>
                      ▼ Sur
                    </button>
                    <button type="button" onClick={() => nudgeCenterMeters(-10, 0)}>
                      ◀ Oeste
                    </button>
                    <button type="button" onClick={() => nudgeCenterMeters(10, 0)}>
                      ▶ Este
                    </button>
                  </div>
                </div>

                <div className="slider-field">
                  <div className="slider-head">
                    <span>Rotación del Loteo</span>
                    <strong>{Number(draftConfig.rotation_deg || 0).toFixed(1)}°</strong>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="0.5"
                    value={draftConfig.rotation_deg || 0}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, rotation_deg: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="admin-field-grid" style={{ marginTop: '0.6rem' }}>
                  <label>
                    <span>Frente General (m)</span>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      step="0.5"
                      value={draftConfig.default_front_m}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          default_front_m: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Fondo General (m)</span>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      step="0.5"
                      value={draftConfig.default_depth_m}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          default_depth_m: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                {/* Parámetros técnicos ocultos por defecto */}
                <div style={{ margin: '0.65rem 0' }}>
                  <button
                    type="button"
                    className="btn-toggle-more full"
                    onClick={() => setShowAdvancedSat(!showAdvancedSat)}
                  >
                    {showAdvancedSat
                      ? '▲ Ocultar coordenadas GPS y anchos de vías'
                      : '▼ Ajustes avanzados (GPS, Vías, Precio m²)'}
                  </button>

                  {showAdvancedSat && (
                    <div className="admin-extra-panel">
                      <div className="admin-field-grid">
                        <label>
                          <span>Latitud GPS</span>
                          <input
                            type="number"
                            step="0.00005"
                            value={draftConfig.center_lat}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, center_lat: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Longitud GPS</span>
                          <input
                            type="number"
                            step="0.00005"
                            value={draftConfig.center_lng}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, center_lng: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Separación lotes (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={draftConfig.gap_lotes_m}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, gap_lotes_m: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Vía Principal (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={draftConfig.road_main_m}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, road_main_m: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Vías Internas (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={draftConfig.road_internal_m}
                            onChange={(e) =>
                              setDraftConfig({
                                ...draftConfig,
                                road_internal_m: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Precio Base m² (COP) [600m² = {formatCOP(600 * (draftConfig.default_precio_m2 || 150000))}]</span>
                          <input
                            type="number"
                            step="any"
                            value={draftConfig.default_precio_m2 || 150000}
                            onChange={(e) =>
                              setDraftConfig({
                                ...draftConfig,
                                default_precio_m2: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="checkbox-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={resetSizesOnSave}
                            onChange={(e) => setResetSizesOnSave(e.target.checked)}
                          />
                          <span>Aplicar Frente × Fondo a los 38 lotes por igual</span>
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={resetOffsetsOnSave}
                            onChange={(e) => setResetOffsetsOnSave(e.target.checked)}
                          />
                          <span>Restablecer desplazamientos individuales</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-primary full"
                  onClick={handleSaveGlobalLayout}
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : `Guardar Distribución Global (${Number(draftConfig.default_front_m || 20)}m × ${Number(
                        draftConfig.default_depth_m || 30
                      )}m)`}
                </button>
              </div>

              {/* Edición Individual del Lote Seleccionado (Colapsable) */}
              {activeLot && (
                <div className="admin-card compact-card">
                  <div className="box-title-bar" style={{ marginBottom: showIndividualLotEdit ? '0.6rem' : 0 }}>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: 0 }}>
                      Lote L{String(activeLot.numero_lote).padStart(2, '0')} ({lotEditForm.estado.toUpperCase()})
                    </h3>
                    <button
                      type="button"
                      className="btn-toggle-more"
                      onClick={() => setShowIndividualLotEdit(!showIndividualLotEdit)}
                    >
                      {showIndividualLotEdit ? '▲ Ocultar edición individual' : '▼ Editar este lote'}
                    </button>
                  </div>

                  {showIndividualLotEdit && (
                    <form onSubmit={handleSaveSingleLot}>
                      <div className="admin-field-grid">
                        <label>
                          <span>Frente (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={lotEditForm.frente_m}
                            onChange={(e) => {
                              const frente = Number(e.target.value);
                              const area = frente * Number(lotEditForm.fondo_m);
                              setLotEditForm({
                                ...lotEditForm,
                                frente_m: frente,
                                precio_total: Math.round(area * Number(lotEditForm.precio_m2)),
                              });
                            }}
                          />
                        </label>
                        <label>
                          <span>Fondo (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={lotEditForm.fondo_m}
                            onChange={(e) => {
                              const fondo = Number(e.target.value);
                              const area = Number(lotEditForm.frente_m) * fondo;
                              setLotEditForm({
                                ...lotEditForm,
                                fondo_m: fondo,
                                precio_total: Math.round(area * Number(lotEditForm.precio_m2)),
                              });
                            }}
                          />
                        </label>
                        <label>
                          <span>Mover Este/Oeste (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={lotEditForm.offset_x_m}
                            onChange={(e) =>
                              setLotEditForm({ ...lotEditForm, offset_x_m: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Mover Norte/Sur (m)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={lotEditForm.offset_y_m}
                            onChange={(e) =>
                              setLotEditForm({ ...lotEditForm, offset_y_m: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Precio Lote (COP)</span>
                          <input
                            type="number"
                            step="any"
                            value={lotEditForm.precio_total}
                            onChange={(e) =>
                              setLotEditForm({ ...lotEditForm, precio_total: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span>Estado</span>
                          <select
                            value={lotEditForm.estado}
                            onChange={(e) =>
                              setLotEditForm({ ...lotEditForm, estado: e.target.value })
                            }
                          >
                            <option value="disponible">Disponible</option>
                            <option value="reservado">Reservado</option>
                            <option value="vendido">Vendido</option>
                          </select>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="btn-outline-full"
                        style={{ marginTop: '0.75rem' }}
                        disabled={saving}
                      >
                        Guardar Lote L{String(activeLot.numero_lote).padStart(2, '0')}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MÓDULO 4: CLIENTES Y CONTABILIDAD ==================== */}
        {adminTab === 'clientes' && (
          <div className="admin-single-col">
            <div className="admin-card">
              <div className="box-title-bar">
                <h3>Directorio de Clientes ({clientes.length})</h3>
                <button
                  type="button"
                  className="btn-toggle-more"
                  onClick={() => setShowContabilidad(!showContabilidad)}
                >
                  {showContabilidad
                    ? '▲ Ocultar libro contable'
                    : `▼ Ver Movimientos de Caja (${contabilidad.length})`}
                </button>
              </div>

              <div className="amort-table-wrap" style={{ maxHeight: '380px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Documento</th>
                      <th>Teléfono</th>
                      <th>Lotes</th>
                      <th>Total Comprado</th>
                      <th>Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.nombre}</strong>
                        </td>
                        <td>{c.documento}</td>
                        <td>{c.telefono}</td>
                        <td>{c.compras_count}</td>
                        <td>{formatCOP(c.total_comprado)}</td>
                        <td className="text-amber">{formatCOP(c.saldo_pendiente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {showContabilidad && (
              <div className="admin-card" style={{ marginTop: '1rem' }}>
                <h3>Movimientos Contables ({contabilidad.length})</h3>
                <div className="amort-table-wrap" style={{ maxHeight: '340px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Recibo/Asiento</th>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contabilidad.map((m) => (
                        <tr key={m.id}>
                          <td>{m.codigo_asiento}</td>
                          <td>{String(m.fecha).slice(0, 10)}</td>
                          <td>{m.concepto}</td>
                          <td className={m.tipo === 'INGRESO' ? 'text-green' : 'text-amber'}>
                            {m.tipo === 'INGRESO' ? '+' : '-'} {formatCOP(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Recibo Oficial Imprimible */}
      {activeReceiptModal && (
        <ReceiptModal
          abono={activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}
    </div>
  );
}
