import { formatCOP, PROJECT_INFO } from '../data/houses';

export default function ReceiptModal({ abono, onClose }) {
  if (!abono) return null;

  const handlePrint = () => {
    window.print();
  };

  const fechaFormateada = abono.fecha_abono
    ? new Date(abono.fecha_abono + 'T12:00:00').toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('es-CO');

  const fechaProximoPagoFormateada = abono.proximo_pago
    ? new Date(abono.proximo_pago + 'T12:00:00').toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A (Liquidado)';

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de acciones (no se imprime) */}
        <div className="receipt-actions-bar no-print">
          <div className="receipt-actions-left">
            <span className="receipt-badge-ok">✓ Recibo Oficial Emitido</span>
            <span className="receipt-code-hint">{abono.codigo_recibo}</span>
          </div>
          <div className="receipt-actions-btns">
            <button type="button" className="btn-print-action" onClick={handlePrint}>
              🖨️ Imprimir / Guardar en PDF
            </button>
            <button type="button" className="btn-receipt-close" onClick={onClose}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Documento Recibo Oficial Imprimible */}
        <div className="receipt-sheet printable-document" id="printable-receipt">
          {/* Encabezado Corporativo */}
          <div className="receipt-header">
            <div className="receipt-brand">
              <h2>{PROJECT_INFO.fullName}</h2>
              <p className="receipt-project-sub">
                {PROJECT_INFO.locationDetail} · Cel: {PROJECT_INFO.phoneDisplay}
              </p>
              <p className="receipt-project-tags">
                Lotes campestres con escrituras legales individuales · Servicios de agua y luz
              </p>
            </div>
            <div className="receipt-meta-box">
              <span className="receipt-type-title">RECIBO OFICIAL DE CAJA</span>
              <strong className="receipt-number">{abono.codigo_recibo}</strong>
              <div className="receipt-date-tag">
                <span>Fecha:</span> <strong>{fechaFormateada}</strong>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Datos del Cliente y Lote */}
          <div className="receipt-grid-info">
            <div className="receipt-info-card">
              <h4>INFORMACIÓN DEL CLIENTE / TITULAR</h4>
              <div className="receipt-info-row">
                <span>Nombre:</span>
                <strong>{abono.cliente_nombre || 'Cliente General'}</strong>
              </div>
              <div className="receipt-info-row">
                <span>Cédula / NIT:</span>
                <strong>{abono.cliente_documento || 'No registrada'}</strong>
              </div>
              <div className="receipt-info-row">
                <span>Teléfono / WhatsApp:</span>
                <strong>{abono.cliente_telefono || PROJECT_INFO.phoneDisplay}</strong>
              </div>
            </div>

            <div className="receipt-info-card">
              <h4>IDENTIFICACIÓN DEL INMUEBLE</h4>
              <div className="receipt-info-row">
                <span>Lote Campestre:</span>
                <strong className="highlight-lot">
                  {abono.lote_codigo || `Lote L${String(abono.numero_lote || '').padStart(2, '0')}`}
                </strong>
              </div>
              <div className="receipt-info-row">
                <span>Contrato:</span>
                <strong>{abono.codigo_contrato || 'Venta Directa'}</strong>
              </div>
              <div className="receipt-info-row">
                <span>Cuota registrada:</span>
                <strong>{Number(abono.numero_cuota) === 0 ? 'Cuota Inicial / Separación' : `Cuota #${abono.numero_cuota}`}</strong>
              </div>
            </div>
          </div>

          {/* Desglose de la transacción */}
          <div className="receipt-payment-table-box">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Concepto del Pago</th>
                  <th>Método de Pago</th>
                  <th>Comprobante / Ref</th>
                  <th style={{ textAlign: 'right' }}>Valor Pagado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>{abono.concepto || 'Abono a financiación de lote campestre'}</strong>
                    {abono.observacion && (
                      <small style={{ display: 'block', color: '#555', marginTop: '2px' }}>
                        Nota: {abono.observacion}
                      </small>
                    )}
                  </td>
                  <td>{abono.metodo_pago || 'Transferencia Bancaria'}</td>
                  <td>{abono.referencia_pago || 'N/A'}</td>
                  <td className="receipt-amount-cell" style={{ textAlign: 'right' }}>
                    <strong>{formatCOP(abono.monto)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Estado de Cartera / Saldos */}
          <div className="receipt-summary-balance-box">
            <div className="balance-item">
              <span>Saldo Anterior:</span>
              <strong>{formatCOP(abono.saldo_anterior)}</strong>
            </div>
            <div className="balance-item">
              <span>Valor Abonado:</span>
              <strong className="text-green">- {formatCOP(abono.monto)}</strong>
            </div>
            <div className="balance-item final-balance">
              <span>Nuevo Saldo Pendiente:</span>
              <strong className="text-primary">{formatCOP(abono.nuevo_saldo)}</strong>
            </div>
          </div>

          {/* Próximo Pago y Fechas */}
          <div className="receipt-next-payment-banner">
            <div>
              <span>Próxima Fecha de Pago Programada:</span>
              <strong> {fechaProximoPagoFormateada}</strong>
            </div>
            <div>
              <span>Estado del Contrato:</span>
              <strong> {Number(abono.nuevo_saldo) <= 0 ? '¡PAZ Y SALVO (100% CANCELADO)!' : 'VIGENTE AL DÍA'}</strong>
            </div>
          </div>

          {/* Firmas de Legalización */}
          <div className="receipt-signatures-box">
            <div className="signature-col">
              <div className="signature-line" />
              <span>Firma y Sello Comercial</span>
              <small>Administración Prados de Terranova</small>
              <small>Cel: {PROJECT_INFO.phoneDisplay}</small>
            </div>
            <div className="signature-col">
              <div className="signature-line" />
              <span>Firma del Comprador / Titular</span>
              <small>C.C. {abono.cliente_documento || '____________________'}</small>
              <small>{abono.cliente_nombre || 'Titular'}</small>
            </div>
          </div>

          {/* Pie de Página */}
          <div className="receipt-footer">
            <p>
              Condominio Campestre Prados de Terranova · Km 7 Vía Yopal - Aguazul margen derecha, a 300 m de la vía principal.
            </p>
            <p>
              Este documento es soporte contable y comprobante de pago oficial registrado en el sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
