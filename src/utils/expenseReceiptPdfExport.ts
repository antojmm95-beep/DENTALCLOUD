import { jsPDF } from 'jspdf';
import { ClinicConfig, ClinicExpense, ExpenseCategory } from '../types/dental';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alquiler: 'Canon de Alquiler',
  telefonia: 'Telefonía / Internet (CANTV / Inter)',
  servicios_publicos: 'Servicios Públicos (Luz / Agua)',
  contador: 'Honorarios Contador',
  alcaldia: 'Alcaldía / Fospuca / Aseo',
  seniat: 'SENIAT (Tributos / Retenciones)',
  inces: 'INCES',
  ivss: 'IVSS (Seguro Social)',
  faov: 'FAOV (Banavih)',
  materiales: 'Materiales e Insumos Dentales',
  laboratorio: 'Gastos de Laboratorio Dental',
  otros: 'Otros Gastos Operativos'
};

export interface ExpenseReceiptPdfParams {
  expense: ClinicExpense;
  clinicConfig: ClinicConfig;
  exchangeRate: number;
  issuerName?: string;
}

export function formatExpenseReceiptDate(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoDate;
}

export function resolveExpenseReceiptFolio(
  expense: Pick<ClinicExpense, 'id' | 'receiptFolio' | 'date'>,
  fallbackIndex = 1
): string {
  if (expense.receiptFolio && expense.receiptFolio.trim()) {
    return expense.receiptFolio.trim();
  }
  const year = (expense.date || '2026').slice(0, 4) || '2026';
  const digits = (expense.id || '').replace(/[^0-9]/g, '');
  const suffix = digits ? digits.slice(-4).padStart(4, '0') : String(Math.max(1, fallbackIndex)).padStart(4, '0');
  return `CE-${year}-${suffix}`;
}

export function buildExpenseReceiptPdfFilename(params: {
  folio: string;
  providerName: string;
}): string {
  const safeFolio = (params.folio || 'CE-2026').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeProvider = (params.providerName || 'PROVEEDOR')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 36);
  return `Recibo_Pago_${safeFolio}_${safeProvider || 'PROVEEDOR'}.pdf`;
}

export function computeExpenseBsEquivalent(
  amountUsd: number,
  exchangeRate: number
): number {
  const safeUsd = Number.isFinite(amountUsd) ? Math.max(0, amountUsd) : 0;
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
  return Math.round(safeUsd * safeRate * 100) / 100;
}

