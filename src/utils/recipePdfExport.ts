import { jsPDF } from 'jspdf';
import { ClinicConfig, Doctor, MedicalPrescription, Patient } from '../types/dental';

export interface RecipePdfParams {
  rx: MedicalPrescription;
  patient: Pick<
    Patient,
    'id' | 'name' | 'cedula' | 'age' | 'historyNumber' | 'phone' | 'email' | 'allergies'
  >;
  doctor: Pick<Doctor, 'name' | 'specialty' | 'colegiado' | 'mpps'> & {
    rif?: string;
    phone?: string;
    email?: string;
  };
  clinicConfig: ClinicConfig;
}

export function resolveRecipeMpps(
  rx: Pick<MedicalPrescription, 'doctorName' | 'doctorMpps'>,
  doctors: Doctor[],
  activeDoctor?: Doctor
): string {
  if (rx.doctorMpps && rx.doctorMpps.trim()) return rx.doctorMpps.trim();
  const cleanRxDoc = rx.doctorName.replace(/^(Dr\.|Dra\.)\s*/i, '').trim().toLowerCase();
  const match = doctors.find((d) => d.name.toLowerCase().includes(cleanRxDoc));
  return match?.mpps || activeDoctor?.mpps || 'MPPS-98412';
}

export function buildRecipePdfFilename(params: {
  folio: string;
  patientName: string;
}): string {
  const safeFolio = (params.folio || 'REC-2026').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePatient = (params.patientName || 'PACIENTE')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '');
  return `Recipe_${safeFolio}_${safePatient || 'PACIENTE'}.pdf`;
}

export function formatRecipeDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoDate;
}

export function formatRecipeWhatsAppText(params: {
  rx: MedicalPrescription;
  doctor: { name: string; colegiado: string; mpps: string };
  clinicConfig: ClinicConfig;
}): string {
  const { rx, doctor, clinicConfig } = params;
  const medsText = rx.medications
    .map(
      (m, idx) =>
        `*${idx + 1}. ${m.name}* (${m.presentation})\n   💊 Dosis: ${m.dose} | Frecuencia: ${m.frequency} | Duración: ${m.duration}${
          m.instructions ? `\n   ℹ️ ${m.instructions}` : ''
        }`
    )
    .join('\n\n');

  const lines = [
    `🩺 *${clinicConfig.clinicName.toUpperCase()} - RÉCIPE MÉDICO ODONTOLÓGICO*`,
    `Folio Oficial: *${rx.folio}*`,
    `Fecha: ${formatRecipeDisplayDate(rx.date)}`,
    `Paciente: *${rx.patientName}* (C.I.: ${rx.patientCedula})`,
    `Doctor(a): *${doctor.name}* (${doctor.colegiado} · ${doctor.mpps})`,
    '',
    `📋 *Prescripción (Rp.):*`,
    medsText,
    '',
    rx.generalIndications?.trim()
      ? `⚠️ *Indicaciones Generales:*\n${rx.generalIndications.trim()}\n`
      : '',
    `📎 *Adjunto:* Récipe Médico Oficial en formato PDF (${buildRecipePdfFilename({
      folio: rx.folio,
      patientName: rx.patientName
    })}) con firma y credenciales profesionales para su validez en farmacia.`,
    '',
    clinicConfig.address,
    `Telf: ${clinicConfig.phone} · @CLINICA_CORONA (IG)`
  ].filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''));

  return lines.join('\n');
}

