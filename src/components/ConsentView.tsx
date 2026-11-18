import React, { useEffect, useRef, useState } from 'react';
import { useDental } from '../context/DentalContext';
import { ConsentProcedureType, InformedConsent } from '../types/dental';
import {
  ConsentFormState,
  IMPLANT_GENERAL_CLAUSES,
  IMPLANT_PHASES_GUIDE,
  SURGICAL_CONSENT_TEMPLATES,
  createInitialConsentFormState,
  formatConsentLongSpanishDate
} from '../utils/consentDocument';
import { exportConsentPdf } from '../utils/consentPdfExport';
import { resolveDoctorCredentials } from '../utils/budgetDocument';
import { EmptyPatientState } from './EmptyPatientState';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck,
  PenTool,
  Printer,
  RotateCcw,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

const CONSENT_BUTTONS: Array<{ id: ConsentProcedureType; label: string; group: 'cirugia' | 'general' }> = [
  { id: 'exodoncia', label: 'Cirugía Oral / Exodoncia', group: 'cirugia' },
  { id: 'terceros_molares', label: 'Terceros Molares (Cordales)', group: 'cirugia' },
  { id: 'implantes', label: 'Implantes Dentales', group: 'cirugia' },
  { id: 'endodoncia', label: 'Endodoncia', group: 'general' },
  { id: 'operatoria', label: 'Operatoria & Resinas', group: 'general' },
  { id: 'blanqueamiento', label: 'Blanqueamiento', group: 'general' }
];

