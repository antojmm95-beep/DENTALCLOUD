import { jsPDF } from 'jspdf';
import { ClinicConfig, ConsentProcedureType, Patient } from '../types/dental';
import {
  ConsentFormState,
  IMPLANT_GENERAL_CLAUSES,
  IMPLANT_PHASES_GUIDE,
  SURGICAL_CONSENT_TEMPLATES,
  buildConsentPdfFilename,
  formatConsentLongSpanishDate
} from './consentDocument';

export interface ConsentPdfExportParams {
  folio?: string;
  procedureType: ConsentProcedureType;
  patient: Patient;
  doctor: {
    name: string;
    colegiado: string;
    mpps: string;
    phone?: string;
    email?: string;
  };
  formState: ConsentFormState;
  clinicConfig: ClinicConfig;
  signatureDataUrl?: string | null;
  generatedDateText?: string;
}

export function buildConsentPdfDoc(params: ConsentPdfExportParams): { doc: jsPDF; filename: string } {
  const {
    folio,
    procedureType,
    patient,
    doctor,
    formState,
    clinicConfig,
    signatureDataUrl,
    generatedDateText = formatConsentLongSpanishDate()
  } = params;

  const tpl = SURGICAL_CONSENT_TEMPLATES[procedureType] || SURGICAL_CONSENT_TEMPLATES.exodoncia;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;

  let y = 16;

  const drawHeaderLogo = () => {
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(1);
    doc.roundedRect(margin, 11, 16, 18, 4.5, 4.5, 'S');
    doc.setDrawColor(12, 74, 110);
    doc.line(margin + 3.5, 21, margin + 12.5, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('CORONA', margin + 20, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('CLÍNICA ODONTOLÓGICA', margin + 20, 22);

    if (folio) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(3, 105, 161);
      doc.text(`Folio: ${folio}`, pageWidth - margin, 17, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${generatedDateText}`, pageWidth - margin, 22, { align: 'right' });
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 18;
    }
  };

  const addParagraph = (text: string, fontSize = 9, bold = false, lineH = 4.4, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * lineH + 2);
    doc.text(lines, margin, y);
    y += lines.length * lineH + 2;
  };

  const addBulletList = (items: string[], fontSize = 8.6, lineH = 4.1) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
      ensureSpace(lines.length * lineH + 1.5);
      doc.text(lines, margin + 2, y);
      y += lines.length * lineH + 1.2;
    });
    y += 1.5;
  };

  const addLabeledLine = (label: string, value: string) => {
    const cleanVal = value.trim() || '________________________________________________';
    addParagraph(`${label}: ${cleanVal}`, 9, false, 4.4, [15, 23, 42]);
  };

  drawHeaderLogo();
  y = 35;

  // Document centered title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(tpl.title, pageWidth / 2, y, { align: 'center' });
  y += 5;

  if (tpl.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(tpl.subtitle, pageWidth / 2, y, { align: 'center' });
    y += 6;
  } else {
    y += 2;
  }

  if (procedureType === 'terceros_molares') {
    addParagraph('1) Identificación del paciente', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph(
      `Nombre: ${patient.name.toUpperCase()}   ·   C.I.: ${patient.cedula}   ·   Edad: ${patient.age ?? '—'} años`,
      9,
      false,
      4.4
    );
    if (formState.representativeName.trim()) {
      addParagraph(`Representante legal / familiar: ${formState.representativeName.trim()}`, 8.8);
    }

    addParagraph('2) Diagnóstico e indicación', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph(formState.diagnosis.trim() || 'Terceros molares con indicación quirúrgica.', 9);

    addParagraph('3) Procedimiento propuesto', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph(tpl.text, 8.8);

    addParagraph('4) Anestesia / sedación', 9.5, true, 4.5, [15, 23, 42]);
    const localMark = formState.anesthesiaModality === 'local' ? '[X]' : '[ ]';
    const sedMark = formState.anesthesiaModality === 'local_sedacion' ? '[X]' : '[ ]';
    addParagraph(
      `Modalidad prevista:   ${localMark} Anestesia local     ${sedMark} Anestesia local + sedación (oral / inhalatoria / endovenosa)`,
      8.8
    );
    addParagraph(
      'He sido informado(a) de los riesgos propios de la anestesia/sedación y de la necesidad de informar antecedentes médicos, alergias y medicación habitual.',
      8.6
    );
    if (patient.allergies.length > 0 || patient.systemicConditions.length > 0) {
      addParagraph(
        `Antecedentes registrados en Historia: Alergias (${patient.allergies.join(', ') || 'Niega'}) · Sistémicas (${patient.systemicConditions.join(', ') || 'Niega'})`,
        8.4,
        true,
        4.2,
        [180, 83, 9]
      );
    }

    addParagraph('5) Beneficios esperados', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph(formState.expectedBenefits.trim() || tpl.defaultBenefits, 8.8);

    addParagraph('6) Riesgos, efectos secundarios y posibles complicaciones', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph('Frecuentes o esperables:', 8.8, true);
    addBulletList(tpl.frequentRisks || []);
    addParagraph('Complicaciones posibles:', 8.8, true);
    addBulletList(tpl.possibleComplications || []);

    addParagraph('7) Estudios y planificación', 9.5, true, 4.5, [15, 23, 42]);
    const pMark = formState.imagingStudies.panoramica ? '[X]' : '[ ]';
    const perMark = formState.imagingStudies.periapical ? '[X]' : '[ ]';
    const cbctMark = formState.imagingStudies.cbctTac ? '[X]' : '[ ]';
    addParagraph(
      `Estudios requeridos/evaluados:   ${pMark} Radiografía panorámica     ${perMark} Periapical     ${cbctMark} CBCT / TAC`,
      8.8
    );
    addParagraph('Hallazgos intraoperatorios pueden modificar la técnica para asegurar resultados y control de riesgos.', 8.5);

    addParagraph('8) Alternativas al tratamiento', 9.5, true, 4.5, [15, 23, 42]);
    addParagraph(formState.alternativeTreatments.trim() || tpl.defaultAlternatives, 8.8);

    addParagraph('9) Medicación, indicaciones y controles', 9.5, true, 4.5, [15, 23, 42]);
    addBulletList([
      'Medidas de higiene, dieta blanda, reposo relativo, frío local y controles postoperatorios.',
      'No fumar y no consumir alcohol en el postoperatorio inmediato (reduce la cicatrización).',
      'Informar de inmediato ante fiebre, sangrado persistente, dolor incontrolable, mal olor intenso, dificultad respiratoria o alteración sensitiva marcada.'
    ]);

    addParagraph('10) Declaración del paciente', 9.5, true, 4.5, [15, 23, 42]);
    addBulletList([
      'He leído o se me ha explicado este documento en lenguaje comprensible y mis preguntas fueron respondidas.',
      'Entiendo beneficios, riesgos, alternativas y posibles complicaciones; otorgo mi consentimiento libre y voluntario para la odontectomía indicada.',
      'Entiendo que la odontología no garantiza resultados absolutos y pueden surgir situaciones imprevistas.'
    ]);
  } else if (procedureType === 'implantes') {
    const repClause = formState.representativeName.trim()
      ? ` (representado por ${formState.representativeName.trim()})`
      : '';
    addParagraph(
      `Yo, ${patient.name.toUpperCase()}${repClause}, titular de la Cédula de Identidad ${patient.cedula}, declaro que me han informado detalladamente y doy mi consentimiento para el tratamiento implantológico descrito a continuación:`,
      9
    );

    if (formState.diagnosis.trim()) {
      addLabeledLine('Diagnóstico clínico', formState.diagnosis);
    }

    addParagraph(`1. ${tpl.text}`, 8.8);
    addParagraph('2. Evaluación, diagnóstico y plan de tratamiento en tres fases principales:', 9.2, true);
    IMPLANT_PHASES_GUIDE.forEach((p) => {
      addParagraph(p.phase, 9, true, 4.3, [3, 105, 161]);
      addParagraph(p.body, 8.7);
    });

    if (formState.prosthodontistName.trim()) {
      addParagraph(`Especialista encargado de la Fase Protésica (Dr./Protesista): ${formState.prosthodontistName.trim()}`, 8.9, true);
    }

    IMPLANT_GENERAL_CLAUSES.forEach((clause) => addParagraph(clause, 8.7));

    if (formState.implantIdentification.trim()) {
      addParagraph(`Registro / Etiquetas de Identificación de Implantes: ${formState.implantIdentification.trim()}`, 8.7, true, 4.3, [15, 23, 42]);
    }

    const contactPhone = doctor.phone || clinicConfig.phone || '0412-6035218';
    const contactEmail = doctor.email || clinicConfig.email || 'antojmm95@gmail.com';
    addParagraph(`En caso de dudas o molestias puede comunicarse al ${contactPhone} y ${contactEmail}.`, 8.8, true);
  } else {
    // Exodoncia general & otras especialidades (fiel a exodoncia_d8847776.pdf)
    const repPart = formState.representativeName.trim()
      ? `, actuando como representante legal o familiar de ${formState.representativeName.trim()}`
      : '';
    addParagraph(
      `YO, ${patient.name.toUpperCase()}, PORTADOR(A) DE LA C.I. NRO. ${patient.cedula}${repPart}, declaro lo siguiente:`,
      9.2,
      true
    );
    addParagraph(tpl.text, 9);

    addLabeledLine('Diagnóstico(s)', formState.diagnosis);
    addLabeledLine('Tratamiento(s) por realizar', formState.proposedTreatment);
    addLabeledLine('Tratamientos Alternativos (en caso que aplique)', formState.alternativeTreatments);
    addLabeledLine('Beneficios esperados con el tratamiento por realizar', formState.expectedBenefits);

    addParagraph('Riesgos y posibles complicaciones frecuentes:', 9, true);
    addBulletList(tpl.risks);

    const yesMark = formState.consentDecision === 'consiento' ? '[X]' : '[ ]';
    const noMark = formState.consentDecision === 'no_consiento' ? '[X]' : '[ ]';
    addParagraph(
      `Me siento libre, sin coacción ni manipulación, para decidir de acuerdo con mis valores e intereses y me declaro competente para tomar las decisiones que correspondan. En tal sentido:   ${yesMark} DOY MI CONSENTIMIENTO AL FACULTATIVO PARA REALIZAR EL TRATAMIENTO PERTINENTE   ó   ${noMark} NO CONSIENTO, entendiendo que puedo retirar este consentimiento por escrito cuando así lo desee, sin represalia ni penalidad alguna.`,
      8.8,
      false,
      4.3
    );
  }

  // Signatures section
  ensureSpace(44);
  y += 4;
  const colLeft = margin;
  const colRight = pageWidth / 2 + 6;
  const boxW = contentWidth / 2 - 6;

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', colLeft + 10, y - 2, 46, 16);
    } catch {
      // Ignore malformed data URL fallback
    }
  }

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.35);
  doc.line(colLeft, y + 16, colLeft + boxW, y + 16);
  doc.line(colRight, y + 16, colRight + boxW, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Paciente: ${patient.name.toUpperCase()}`, colLeft, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`C.I.: ${patient.cedula} · Firma del Paciente / Representante`, colLeft, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(`Profesional: ${doctor.name}`, colRight, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text(`${doctor.colegiado}   ·   ${doctor.mpps}`, colRight, y + 24);

  y += 30;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  const witnessLabel = formState.witnessName.trim()
    ? `Testigo: ${formState.witnessName.trim()}   ·   Firma: _______________________`
    : 'Testigo (opcional): ________________________________   Firma: _______________________';
  doc.text(witnessLabel, margin, y);
  y += 6;
  doc.text(`Fecha de Generación: ${generatedDateText}`, margin, y);

  const filename = buildConsentPdfFilename({
    folio,
    procedureType,
    patientName: patient.name
  });
  return { doc, filename };
}

export function exportConsentPdf(params: ConsentPdfExportParams): string {
  const { doc, filename } = buildConsentPdfDoc(params);
  doc.save(filename);
  return filename;
}
