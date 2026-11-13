// Utilidades financieras para Prados de Terranova
// Basadas en el modelo matemático del archivo "Simulador dinamico de financiacion.xlsx"

/**
 * Calcula la cuota fija mensual usando la fórmula PMT de Excel:
 * PMT = PV * [ r*(1+r)^n ] / [ (1+r)^n - 1 ]
 *
 * @param {number} rate - Tasa periódica mensual (ej. 0.02 para 2.0%)
 * @param {number} nper - Número total de cuotas / meses
 * @param {number} pv - Valor presente neto a financiar (monto a financiar)
 * @returns {number} Valor de la cuota mensual fija
 */
export function calculatePMT(rate, nper, pv) {
  const r = Number(rate) || 0;
  const n = Math.max(1, Number(nper) || 1);
  const p = Math.max(0, Number(pv) || 0);

  if (p === 0) return 0;
  if (r <= 0) return p / n;

  const factor = Math.pow(1 + r, n);
  return (p * (r * factor)) / (factor - 1);
}

/**
 * Genera la tabla completa de amortización idéntica al modelo de Excel.
 * Columnas: Mes, Saldo Inicial, Cuota Mensual, Interés, Abono a Capital, Saldo Final, Estado
 *
 * @param {Object} params
 * @param {number} params.montoFinanciar - Monto neto a financiar (Valor Lote - Cuota Inicial)
 * @param {number} params.plazoMeses - Número de meses (por defecto 24 a 58)
 * @param {number} params.tasaInteresMensualPct - Tasa mensual en porcentaje (ej: 2 para 2%)
 * @param {string|Date} [params.fechaInicio] - Fecha de inicio del crédito
 * @returns {Array<Object>} Lista de cuotas con desglose exacto
 */
export function generateAmortizationSchedule({
  montoFinanciar,
  plazoMeses,
  tasaInteresMensualPct = 2.0,
  fechaInicio = new Date(),
}) {
  const p = Math.max(0, Number(montoFinanciar) || 0);
  const n = Math.max(1, Number(plazoMeses) || 1);
  const r = (Number(tasaInteresMensualPct) || 0) / 100;
  const cuotaMensual = calculatePMT(r, n, p);

  const baseDate = new Date(
    typeof fechaInicio === 'string' && !fechaInicio.includes('T')
      ? `${fechaInicio}T12:00:00`
      : fechaInicio
  );

  const schedule = [];
  let saldoInicial = p;

  for (let mes = 1; mes <= n; mes++) {
    const interes = r > 0 ? saldoInicial * r : 0;
    // En la última cuota o si el saldo es menor, ajustamos para liquidar exactamente a 0
    let abonoCapital = cuotaMensual - interes;
    let cuotaActual = cuotaMensual;

    if (mes === n || abonoCapital > saldoInicial) {
      abonoCapital = saldoInicial;
      cuotaActual = abonoCapital + interes;
    }

    const saldoFinal = Math.max(0, saldoInicial - abonoCapital);

    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + mes);

    schedule.push({
      mes,
      fecha: d.toISOString().slice(0, 10),
      saldoInicial: Math.round(saldoInicial),
      cuotaMensual: Math.round(cuotaActual),
      interes: Math.round(interes),
      abonoCapital: Math.round(abonoCapital),
      saldoFinal: Math.round(saldoFinal),
      estado: saldoFinal <= 1 ? 'PAGADO' : 'Activo',
    });

    saldoInicial = saldoFinal;
    if (saldoInicial <= 0) break;
  }

  return {
    cuotaFija: Math.round(cuotaMensual),
    totalIntereses: Math.round(schedule.reduce((acc, c) => acc + c.interes, 0)),
    costoTotalFinanciado: Math.round(schedule.reduce((acc, c) => acc + c.cuotaMensual, 0)),
    cronograma: schedule,
  };
}