export function formatBsVe(amountBs: number): string {
  return `Bs. ${amountBs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function buildExpenseReceiptPdfDoc(params: ExpenseReceiptPdfParams): {
  doc: jsPDF;
  filename: string;
  folio: string;
} {
  const { expense, clinicConfig, exchangeRate, issuerName } = params;
  const folio = resolveExpenseReceiptFolio(expense);
  const filename = buildExpenseReceiptPdfFilename({
    folio,
    providerName: expense.providerName
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const amountBs = computeExpenseBsEquivalent(expense.amountUsd, exchangeRate);
  const categoryLabel = EXPENSE_CATEGORY_LABELS[expense.category] || 'Otros Gastos Operativos';
  const isPaid = expense.status === 'pagado';

  // --- Header & Corona Emblem ---
  const logoX = pageWidth - margin - 40;
  const logoY = 12;
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(1.0);
  doc.roundedRect(logoX + 9, logoY, 20, 21, 5.5, 5.5, 'S');
  doc.setDrawColor(12, 74, 110);
  doc.line(logoX + 12.5, logoY + 11.5, logoX + 25.5, logoY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CORONA', logoX + 19, logoY + 26.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('CLÍNICA ODONTOLÓGICA', logoX + 19, logoY + 30.2, { align: 'center' });

  let y = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(clinicConfig.clinicName.toUpperCase(), margin, y);

  y += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`RIF: ${clinicConfig.rif || 'J-31298456-0'}   ·   Telf: ${clinicConfig.phone}`, margin, y);

  y += 4.3;
  const addrLines = doc.splitTextToSize(clinicConfig.address || '', contentWidth - 46);
  doc.text(addrLines, margin, y);
  y += Math.max(1, addrLines.length) * 3.8 + 3;

  // Blue Rule
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6.5;

  // Document Title + Folio + Status Pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPROBANTE DE EGRESO / RECIBO DE PAGO A PROVEEDOR', margin, y);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(3, 105, 161);
  doc.text(
    `Comprobante N°: ${folio}   ·   Fecha de Pago: ${formatExpenseReceiptDate(expense.date)}`,
    margin,
    y
  );

  // Status badge on right
  if (isPaid) {
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(22, 163, 74);
    doc.setTextColor(21, 128, 61);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.setTextColor(180, 83, 9);
  }
  doc.setLineWidth(0.35);
  doc.roundedRect(pageWidth - margin - 34, y - 4.4, 34, 6.2, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(isPaid ? 'PAGADO' : 'PENDIENTE', pageWidth - margin - 17, y - 0.3, { align: 'center' });

  y += 6.5;

  // --- Beneficiario / Proveedor Card ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('DATOS DEL PROVEEDOR / BENEFICIARIO', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Nombre / Razón Social:', margin + 4, y + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.8);
  doc.text((expense.providerName || 'PROVEEDOR GENERAL').toUpperCase(), margin + 43, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('C.I. / RIF:', margin + 4, y + 17.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    expense.providerDocument?.trim() || '______________________________',
    margin + 23,
    y + 17.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Categoría:', margin + 96, y + 17.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(categoryLabel, margin + 114, y + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Período Contable:', margin + 4, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.monthCorrelation || expense.date.slice(0, 7), margin + 35, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tasa BCV Ref.:', margin + 96, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Bs. ${exchangeRate.toFixed(2)} / USD`, margin + 122, y + 23);

  y += 33;

  // --- Payment Breakdown Table ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE FORMAL DE LA OPERACIÓN Y SUSTENTO DE PAGO', margin, y);
  y += 3.5;

  const rowDefs: Array<[string, string]> = [
    ['Concepto / Descripción:', expense.description],
    ['Documento / Factura N°:', expense.invoiceNumber?.trim() || 'Recibo Interno / Sin Factura'],
    ['N° Control SENIAT:', expense.controlNumberSeniat?.trim() || 'N/A'],
    ['Modalidad de Pago:', expense.paymentMethod || 'Efectivo / Transferencia'],
    ['N° Referencia / Operación:', expense.paymentReference?.trim() || '__________________________']
  ];

  if (expense.notes && expense.notes.trim()) {
    rowDefs.push(['Observaciones:', expense.notes.trim()]);
  }

  const labelColWidth = 52;
  const valColWidth = contentWidth - labelColWidth - 6;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  rowDefs.forEach(([label, value], idx) => {
    const valLines = doc.splitTextToSize(value, valColWidth);
    const rowHeight = Math.max(8, valLines.length * 4.2 + 3.5);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin + 3, y + 5.2);

    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(valLines, margin + labelColWidth + 3, y + 5.2);
    y += rowHeight;
  });

  y += 5;

  // --- Amount Summary Highlight Box ---
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 21, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(3, 105, 161);
  doc.text('MONTO TOTAL PAGADO AL PROVEEDOR', margin + 5, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${expense.amountUsd.toFixed(2)} USD`, margin + 5, y + 15.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('EQUIVALENTE EN BOLÍVARES (BCV)', pageWidth - margin - 5, y + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(3, 105, 161);
  doc.text(formatBsVe(amountBs), pageWidth - margin - 5, y + 15.2, { align: 'right' });

  y += 28;

  // --- Formal Declaration Box ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  const declaration = `Por medio del presente comprobante, el proveedor o beneficiario arriba identificado hace constar que ha recibido de ${clinicConfig.clinicName.toUpperCase()} (RIF: ${clinicConfig.rif || 'J-31298456-0'}) la suma indicada en concepto de pago por los bienes o servicios detallados, sirviendo este documento como sustento formal, administrativo y contable del egreso efectuado.`;
  const decLines = doc.splitTextToSize(declaration, contentWidth - 8);
  const decHeight = decLines.length * 4.2 + 7;
  doc.roundedRect(margin, y, contentWidth, decHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(decLines, margin + 4, y + 5.5);

  // --- Signatures Block (Anchored nicely above footer) ---
  const sigBaseY = Math.max(y + decHeight + 24, pageHeight - 54);
  const leftSigCenter = margin + 44;
  const rightSigCenter = pageWidth - margin - 44;

  // Optional digital receiver signature
  if (expense.receiverSignatureDataUrl && expense.receiverSignatureDataUrl.startsWith('data:image/')) {
    try {
      const imgFormat = expense.receiverSignatureDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(
        expense.receiverSignatureDataUrl,
        imgFormat,
        leftSigCenter - 26,
        sigBaseY - 19,
        52,
        16
      );
    } catch {
      // Skip malformed image silently
    }
  }

  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(leftSigCenter - 36, sigBaseY, leftSigCenter + 36, sigBaseY);
  doc.line(rightSigCenter - 36, sigBaseY, rightSigCenter + 36, sigBaseY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RECIBÍ CONFORME (PROVEEDOR)', leftSigCenter, sigBaseY + 4.5, { align: 'center' });
  doc.text('AUTORIZADO Y PAGADO POR', rightSigCenter, sigBaseY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(71, 85, 105);
  doc.text((expense.providerName || 'Beneficiario').toUpperCase(), leftSigCenter, sigBaseY + 9, {
    align: 'center'
  });
  doc.text(
    `C.I./RIF: ${expense.providerDocument?.trim() || '____________________'}`,
    leftSigCenter,
    sigBaseY + 13,
    { align: 'center' }
  );

  doc.text(clinicConfig.clinicName.toUpperCase(), rightSigCenter, sigBaseY + 9, {
    align: 'center'
  });
  doc.text(
    issuerName?.trim() ? `Administración · ${issuerName.trim()}` : 'Administración y Contabilidad',
    rightSigCenter,
    sigBaseY + 13,
    { align: 'center' }
  );

  // --- Footer ---
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Sustento contable interno de egreso · ${clinicConfig.clinicName} · RIF ${clinicConfig.rif || 'J-31298456-0'}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Telf: ${clinicConfig.phone} · Folio ${folio}`,
    pageWidth / 2,
    footerY + 3.6,
    { align: 'center' }
  );

  return { doc, filename, folio };
}

export function buildExpenseReceiptPdfFile(params: ExpenseReceiptPdfParams): {
  doc: jsPDF;
  filename: string;
  folio: string;
  blob: Blob;
} {
  const { doc, filename, folio } = buildExpenseReceiptPdfDoc(params);
  const blob = doc.output('blob');
  return { doc, filename, folio, blob };
}

export function exportExpenseReceiptPdf(params: ExpenseReceiptPdfParams): string {
  const { doc, filename } = buildExpenseReceiptPdfDoc(params);
  doc.save(filename);
  return filename;
}