export function formatRecipeEmailContent(params: RecipePdfParams): {
  subject: string;
  body: string;
} {
  const { rx, doctor, clinicConfig } = params;
  const medsPlain = rx.medications
    .map(
      (m, idx) =>
        `${idx + 1}. ${m.name} (${m.presentation})\n   - Tomar: ${m.dose} | ${m.frequency} | ${m.duration}${
          m.instructions ? `\n   - Nota: ${m.instructions}` : ''
        }`
    )
    .join('\n\n');

  const subject = `Récipe Médico Odontológico ${rx.folio} - ${rx.patientName} (${clinicConfig.clinicName})`;
  const body = [
    `Estimado(a) ${rx.patientName},`,
    '',
    `Adjuntamos su Récipe Médico Odontológico Oficial en formato PDF (${buildRecipePdfFilename({
      folio: rx.folio,
      patientName: rx.patientName
    })}), emitido por ${clinicConfig.clinicName}.`,
    '',
    `Folio Oficial: ${rx.folio}`,
    `Fecha de Emisión: ${formatRecipeDisplayDate(rx.date)}`,
    `Odontólogo(a): ${doctor.name} (${doctor.colegiado} · ${doctor.mpps})`,
    '',
    'PRESCRIPCIÓN MÉDICA (Rp.):',
    medsPlain,
    '',
    rx.generalIndications?.trim()
      ? `INDICACIONES GENERALES:\n${rx.generalIndications.trim()}\n`
      : '',
    'Este documento cuenta con los datos reglamentarios y credenciales profesionales para su validez farmacéutica.',
    '',
    'Atentamente,',
    clinicConfig.clinicName,
    clinicConfig.address,
    `Telf: ${clinicConfig.phone}`
  ].join('\n');

  return { subject, body };
}

