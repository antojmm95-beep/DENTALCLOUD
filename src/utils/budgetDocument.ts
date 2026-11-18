import { Budget, ClinicConfig, Doctor, Patient } from '../types/dental';

export interface ResolvedDoctorCredentials {
  name: string;
  specialty: string;
  colegiado: string;
  mpps: string;
  rif: string;
}

const PHASE_LABELS: Record<string, string> = {
  fase_inicial: 'Fase 1: Inicial / Periodontal & Saneamiento',
  fase_quirurgica: 'Fase 2: Quirúrgica & Exodoncias',
  fase_funcional_ortodoncia: 'Fase 3: Funcional / Endodoncia & Ortodoncia',
  fase_protesica: 'Fase 4: Protésica & Rehabilitación Oral',
  fase_mantenimiento: 'Fase 5: Mantenimiento & Control'
};

function stripDoctorTitle(name: string): string {
  return name
    .replace(/^(dr\.?|dra\.?)\s+/i, '')
    .trim()
    .toLowerCase();
}

export function resolveDoctorCredentials(
  doctorName: string,
  doctors: Doctor[],
  fallback?: { colegiado?: string; mpps?: string }
): ResolvedDoctorCredentials {
  const cleanTarget = stripDoctorTitle(doctorName || '');
  const matched =
    doctors.find(d => d.name.toLowerCase() === (doctorName || '').trim().toLowerCase()) ||
    doctors.find(d => stripDoctorTitle(d.name) === cleanTarget) ||
    doctors.find(d => cleanTarget && stripDoctorTitle(d.name).includes(cleanTarget)) ||
    doctors[0];

  if (matched) {
    return {
      name: doctorName?.trim() || matched.name,
      specialty: matched.specialty,
      colegiado: fallback?.colegiado || matched.colegiado || 'COV-Pendiente',
      mpps: fallback?.mpps || matched.mpps || 'MPPS-Pendiente',
      rif: matched.rif
    };
  }

  return {
    name: doctorName || 'Odontólogo Tratante',
    specialty: 'Odontología General',
    colegiado: fallback?.colegiado || 'COV-Pendiente',
    mpps: fallback?.mpps || 'MPPS-Pendiente',
    rif: ''
  };
}

