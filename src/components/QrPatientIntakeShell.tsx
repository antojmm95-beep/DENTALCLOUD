import React, { useEffect, useRef, useState } from 'react';
import { useDental } from '../context/DentalContext';
import {
  buildClinicHandoffUrl,
  QrPatientIntakePayload,
  resolvePublicQrOrigin
} from '../utils/qrIntakeMode';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eraser,
  HeartPulse,
  Lock,
  MessageSquare,
  PhoneCall,
  QrCode,
  ShieldCheck,
  User
} from 'lucide-react';

interface QrPatientIntakeShellProps {
  templateId?: string;
  patientId?: string;
  onExitKioskMode?: () => void;
}

interface SubmittedConfirmation {
  patientName: string;
  cedula: string;
  historyNumber: string;
  isExisting: boolean;
  submittedAt: string;
  handoffUrl: string;
  handoffQrImgUrl: string;
  whatsappHref: string;
}

function formatClinicWhatsAppHref(rawPhone: string, countryCode: string, message: string): string {
  const firstSegment = (rawPhone || '').split('/')[0] || rawPhone || '';
  const digits = firstSegment.replace(/\D/g, '');
  const cleanCode = (countryCode || '58').replace(/\D/g, '') || '58';
  let fullDigits = digits;
  if (fullDigits.startsWith('0')) {
    fullDigits = `${cleanCode}${fullDigits.slice(1)}`;
  } else if (fullDigits && !fullDigits.startsWith(cleanCode) && fullDigits.length <= 10) {
    fullDigits = `${cleanCode}${fullDigits}`;
  }
  const encodedText = encodeURIComponent(message);
  return fullDigits
    ? `https://wa.me/${fullDigits}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export const QrPatientIntakeShell: React.FC<QrPatientIntakeShellProps> = ({
  templateId,
  patientId,
  onExitKioskMode
}) => {
  const [confirmExitKiosk, setConfirmExitKiosk] = useState(false);
  const {
    clinicConfig,
    intakeTemplates,
    patients,
    registerPatientFromQrIntake,
    showToast
  } = useDental();

  const activeTemplate =
    intakeTemplates.find((t) => t.id === templateId) ||
    intakeTemplates[0];

  const linkedPatient = patientId
    ? patients.find((p) => p.id === patientId)
    : undefined;

  const [pName, setPName] = useState(linkedPatient?.name || '');
  const [pCedula, setPCedula] = useState(linkedPatient?.cedula || '');
  const [pPhone, setPPhone] = useState(linkedPatient?.phone || '');
  const [pEmail, setPEmail] = useState(linkedPatient?.email || '');
  const [pBirthDate, setPBirthDate] = useState(linkedPatient?.birthDate || '');
  const [pGender, setPGender] = useState<'M' | 'F' | 'Otro'>(linkedPatient?.gender || 'F');
  const [pProfession, setPProfession] = useState(linkedPatient?.profession || '');
  const [pAllergies, setPAllergies] = useState(
    linkedPatient?.allergies?.length ? linkedPatient.allergies.join(', ') : ''
  );
  const [pConditions, setPConditions] = useState(
    linkedPatient?.systemicConditions?.length ? linkedPatient.systemicConditions.join(', ') : ''
  );
  const [pMedications, setPMedications] = useState(
    linkedPatient?.regularMedications?.length ? linkedPatient.regularMedications.join(', ') : ''
  );
  const [emergencyName, setEmergencyName] = useState(linkedPatient?.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(linkedPatient?.emergencyContact?.phone || '');
  const [emergencyRel, setEmergencyRel] = useState(linkedPatient?.emergencyContact?.relationship || '');
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [hasSigned, setHasSigned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedConfirmation | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!linkedPatient) return;
    setPName(linkedPatient.name || '');
    setPCedula(linkedPatient.cedula || '');
    setPPhone(linkedPatient.phone || '');
    setPEmail(linkedPatient.email || '');
    setPBirthDate(linkedPatient.birthDate || '');
    setPGender(linkedPatient.gender || 'F');
    setPProfession(linkedPatient.profession || '');
    setPAllergies(linkedPatient.allergies?.join(', ') || '');
    setPConditions(linkedPatient.systemicConditions?.join(', ') || '');
    setPMedications(linkedPatient.regularMedications?.join(', ') || '');
    setEmergencyName(linkedPatient.emergencyContact?.name || '');
    setEmergencyPhone(linkedPatient.emergencyContact?.phone || '');
    setEmergencyRel(linkedPatient.emergencyContact?.relationship || '');
  }, [linkedPatient?.id]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';
    setHasSigned(true);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const resetFormForNextPatient = () => {
    setSubmittedRecord(null);
    setFormError(null);
    if (!linkedPatient) {
      setPName('');
      setPCedula('');
      setPPhone('');
      setPEmail('');
      setPBirthDate('');
      setPGender('F');
      setPProfession('');
      setPAllergies('');
      setPConditions('');
      setPMedications('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRel('');
    }
    setAnswers({});
    clearSignature();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pName.trim() || !pCedula.trim() || !pPhone.trim()) {
      setFormError('Por favor complete Nombre y Apellidos, Cédula/Documento y Teléfono de contacto.');
      return;
    }

    const signatureDataUrl =
      hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;

    const mergedAnswers: Record<string, string | boolean> = {
      ...answers,
      ...(pProfession.trim() ? { ocupacion: pProfession.trim() } : {}),
      ...(pMedications.trim() ? { medicacion_habitual: pMedications.trim() } : {}),
      ...(emergencyName.trim()
        ? { contacto_emergencia: `${emergencyName.trim()} (${emergencyPhone.trim()} · ${emergencyRel.trim()})` }
        : {})
    };

    const payload: QrPatientIntakePayload = {
      templateId: activeTemplate?.id || 'tpl-anamnesis-general',
      templateName: activeTemplate?.name || 'Historia Clínica de Ingreso',
      patientId: linkedPatient?.id,
      name: pName.trim().toUpperCase(),
      cedula: pCedula.trim().toUpperCase(),
      phone: pPhone.trim(),
      email: pEmail.trim(),
      birthDate: pBirthDate || undefined,
      gender: pGender,
      profession: pProfession.trim() || undefined,
      allergies: pAllergies.trim() || 'Ninguna',
      systemicConditions: pConditions.trim() || 'Ninguna',
      regularMedications: pMedications.trim() || undefined,
      emergencyContact:
        emergencyName.trim() || emergencyPhone.trim()
          ? {
              name: emergencyName.trim(),
              phone: emergencyPhone.trim() || pPhone.trim(),
              relationship: emergencyRel.trim() || 'Familiar'
            }
          : undefined,
      answers: mergedAnswers
    };

    const { patient, submission, isExisting } = registerPatientFromQrIntake({
      ...payload,
      signatureDataUrl
    });

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const { origin: publicOrigin } = resolvePublicQrOrigin(
      currentOrigin,
      clinicConfig.publicQrBaseUrl
    );
    const handoffUrl = buildClinicHandoffUrl(
      publicOrigin,
      payload,
      clinicConfig.publicQrBaseUrl
    );
    const handoffQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(handoffUrl)}`;

    const waSummary = [
      `*HISTORIA CLÍNICA DIGITAL — ${clinicConfig.clinicName}*`,
      `Paciente: ${patient.name}`,
      `C.I.: ${patient.cedula}`,
      `Teléfono: ${patient.phone}`,
      patient.email ? `Correo: ${patient.email}` : '',
      `Alergias: ${pAllergies.trim() || 'Ninguna'}`,
      `Condiciones Médicas: ${pConditions.trim() || 'Ninguna'}`,
      ``,
      `Enlace directo para agregar al sistema de recepción:`,
      handoffUrl
    ]
      .filter(Boolean)
      .join('\n');

    setSubmittedRecord({
      patientName: patient.name,
      cedula: patient.cedula,
      historyNumber: patient.historyNumber || '—',
      isExisting,
      submittedAt: submission.submittedAt,
      handoffUrl,
      handoffQrImgUrl,
      whatsappHref: formatClinicWhatsAppHref(
        clinicConfig.phone,
        clinicConfig.waCountryCode,
        waSummary
      )
    });
  };

  return (
    <div
      data-testid="qr-restricted-intake-shell"
      className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100 flex flex-col"
    >
      {/* Restricted Patient-Only Header (Zero access to main software, zero login required) */}
      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-sky-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {clinicConfig.clinicName}
              </h1>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold">
                Registro Directo de Historia Clínica (Sin Inicio de Sesión)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-800 dark:text-sky-300">
            <Lock className="w-3 h-3" />
            <span>Acceso Solo Historia Clínica</span>
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6">
        {submittedRecord ? (
          <div
            data-testid="qr-intake-success-card"
            className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5 mt-2"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {submittedRecord.isExisting
                  ? '¡Historia Clínica Actualizada!'
                  : '¡Registro Completado y Paciente Agregado!'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Gracias, <strong className="uppercase">{submittedRecord.patientName}</strong> (C.I.{' '}
                <strong className="font-mono">{submittedRecord.cedula}</strong>). Su expediente{' '}
                <strong className="text-sky-700 dark:text-sky-300">
                  Historia #{submittedRecord.historyNumber}
                </strong>{' '}
                fue registrado en <strong>{clinicConfig.clinicName}</strong>.
              </p>
              <p className="text-xs font-mono text-slate-400 pt-1">
                Registro confirmado: {submittedRecord.submittedAt}
              </p>
            </div>

            {/* Cross-Device Handoff for Patients Scanning from Personal Phone */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-200">
                  <strong className="block text-emerald-800 dark:text-emerald-300">
                    ¿Llenaste esta ficha desde tu celular personal?
                  </strong>
                  <span>
                    Envía tu ficha por WhatsApp a recepción o muestra este código QR en mostrador para vincular tus datos al equipo de la clínica al instante:
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <img
                  src={submittedRecord.handoffQrImgUrl}
                  alt="QR de Confirmación para Recepción"
                  className="w-28 h-28 rounded-lg bg-white p-1.5 border border-emerald-300 shrink-0"
                />
                <div className="flex-1 w-full space-y-2">
                  <a
                    href={submittedRecord.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="qr-send-whatsapp-handoff"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Enviar Ficha a la Clínica por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(submittedRecord.handoffUrl);
                      showToast('Enlace de registro copiado para enviar a recepción');
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace de Ficha para Recepción</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Por su privacidad clínica, este enlace QR únicamente permite registrar su historia médica sin acceso al resto del sistema.
              </span>
            </div>

            <button
              type="button"
              onClick={resetFormForNextPatient}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition"
            >
              Completar Otra Historia Clínica
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Welcome Card */}
            <div className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {activeTemplate?.name || 'Ficha de Historia Clínica Digital'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Complete sus datos personales, alergias, condiciones médicas y firma digital. No requiere usuario ni contraseña: al enviar quedará registrado directamente en su historia clínica.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Section 1: Datos Personales */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <User className="w-4 h-4" />
                <span>1. Datos Personales del Paciente</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nombre y Apellidos *
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Ej. María Fernanda López"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Cédula / Documento *
                  <input
                    type="text"
                    required
                    value={pCedula}
                    onChange={(e) => setPCedula(e.target.value)}
                    placeholder="Ej. V-22456789"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono / WhatsApp *
                  <input
                    type="tel"
                    required
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="Ej. 0414-1234567"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Correo Electrónico (Opcional)
                  <input
                    type="email"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Fecha de Nacimiento
                  <input
                    type="date"
                    value={pBirthDate}
                    onChange={(e) => setPBirthDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Género
                    <select
                      value={pGender}
                      onChange={(e) => setPGender(e.target.value as 'M' | 'F' | 'Otro')}
                      className="mt-1 w-full px-2.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </label>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Ocupación
                    <input
                      type="text"
                      value={pProfession}
                      onChange={(e) => setPProfession(e.target.value)}
                      placeholder="Profesión..."
                      className="mt-1 w-full px-2.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* Section 2: Alergias y Enfermedades Sistémicas */}
            <section className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-100 dark:border-slate-800 pb-2">
                <HeartPulse className="w-4 h-4" />
                <span>2. Alergias y Enfermedades Sistémicas</span>
              </h3>

              <div className="space-y-3 text-xs">
                <label className="block font-semibold text-rose-700 dark:text-rose-300">
                  ¿Es alérgico(a) a algún medicamento, anestesia o material? (Ej. Penicilina, Lidocaína, Látex, AINEs)
                  <input
                    type="text"
                    value={pAllergies}
                    onChange={(e) => setPAllergies(e.target.value)}
                    placeholder="Separar por comas o escribir Ninguna"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rose-200 dark:border-slate-700 bg-rose-50/40 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500"
                  />
                </label>

                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  ¿Padece alguna enfermedad sistémica? (Hipertensión, Diabetes, Cardiopatía, Asma, Tiroides, Coagulación...)
                  <input
                    type="text"
                    value={pConditions}
                    onChange={(e) => setPConditions(e.target.value)}
                    placeholder="Separar por comas o escribir Ninguna"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>

                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Medicación que toma actualmente
                  <input
                    type="text"
                    value={pMedications}
                    onChange={(e) => setPMedications(e.target.value)}
                    placeholder="Ej. Losartán, Aspirina, Metformina o Ninguna"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </label>
              </div>
            </section>

            {/* Section 3: Contacto de Emergencia */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <PhoneCall className="w-4 h-4" />
                <span>3. Contacto en Caso de Emergencia</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nombre Contacto
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Nombre familiar"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </label>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono Emergencia
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="0414-0000000"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </label>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Parentesco
                  <input
                    type="text"
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                    placeholder="Madre / Esposo / Hijo"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </label>
              </div>
            </section>

            {/* Section 4: Cuestionario Clínico */}
            {activeTemplate && activeTemplate.fields.length > 0 && (
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>4. Cuestionario de Anamnesis Odontológica</span>
                </h3>

                {activeTemplate.fields.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                  >
                    {f.type === 'checkbox' ? (
                      <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-100">
                        <input
                          type="checkbox"
                          checked={Boolean(answers[f.id])}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [f.id]: e.target.checked }))
                          }
                          className="w-4 h-4 accent-sky-600 rounded"
                        />
                        <span>{f.label}</span>
                      </label>
                    ) : f.type === 'select' ? (
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {f.label}
                        <select
                          value={String(answers[f.id] || '')}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        >
                          <option value="">Seleccione una opción...</option>
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : f.type === 'textarea' ? (
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {f.label}
                        <textarea
                          rows={2}
                          value={String(answers[f.id] || '')}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                      </label>
                    ) : (
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {f.label}
                        <input
                          type={f.type}
                          value={String(answers[f.id] || '')}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Section 5: Firma Digital */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  5. Firma Digital del Paciente o Representante
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                >
                  <Eraser className="w-3.5 h-3.5" /> Limpiar Firma
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={640}
                height={150}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                data-testid="qr-patient-signature-canvas"
                className="w-full h-36 bg-sky-50/40 dark:bg-slate-950 border-2 border-dashed border-sky-300 dark:border-slate-700 rounded-xl touch-none cursor-crosshair"
              />
            </section>

            <button
              type="submit"
              data-testid="qr-intake-submit-btn"
              className="w-full py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black shadow-sm transition"
            >
              Registrarme y Enviar Historia Clínica a {clinicConfig.clinicName}
            </button>
          </form>
        )}
      </main>

      {onExitKioskMode && (
        <footer className="max-w-3xl w-full mx-auto px-4 pb-6 pt-2 flex justify-center">
          {!confirmExitKiosk ? (
            <button
              type="button"
              data-testid="kiosk-exit-request-btn"
              onClick={() => setConfirmExitKiosk(true)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              Volver al Sistema Completo (Solo Personal Clínica)
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold">
              <span>¿Regresar a recepción?</span>
              <button
                type="button"
                data-testid="kiosk-exit-confirm-btn"
                onClick={onExitKioskMode}
                className="px-2.5 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-white"
              >
                Sí, salir
              </button>
              <button
                type="button"
                onClick={() => setConfirmExitKiosk(false)}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          )}
        </footer>
      )}
    </div>
  );
};
