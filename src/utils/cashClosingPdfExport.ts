import { jsPDF } from 'jspdf';
import {
  CashClosingRecord,
  ClinicConfig,
  ClinicExpense,
  PaymentReceipt
} from '../types/dental';
import { filterCashClosingMovements } from './dentalCalc';

export interface CashClosingPdfParams {
  closing: CashClosingRecord;
  payments: PaymentReceipt[];
  expenses: ClinicExpense[];
  exchangeRate: number;
  clinicConfig: ClinicConfig;
}

const METHOD_LABELS: Array<{ key: keyof CashClosingRecord['methodTotalsUsd']; label: string }> = [
  { key: 'efectivo', label: 'Efectivo ($ / Bs)' },
  { key: 'pago_movil', label: 'Pago Móvil' },
  { key: 'transferencia', label: 'Transferencia Bancaria' },
  { key: 'tarjeta_debito', label: 'Punto de Venta (Débito)' },
  { key: 'tarjeta_credito', label: 'Punto de Venta (Crédito)' },
  { key: 'zelle', label: 'Zelle (USD)' },
  { key: 'binance', label: 'Binance Pay (USDT)' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'vale_abono', label: 'Vale / Abono' }
];

function formatMoney(val: number): string {
  return (val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildCashClosingPdfDoc({
  closing,
  payments,
  expenses,
  exchangeRate,
  clinicConfig
}: CashClosingPdfParams): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;

  const { periodPayments, periodLabExpenses, periodOperatingExpenses } = filterCashClosingMovements(
    payments,
    expenses,
    closing.startDate,
    closing.endDate
  );

  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  // Header Banner
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin, y, contentWidth, 18, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`CIERRE DE CAJA GENERAL (${closing.period.toUpperCase()})`, margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${clinicConfig.clinicName.toUpperCase()} · RIF: ${clinicConfig.rif} · Tlf: ${clinicConfig.phone}`,
    margin + 4,
    y + 13
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Folio: ${closing.folio}`, pageWidth - margin - 4, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(`Tasa BCV: ${safeRate.toFixed(2)} Bs/$`, pageWidth - margin - 4, y + 13, { align: 'right' });

  y += 23;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 15, 2, 2, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Período Evaluado: ${closing.startDate} al ${closing.endDate}`, margin + 3, y + 5.5);
  doc.text(`Responsable / Cajero: ${closing.cashierName}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Fecha Referencia: ${closing.referenceDate} · Recibos: ${closing.receiptsCount} · Facturas SENIAT: ${closing.invoicesCount} · Egresos: ${closing.expensesCount}`,
    margin + 3,
    y + 11.2
  );
  doc.text(
    `Emitido: ${closing.createdAt ? closing.createdAt.split('T')[0] : closing.referenceDate}`,
    pageWidth - margin - 3,
    y + 11.2,
    { align: 'right' }
  );

  y += 20;

  // 4 Summary KPI Boxes
  const boxW = (contentWidth - 6) / 4;
  const kpis = [
    {
      title: 'INGRESOS',
      usd: `$${closing.totalCollectedUsd.toFixed(2)}`,
      bs: `Bs. ${formatMoney(closing.totalCollectedBs)}`,
      color: [5, 150, 105] as [number, number, number]
    },
    {
      title: 'EGRESOS + LAB',
      usd: `$${closing.totalExpensesUsd.toFixed(2)}`,
      bs: `Bs. ${formatMoney(closing.totalExpensesBs)}`,
      color: [225, 29, 72] as [number, number, number]
    },
    {
      title: 'GASTO LAB',
      usd: `$${(closing.labExpensesUsd || 0).toFixed(2)}`,
      bs: `Bs. ${formatMoney(closing.labExpensesBs || 0)}`,
      color: [109, 40, 217] as [number, number, number]
    },
    {
      title: 'SALDO NETO',
      usd: `${closing.netBalanceUsd < 0 ? '-' : ''}$${Math.abs(closing.netBalanceUsd).toFixed(2)}`,
      bs: `${closing.netBalanceBs < 0 ? '-' : ''}Bs. ${formatMoney(Math.abs(closing.netBalanceBs))}`,
      color: closing.netBalanceUsd >= 0 ? ([3, 105, 161] as [number, number, number]) : ([225, 29, 72] as [number, number, number])
    }
  ];

  kpis.forEach((k, idx) => {
    const x = margin + idx * (boxW + 2);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, boxW, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(k.title, x + 2.5, y + 4.5);

    doc.setFontSize(10.5);
    doc.setTextColor(...k.color);
    doc.text(k.usd, x + 2.5, y + 10.5);

    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(k.bs, x + 2.5, y + 15.2);
  });

  y += 23;

  // Arqueo Summary Line
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  const diffSign = closing.cashDifferenceUsd >= 0 ? '+' : '';
  doc.text(
    `ARQUEO DE EFECTIVO  ·  Esperado: $${closing.expectedCashUsd.toFixed(2)}   |   Contado: $${closing.countedCashUsd.toFixed(2)}   |   Diferencia: ${diffSign}$${closing.cashDifferenceUsd.toFixed(2)}`,
    margin + 3,
    y + 5.8
  );

  y += 14;

  // Section 1: Desglose por Forma de Pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DESGLOSE DE INGRESOS POR FORMA DE PAGO', margin, y);
  y += 3;

  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(8);
  doc.text('Forma de Pago', margin + 2, y + 4.2);
  doc.text('Monto USD', pageWidth - margin - 52, y + 4.2, { align: 'right' });
  doc.text('Equivalente Bs.', pageWidth - margin - 20, y + 4.2, { align: 'right' });
  doc.text('% Part.', pageWidth - margin - 2, y + 4.2, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  METHOD_LABELS.forEach((m, idx) => {
    const val = closing.methodTotalsUsd[m.key] || 0;
    const pct = closing.totalCollectedUsd > 0 ? (val / closing.totalCollectedUsd) * 100 : 0;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 5.2, 'F');
    }
    doc.setTextColor(val > 0 ? 15 : 148, val > 0 ? 23 : 163, val > 0 ? 42 : 184);
    doc.setFont('helvetica', val > 0 ? 'bold' : 'normal');
    doc.text(m.label, margin + 2, y + 3.8);
    doc.text(`$${val.toFixed(2)}`, pageWidth - margin - 52, y + 3.8, { align: 'right' });
    doc.text(`Bs. ${formatMoney(val * safeRate)}`, pageWidth - margin - 20, y + 3.8, { align: 'right' });
    doc.text(`${pct.toFixed(1)}%`, pageWidth - margin - 2, y + 3.8, { align: 'right' });
    y += 5.2;
  });

  y += 6;

  // Section 2: Detalle de Recibos del Periodo
  ensureSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. RECIBOS DE PACIENTES INCLUIDOS EN EL CIERRE (${periodPayments.length})`, margin, y);
  y += 3;

  if (periodPayments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin recibos registrados dentro de este rango de fechas.', margin + 2, y + 4);
    y += 9;
  } else {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Nro. Recibo', margin + 2, y + 4.2);
    doc.text('Fecha', margin + 28, y + 4.2);
    doc.text('Paciente', margin + 48, y + 4.2);
    doc.text('Concepto / Método', margin + 96, y + 4.2);
    doc.text('Monto USD', pageWidth - margin - 28, y + 4.2, { align: 'right' });
    doc.text('Monto Bs.', pageWidth - margin - 2, y + 4.2, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    periodPayments.forEach((p, idx) => {
      ensureSpace(6);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5.4, 'F');
      }
      doc.setFontSize(7.4);
      doc.setTextColor(15, 23, 42);
      doc.text(p.receiptNumber || '—', margin + 2, y + 3.8);
      doc.text(p.date, margin + 28, y + 3.8);
      doc.text((p.patientName || '').slice(0, 24), margin + 48, y + 3.8);
      const conceptLabel = `${(p.concept || '').slice(0, 26)} (${p.method.replace('_', ' ')})`;
      doc.text(conceptLabel, margin + 96, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${p.amount.toFixed(2)}`, pageWidth - margin - 28, y + 3.8, { align: 'right' });
      doc.text(`Bs. ${formatMoney(p.amount * safeRate)}`, pageWidth - margin - 2, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 5.4;
    });
    y += 5;
  }

  // Section 3: Gastos de Laboratorio del Periodo
  ensureSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(109, 40, 217);
  doc.text(`3. GASTOS DE LABORATORIO DESCONTADOS (${periodLabExpenses.length})`, margin, y);
  y += 3;

  if (periodLabExpenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin gastos de laboratorio en este período.', margin + 2, y + 4);
    y += 9;
  } else {
    doc.setFillColor(237, 233, 254);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(76, 29, 149);
    doc.text('Fecha', margin + 2, y + 4.2);
    doc.text('Laboratorio', margin + 24, y + 4.2);
    doc.text('Trabajo / Paciente', margin + 68, y + 4.2);
    doc.text('Orden', pageWidth - margin - 52, y + 4.2);
    doc.text('Monto USD', pageWidth - margin - 26, y + 4.2, { align: 'right' });
    doc.text('Monto Bs.', pageWidth - margin - 2, y + 4.2, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    periodLabExpenses.forEach((exp, idx) => {
      ensureSpace(6);
      if (idx % 2 === 1) {
        doc.setFillColor(245, 243, 255);
        doc.rect(margin, y, contentWidth, 5.4, 'F');
      }
      doc.setFontSize(7.4);
      doc.setTextColor(15, 23, 42);
      doc.text(exp.date, margin + 2, y + 3.8);
      doc.text((exp.providerName || '').slice(0, 22), margin + 24, y + 3.8);
      doc.text((exp.description || '').slice(0, 32), margin + 68, y + 3.8);
      doc.text(exp.invoiceNumber || '—', pageWidth - margin - 52, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${exp.amountUsd.toFixed(2)}`, pageWidth - margin - 26, y + 3.8, { align: 'right' });
      doc.text(`Bs. ${formatMoney(exp.amountUsd * safeRate)}`, pageWidth - margin - 2, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 5.4;
    });
    y += 5;
  }

  // Section 4: Otros Egresos Operativos
  ensureSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(190, 18, 60);
  doc.text(`4. OTROS EGRESOS OPERATIVOS (${periodOperatingExpenses.length})`, margin, y);
  y += 3;

  if (periodOperatingExpenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin egresos operativos adicionales en este período.', margin + 2, y + 4);
    y += 9;
  } else {
    doc.setFillColor(255, 228, 230);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(136, 19, 55);
    doc.text('Fecha', margin + 2, y + 4.2);
    doc.text('Proveedor', margin + 24, y + 4.2);
    doc.text('Descripción / Categoría', margin + 68, y + 4.2);
    doc.text('Monto USD', pageWidth - margin - 26, y + 4.2, { align: 'right' });
    doc.text('Monto Bs.', pageWidth - margin - 2, y + 4.2, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    periodOperatingExpenses.forEach((exp, idx) => {
      ensureSpace(6);
      if (idx % 2 === 1) {
        doc.setFillColor(255, 241, 242);
        doc.rect(margin, y, contentWidth, 5.4, 'F');
      }
      doc.setFontSize(7.4);
      doc.setTextColor(15, 23, 42);
      doc.text(exp.date, margin + 2, y + 3.8);
      doc.text((exp.providerName || '').slice(0, 22), margin + 24, y + 3.8);
      doc.text(`${(exp.description || '').slice(0, 34)} (${exp.category})`, margin + 68, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${exp.amountUsd.toFixed(2)}`, pageWidth - margin - 26, y + 3.8, { align: 'right' });
      doc.text(`Bs. ${formatMoney(exp.amountUsd * safeRate)}`, pageWidth - margin - 2, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 5.4;
    });
    y += 5;
  }

  // Observations + Signatures
  if (closing.notes?.trim()) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Observaciones del Cierre:', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(closing.notes.trim(), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  ensureSpace(24);
  y = Math.max(y + 6, pageHeight - 28);
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.35);
  doc.line(margin + 14, y, margin + 74, y);
  doc.line(pageWidth - margin - 74, y, pageWidth - margin - 14, y);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma Responsable / Cajero', margin + 44, y + 4.2, { align: 'center' });
  doc.text(closing.cashierName, margin + 44, y + 8.2, { align: 'center' });
  doc.text('Visto Bueno Administración', pageWidth - margin - 44, y + 4.2, { align: 'center' });
  doc.text(clinicConfig.clinicName, pageWidth - margin - 44, y + 8.2, { align: 'center' });

  return doc;
}

export function exportCashClosingPdf(params: CashClosingPdfParams): void {
  const doc = buildCashClosingPdfDoc(params);
  const safeFolio = (params.closing.folio || 'CIERRE').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Cierre_Caja_${safeFolio}_${params.closing.period}_${params.closing.referenceDate}.pdf`);
}