export function formatPresupuestoDate(isoDate: string): string {
  const match = (isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate || '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export type BudgetDisplayCurrency = 'USD' | 'BS' | 'BOTH';
export type BudgetRateSource = 'usdBcv' | 'eurBcv' | 'binanceUsdt';

export function resolveBudgetRate(
  rates: { usdBcv: number; eurBcv: number; binanceUsdt: number } | undefined,
  source: BudgetRateSource,
  fallbackRate = 911.62
): { rate: number; label: string } {
  const safeFallback = Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : 911.62;
  if (!rates) {
    return { rate: safeFallback, label: 'Dólar BCV' };
  }
  if (source === 'eurBcv') {
    const val = Number.isFinite(rates.eurBcv) && rates.eurBcv > 0 ? rates.eurBcv : safeFallback;
    return { rate: val, label: 'Euro BCV' };
  }
  if (source === 'binanceUsdt') {
    const val = Number.isFinite(rates.binanceUsdt) && rates.binanceUsdt > 0 ? rates.binanceUsdt : safeFallback;
    return { rate: val, label: 'Binance USDT' };
  }
  const val = Number.isFinite(rates.usdBcv) && rates.usdBcv > 0 ? rates.usdBcv : safeFallback;
  return { rate: val, label: 'Dólar BCV' };
}

export function convertBudgetAmountToBs(amountUsd: number, rate: number): number {
  const safeUsd = Number.isFinite(amountUsd) ? amountUsd : 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return Math.round(safeUsd * safeRate * 100) / 100;
}

export function formatPresupuestoMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatBudgetCurrencyValue(
  amountUsd: number,
  currencyMode: BudgetDisplayCurrency,
  rate: number,
  withPrefix = true
): string {
  const bsVal = convertBudgetAmountToBs(amountUsd, rate);
  if (currencyMode === 'BS') {
    return `${withPrefix ? 'Bs. ' : ''}${formatPresupuestoMoney(bsVal)}`;
  }
  if (currencyMode === 'BOTH') {
    return `$${formatPresupuestoMoney(amountUsd)} / Bs. ${formatPresupuestoMoney(bsVal)}`;
  }
  return `${withPrefix ? '$' : ''}${formatPresupuestoMoney(amountUsd)}`;
}

export function buildPresupuestoSequenceLines(budget: Budget): string[] {
  if (!budget.items || budget.items.length === 0) {
    return ['1. Evaluación clínica diagnóstica y plan integral por definir.'];
  }

  return budget.items.map((item, idx) => {
    const phaseLabel = item.phase ? (PHASE_LABELS[item.phase] || item.phase) : '';
    const toothTag = item.toothNumber ? ` (Pieza #${item.toothNumber})` : '';
    const priceTag = `$${formatPresupuestoMoney(item.total)}`;
    const statusTag =
      item.status === 'finalizado'
        ? ' [REALIZADO]'
        : item.status === 'en_curso'
        ? ' [EN CURSO]'
        : '';
    const phaseNote = phaseLabel ? ` — ${phaseLabel.split(':')[0]}` : '';
    return `${idx + 1} ${item.name.toUpperCase()}${toothTag} · ${priceTag}${phaseNote}${statusTag}`;
  });
}

export interface PresupuestoDispatchParams {
  budget: Budget;
  patient: Pick<Patient, 'id' | 'name' | 'cedula' | 'historyNumber' | 'phone' | 'email'>;
  doctor: ResolvedDoctorCredentials;
  exchangeRate: number;
  clinicConfig: Pick<ClinicConfig, 'clinicName' | 'address' | 'phone' | 'email' | 'rif'>;
}

export function formatPresupuestoWhatsAppText({
  budget,
  patient,
  doctor,
  exchangeRate,
  clinicConfig
}: PresupuestoDispatchParams): string {
  const formattedDate = formatPresupuestoDate(budget.date);
  const historyNum = patient.historyNumber || patient.id;
  const subtotalUsd = formatPresupuestoMoney(budget.subtotal);
  const totalUsd = formatPresupuestoMoney(budget.total);
  const totalBs = formatPresupuestoMoney(budget.total * (exchangeRate || 1));

  const itemLines =
    budget.items.length > 0
      ? budget.items
          .map((it, idx) => {
            const toothInfo = it.toothNumber ? ` [Pz ${it.toothNumber}]` : '';
            return `${idx + 1}) ${it.quantity} x *${it.name.toUpperCase()}*${toothInfo}\n   P.Unit: $${formatPresupuestoMoney(it.price)} | Total: *$${formatPresupuestoMoney(it.total)}*`;
          })
          .join('\n')
      : 'Sin procedimientos agregados aún.';

  const sequenceLines = buildPresupuestoSequenceLines(budget).join('\n');
  const noteSection = budget.notes?.trim()
    ? `\n📝 *Nota:*\n${budget.notes.trim()}\n`
    : '';
  const paymentPlanLine = budget.paymentPlan?.trim()
    ? `\n💳 *Modalidad de Pago:* ${budget.paymentPlan.trim()}`
    : '';

  return `🦷 *${clinicConfig.clinicName.toUpperCase()}*
*PLAN DE TRATAMIENTO Y PRESUPUESTO*

*Nro. Presupuesto:* ${budget.folio}
*Fecha Presupuesto:* ${formattedDate}
*Paciente:* ${patient.name}
*C.I.:* ${patient.cedula}
*Historia Nro.:* ${historyNum}
*Doctor(a):* ${doctor.name}
*Credenciales:* ${doctor.colegiado} · *${doctor.mpps}*

📋 *DETALLE DE TRATAMIENTOS:*
${itemLines}

*Sub Total:* $${subtotalUsd} USD${
    budget.discountTotal > 0 ? `\n*Descuento:* -$${formatPresupuestoMoney(budget.discountTotal)} USD` : ''
  }
💰 *TOTAL:* *$${totalUsd} USD* (Ref. Bs. ${totalBs} a tasa ${exchangeRate.toFixed(2)})${paymentPlanLine}
${noteSection}
📌 *SECUENCIA DE TRATAMIENTO:*
${sequenceLines}

_Nota: dicho presupuesto puede estar sujeto a cambio durante el desarrollo de su tratamiento._

📍 ${clinicConfig.address}
📞 TLF: ${clinicConfig.phone} · @CLINICA_CORONA (IG)`;
}

export function formatPresupuestoEmailContent({
  budget,
  patient,
  doctor,
  exchangeRate,
  clinicConfig
}: PresupuestoDispatchParams): { subject: string; body: string } {
  const formattedDate = formatPresupuestoDate(budget.date);
  const historyNum = patient.historyNumber || patient.id;
  const subtotalUsd = formatPresupuestoMoney(budget.subtotal);
  const totalUsd = formatPresupuestoMoney(budget.total);
  const totalBs = formatPresupuestoMoney(budget.total * (exchangeRate || 1));

  const itemLines =
    budget.items.length > 0
      ? budget.items
          .map((it) => {
            const toothInfo = it.toothNumber ? ` (Pieza #${it.toothNumber})` : '';
            const itemSub = formatPresupuestoMoney(it.price * it.quantity);
            return `  ${it.quantity}  |  ${it.name.toUpperCase()}${toothInfo}  |  P.Unit: $${formatPresupuestoMoney(it.price)}  |  SubTotal: $${itemSub}  |  Total: $${formatPresupuestoMoney(it.total)}`;
          })
          .join('\n')
      : '  Sin procedimientos registrados.';

  const sequenceLines = buildPresupuestoSequenceLines(budget)
    .map((line) => `  ${line}`)
    .join('\n');

  const subject = `Presupuesto Nro. ${budget.folio} - ${patient.name} | ${clinicConfig.clinicName}`;

  const body = `Estimado(a) ${patient.name},

Por medio del presente correo le hacemos entrega formal de su Presupuesto y Plan de Tratamiento Odontológico emitido por ${clinicConfig.clinicName}.

------------------------------------------------------------
Nro. Presupuesto:   ${budget.folio}
Fecha Presupuesto:  ${formattedDate}
Paciente:           ${patient.name}
C.I.:               ${patient.cedula}
Historia Nro.:      ${historyNum}
Doctor(a):          ${doctor.name} (${doctor.specialty})
Registro Gremial:   ${doctor.colegiado}  |  ${doctor.mpps}
------------------------------------------------------------

Cant. | Tratamiento | Prec. Unit. | Sub Total | Total
${itemLines}

Sub Total: $${subtotalUsd} USD${
    budget.discountTotal > 0 ? `\nDescuento: -$${formatPresupuestoMoney(budget.discountTotal)} USD` : ''
  }
Total:     $${totalUsd} USD  (Equivalente: Bs. ${totalBs} a tasa ${exchangeRate.toFixed(2)})
${budget.paymentPlan ? `Forma de Pago: ${budget.paymentPlan}\n` : ''}
${budget.notes?.trim() ? `Nota:\n${budget.notes.trim()}\n\n` : ''}SECUENCIA DE TRATAMIENTO:
${sequenceLines}

Nota: dicho presupuesto puede estar sujeto a cambio durante el desarrollo de su tratamiento.

Atentamente,
${doctor.name}
${doctor.colegiado} · ${doctor.mpps}
${clinicConfig.clinicName}
${clinicConfig.address}
TLF: ${clinicConfig.phone} · @CLINICA_CORONA (IG)`;

  return { subject, body };
}
