import type { ClinicExpense, PaymentReceipt, VademecumMedication } from '../types/dental';

export interface TestBudgetItem {
  price: number;
  quantity: number;
  discount: number; // percentage 0-100
}

export function calculateBudgetTotals(items: TestBudgetItem[]) {
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const discountTotal = items.reduce((acc, it) => acc + (it.price * it.quantity * it.discount) / 100, 0);
  const total = subtotal - discountTotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

export function normalizeWhatsAppPhone(rawPhone: string, countryCode = '58'): string {
  const safeCode = (countryCode || '58').replace(/[^0-9]/g, '') || '58';
  const raw = (rawPhone || '').trim();
  if (!raw) return '';

  // When multiple numbers are stored (e.g. "0414-1234567 / 0412-9876543"), take the first valid number
  const segments = raw
    .split(/[/,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate =
    segments.find((seg) => seg.replace(/[^0-9]/g, '').length >= 7) || raw;

  let cleanPhone = candidate.replace(/[^0-9]/g, '');
  if (!cleanPhone) return '';

  // Strip international 00 prefix (e.g. 0058414... -> 58414...)
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.slice(2);
  }

  // Strip mistaken trunk 0 right after country code (e.g. +58 0414... -> 58414...)
  if (cleanPhone.startsWith(`${safeCode}0`) && cleanPhone.length >= safeCode.length + 10) {
    cleanPhone = `${safeCode}${cleanPhone.slice(safeCode.length + 1)}`;
  }

  // Local leading 0 (e.g. 04141234567 -> 584141234567)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = `${safeCode}${cleanPhone.slice(1)}`;
  } else if (cleanPhone.length === 10 && !cleanPhone.startsWith(safeCode)) {
    cleanPhone = `${safeCode}${cleanPhone}`;
  }

  return cleanPhone.length >= 7 ? cleanPhone : '';
}

export function resolvePatientWhatsAppPhone(
  patient:
    | {
        phone?: string;
        phones?: {
          whatsapp?: string;
          mobile?: string;
          home?: string;
          office?: string;
        };
      }
    | null
    | undefined,
  customPhone?: string,
  countryCode = '58'
): { rawPhone: string; normalizedPhone: string; displayPhone: string } {
  const candidates = [
    customPhone,
    patient?.phones?.whatsapp,
    patient?.phone,
    patient?.phones?.mobile,
    patient?.phones?.home,
    patient?.phones?.office
  ];

  for (const item of candidates) {
    const trimmed = (item || '').trim();
    if (!trimmed) continue;
    const normalized = normalizeWhatsAppPhone(trimmed, countryCode);
    if (normalized) {
      return {
        rawPhone: trimmed,
        normalizedPhone: normalized,
        displayPhone: `+${normalized}`
      };
    }
  }

  return {
    rawPhone: '',
    normalizedPhone: '',
    displayPhone: ''
  };
}

export function buildWhatsAppLink(phone: string, text: string, countryCode = '58'): string {
  const cleanPhone = normalizeWhatsAppPhone(phone, countryCode);
  const encoded = encodeURIComponent(text);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function sanitizePatientBalance(currentBalance: number, paymentAmount: number): number {
  return Math.max(0, currentBalance - paymentAmount);
}

export function parseVoiceCommand(text: string): { toothNumber?: number; price?: number } {
  let price: number | undefined;
  const explicitPriceMatch = text.match(/(?:por|cuesta|precio|valor|\$)\s*(\d+)|(\d+)\s*(?:d[oó]lares|dolares|usd|\$)/i);
  if (explicitPriceMatch) {
    price = parseInt(explicitPriceMatch[1] || explicitPriceMatch[2]);
  }

  const toothPrefixMatch = text.match(/(?:pieza|diente|pz|#)\s*(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/i);
  let toothNumber: number | undefined;
  if (toothPrefixMatch) {
    toothNumber = parseInt(toothPrefixMatch[1]);
  } else {
    const toothMatch = text.match(/\b(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/);
    if (toothMatch) {
      const candidate = parseInt(toothMatch[1]);
      if (candidate !== price) {
        toothNumber = candidate;
      }
    }
  }

  return { toothNumber, price };
}

export function calculateProcedureCost(
  chairCostPerMinute: number,
  durationMinutes: number,
  descartablesCost: number,
  profitMarginPercent: number
): { directCost: number; suggestedPrice: number } {
  const chairCost = chairCostPerMinute * durationMinutes;
  const directCost = Math.round((chairCost + descartablesCost) * 100) / 100;
  const marginRatio = Math.max(0.1, 1 - (profitMarginPercent / 100));
  const suggestedPrice = Math.round((directCost / marginRatio) * 100) / 100;
  return { directCost, suggestedPrice };
}

export interface PureCuotaItem {
  number: number;
  dueDate: string;
  amountUsd: number;
  paidUsd: number;
  status: 'pendiente' | 'pagada' | 'vencida';
  paidDate?: string;
}

export function generateInstallmentSchedule(
  totalAmountUsd: number,
  downPaymentUsd: number,
  installmentCount: number,
  startDateStr: string,
  referenceTodayStr = '2026-11-10'
): PureCuotaItem[] {
  const numericCount = Number.isFinite(installmentCount) ? installmentCount : 1;
  const safeCount = Math.max(1, Math.floor(numericCount));
  const financed = Math.max(0, totalAmountUsd - Math.max(0, downPaymentUsd));
  const baseInstallment = Math.floor((financed / safeCount) * 100) / 100;
  const remainder = Math.round((financed - baseInstallment * safeCount) * 100) / 100;

  const startParts = startDateStr.split('-').map(Number);
  const startYear = startParts[0] || 2026;
  const startMonth = (startParts[1] || 11) - 1;
  const startDay = startParts[2] || 10;

  const cuotas: PureCuotaItem[] = [];
  for (let i = 0; i < safeCount; i++) {
    const dueObj = new Date(Date.UTC(startYear, startMonth + i, startDay));
    const dueDate = dueObj.toISOString().split('T')[0];
    const amountUsd = Math.round((baseInstallment + (i === safeCount - 1 ? remainder : 0)) * 100) / 100;
    const status: PureCuotaItem['status'] = dueDate < referenceTodayStr ? 'vencida' : 'pendiente';
    cuotas.push({
      number: i + 1,
      dueDate,
      amountUsd,
      paidUsd: 0,
      status
    });
  }
  return cuotas;
}

export function conciliatePaymentIntoInstallments<T extends PureCuotaItem>(
  cuotas: T[],
  paymentUsd: number
): { updatedCuotas: T[]; unappliedUsd: number } {
  let remaining = Math.max(0, paymentUsd);
  const updatedCuotas: T[] = cuotas.map(c => {
    if (remaining <= 0 || c.status === 'pagada') return { ...c };
    const owed = Math.max(0, Math.round((c.amountUsd - c.paidUsd) * 100) / 100);
    const apply = Math.min(owed, remaining);
    const newPaid = Math.round((c.paidUsd + apply) * 100) / 100;
    remaining = Math.round((remaining - apply) * 100) / 100;
    const nextStatus: PureCuotaItem['status'] = newPaid >= c.amountUsd - 0.01 ? 'pagada' : c.status;
    return {
      ...c,
      paidUsd: newPaid,
      status: nextStatus
    };
  });
  return { updatedCuotas, unappliedUsd: remaining };
}

export function adjustCatalogPricesByPercent<T extends { basePrice: number }>(
  items: T[],
  percentDelta: number
): T[] {
  const factor = 1 + percentDelta / 100;
  return items.map(item => ({
    ...item,
    basePrice: Math.max(1, Math.round(item.basePrice * factor * 100) / 100)
  }));
}

export interface NotifiablePatientLike {
  patientInactive?: boolean;
  notificationsBlocked?: boolean;
  inactiveReason?: string;
}

export function isPatientNotifiable(patient?: NotifiablePatientLike | null): boolean {
  if (!patient) return false;
  if (patient.patientInactive) return false;
  if (patient.notificationsBlocked) return false;
  if ((patient.inactiveReason || '').toLowerCase() === 'fallecimiento') return false;
  return true;
}

export interface SegmentFilterCriteria {
  gender?: 'TODOS' | 'M' | 'F';
  minAge?: number;
  maxAge?: number;
  onlyWithDebt?: boolean;
  birthdayMonth?: number; // 1-12 or 0 for all
  minDaysSinceVisit?: number;
  referenceDateStr?: string;
  includeInactive?: boolean;
}

export function filterContactsSegment<
  T extends {
    gender: string;
    age: number;
    balance: number;
    birthDate?: string;
    lastVisit?: string;
    patientInactive?: boolean;
    notificationsBlocked?: boolean;
    inactiveReason?: string;
  }
>(patients: T[], criteria: SegmentFilterCriteria): T[] {
  const refDate = new Date((criteria.referenceDateStr || '2026-11-10') + 'T00:00:00Z');
  return patients.filter(p => {
    if (!criteria.includeInactive && !isPatientNotifiable(p)) return false;
    if (criteria.gender && criteria.gender !== 'TODOS' && p.gender !== criteria.gender) return false;
    if (criteria.minAge !== undefined && p.age < criteria.minAge) return false;
    if (criteria.maxAge !== undefined && p.age > criteria.maxAge) return false;
    if (criteria.onlyWithDebt && p.balance <= 0) return false;
    if (criteria.birthdayMonth && criteria.birthdayMonth > 0) {
      if (!p.birthDate) return false;
      const m = parseInt(p.birthDate.split('-')[1] || '0', 10);
      if (m !== criteria.birthdayMonth) return false;
    }
    if (criteria.minDaysSinceVisit && criteria.minDaysSinceVisit > 0) {
      if (!p.lastVisit) return true;
      const last = new Date(p.lastVisit + 'T00:00:00Z');
      const diffDays = Math.floor((refDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < criteria.minDaysSinceVisit) return false;
    }
    return true;
  });
}

export function calculateDoctorLiquidation(
  collectedUsd: number,
  commissionPercent: number
): { payoutUsd: number; clinicShareUsd: number } {
  const rate = Math.max(0, Math.min(100, commissionPercent)) / 100;
  const payoutUsd = Math.round(collectedUsd * rate * 100) / 100;
  const clinicShareUsd = Math.round((collectedUsd - payoutUsd) * 100) / 100;
  return { payoutUsd, clinicShareUsd };
}

export function formatWhatsAppTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function generateDoctorICSContent(
  doctorName: string,
  clinicName: string,
  appointments: Array<{
    id: string;
    date: string;
    time: string;
    durationMinutes: number;
    patientName: string;
    treatmentType: string;
    box: string;
  }>
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${clinicName}//Agenda Dental//ES`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${doctorName} - ${clinicName}`
  ];

  appointments.forEach(apt => {
    const cleanDate = apt.date.replace(/-/g, '');
    const [hh = '09', mm = '00'] = apt.time.split(':');
    const startUtc = `${cleanDate}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
    const startDateObj = new Date(`${apt.date}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`);
    const endDateObj = new Date(startDateObj.getTime() + (apt.durationMinutes || 45) * 60000);
    const endHH = String(endDateObj.getHours()).padStart(2, '0');
    const endMM = String(endDateObj.getMinutes()).padStart(2, '0');
    const endUtc = `${cleanDate}T${endHH}${endMM}00`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${apt.id}@clinicacorona.com`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${apt.patientName} - ${apt.treatmentType}`,
      `LOCATION:${clinicName} (${apt.box})`,
      `DESCRIPTION:Doctor: ${doctorName} | Sala: ${apt.box}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export type PureCashClosingPeriod = 'diario' | 'semanal' | 'mensual';

function formatUtcDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function getCashClosingPeriodRange(
  period: PureCashClosingPeriod,
  referenceDateStr: string
): { startDate: string; endDate: string; label: string } {
  const parts = (referenceDateStr || '2026-11-10').split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 11;
  const day = parts[2] || 10;
  const refUtc = new Date(Date.UTC(year, month - 1, day));
  const safeRef = formatUtcDate(refUtc);

  if (period === 'diario') {
    return {
      startDate: safeRef,
      endDate: safeRef,
      label: `Cierre Diario (${safeRef})`
    };
  }

  if (period === 'semanal') {
    const dayOfWeek = refUtc.getUTCDay(); // 0=Sun .. 6=Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refUtc.getTime() + diffToMonday * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const startDate = formatUtcDate(monday);
    const endDate = formatUtcDate(sunday);
    return {
      startDate,
      endDate,
      label: `Cierre Semanal (${startDate} al ${endDate})`
    };
  }

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const startDate = formatUtcDate(firstDay);
  const endDate = formatUtcDate(lastDay);
  return {
    startDate,
    endDate,
    label: `Cierre Mensual (${year}-${String(month).padStart(2, '0')})`
  };
}

export interface CashClosingSummary<
  TPayment extends { date: string; amount: number; method: string },
  TExpense extends { date: string; amountUsd: number; category?: string }
> {
  period: PureCashClosingPeriod;
  startDate: string;
  endDate: string;
  label: string;
  filteredPayments: TPayment[];
  filteredExpenses: TExpense[];
  labExpenses: TExpense[];
  receiptsCount: number;
  expensesCount: number;
  labExpensesCount: number;
  totalCollectedUsd: number;
  totalCollectedBs: number;
  totalExpensesUsd: number;
  totalExpensesBs: number;
  labExpensesUsd: number;
  labExpensesBs: number;
  operatingExpensesUsd: number;
  netBalanceUsd: number;
  netBalanceBs: number;
  expectedCashUsd: number;
  countedCashUsd: number;
  cashDifferenceUsd: number;
  methodTotalsUsd: Record<string, number>;
}

export function computeCashClosingSummary<
  TPayment extends { date: string; amount: number; method: string },
  TExpense extends { date: string; amountUsd: number; category?: string }
>(params: {
  payments: TPayment[];
  expenses: TExpense[];
  period: PureCashClosingPeriod;
  referenceDate: string;
  exchangeRate: number;
  countedCashUsd?: number;
}): CashClosingSummary<TPayment, TExpense> {
  const { payments, expenses, period, referenceDate, exchangeRate, countedCashUsd } = params;
  const { startDate, endDate, label } = getCashClosingPeriodRange(period, referenceDate);

  const filteredPayments = payments.filter(p => p.date >= startDate && p.date <= endDate);
  const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  const labExpenses = filteredExpenses.filter(e => e.category === 'laboratorio');

  const methodTotalsUsd: Record<string, number> = {};
  let totalCollectedUsd = 0;

  for (const p of filteredPayments) {
    const amt = Number.isFinite(p.amount) ? p.amount : 0;
    totalCollectedUsd += amt;
    methodTotalsUsd[p.method] = Math.round(((methodTotalsUsd[p.method] || 0) + amt) * 100) / 100;
  }

  totalCollectedUsd = Math.round(totalCollectedUsd * 100) / 100;
  const totalExpensesUsd = Math.round(
    filteredExpenses.reduce((acc, e) => acc + (Number.isFinite(e.amountUsd) ? e.amountUsd : 0), 0) * 100
  ) / 100;
  const labExpensesUsd = Math.round(
    labExpenses.reduce((acc, e) => acc + (Number.isFinite(e.amountUsd) ? e.amountUsd : 0), 0) * 100
  ) / 100;
  const operatingExpensesUsd = Math.round((totalExpensesUsd - labExpensesUsd) * 100) / 100;
  const netBalanceUsd = Math.round((totalCollectedUsd - totalExpensesUsd) * 100) / 100;

  const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
  const totalCollectedBs = Math.round(totalCollectedUsd * rate * 100) / 100;
  const totalExpensesBs = Math.round(totalExpensesUsd * rate * 100) / 100;
  const labExpensesBs = Math.round(labExpensesUsd * rate * 100) / 100;
  const netBalanceBs = Math.round(netBalanceUsd * rate * 100) / 100;

  const expectedCashUsd = Math.round((methodTotalsUsd.efectivo || 0) * 100) / 100;
  const actualCounted = countedCashUsd !== undefined && Number.isFinite(countedCashUsd) ? countedCashUsd : expectedCashUsd;
  const cashDifferenceUsd = Math.round((actualCounted - expectedCashUsd) * 100) / 100;

  return {
    period,
    startDate,
    endDate,
    label,
    filteredPayments,
    filteredExpenses,
    labExpenses,
    receiptsCount: filteredPayments.length,
    expensesCount: filteredExpenses.length,
    labExpensesCount: labExpenses.length,
    totalCollectedUsd,
    totalCollectedBs,
    totalExpensesUsd,
    totalExpensesBs,
    labExpensesUsd,
    labExpensesBs,
    operatingExpensesUsd,
    netBalanceUsd,
    netBalanceBs,
    expectedCashUsd,
    countedCashUsd: Math.round(actualCounted * 100) / 100,
    cashDifferenceUsd,
    methodTotalsUsd
  };
}

export type PureCatalogSuggestedPhase =
  | 'fase_inicial'
  | 'fase_quirurgica'
  | 'fase_funcional_ortodoncia'
  | 'fase_protesica'
  | 'fase_mantenimiento';

export interface PureCatalogItemInput {
  id: string;
  code: string;
  name: string;
  area: string;
  suggestedPhase: PureCatalogSuggestedPhase;
  basePrice: number;
}

export function buildNewCatalogItem(
  existingItems: Array<{ code: string }>,
  params: {
    code?: string;
    name: string;
    area: string;
    suggestedPhase?: PureCatalogSuggestedPhase;
    basePrice: number;
  },
  idSuffix = Date.now().toString()
): PureCatalogItemInput {
  const numericCodes = existingItems
    .map((it) => parseInt(it.code.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n));
  const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 375;
  const rawCode = (params.code || '').trim();
  const code = rawCode || String(maxCode + 1).padStart(4, '0');
  const cleanName = params.name.trim().toUpperCase();
  const formattedName = cleanName.startsWith(`${code} -`) ? cleanName : `${code} - ${cleanName}`;
  const area = params.area.trim() || '1 - PREVENTIVA Y GENERAL';
  const defaultPhase: PureCatalogSuggestedPhase = area.includes('CIRUGIA')
    ? 'fase_quirurgica'
    : area.includes('ORTODONCIA')
      ? 'fase_funcional_ortodoncia'
      : area.includes('PROTESIS') || area.includes('ESTETICA')
        ? 'fase_protesica'
        : 'fase_inicial';

  return {
    id: `tc-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idSuffix}`,
    code,
    name: formattedName,
    area,
    suggestedPhase: params.suggestedPhase || defaultPhase,
    basePrice: Math.max(1, Math.round((Number.isFinite(params.basePrice) ? params.basePrice : 1) * 100) / 100),
  };
}

export function buildAutoSecuenciaNote(params: {
  procedureName: string;
  toothNumber?: number;
  phase?: string;
}): string {
  const proc = (params.procedureName || '').toUpperCase();
  const toothSuffix = params.toothNumber ? ` en pieza #${params.toothNumber}` : '';
  const phaseLabel = params.phase ? ` (${params.phase.replace(/^fase_/, 'Fase ').replace(/_/g, ' ')})` : '';

  if (proc.includes('TARTRECTOMIA') || proc.includes('PULIDO') || proc.includes('PROFILAXIS')) {
    return `Tartrectomía ultrasónica supra/subgingival${toothSuffix}, eliminación de cálculo y placa bacteriana, pulido coronario con pasta profiláctica e instrucciones de higiene oral${phaseLabel}.`;
  }
  if (proc.includes('RESINA') || proc.includes('CARIES') || proc.includes('OBTURACION')) {
    return `Aislamiento operatorio${toothSuffix}, remoción de tejido cariado, grabado ácido, adhesión dentinaria y obturación con resina compuesta fotocurada + control oclusal${phaseLabel}.`;
  }
  if (proc.includes('ENDODONCIA') || proc.includes('CONDUCTO')) {
    return `Apertura cameral${toothSuffix}, conductometría, instrumentación biomecánica, irrigación antiséptica y obturación endodóntica tridimensional${phaseLabel}.`;
  }
  if (proc.includes('EXODONCIA') || proc.includes('EXTRACCION') || proc.includes('CIRUGIA')) {
    return `Antisepsia intraoral, anestesia local, sindesmotomía, exodoncia${toothSuffix} y hemostasia controlada con indicaciones postoperatorias${phaseLabel}.`;
  }
  if (proc.includes('CORONA') || proc.includes('PROTESIS') || proc.includes('PUENTE')) {
    return `Preparación/cementado protésico${toothSuffix}, verificación de sellado marginal, punto de contacto y oclusión funcional${phaseLabel}.`;
  }

  return `Procedimiento "${params.procedureName}" ejecutado y finalizado${toothSuffix}${phaseLabel}. Reflejado automáticamente en Secuencia de Ttos y Cuentas por Cobrar.`;
}

export interface MultiRateSnapshot {
  usdBcv: number;
  eurBcv: number;
  binanceUsdt: number;
}

export function parseVeDolarApiPayloads(
  dolaresPayload: unknown,
  eurosPayload: unknown,
  fallback: MultiRateSnapshot
): MultiRateSnapshot {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  let usdBcv = fallback.usdBcv;
  let binanceUsdt = fallback.binanceUsdt;
  let eurBcv = fallback.eurBcv;

  if (Array.isArray(dolaresPayload)) {
    for (const entry of dolaresPayload) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as { fuente?: string; promedio?: number };
      const val = Number(item.promedio);
      if (!Number.isFinite(val) || val <= 0) continue;
      if (item.fuente === 'oficial') {
        usdBcv = round2(val);
      } else if (item.fuente === 'paralelo' || item.fuente === 'binance') {
        binanceUsdt = round2(val);
      }
    }
  }

  if (Array.isArray(eurosPayload)) {
    for (const entry of eurosPayload) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as { fuente?: string; promedio?: number };
      const val = Number(item.promedio);
      if (!Number.isFinite(val) || val <= 0) continue;
      if (item.fuente === 'oficial') {
        eurBcv = round2(val);
      }
    }
  }

  return { usdBcv, eurBcv, binanceUsdt };
}

export function computeCurrencyConversions(
  amount: number,
  currency: 'USD' | 'EUR' | 'USDT',
  rates: MultiRateSnapshot
): { bsBcv: number; bsEur: number; bsBinance: number; selectedBs: number } {
  const safeAmt = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const bsBcv = r2(safeAmt * (rates.usdBcv > 0 ? rates.usdBcv : 1));
  const bsEur = r2(safeAmt * (rates.eurBcv > 0 ? rates.eurBcv : 1));
  const bsBinance = r2(safeAmt * (rates.binanceUsdt > 0 ? rates.binanceUsdt : 1));
  const selectedBs = currency === 'EUR' ? bsEur : currency === 'USDT' ? bsBinance : bsBcv;
  return { bsBcv, bsEur, bsBinance, selectedBs };
}

export function applyFixedFindingToOdontogram<
  TTooth extends { number: number; wholeStatus?: string; surfaces: Record<string, unknown> }
>(
  patientOdontogram: Record<number, TTooth>,
  toothNumbers: number[],
  status: string | 'clear'
): Record<number, TTooth> {
  const next = { ...(patientOdontogram || {}) };
  for (const num of toothNumbers) {
    if (!Number.isFinite(num)) continue;
    if (status === 'clear' || status === 'sano') {
      delete next[num];
    } else {
      const existing = next[num] || ({ number: num, surfaces: {} } as TTooth);
      next[num] = {
        ...existing,
        wholeStatus: status
      };
    }
  }
  return next;
}

export function sortOdontogramControlsDesc<T extends { date: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function paginateList<T>(
  list: T[],
  requestedPage: number,
  pageSize = 20
): PaginationResult<T> {
  const safeSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : 20;
  const totalItems = Array.isArray(list) ? list.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const rawPage = Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1;
  const page = Math.max(1, Math.min(totalPages, rawPage));
  const sliceStart = (page - 1) * safeSize;
  const items = Array.isArray(list) ? list.slice(sliceStart, sliceStart + safeSize) : [];
  const startIndex = totalItems === 0 ? 0 : sliceStart + 1;
  const endIndex = totalItems === 0 ? 0 : sliceStart + items.length;

  return {
    items,
    page,
    pageSize: safeSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex
  };
}

export function extractToothNumberFromTranscript(transcript: string): number | undefined {
  if (!transcript) return undefined;
  const match = transcript.match(/\b(?:pieza|diente|molar|incisivo|premolar|canino)\s*#?\s*([1-8][1-8])\b/i);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  const validFdi =
    (num >= 11 && num <= 18) ||
    (num >= 21 && num <= 28) ||
    (num >= 31 && num <= 38) ||
    (num >= 41 && num <= 48) ||
    (num >= 51 && num <= 55) ||
    (num >= 61 && num <= 65) ||
    (num >= 71 && num <= 75) ||
    (num >= 81 && num <= 85);
  return validFdi ? num : undefined;
}

export interface RecordedSequencePayload {
  procedure: string;
  toothNumber?: number;
  audioDuration: string;
  transcript: string;
  notes: string;
}

export function buildRecordedSequencePayload(params: {
  transcript: string;
  procedure?: string;
  toothNumber?: number | string;
  durationSeconds?: number;
}): RecordedSequencePayload {
  const cleanTranscript = (params.transcript || '').trim();
  const safeProcedure = (params.procedure || '').trim() || 'Evolución Clínica por Voz';
  const explicitTooth =
    typeof params.toothNumber === 'number'
      ? params.toothNumber
      : typeof params.toothNumber === 'string' && params.toothNumber.trim() !== ''
        ? parseInt(params.toothNumber.trim(), 10)
        : undefined;
  const resolvedTooth =
    explicitTooth && !Number.isNaN(explicitTooth)
      ? explicitTooth
      : extractToothNumberFromTranscript(cleanTranscript);

  const secs = Math.max(1, Math.floor(params.durationSeconds || 0));
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  const audioDuration = `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;

  return {
    procedure: safeProcedure,
    toothNumber: resolvedTooth,
    audioDuration,
    transcript: cleanTranscript,
    notes: cleanTranscript
      ? `[Grabación en Consulta (${audioDuration})]: ${cleanTranscript}`
      : `[Grabación en Consulta (${audioDuration})]`
  };
}

export interface CashClosingMovementsFilterResult {
  periodPayments: PaymentReceipt[];
  periodLabExpenses: ClinicExpense[];
  periodOperatingExpenses: ClinicExpense[];
}

export function filterCashClosingMovements(
  payments: PaymentReceipt[],
  expenses: ClinicExpense[],
  startDate: string,
  endDate: string
): CashClosingMovementsFilterResult {
  const periodPayments = (payments || [])
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const periodExpenses = (expenses || [])
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    periodPayments,
    periodLabExpenses: periodExpenses.filter((e) => e.category === 'laboratorio'),
    periodOperatingExpenses: periodExpenses.filter((e) => e.category !== 'laboratorio')
  };
}

export function upsertVademecumMedication(
  current: VademecumMedication[],
  input: {
    name: string;
    presentation: string;
    defaultDose?: string;
    defaultFreq?: string;
    defaultDur?: string;
    instructions?: string;
  }
): { list: VademecumMedication[]; saved: VademecumMedication; isUpdate: boolean } {
  const cleanName = (input.name || '').trim();
  const cleanPresentation = (input.presentation || '').trim();
  if (!cleanName) {
    throw new Error('El nombre del medicamento es obligatorio.');
  }
  if (!cleanPresentation) {
    throw new Error('La presentación del medicamento es obligatoria.');
  }

  const normalizedKey = cleanName.toLowerCase();
  const existingIdx = (current || []).findIndex(
    (m) => m.name.trim().toLowerCase() === normalizedKey
  );

  const normalizedEntry = {
    name: cleanName,
    presentation: cleanPresentation,
    defaultDose: (input.defaultDose || '').trim() || '1 dosis',
    defaultFreq: (input.defaultFreq || '').trim() || 'Cada 8 horas',
    defaultDur: (input.defaultDur || '').trim() || 'Por 5 días',
    instructions: (input.instructions || '').trim()
  };

  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    const updated: VademecumMedication = {
      ...existing,
      ...normalizedEntry
    };
    const nextList = [...current];
    nextList[existingIdx] = updated;
    return { list: nextList, saved: updated, isUpdate: true };
  }

  const created: VademecumMedication = {
    id: `vad-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...normalizedEntry,
    isCustom: true
  };
  return { list: [...(current || []), created], saved: created, isUpdate: false };
}

export function removeVademecumMedication(
  current: VademecumMedication[],
  id: string
): VademecumMedication[] {
  return (current || []).filter((m) => m.id !== id);
}
