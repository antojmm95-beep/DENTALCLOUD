import { jsPDF } from 'jspdf';
import {
  BudgetDisplayCurrency,
  PresupuestoDispatchParams,
  convertBudgetAmountToBs,
  formatBudgetCurrencyValue,
  formatPresupuestoDate,
  formatPresupuestoMoney
} from './budgetDocument';

export interface PresupuestoPdfExportParams extends PresupuestoDispatchParams {
  currencyMode?: BudgetDisplayCurrency;
  rateLabel?: string;
}

export function buildPresupuestoPdfFilename(params: {
  folio: string;
  currencyMode?: BudgetDisplayCurrency;
  patientName: string;
}): string {
  const safeFolio = (params.folio || 'PRESUPUESTO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeMode = params.currencyMode || 'USD';
  const safePatient = (params.patientName || 'PACIENTE')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return `Presupuesto_${safeFolio}_${safeMode}_${safePatient}.pdf`;
}

export function buildPresupuestoPdfDoc({
  budget,
  patient,
  doctor,
  exchangeRate,
  clinicConfig,
  currencyMode = 'USD',
  rateLabel = 'Dólar BCV'
}: PresupuestoPdfExportParams): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;

  // Top-left metadata block
  let y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nro. Presupuesto: ${budget.folio}`, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  y += 5.5;
  doc.text(`Fecha Presupuesto: ${formatPresupuestoDate(budget.date)}`, margin, y);
  y += 5.5;
  doc.text(`Paciente: ${patient.name}`, margin, y);
  y += 5.5;
  doc.text(`C.I.: ${patient.cedula}`, margin, y);
  y += 5.5;
  doc.text(`Doctor(a): ${doctor.name}`, margin, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(3, 105, 161);
  doc.text(`COV: ${doctor.colegiado}   |   MPPS: ${doctor.mpps}`, margin, y);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  y += 5.5;
  doc.text(`Historia Nro. ${patient.historyNumber || patient.id}`, margin, y);

  if (currencyMode !== 'USD') {
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161);
    doc.text(
      `Moneda: Bolívares (${rateLabel}: ${safeRate.toFixed(2)} Bs/$)`,
      margin,
      y
    );
    doc.setTextColor(15, 23, 42);
  }

  // Top-right Clínica Corona Tooth Logo & Wordmark
  const logoX = pageWidth - margin - 42;
  const logoY = 14;
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(1.1);
  doc.roundedRect(logoX + 10, logoY, 22, 24, 6, 6, 'S');
  doc.setDrawColor(12, 74, 110);
  doc.line(logoX + 14, logoY + 13, logoX + 28, logoY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(100, 116, 139);
  doc.text('CORONA', logoX + 21, logoY + 31, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('CLÍNICA ODONTOLÓGICA', logoX + 21, logoY + 35, { align: 'center' });

  // Treatments table
  y = 66;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  const colCant = margin + 3;
  const colTrat = margin + 15;
  const colUnit = currencyMode === 'BOTH' ? pageWidth - margin - 72 : pageWidth - margin - 62;
  const colSub = currencyMode === 'BOTH' ? pageWidth - margin - 38 : pageWidth - margin - 34;
  const colTot = pageWidth - margin - 3;

  const unitSuffix = currencyMode === 'BS' ? ' (Bs.)' : currencyMode === 'USD' ? ' ($)' : '';
  doc.text('Cant.', colCant, y);
  doc.text('Tratamiento', colTrat, y);
  doc.text(`Prec. Unit.${unitSuffix}`, colUnit, y, { align: 'right' });
  doc.text(`Sub Total${unitSuffix}`, colSub, y, { align: 'right' });
  doc.text(`Total${unitSuffix}`, colTot, y, { align: 'right' });

  y += 2.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5.5;

  const formatCell = (usdVal: number) => {
    if (currencyMode === 'BS') {
      return formatPresupuestoMoney(convertBudgetAmountToBs(usdVal, safeRate));
    }
    if (currencyMode === 'BOTH') {
      return `$${formatPresupuestoMoney(usdVal)}`;
    }
    return formatPresupuestoMoney(usdVal);
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  if (budget.items.length === 0) {
    doc.text('Sin procedimientos cargados en este plan.', colTrat, y);
    y += 7;
  } else {
    budget.items.forEach((item) => {
      const toothLabel = item.toothNumber ? ` (Pz ${item.toothNumber})` : '';
      const lineTitle = `${item.name.toUpperCase()}${toothLabel}`;
      const wrapped = doc.splitTextToSize(lineTitle, colUnit - colTrat - 24);
      const itemSub = item.price * item.quantity;

      doc.text(String(item.quantity), colCant + 2, y);
      doc.text(wrapped, colTrat, y);
      doc.text(formatCell(item.price), colUnit, y, { align: 'right' });
      doc.text(formatCell(itemSub), colSub, y, { align: 'right' });
      doc.text(formatCell(item.total), colTot, y, { align: 'right' });

      if (currencyMode === 'BOTH') {
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(item.total, safeRate))}`,
          colTot,
          y + 3.8,
          { align: 'right' }
        );
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.8);
        y += Math.max(wrapped.length * 4.8, 7.5) + 2;
      } else {
        y += wrapped.length * 4.8 + 1.5;
      }
    });
  }

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6.5;

  // Sub Total & Total right-aligned
  const subDisplay =
    currencyMode === 'BS'
      ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.subtotal, safeRate))}`
      : `$${formatPresupuestoMoney(budget.subtotal)}`;
  const discDisplay =
    currencyMode === 'BS'
      ? `-Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.discountTotal, safeRate))}`
      : `-$${formatPresupuestoMoney(budget.discountTotal)}`;
  const totalDisplay =
    currencyMode === 'BS'
      ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.total, safeRate))}`
      : currencyMode === 'BOTH'
        ? formatBudgetCurrencyValue(budget.total, 'BOTH', safeRate)
        : `$${formatPresupuestoMoney(budget.total)} USD`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Sub Total:', pageWidth - margin - 46, y, { align: 'right' });
  doc.text(subDisplay, colTot, y, { align: 'right' });
  y += 6;

  if (budget.discountTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Descuento:', pageWidth - margin - 46, y, { align: 'right' });
    doc.text(discDisplay, colTot, y, { align: 'right' });
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total:', pageWidth - margin - 46, y, { align: 'right' });
  doc.text(totalDisplay, colTot, y, { align: 'right' });

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const secondaryLine =
    currencyMode === 'BS'
      ? `Ref. $${formatPresupuestoMoney(budget.total)} USD · Tasa ${rateLabel}: ${safeRate.toFixed(2)} Bs/$`
      : `Equiv. Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.total, safeRate))} (${rateLabel}: ${safeRate.toFixed(2)} Bs/$)`;
  doc.text(secondaryLine, colTot, y, { align: 'right' });

  // Nota section (sin Secuencia de Tratamiento ni Forma de Pago)
  doc.setTextColor(15, 23, 42);
  y += 10;
  if (budget.notes?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nota:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(budget.notes.trim(), contentWidth);
    doc.text(noteLines, margin, y);
  }

  // Bottom Signatures, Disclaimer & Footer
  const sigY = pageHeight - 36;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(margin + 12, sigY, margin + 72, sigY);
  doc.line(pageWidth - margin - 72, sigY, pageWidth - margin - 12, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma Doctor', margin + 42, sigY + 4.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${doctor.name} · ${doctor.colegiado} · ${doctor.mpps}`, margin + 42, sigY + 8.5, {
    align: 'center'
  });

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma Paciente', pageWidth - margin - 42, sigY + 4.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${patient.name} · ${patient.cedula}`, pageWidth - margin - 42, sigY + 8.5, {
    align: 'center'
  });

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Nota: dicho presupuesto puede estar sujeto a cambio durante el desarrollo de su tratamiento',
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );

  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(clinicConfig.address.toUpperCase(), contentWidth);
  doc.text(addrLines, pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(
    `TLF: ${clinicConfig.phone}   ·   @CLINICA_CORONA (IG)`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  const filename = buildPresupuestoPdfFilename({
    folio: budget.folio,
    currencyMode,
    patientName: patient.name
  });
  return { doc, filename };
}

export function buildPresupuestoPdfFile(params: PresupuestoPdfExportParams): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
} {
  const { doc, filename } = buildPresupuestoPdfDoc(params);
  const blob = doc.output('blob');
  const file =
    typeof File !== 'undefined'
      ? new File([blob], filename, { type: 'application/pdf' })
      : (blob as unknown as File);
  return { doc, blob, file, filename };
}

export function exportPresupuestoPdf(params: PresupuestoPdfExportParams): string {
  const { doc, filename } = buildPresupuestoPdfDoc(params);
  doc.save(filename);
  return filename;
}
