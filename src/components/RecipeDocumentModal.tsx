import React, { useEffect, useRef, useState } from 'react';
import { ClinicConfig, Doctor, MedicalPrescription, Patient } from '../types/dental';
import {
  isPatientNotifiable,
  normalizeWhatsAppPhone,
  resolvePatientWhatsAppPhone
} from '../utils/dentalCalc';
import {
  buildRecipePdfFile,
  buildRecipePdfFilename,
  exportRecipePdf,
  formatRecipeDisplayDate,
  formatRecipeEmailContent,
  formatRecipeWhatsAppText,
  resolveRecipeMpps
} from '../utils/recipePdfExport';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Printer,
  Send,
  Share2,
  ShieldCheck,
  X
} from 'lucide-react';

export type RecipeDispatchMode = 'preview' | 'whatsapp' | 'email';

interface RecipeDocumentModalProps {
  isOpen: boolean;
  initialMode: RecipeDispatchMode;
  onClose: () => void;
  rx: MedicalPrescription;
  patient: Patient;
  doctors: Doctor[];
  activeDoctor?: Doctor;
  clinicConfig: ClinicConfig;
  generateDirectWhatsAppUrl: (phone: string, text: string) => string;
  onUpdatePatientPhone?: (newPhone: string) => void;
  showToast: (msg: string) => void;
}