export const ConsentView: React.FC = () => {
  const {
    selectedPatient,
    selectedPatientId,
    consents,
    saveConsent,
    doctors,
    activeDoctor,
    clinicConfig,
    showToast
  } = useDental();

  const [procedureType, setProcedureType] = useState<ConsentProcedureType>('exodoncia');
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>(
    activeDoctor?.name || doctors[0]?.name || 'Dr. Antonio Morera'
  );
  const [formState, setFormState] = useState<ConsentFormState>(() =>
    createInitialConsentFormState('exodoncia', activeDoctor?.name || 'Dr. Antonio Morera')
  );
  const [patientSigned, setPatientSigned] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const patientConsents = consents.filter((c) => c.patientId === selectedPatientId);
  const currentTemplate = SURGICAL_CONSENT_TEMPLATES[procedureType] || SURGICAL_CONSENT_TEMPLATES.exodoncia;
  const resolvedDoctor = resolveDoctorCredentials(selectedDoctorName, doctors);
  const matchedDoctorObj = doctors.find((d) => d.name === resolvedDoctor.name) || activeDoctor || doctors[0];
  const generatedLongDate = formatConsentLongSpanishDate();

  useEffect(() => {
    setFormState(createInitialConsentFormState(procedureType, resolvedDoctor.name));
  }, [procedureType, selectedPatientId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setSignatureData(canvas.toDataURL());
      }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', stopDrawing);
    };
  }, [procedureType, selectedPatientId]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureData(null);
    setPatientSigned(false);
  };

  const handleSaveConsentForm = () => {
    if (!selectedPatient) return;
    if (!signatureData) {
      showToast('Por favor trace la firma del paciente en el recuadro lateral.');
      return;
    }

    saveConsent({
      patientId: selectedPatientId,
      patientName: selectedPatient.name,
      patientCedula: selectedPatient.cedula,
      patientAge: selectedPatient.age,
      procedureType,
      procedureTitle: currentTemplate.title,
      content: currentTemplate.text,
      risks: currentTemplate.risks,
      doctorName: resolvedDoctor.name,
      doctorColegiado: resolvedDoctor.colegiado,
      doctorMpps: resolvedDoctor.mpps,
      signedDate: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
      patientSignature: signatureData,
      isSigned: true,
      diagnosis: formState.diagnosis,
      proposedTreatment: formState.proposedTreatment,
      alternativeTreatments: formState.alternativeTreatments,
      expectedBenefits: formState.expectedBenefits,
      consentDecision: formState.consentDecision,
      representativeName: formState.representativeName,
      witnessName: formState.witnessName,
      anesthesiaModality: formState.anesthesiaModality,
      imagingStudies: formState.imagingStudies,
      prosthodontistName: formState.prosthodontistName,
      implantIdentification: formState.implantIdentification
    });

    setPatientSigned(true);
  };

  const handleDownloadCurrentPdf = () => {
    if (!selectedPatient) return;
    const filename = exportConsentPdf({
      procedureType,
      patient: selectedPatient,
      doctor: {
        name: resolvedDoctor.name,
        colegiado: resolvedDoctor.colegiado,
        mpps: resolvedDoctor.mpps,
        phone: matchedDoctorObj?.phone || clinicConfig.phone,
        email: matchedDoctorObj?.email || clinicConfig.email
      },
      formState,
      clinicConfig,
      signatureDataUrl: signatureData,
      generatedDateText: generatedLongDate
    });
    showToast(`PDF generado: ${filename}`);
  };

  const handleDownloadSavedPdf = (saved: InformedConsent) => {
    if (!selectedPatient) return;
    const savedDocCreds = resolveDoctorCredentials(saved.doctorName, doctors, {
      colegiado: saved.doctorColegiado,
      mpps: saved.doctorMpps
    });
    const savedDocObj = doctors.find((d) => d.name === savedDocCreds.name) || matchedDoctorObj;
    const savedForm: ConsentFormState = {
      ...createInitialConsentFormState(saved.procedureType, savedDocCreds.name),
      diagnosis: saved.diagnosis || '',
      proposedTreatment: saved.proposedTreatment || '',
      alternativeTreatments: saved.alternativeTreatments || '',
      expectedBenefits: saved.expectedBenefits || '',
      consentDecision: saved.consentDecision || 'consiento',
      representativeName: saved.representativeName || '',
      witnessName: saved.witnessName || '',
      anesthesiaModality: saved.anesthesiaModality || 'local',
      imagingStudies: saved.imagingStudies || { panoramica: true, periapical: false, cbctTac: false },
      prosthodontistName: saved.prosthodontistName || savedDocCreds.name,
      implantIdentification: saved.implantIdentification || ''
    };
    const filename = exportConsentPdf({
      folio: saved.folio,
      procedureType: saved.procedureType,
      patient: selectedPatient,
      doctor: {
        name: savedDocCreds.name,
        colegiado: savedDocCreds.colegiado,
        mpps: savedDocCreds.mpps,
        phone: savedDocObj?.phone || clinicConfig.phone,
        email: savedDocObj?.email || clinicConfig.email
      },
      formState: savedForm,
      clinicConfig,
      signatureDataUrl: saved.patientSignature,
      generatedDateText: saved.signedDate
    });
    showToast(`PDF descargado: ${filename}`);
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Consentimientos Informados" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-600" />
            <span>Consentimientos Informados · Cirugía, Implantes & Especialidades</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>
              Paciente: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>C.I.: {selectedPatient.cedula}</span>
            <span aria-hidden="true">·</span>
            <span>Edad: {selectedPatient.age} años</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">
              {resolvedDoctor.name} ({resolvedDoctor.colegiado} · {resolvedDoctor.mpps})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCurrentPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Format Switcher + Doctor Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide mr-1">
              Cirugía e Implantes:
            </span>
            {CONSENT_BUTTONS.filter((b) => b.group === 'cirugia').map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setProcedureType(t.id);
                  clearSignature();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  procedureType === t.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Stethoscope className="w-4 h-4 text-sky-600" />
            <label className="font-semibold text-slate-600 dark:text-slate-300">Profesional:</label>
            <select
              value={resolvedDoctor.name}
              onChange={(e) => setSelectedDoctorName(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.colegiado} · {d.mpps})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Otras Especialidades:
          </span>
          {CONSENT_BUTTONS.filter((b) => b.group === 'general').map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setProcedureType(t.id);
                clearSignature();
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                procedureType === t.id
                  ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Legal Document + Signature Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Printable Official Document */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 print-area shadow-xs text-xs space-y-5">
          {/* Official Corona Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 120 110" className="w-14 h-14 shrink-0" aria-label="Logo Clínica Odontológica Corona">
                <path
                  d="M36 18 C22 18, 16 32, 20 50 C24 68, 30 96, 39 98 C46 99, 48 76, 60 76 C72 76, 74 99, 81 98 C90 96, 96 68, 100 50 C104 32, 98 18, 84 18 C73 18, 66 26, 60 26 C54 26, 47 18, 36 18 Z"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M38 56 Q60 74 84 50"
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <div className="text-base font-black tracking-wide text-slate-600 dark:text-slate-200 leading-none">
                  CORONA
                </div>
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                  CLÍNICA ODONTOLÓGICA
                </div>
                <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 mt-1">
                  {currentTemplate.specialtyBadge}
                </div>
              </div>
            </div>

            <div className="text-right">
              <ShieldCheck className="w-7 h-7 text-sky-600 ml-auto opacity-85" />
              <div className="text-[11px] font-mono text-slate-500 mt-1">{generatedLongDate}</div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight uppercase">
              {currentTemplate.title}
            </h3>
            {currentTemplate.subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{currentTemplate.subtitle}</p>
            )}
          </div>

          {/* Patient Medical Alerts if present */}
          {(selectedPatient.allergies.length > 0 || selectedPatient.systemicConditions.length > 0) && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-snug">
                <strong>Alerta Médica de Historia Clínica:</strong>{' '}
                Alergias: <span className="font-semibold">{selectedPatient.allergies.join(', ') || 'Niega'}</span> ·{' '}
                Condiciones sistémicas:{' '}
                <span className="font-semibold">{selectedPatient.systemicConditions.join(', ') || 'Niega'}</span>
              </div>
            </div>
          )}

          {/* TEMPLATE 1: TERCEROS MOLARES (CORDALES) - 11 Secciones */}
          {procedureType === 'terceros_molares' && (
            <div className="space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed">
              {/* 1) Identificación */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">1) Identificación del paciente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium">
                  <div>Nombre: <strong className="uppercase">{selectedPatient.name}</strong></div>
                  <div>C.I.: <strong className="font-mono">{selectedPatient.cedula}</strong></div>
                  <div>Edad: <strong>{selectedPatient.age} años</strong></div>
                </div>
                <div className="pt-1 no-print">
                  <label className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Representante legal / familiar (si aplica):</span>
                    <input
                      type="text"
                      value={formState.representativeName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, representativeName: e.target.value }))}
                      placeholder="Nombre completo del representante (opcional)"
                      className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </label>
                </div>
              </div>

              {/* 2) Diagnóstico */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">2) Diagnóstico e indicación</h4>
                <textarea
                  rows={2}
                  value={formState.diagnosis}
                  onChange={(e) => setFormState((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs outline-none focus:border-sky-500"
                />
              </div>

              {/* 3) Procedimiento propuesto */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">3) Procedimiento propuesto</h4>
                <p className="text-slate-600 dark:text-slate-300">
                  He sido informado(a) que el tratamiento consiste en la extracción quirúrgica del/los terceros molares, lo cual puede incluir:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-700 dark:text-slate-300">
                  <li>Aplicación de anestesia local (y/o sedación si se acuerda).</li>
                  <li>Incisión y levantamiento de colgajo, osteotomía (remoción de hueso) y/o odontosección (sección del diente).</li>
                  <li>Lavado, regularización del lecho quirúrgico y sutura.</li>
                  <li>Indicaciones postoperatorias, control y retiro de puntos si corresponde.</li>
                </ul>
              </div>

              {/* 4) Anestesia / sedación */}
              <div className="space-y-2 p-3.5 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20">
                <h4 className="font-bold text-slate-900 dark:text-white">4) Anestesia / sedación</h4>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Modalidad prevista:</div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="anesthesiaModality"
                      checked={formState.anesthesiaModality === 'local'}
                      onChange={() => setFormState((prev) => ({ ...prev, anesthesiaModality: 'local' }))}
                      className="text-sky-600"
                    />
                    <span>Anestesia local</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="anesthesiaModality"
                      checked={formState.anesthesiaModality === 'local_sedacion'}
                      onChange={() => setFormState((prev) => ({ ...prev, anesthesiaModality: 'local_sedacion' }))}
                      className="text-sky-600"
                    />
                    <span>Anestesia local + sedación (oral / inhalatoria / endovenosa)</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  He sido informado(a) de los riesgos propios de la anestesia/sedación y de la necesidad de informar antecedentes, alergias y medicación habitual.
                </p>
              </div>

              {/* 5) Beneficios esperados */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">5) Beneficios esperados</h4>
                <textarea
                  rows={2}
                  value={formState.expectedBenefits}
                  onChange={(e) => setFormState((prev) => ({ ...prev, expectedBenefits: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs outline-none focus:border-sky-500"
                />
              </div>

              {/* 6) Riesgos y complicaciones */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>6) Riesgos, efectos secundarios y posibles complicaciones</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-1">
                    <div className="font-bold text-[11px] text-amber-900 dark:text-amber-300">Frecuentes o esperables:</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                      {currentTemplate.frequentRisks?.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-1">
                    <div className="font-bold text-[11px] text-rose-900 dark:text-rose-300">Complicaciones posibles:</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900 dark:text-rose-200">
                      {currentTemplate.possibleComplications?.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 7) Estudios y planificación */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">7) Estudios y planificación</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">Se me ha explicado que el profesional puede requerir:</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={formState.imagingStudies.panoramica}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          imagingStudies: { ...prev.imagingStudies, panoramica: e.target.checked }
                        }))
                      }
                      className="rounded text-sky-600"
                    />
                    <span>Radiografía panorámica</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={formState.imagingStudies.periapical}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          imagingStudies: { ...prev.imagingStudies, periapical: e.target.checked }
                        }))
                      }
                      className="rounded text-sky-600"
                    />
                    <span>Periapical</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={formState.imagingStudies.cbctTac}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          imagingStudies: { ...prev.imagingStudies, cbctTac: e.target.checked }
                        }))
                      }
                      className="rounded text-sky-600"
                    />
                    <span>CBCT / TAC</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Los hallazgos intraoperatorios pueden modificar la técnica quirúrgica para asegurar resultados y control de riesgos.
                </p>
              </div>

              {/* 8) Alternativas */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">8) Alternativas al tratamiento</h4>
                <textarea
                  rows={2}
                  value={formState.alternativeTreatments}
                  onChange={(e) => setFormState((prev) => ({ ...prev, alternativeTreatments: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs outline-none focus:border-sky-500"
                />
              </div>

              {/* 9) Medicación, indicaciones y controles */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">9) Medicación, indicaciones y controles</h4>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <li>Pueden indicarse analgésicos, antiinflamatorios, antibióticos y/o enjuagues; debo cumplir medidas de higiene, dieta blanda, reposo relativo, frío local y controles.</li>
                  <li><strong>No fumar y no consumir alcohol</strong> en el postoperatorio inmediato (reduce la cicatrización).</li>
                  <li>Informar de inmediato: fiebre, sangrado persistente, dolor incontrolable, mal olor intenso, dificultad respiratoria, empeoramiento progresivo o alteración sensitiva marcada.</li>
                </ul>
              </div>

              {/* 10) Declaración del paciente */}
              <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300">10) Declaración del paciente</h4>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-emerald-900 dark:text-emerald-200">
                  <li>He leído o se me ha explicado este documento en lenguaje comprensible y mis preguntas fueron respondidas.</li>
                  <li>Entiendo beneficios, riesgos, alternativas y posibles complicaciones; otorgo mi consentimiento libre y voluntario para la odontectomía indicada.</li>
                  <li>Entiendo que la odontología no garantiza resultados absolutos y pueden surgir situaciones imprevistas.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TEMPLATE 2: IMPLANTES DENTALES (Fases I, II y III + Etiquetas) */}
          {procedureType === 'implantes' && (
            <div className="space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                Yo, <strong className="uppercase">{selectedPatient.name}</strong>, titular de la Cédula de Identidad{' '}
                <strong className="font-mono">{selectedPatient.cedula}</strong>, declaro que me han informado y doy mi consentimiento para el tratamiento implantológico descrito a continuación:
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Diagnóstico e indicación implantológica:</label>
                <input
                  type="text"
                  value={formState.diagnosis}
                  onChange={(e) => setFormState((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2 text-[11.5px] text-slate-700 dark:text-slate-300">
                <p>
                  <strong>1.</strong> Los <strong>IMPLANTES DENTALES</strong> son aditamentos metálicos que rehabilitan dientes sustituyendo la raíz de una pieza ausente, sobre los cuales se adapta un muñón y una corona que dará resultado funcional y estético; pueden colocarse de manera unitaria o múltiple según diversos planes de tratamiento. En la actualidad representan la mejor opción terapéutica sin necesidad de tallar dientes vecinos sanos.
                </p>
                <p>
                  <strong>2.</strong> Son fabricados con combinaciones de metales biocompatibles, principalmente <strong>Titanio</strong>, aceptados por el tejido óseo; sin embargo, si no se cuidan e higienizan al igual que los dientes naturales, pueden perderse.
                </p>
                <p className="font-bold text-slate-900 dark:text-white">
                  3. Luego de la evaluación, diagnóstico y plan de tratamiento, el proceso comprende tres fases principales:
                </p>
              </div>

              <div className="space-y-2.5">
                {IMPLANT_PHASES_GUIDE.map((item) => (
                  <div
                    key={item.phase}
                    className="p-3 rounded-lg bg-sky-50/60 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-900 space-y-1"
                  >
                    <div className="font-bold text-sky-800 dark:text-sky-300 text-xs">{item.phase}</div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Especialista encargado de la Fase Protésica (Dr.):
                  </span>
                  <input
                    type="text"
                    value={formState.prosthodontistName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, prosthodontistName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                </label>
                <label className="text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Etiquetas / Marca / Lote / Pieza de Implantes:
                  </span>
                  <input
                    type="text"
                    value={formState.implantIdentification}
                    onChange={(e) => setFormState((prev) => ({ ...prev, implantIdentification: e.target.value }))}
                    placeholder="Ej. Pz 36 · Implante 4.0x10mm Lote..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </label>
              </div>

              <div className="space-y-1.5 text-[11.5px] text-slate-700 dark:text-slate-300">
                {IMPLANT_GENERAL_CLAUSES.map((clause, idx) => (
                  <p key={idx}>{clause}</p>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                En caso de dudas o molestias puede comunicarse al{' '}
                <span className="font-mono">{matchedDoctorObj?.phone || clinicConfig.phone}</span> y{' '}
                <span className="font-mono uppercase">{matchedDoctorObj?.email || clinicConfig.email}</span>.
              </div>
            </div>
          )}

          {/* TEMPLATE 3: EXODONCIA GENERAL & OTRAS ESPECIALIDADES (Fiel a exodoncia_d8847776.pdf) */}
          {procedureType !== 'terceros_molares' && procedureType !== 'implantes' && (
            <div className="space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <p>
                  <strong>YO, <span className="uppercase">{selectedPatient.name}</span></strong>, PORTADOR(A) DE LA{' '}
                  <strong>C.I. NRO. <span className="font-mono">{selectedPatient.cedula}</span></strong>
                  {formState.representativeName.trim() ? (
                    <span>, como representante legal o familiar de <strong>{formState.representativeName.trim()}</strong></span>
                  ) : null}
                  , declaro lo siguiente:
                </p>
                <p className="text-slate-600 dark:text-slate-300">{currentTemplate.text}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Representante legal o familiar (si aplica):
                  </span>
                  <input
                    type="text"
                    value={formState.representativeName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, representativeName: e.target.value }))}
                    placeholder="Dejar en blanco si firma el propio paciente titular"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Diagnóstico(s):</span>
                  <input
                    type="text"
                    value={formState.diagnosis}
                    onChange={(e) => setFormState((prev) => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Tratamiento(s) por realizar:</span>
                  <input
                    type="text"
                    value={formState.proposedTreatment}
                    onChange={(e) => setFormState((prev) => ({ ...prev, proposedTreatment: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Tratamientos Alternativos (en caso que aplique):
                  </span>
                  <input
                    type="text"
                    value={formState.alternativeTreatments}
                    onChange={(e) => setFormState((prev) => ({ ...prev, alternativeTreatments: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Beneficios esperados con el tratamiento por realizar:
                  </span>
                  <textarea
                    rows={2}
                    value={formState.expectedBenefits}
                    onChange={(e) => setFormState((prev) => ({ ...prev, expectedBenefits: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Riesgos, Molestias y Posibles Complicaciones</span>
                </h4>
                <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-1">
                  {currentTemplate.risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2 text-amber-900 dark:text-amber-300 text-[11px]">
                      <span className="font-bold">•</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Clause */}
              <div className="p-3.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 space-y-2.5">
                <p className="text-[11.5px]">
                  Me siento libre, sin coacción ni manipulación, para decidir de acuerdo con mis valores e intereses y me declaro competente para tomar las decisiones que correspondan. En tal sentido:
                </p>
                <div className="flex flex-wrap gap-4 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer text-emerald-700 dark:text-emerald-300">
                    <input
                      type="radio"
                      name="consentDecision"
                      checked={formState.consentDecision === 'consiento'}
                      onChange={() => setFormState((prev) => ({ ...prev, consentDecision: 'consiento' }))}
                      className="text-emerald-600"
                    />
                    <span>DOY MI CONSENTIMIENTO AL FACULTATIVO</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-rose-700 dark:text-rose-300">
                    <input
                      type="radio"
                      name="consentDecision"
                      checked={formState.consentDecision === 'no_consiento'}
                      onChange={() => setFormState((prev) => ({ ...prev, consentDecision: 'no_consiento' }))}
                      className="text-rose-600"
                    />
                    <span>NO CONSIENTO</span>
                  </label>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  Con el buen entendido de que puedo retirar este consentimiento por escrito cuando así lo desee, sin represalia ni penalidad alguna.
                </p>
              </div>
            </div>
          )}

          {/* Optional Witness Name + Signature Zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="no-print">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span>Nombre del Testigo (opcional):</span>
                <input
                  type="text"
                  value={formState.witnessName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, witnessName: e.target.value }))}
                  placeholder="Nombre completo del testigo si aplica"
                  className="flex-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              {/* Doctor Signature */}
              <div className="text-center p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="h-16 flex items-center justify-center italic text-sky-700 dark:text-sky-400 text-sm font-bold">
                  {resolvedDoctor.name}
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  {resolvedDoctor.name}
                </div>
                <div className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-semibold">
                  {resolvedDoctor.colegiado} · {resolvedDoctor.mpps}
                </div>
              </div>

              {/* Patient Signature Display */}
              <div className="text-center p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="h-16 flex items-center justify-center">
                  {signatureData ? (
                    <img src={signatureData} alt="Firma del paciente" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">
                      Pendiente de firma en el panel lateral →
                    </span>
                  )}
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 uppercase">
                  {selectedPatient.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  Firma del Paciente o Representante Legal (C.I.: {selectedPatient.cedula})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Signature Pad + Saved Consents */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-sky-600" />
                <span>Panel de Firma Digital</span>
              </h3>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-slate-400 hover:text-red-500 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Indique al paciente que trace su firma en el recuadro usando el dedo, lápiz óptico o mouse:
            </p>

            <div className="border-2 border-sky-200 dark:border-sky-900 rounded-xl bg-white overflow-hidden shadow-inner flex justify-center">
              <canvas
                ref={canvasRef}
                width={320}
                height={160}
                className="cursor-crosshair touch-none w-full max-w-[320px] bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Trazo sensible al tacto</span>
              <span className="font-mono">Respaldo MPPS / COV</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveConsentForm}
                disabled={!signatureData}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aceptar y Guardar en Historia</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCurrentPdf}
                className="w-full py-2 px-4 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Consentimiento PDF</span>
              </button>
            </div>

            {patientSigned && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>¡Consentimiento firmado y guardado satisfactoriamente!</span>
              </div>
            )}
          </div>

          {/* Saved Consents List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Documentos Guardados ({patientConsents.length})
            </h4>

            {patientConsents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay consentimientos previos archivados.</p>
            ) : (
              <div className="space-y-2">
                {patientConsents.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {c.procedureTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.folio} · {c.signedDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                        FIRMADO
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadSavedPdf(c)}
                        title="Descargar PDF de este consentimiento"
                        className="p-1.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 hover:bg-sky-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