export function buildRecipePdfDoc(params: RecipePdfParams): { doc: jsPDF; filename: string } {
  const { rx, patient, doctor, clinicConfig } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 48;

  const drawHeader = () => {
    // Top-right CORONA emblem
    const logoX = pageWidth - margin - 42;
    const logoY = 12;
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(1.05);
    doc.roundedRect(logoX + 10, logoY, 20, 22, 5.5, 5.5, 'S');
    doc.setDrawColor(12, 74, 110);
    doc.line(logoX + 13.5, logoY + 12, logoX + 26.5, logoY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text('CORONA', logoX + 20, logoY + 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text('CLÍNICA ODONTOLÓGICA', logoX + 20, logoY + 32, { align: 'center' });

    // Top-left clinic + prescribing doctor official block
    let hy = 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(clinicConfig.clinicName.toUpperCase(), margin, hy);

    hy += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`RIF: ${clinicConfig.rif || 'J-31298456-0'}   ·   Telf: ${clinicConfig.phone}`, margin, hy);

    hy += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(3, 105, 161);
    doc.text(doctor.name, margin, hy);

    hy += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(doctor.specialty || rx.doctorSpecialty || 'Odontología General y Especializada', margin, hy);

    hy += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    const rifPart = doctor.rif ? `   ·   RIF: ${doctor.rif}` : '';
    doc.text(`COV: ${doctor.colegiado}   ·   MPPS: ${doctor.mpps}${rifPart}`, margin, hy);

    // Folio & Date line
    hy += 6;
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.6);
    doc.line(margin, hy, pageWidth - margin, hy);

    hy += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RÉCIPE MÉDICO ODONTOLÓGICO OFICIAL', margin, hy);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(3, 105, 161);
    doc.text(`Folio: ${rx.folio}   ·   Fecha: ${formatRecipeDisplayDate(rx.date)}`, pageWidth - margin, hy, {
      align: 'right'
    });

    return hy + 4;
  };

  let y = drawHeader();

  // Patient Identification Box
  const allergiesList = patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(', ') : 'Niega alergias reportadas';
  const hasAllergyAlert = Boolean(patient.allergies && patient.allergies.length > 0);
  const boxHeight = hasAllergyAlert ? 22 : 17;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PACIENTE:', margin + 4, y + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(rx.patientName.toUpperCase(), margin + 24, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const historyLabel = patient.historyNumber || patient.id;
  doc.text(
    `C.I.: ${rx.patientCedula}   ·   Edad: ${rx.patientAge} años   ·   Historia Nro.: ${historyLabel}`,
    margin + 4,
    y + 11.5
  );

  if (hasAllergyAlert) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(185, 28, 28);
    doc.text(`ALERTA ALERGIAS: ${allergiesList}`, margin + 4, y + 17.5);
  }

  y += boxHeight + 7;

  // Rp. Section Heading
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(13);
  doc.setTextColor(3, 105, 161);
  doc.text('Rp. (Prescripción Médica)', margin, y);
  y += 6;

  const ensurePageSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Continuación Récipe Médico · ${rx.folio} (${rx.patientName.toUpperCase()})`, margin, y);
      y += 8;
    }
  };

  if (rx.medications.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin medicamentos registrados en la prescripción.', margin, y);
    y += 8;
  } else {
    rx.medications.forEach((med, index) => {
      const noteText = med.instructions ? `Indicaciones: ${med.instructions}` : '';
      const noteLines = noteText ? doc.splitTextToSize(noteText, contentWidth - 10) : [];
      const blockNeed = 15 + noteLines.length * 4.2;
      ensurePageSpace(blockNeed);

      // Medication title & presentation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${index + 1}. ${med.name.toUpperCase()}`, margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(71, 85, 105);
      doc.text(med.presentation, pageWidth - margin - 2, y, { align: 'right' });

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.setTextColor(30, 41, 59);
      doc.text(`Tomar / Aplicar: ${med.dose}  ·  ${med.frequency}  ·  ${med.duration}`, margin + 6, y);

      if (noteLines.length > 0) {
        y += 4.5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(noteLines, margin + 6, y);
        y += noteLines.length * 4.2;
      } else {
        y += 3;
      }

      y += 3;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(margin + 2, y, pageWidth - margin - 2, y);
      y += 5;
    });
  }

  // General Indications Box
  if (rx.generalIndications && rx.generalIndications.trim()) {
    const indLines = doc.splitTextToSize(rx.generalIndications.trim(), contentWidth - 8);
    const indHeight = Math.max(14, 9 + indLines.length * 4.3);
    ensurePageSpace(indHeight + 4);

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, indHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(3, 105, 161);
    doc.text('INDICACIONES GENERALES DEL ESPECIALISTA:', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(15, 23, 42);
    doc.text(indLines, margin + 4, y + 10.5);
    y += indHeight + 6;
  }

  // Official Signature, Stamp & Validity Footer
  const footerTop = pageHeight - 44;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(margin, footerTop, pageWidth - margin, footerTop);

  // Left side: legal validity & verification info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('VALIDEZ CLÍNICA Y FARMACÉUTICA', margin, footerTop + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const validityLines = doc.splitTextToSize(
    `Documento emitido digitalmente por ${clinicConfig.clinicName} bajo folio ${rx.folio}. Válido con firma autógrafa o digital y credenciales COV/MPPS del facultativo.`,
    contentWidth * 0.5
  );
  doc.text(validityLines, margin, footerTop + 10.5);

  // Right side: Doctor signature (drawn canvas if supplied + stamp text)
  const sigCenterX = pageWidth - margin - 34;
  if (rx.signatureDataUrl) {
    try {
      doc.addImage(rx.signatureDataUrl, 'PNG', sigCenterX - 24, footerTop + 2, 48, 15);
    } catch {
      // Fallback to crisp typographic signature
    }
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(3, 105, 161);
    doc.text(doctor.name, sigCenterX, footerTop + 13, { align: 'center' });
  }

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.4);
  doc.line(sigCenterX - 30, footerTop + 18, sigCenterX + 30, footerTop + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma y Sello del Facultativo', sigCenterX, footerTop + 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text(`${doctor.colegiado}   ·   ${doctor.mpps}`, sigCenterX, footerTop + 26, { align: 'center' });

  // Bottom clinic bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const addrLines = doc.splitTextToSize(clinicConfig.address.toUpperCase(), contentWidth);
  doc.text(addrLines, pageWidth / 2, pageHeight - 13, { align: 'center' });
  doc.text(
    `TLF: ${clinicConfig.phone}   ·   ${clinicConfig.email || 'contacto@clinicacorona.com'}   ·   @CLINICA_CORONA (IG)`,
    pageWidth / 2,
    pageHeight - 6.5,
    { align: 'center' }
  );

  const filename = buildRecipePdfFilename({
    folio: rx.folio,
    patientName: rx.patientName
  });
  return { doc, filename };
}

export function buildRecipePdfFile(params: RecipePdfParams): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
} {
  const { doc, filename } = buildRecipePdfDoc(params);
  const blob = doc.output('blob');
  const file =
    typeof File !== 'undefined'
      ? new File([blob], filename, { type: 'application/pdf' })
      : (blob as unknown as File);
  return { doc, blob, file, filename };
}

export function exportRecipePdf(params: RecipePdfParams): string {
  const { doc, filename } = buildRecipePdfDoc(params);
  doc.save(filename);
  return filename;
}