export const RecipeDocumentModal: React.FC<RecipeDocumentModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  rx,
  patient,
  doctors,
  activeDoctor,
  clinicConfig,
  generateDirectWhatsAppUrl,
  onUpdatePatientPhone,
  showToast
}) => {
  const [mode, setMode] = useState<RecipeDispatchMode>(initialMode);
  const [attachPdfOnSend, setAttachPdfOnSend] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const waPhoneInputRef = useRef<HTMLInputElement | null>(null);

  const mppsValue = resolveRecipeMpps(rx, doctors, activeDoctor);
  const matchedDoc = doctors.find((d) =>
    d.name.toLowerCase().includes(rx.doctorName.replace(/^(Dr\.|Dra\.)\s*/i, '').trim().toLowerCase())
  );
  const doctorInfo = {
    name: rx.doctorName,
    specialty: rx.doctorSpecialty || matchedDoc?.specialty || 'Odontología General',
    colegiado: rx.doctorColegiado || matchedDoc?.colegiado || 'COV-21870',
    mpps: mppsValue,
    rif: matchedDoc?.rif,
    phone: matchedDoc?.phone,
    email: matchedDoc?.email
  };

  const [waText, setWaText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setDispatchStatus(null);
    const resolved = resolvePatientWhatsAppPhone(
      patient,
      undefined,
      clinicConfig.waCountryCode || '58'
    );
    setWaPhoneInput(resolved.rawPhone || patient.phone || '');
  }, [isOpen, initialMode, patient.id]);

  useEffect(() => {
    if (!isOpen) return;
    setWaText(
      formatRecipeWhatsAppText({
        rx,
        doctor: doctorInfo,
        clinicConfig
      })
    );
    const mail = formatRecipeEmailContent({
      rx,
      patient,
      doctor: doctorInfo,
      clinicConfig
    });
    setEmailSubject(mail.subject);
    setEmailBody(mail.body);
  }, [isOpen, rx, patient, clinicConfig, doctorInfo.colegiado, doctorInfo.mpps, doctorInfo.name]);

  if (!isOpen) return null;

  const plannedPdfFilename = buildRecipePdfFilename({
    folio: rx.folio,
    patientName: rx.patientName
  });

  const handleDownloadPdf = () => {
    const filename = exportRecipePdf({
      rx,
      patient,
      doctor: doctorInfo,
      clinicConfig
    });
    setDispatchStatus(`PDF oficial ${filename} descargado correctamente.`);
    showToast(`Récipe oficial ${filename} descargado`);
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado al portapapeles`);
    } catch {
      showToast('No se pudo copiar automáticamente; selecciona el texto manualmente');
    }
  };

  const waCountryCode = (clinicConfig.waCountryCode || '58').replace(/[^0-9]/g, '') || '58';
  const normalizedTargetPhone = normalizeWhatsAppPhone(waPhoneInput, waCountryCode);
  const directWhatsAppUrl = normalizedTargetPhone
    ? generateDirectWhatsAppUrl(normalizedTargetPhone, waText)
    : '';
  const hasNativeFileShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const handleOpenWhatsApp = () => {
    if (!isPatientNotifiable(patient)) {
      showToast('Envío bloqueado: el paciente figura como inactivo o fallecido.');
      return;
    }

    if (!normalizedTargetPhone || !directWhatsAppUrl) {
      setDispatchStatus(
        'Ingresa un número de WhatsApp válido del paciente arriba para abrir su chat directamente sin tener que buscarlo.'
      );
      showToast('Ingresa el teléfono WhatsApp del paciente para ir directo al chat');
      waPhoneInputRef.current?.focus();
      return;
    }

    let downloadedName: string | null = null;
    if (attachPdfOnSend) {
      const { doc, filename } = buildRecipePdfFile({
        rx,
        patient,
        doctor: doctorInfo,
        clinicConfig
      });
      doc.save(filename);
      downloadedName = filename;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(waText).catch(() => {});
    }

    window.open(directWhatsAppUrl, '_blank', 'noopener,noreferrer');

    if (downloadedName) {
      setDispatchStatus(
        `Chat directo abierto con +${normalizedTargetPhone} y PDF "${downloadedName}" descargado automáticamente para adjuntar en ese chat.`
      );
      showToast(`Abriendo chat directo de ${patient.name} (+${normalizedTargetPhone}) y descargando PDF`);
    } else {
      setDispatchStatus(`Abriendo chat directo de WhatsApp con +${normalizedTargetPhone}.`);
      showToast(`Abriendo chat directo de ${patient.name}`);
    }
  };

  const handleNativeSharePdf = async () => {
    if (!isPatientNotifiable(patient)) {
      showToast('Envío bloqueado: el paciente figura como inactivo o fallecido.');
      return;
    }
    const { file, filename } = buildRecipePdfFile({
      rx,
      patient,
      doctor: doctorInfo,
      clinicConfig
    });
    if (hasNativeFileShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Récipe Médico ${rx.folio} - ${patient.name}`,
          text: waText
        });
        setDispatchStatus(`PDF ${filename} compartido desde el menú del dispositivo.`);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    exportRecipePdf({ rx, patient, doctor: doctorInfo, clinicConfig });
    showToast(`PDF ${filename} descargado`);
  };

  const handleOpenEmail = () => {
    if (attachPdfOnSend) {
      const filename = exportRecipePdf({
        rx,
        patient,
        doctor: doctorInfo,
        clinicConfig
      });
      setDispatchStatus(`PDF "${filename}" descargado para adjuntar al borrador de correo.`);
    }
    const recipient = patient.email || '';
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    showToast(
      attachPdfOnSend
        ? `Récipe PDF descargado y correo preparado para ${recipient || patient.name}`
        : `Borrador de correo preparado para ${recipient || patient.name}`
    );
  };

  return (
    <div
      data-testid="recipe-document-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Récipe Médico Oficial en PDF · {rx.folio}
              </h3>
              <p className="text-[11px] text-slate-500">
                {doctorInfo.name} ({doctorInfo.colegiado} · {doctorInfo.mpps})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  mode === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Formato PDF
              </button>
              <button
                type="button"
                onClick={() => setMode('whatsapp')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  mode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp + PDF
              </button>
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  mode === 'email'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Correo + PDF
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Descargar PDF
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa del récipe"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <div className={`grid gap-6 ${mode === 'preview' ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-12'}`}>
            {/* Official Prescription Sheet */}
            <div
              className={`${
                mode === 'preview' ? '' : 'lg:col-span-7'
              } bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm p-6 sm:p-8 print-area text-xs space-y-5`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-sky-600 pb-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    {clinicConfig.clinicName} · RIF: {clinicConfig.rif || 'J-31298456-0'}
                  </div>
                  <h4 className="text-base font-extrabold text-sky-800">{doctorInfo.name}</h4>
                  <div className="text-xs font-medium text-slate-700">{doctorInfo.specialty}</div>
                  <div className="text-[11px] font-mono font-bold text-slate-900">
                    {doctorInfo.colegiado} · {doctorInfo.mpps}
                    {doctorInfo.rif ? ` · RIF: ${doctorInfo.rif}` : ''}
                  </div>
                  <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono">
                    <span className="font-bold text-slate-900">Folio: {rx.folio}</span>
                    <span className="text-slate-500">Fecha: {formatRecipeDisplayDate(rx.date)}</span>
                  </div>
                </div>

                {/* Corona Logo */}
                <div className="shrink-0 flex flex-col items-center text-center select-none">
                  <svg viewBox="0 0 120 110" className="w-20 h-18" aria-label="Logo Clínica Odontológica Corona">
                    <path
                      d="M36 18 C22 18, 16 32, 20 50 C24 68, 30 96, 39 98 C46 99, 48 76, 60 76 C72 76, 74 99, 81 98 C90 96, 96 68, 100 50 C104 32, 98 18, 84 18 C73 18, 66 26, 60 26 C54 26, 47 18, 36 18 Z"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M38 56 Q60 74 84 50"
                      fill="none"
                      stroke="#0369a1"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-base font-extrabold tracking-wide text-slate-600 leading-none -mt-1">
                    CORONA
                  </div>
                  <div className="text-[8px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                    CLÍNICA ODONTOLÓGICA
                  </div>
                </div>
              </div>

              {/* Patient Strip */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Paciente</span>
                    <strong className="text-slate-950 uppercase">{rx.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">C.I.</span>
                    <span className="font-mono font-semibold">{rx.patientCedula}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Edad / Hist.</span>
                    <span className="font-mono">
                      {rx.patientAge} años · #{patient.historyNumber || patient.id}
                    </span>
                  </div>
                </div>

                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="pt-1 border-t border-rose-200 flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>ALERTA ALERGIAS: {patient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Rp. Body */}
              <div className="space-y-3">
                <div className="font-bold text-sm text-sky-800 italic">Rp. (Prescripción Médica)</div>
                <div className="divide-y divide-slate-200 border-y border-slate-200">
                  {rx.medications.map((m, idx) => (
                    <div key={idx} className="py-2.5 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-950 text-[13px] uppercase">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600">{m.presentation}</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Tomar / Aplicar: {m.dose} · {m.frequency} · {m.duration}
                      </div>
                      {m.instructions && (
                        <div className="text-[11px] text-slate-600 italic">Indicaciones: {m.instructions}</div>
                      )}
                    </div>
                  ))}
                </div>

                {rx.generalIndications?.trim() && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-950">
                    <strong className="block text-sky-800 mb-0.5">INDICACIONES GENERALES DEL ESPECIALISTA:</strong>
                    <p className="whitespace-pre-line">{rx.generalIndications}</p>
                  </div>
                )}
              </div>

              {/* Signatures & Legal Footer */}
              <div className="pt-6 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-end gap-6">
                <div className="text-[10px] text-slate-600 max-w-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Validez Clínica y Farmacéutica</span>
                  </div>
                  <p>
                    Válido únicamente con firma y sello del facultativo debidamente registrado ante el COV y MPPS.
                  </p>
                  <div className="font-semibold text-slate-800 uppercase">{clinicConfig.address}</div>
                  <div>
                    Telf: {clinicConfig.phone} · @CLINICA_CORONA (IG)
                  </div>
                </div>

                <div className="text-center w-60 shrink-0">
                  <div className="h-14 flex items-center justify-center">
                    {rx.signatureDataUrl ? (
                      <img
                        src={rx.signatureDataUrl}
                        alt={`Firma de ${rx.doctorName}`}
                        className="max-h-14 object-contain"
                      />
                    ) : (
                      <span className="font-cinzel text-sky-700 font-bold italic text-base">
                        {rx.doctorName}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-slate-800 pt-1 text-[11px] font-bold text-slate-900">
                    Firma y Sello del Facultativo
                  </div>
                  <div className="text-[10px] font-mono text-sky-800 font-semibold">
                    {doctorInfo.colegiado} · {doctorInfo.mpps}
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Panel */}
            {mode !== 'preview' && (
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 no-print flex flex-col">
                {mode === 'whatsapp' ? (
                  <>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-2.5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Enviar Récipe Directo al WhatsApp del Paciente</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Paciente: <strong>{patient.name}</strong>
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="recipe-wa-phone-input"
                            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Teléfono WhatsApp destino:</span>
                          </label>
                          {normalizedTargetPhone ? (
                            <span
                              data-testid="recipe-wa-direct-badge"
                              className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded"
                            >
                              Chat directo: +{normalizedTargetPhone}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                              Falta teléfono
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={waPhoneInputRef}
                            id="recipe-wa-phone-input"
                            data-testid="recipe-wa-phone-input"
                            type="tel"
                            value={waPhoneInput}
                            onChange={(e) => setWaPhoneInput(e.target.value)}
                            placeholder="Ej: 0414-1234567 o +58 414 1234567"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:border-emerald-500"
                          />
                          {onUpdatePatientPhone &&
                            normalizedTargetPhone &&
                            waPhoneInput.trim() !== (patient.phone || '').trim() && (
                              <button
                                type="button"
                                onClick={() => onUpdatePatientPhone(waPhoneInput.trim())}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold whitespace-nowrap"
                              >
                                Guardar en ficha
                              </button>
                            )}
                        </div>
                      </div>
                    </div>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 flex flex-col gap-1.5">
                      <span>Mensaje clínico de acompañamiento:</span>
                      <textarea
                        rows={11}
                        value={waText}
                        onChange={(e) => setWaText(e.target.value)}
                        className="w-full flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono leading-relaxed outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachPdfOnSend}
                        onChange={(e) => setAttachPdfOnSend(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="leading-snug">
                        <strong className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Descargar PDF oficial y abrir chat del paciente al instante
                        </strong>
                        <span className="block text-[10px] font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 break-all">
                          {plannedPdfFilename}
                        </span>
                      </span>
                    </label>

                    {dispatchStatus && (
                      <div
                        data-testid="recipe-dispatch-status"
                        className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200 space-y-1.5"
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{dispatchStatus}</span>
                        </div>
                        {directWhatsAppUrl && (
                          <a
                            href={directWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="recipe-wa-fallback-link"
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 underline"
                          >
                            <span>Abrir chat directo (+{normalizedTargetPhone})</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(waText, 'Texto del récipe')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Texto
                      </button>
                      {hasNativeFileShare && (
                        <button
                          type="button"
                          onClick={handleNativeSharePdf}
                          title="Usa el selector del teléfono para compartir el archivo PDF manualmente"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Compartir Archivo
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid="recipe-send-wa-direct-btn"
                        onClick={handleOpenWhatsApp}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {attachPdfOnSend
                            ? 'Ir Directo al Chat + PDF'
                            : 'Ir Directo al Chat WhatsApp'}
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-sky-600" />
                        <span>Enviar Récipe PDF por Correo</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Para: <strong>{patient.email || 'paciente@correo.com'}</strong>
                      </p>
                    </div>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block space-y-1">
                      <span>Asunto:</span>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 flex flex-col gap-1.5">
                      <span>Cuerpo del Correo:</span>
                      <textarea
                        rows={11}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono leading-relaxed outline-none focus:border-sky-500"
                      />
                    </label>

                    <label className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachPdfOnSend}
                        onChange={(e) => setAttachPdfOnSend(e.target.checked)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="leading-snug">
                        <strong className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Generar y descargar PDF al abrir correo
                        </strong>
                        <span className="block text-[10px] font-mono text-sky-700 dark:text-sky-300 mt-0.5 break-all">
                          {plannedPdfFilename}
                        </span>
                      </span>
                    </label>

                    {dispatchStatus && (
                      <div
                        data-testid="recipe-dispatch-status"
                        className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{dispatchStatus}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(emailBody, 'Contenido del correo')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Texto
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEmail}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{attachPdfOnSend ? 'Enviar Correo + PDF' : 'Abrir Cliente de Correo'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
