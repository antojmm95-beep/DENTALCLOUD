import React, { useEffect, useRef, useState } from 'react';
import { useDental } from '../context/DentalContext';
import { Medication, MedicalPrescription, VademecumMedication } from '../types/dental';
import { EmptyPatientState } from './EmptyPatientState';
import { RecipeDispatchMode, RecipeDocumentModal } from './RecipeDocumentModal';
import { resolvePatientWhatsAppPhone } from '../utils/dentalCalc';
import {
  exportRecipePdf,
  formatRecipeDisplayDate,
  resolveRecipeMpps
} from '../utils/recipePdfExport';
import { 
  Pill, 
  Plus, 
  Trash2, 
  Printer, 
  MessageSquare, 
  CheckCircle2, 
  FileText,
  Download,
  Mail,
  PenTool,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  BookmarkPlus,
  X
} from 'lucide-react';

export const RecipesView: React.FC = () => {
  const { 
    selectedPatient, 
    selectedPatientId, 
    updatePatient,
    prescriptions, 
    addPrescription,
    vademecumItems,
    addVademecumMedication,
    deleteVademecumMedication,
    generateDirectWhatsAppUrl,
    doctors,
    activeDoctor,
    clinicConfig,
    showToast
  } = useDental();

  const patientPrescriptions = prescriptions.filter(p => p.patientId === selectedPatientId);
  const [selectedRxId, setSelectedRxId] = useState<string>(patientPrescriptions[0]?.id || '');
  const [prescribingDoctorId, setPrescribingDoctorId] = useState<string>(activeDoctor?.id || doctors[0]?.id || '');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalMode, setDocModalMode] = useState<RecipeDispatchMode>('whatsapp');
  const [doctorSignatureData, setDoctorSignatureData] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSigRef = useRef(false);

  // Add new medication to Vademecum inline panel state
  const [showNewMedForm, setShowNewMedForm] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedPresentation, setNewMedPresentation] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedDur, setNewMedDur] = useState('');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedError, setNewMedError] = useState<string | null>(null);

  const prescribingDoctor = doctors.find(d => d.id === prescribingDoctorId) || activeDoctor || doctors[0];

  // Active form items
  const [medicationsList, setMedicationsList] = useState<Medication[]>([
    {
      name: 'Ibuprofeno',
      presentation: 'Tabletas recubiertas 600 mg',
      dose: '1 tableta',
      frequency: 'Cada 8 horas',
      duration: 'Por 3 a 5 días',
      instructions: 'Tomar después de las comidas con abundante agua para analgesia y desinflamación.'
    }
  ]);

  const firstVad = vademecumItems[0];
  const [currentMedName, setCurrentMedName] = useState(firstVad?.name || 'Amoxicilina');
  const [currentPresentation, setCurrentPresentation] = useState(firstVad?.presentation || 'Cápsulas 500 mg');
  const [currentDose, setCurrentDose] = useState(firstVad?.defaultDose || '1 cápsula');
  const [currentFreq, setCurrentFreq] = useState(firstVad?.defaultFreq || 'Cada 8 horas');
  const [currentDur, setCurrentDur] = useState(firstVad?.defaultDur || 'Por 7 días');
  const [currentInst, setCurrentInst] = useState(firstVad?.instructions || '');
  const [generalIndications, setGeneralIndications] = useState('Mantener buena higiene oral con cepillo de cerdas suaves. En caso de dolor agudo persistente comunicarse al consultorio.');

  const activeRx = patientPrescriptions.find(p => p.id === selectedRxId) || patientPrescriptions[0];

  useEffect(() => {
    const firstId = prescriptions.find(p => p.patientId === selectedPatientId)?.id || '';
    setSelectedRxId(firstId);
  }, [selectedPatientId]);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0369a1';

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
      isDrawingSigRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingSigRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (isDrawingSigRef.current) {
        isDrawingSigRef.current = false;
        setDoctorSignatureData(canvas.toDataURL('image/png'));
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
  }, [selectedPatientId]);

  const handleClearDoctorSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDoctorSignatureData(null);
  };

  const applyMedicationToEditor = (item: VademecumMedication) => {
    setCurrentMedName(item.name);
    setCurrentPresentation(item.presentation);
    setCurrentDose(item.defaultDose);
    setCurrentFreq(item.defaultFreq);
    setCurrentDur(item.defaultDur);
    setCurrentInst(item.instructions);
  };

  const handleSelectFromVademecum = (vademecumItemName: string) => {
    const item = vademecumItems.find(v => v.name === vademecumItemName);
    if (item) {
      applyMedicationToEditor(item);
    }
  };

  const handleSaveNewMedication = (alsoAddToPrescription: boolean) => {
    if (!newMedName.trim() || !newMedPresentation.trim()) {
      setNewMedError('Indica al menos el nombre del medicamento y su presentación.');
      return;
    }
    setNewMedError(null);
    const saved = addVademecumMedication({
      name: newMedName,
      presentation: newMedPresentation,
      defaultDose: newMedDose || '1 dosis',
      defaultFreq: newMedFreq || 'Cada 8 horas',
      defaultDur: newMedDur || 'Por 5 días',
      instructions: newMedInstructions
    });
    applyMedicationToEditor(saved);

    if (alsoAddToPrescription) {
      setMedicationsList(prev => [
        ...prev,
        {
          name: saved.name,
          presentation: saved.presentation,
          dose: saved.defaultDose,
          frequency: saved.defaultFreq,
          duration: saved.defaultDur,
          instructions: saved.instructions
        }
      ]);
    }

    setNewMedName('');
    setNewMedPresentation('');
    setNewMedDose('');
    setNewMedFreq('');
    setNewMedDur('');
    setNewMedInstructions('');
    setShowNewMedForm(false);
  };

  const handleSaveCurrentEditorToVademecum = () => {
    if (!currentMedName.trim() || !currentPresentation.trim()) {
      showToast('Completa el nombre y la presentación del fármaco para guardarlo.');
      return;
    }
    addVademecumMedication({
      name: currentMedName,
      presentation: currentPresentation,
      defaultDose: currentDose,
      defaultFreq: currentFreq,
      defaultDur: currentDur,
      instructions: currentInst
    });
  };

  const handleClearCurrentMedFields = () => {
    setCurrentMedName('');
    setCurrentPresentation('');
    setCurrentDose('');
    setCurrentFreq('');
    setCurrentDur('');
    setCurrentInst('');
  };

  const handleAddMedicationToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMedName.trim() || !currentPresentation.trim()) return;
    setMedicationsList(prev => [
      ...prev,
      {
        name: currentMedName.trim(),
        presentation: currentPresentation.trim(),
        dose: currentDose.trim(),
        frequency: currentFreq.trim(),
        duration: currentDur.trim(),
        instructions: currentInst.trim()
      }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedicationsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePrescription = () => {
    if (!selectedPatient || medicationsList.length === 0 || !prescribingDoctor) return;

    const newRx = addPrescription({
      patientId: selectedPatientId,
      patientName: selectedPatient.name,
      patientCedula: selectedPatient.cedula,
      patientAge: selectedPatient.age,
      date: new Date().toISOString().split('T')[0],
      doctorName: prescribingDoctor.name,
      doctorSpecialty: prescribingDoctor.specialty,
      doctorColegiado: prescribingDoctor.colegiado,
      doctorMpps: prescribingDoctor.mpps,
      medications: medicationsList,
      generalIndications,
      signed: true,
      signatureDataUrl: doctorSignatureData || undefined
    });

    setSelectedRxId(newRx.id);
  };

  const getRxMpps = (rx: MedicalPrescription): string =>
    resolveRecipeMpps(rx, doctors, activeDoctor);

  const handleDownloadActivePdf = (rx: MedicalPrescription) => {
    if (!selectedPatient) return;
    const matchedDoc = doctors.find((d) =>
      d.name.toLowerCase().includes(rx.doctorName.replace(/^(Dr\.|Dra\.)\s*/i, '').trim().toLowerCase())
    );
    const filename = exportRecipePdf({
      rx,
      patient: selectedPatient,
      doctor: {
        name: rx.doctorName,
        specialty: rx.doctorSpecialty || matchedDoc?.specialty || 'Odontología General',
        colegiado: rx.doctorColegiado || matchedDoc?.colegiado || 'COV-21870',
        mpps: getRxMpps(rx),
        rif: matchedDoc?.rif,
        phone: matchedDoc?.phone,
        email: matchedDoc?.email
      },
      clinicConfig
    });
    showToast(`PDF oficial ${filename} descargado`);
  };

  const openDocumentModal = (mode: RecipeDispatchMode) => {
    setDocModalMode(mode);
    setDocModalOpen(true);
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Récipes Médicos" />;
  }

  const resolvedPatientWa = resolvePatientWhatsAppPhone(
    selectedPatient,
    undefined,
    clinicConfig.waCountryCode || '58'
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Récipes y Prescripciones Médicas Odontológicas
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Paciente: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong></span>
            <span aria-hidden="true">·</span>
            <span>C.I: {selectedPatient.cedula}</span>
            <span aria-hidden="true">·</span>
            <span>Edad: {selectedPatient.age} años</span>
            <span aria-hidden="true">·</span>
            <span>
              WhatsApp:{' '}
              <strong className={resolvedPatientWa.displayPhone ? 'text-emerald-700 dark:text-emerald-400 font-mono' : 'text-amber-600'}>
                {resolvedPatientWa.displayPhone || 'Sin teléfono'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Select active Prescription if multiple exist */}
      {patientPrescriptions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {patientPrescriptions.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedRxId(p.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                activeRx?.id === p.id
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {p.folio} · {p.date} ({p.medications.length} fármacos)
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Rx Builder Form (Left 5 cols) + Printable Official Prescription (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Vademecum & Drug Adder */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-sky-600" />
              <span>Vademécum Odontológico</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setNewMedError(null);
                setShowNewMedForm(prev => !prev);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                showNewMedForm
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
              }`}
            >
              {showNewMedForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showNewMedForm ? 'Cerrar' : 'Nuevo Medicamento'}</span>
            </button>
          </div>

          {showNewMedForm && (
            <div
              data-testid="new-vademecum-med-panel"
              className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2.5 text-xs"
            >
              <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-sky-600" />
                <span>Registrar Nuevo Medicamento en Vademécum</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Nombre del Medicamento *
                  </span>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="Ej: Azitromicina"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Presentación *
                  </span>
                  <input
                    type="text"
                    value={newMedPresentation}
                    onChange={(e) => setNewMedPresentation(e.target.value)}
                    placeholder="Ej: Tabletas 500 mg"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Dosis habitual
                  </span>
                  <input
                    type="text"
                    value={newMedDose}
                    onChange={(e) => setNewMedDose(e.target.value)}
                    placeholder="1 tableta"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Frecuencia
                  </span>
                  <input
                    type="text"
                    value={newMedFreq}
                    onChange={(e) => setNewMedFreq(e.target.value)}
                    placeholder="Cada 24 horas"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Duración
                  </span>
                  <input
                    type="text"
                    value={newMedDur}
                    onChange={(e) => setNewMedDur(e.target.value)}
                    placeholder="Por 3 días"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                  Indicaciones de toma
                </span>
                <input
                  type="text"
                  value={newMedInstructions}
                  onChange={(e) => setNewMedInstructions(e.target.value)}
                  placeholder="Ej: Tomar a la misma hora, preferiblemente alejado de antiácidos."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                />
              </label>

              {newMedError && (
                <p className="text-[11px] font-semibold text-rose-600">{newMedError}</p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveNewMedication(false)}
                  className="px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-50"
                >
                  Guardar en Vademécum
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewMedication(true)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
                >
                  Guardar y Añadir al Récipe
                </button>
              </div>
            </div>
          )}

          <div className="text-xs">
            <label htmlFor="rx-doctor-select" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Odontólogo Emisor (COV / MPPS):
            </label>
            <select
              id="rx-doctor-select"
              value={prescribingDoctor?.id || ''}
              onChange={(e) => setPrescribingDoctorId(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-medium"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.colegiado} · {d.mpps})
                </option>
              ))}
            </select>
          </div>

          {/* Quick vademecum items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400">
                Seleccionar medicamento rápido ({vademecumItems.length}):
              </span>
              <button
                type="button"
                onClick={handleClearCurrentMedFields}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
              >
                Limpiar campos
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vademecumItems.map((v) => (
                <div key={v.id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectFromVademecum(v.name)}
                    className={`px-2.5 py-1 text-[11px] font-medium transition ${
                      v.isCustom ? 'rounded-l-lg' : 'rounded-lg'
                    } ${
                      currentMedName === v.name
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {v.name}
                  </button>
                  {v.isCustom && (
                    <button
                      type="button"
                      onClick={() => deleteVademecumMedication(v.id)}
                      aria-label={`Eliminar ${v.name} del vademécum`}
                      title={`Eliminar ${v.name} del vademécum`}
                      className={`px-1.5 py-1 text-[11px] rounded-r-lg border-l transition ${
                        currentMedName === v.name
                          ? 'bg-sky-700 text-white border-sky-500 hover:bg-rose-600'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-rose-500 hover:text-white'
                      }`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddMedicationToList} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre del Fármaco:
                </label>
                <input
                  type="text"
                  required
                  value={currentMedName}
                  onChange={(e) => setCurrentMedName(e.target.value)}
                  placeholder="Escribe cualquier medicamento"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Presentación:
                </label>
                <input
                  type="text"
                  required
                  value={currentPresentation}
                  onChange={(e) => setCurrentPresentation(e.target.value)}
                  placeholder="Ej: Tabletas 500 mg"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Dosis:
                </label>
                <input
                  type="text"
                  value={currentDose}
                  onChange={(e) => setCurrentDose(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Frecuencia:
                </label>
                <input
                  type="text"
                  value={currentFreq}
                  onChange={(e) => setCurrentFreq(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Duración:
                </label>
                <input
                  type="text"
                  value={currentDur}
                  onChange={(e) => setCurrentDur(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Instrucciones específicas de toma:
              </label>
              <input
                type="text"
                value={currentInst}
                onChange={(e) => setCurrentInst(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-lg transition border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Medicamento a la Lista</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentEditorToVademecum}
                title="Guardar este fármaco en el vademécum para futuros récipes"
                className="py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-sky-600" />
                <span>Guardar en Vademécum</span>
              </button>
            </div>
          </form>

          {/* Current staged medications list */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Fármacos en esta receta ({medicationsList.length}):
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {medicationsList.map((m, i) => (
                <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {m.name} ({m.presentation})
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {m.dose} · {m.frequency} · {m.duration}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(i)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Indicaciones Generales de la Receta:
            </label>
            <textarea
              rows={2}
              value={generalIndications}
              onChange={(e) => setGeneralIndications(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none text-xs"
            />
          </div>

          {/* Doctor Signature Canvas for PDF Legal Validity */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-sky-600" />
                <span>Firma del Facultativo (se incrusta en PDF oficial):</span>
              </span>
              {doctorSignatureData && (
                <button
                  type="button"
                  onClick={handleClearDoctorSignature}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            <div className="relative rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
              {!doctorSignatureData && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 select-none">
                  Firme aquí con el mouse o pantalla táctil
                </div>
              )}
              <canvas
                ref={signatureCanvasRef}
                width={380}
                height={95}
                data-testid="rx-doctor-signature-canvas"
                aria-label="Firma manuscrita del odontólogo para el récipe en PDF"
                className="relative z-10 w-full h-24 touch-none cursor-crosshair block"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {doctorSignatureData
                ? 'Firma capturada lista para estampar en el PDF oficial.'
                : 'Opcional: trace la firma del doctor aquí o use la firma digital con credenciales COV/MPPS.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSavePrescription}
            disabled={medicationsList.length === 0}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Emitir y Firmar Récipe Médico</span>
          </button>
        </div>

        {/* Right Preview: Official Clean Medical Prescription (Printable & PDF Exportable) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 print-area shadow-xs text-xs space-y-6">
          {activeRx ? (
            <>
              {/* Prescription Header */}
              <div className="flex justify-between items-start border-b-2 border-sky-600 pb-4 gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {clinicConfig.clinicName} · RIF: {clinicConfig.rif || 'J-31298456-0'}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                    {activeRx.doctorName}
                  </h3>
                  <p className="text-xs text-sky-700 dark:text-sky-400 font-medium">
                    {activeRx.doctorSpecialty}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                    <span>Colegio de Odontólogos: <strong className="font-mono text-slate-700 dark:text-slate-200">{activeRx.doctorColegiado}</strong></span>
                    <span>·</span>
                    <span>Registro MPPS: <strong className="font-mono text-sky-700 dark:text-sky-300">{getRxMpps(activeRx)}</strong></span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activeRx.folio}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Fecha: <span className="font-mono">{formatRecipeDisplayDate(activeRx.date)}</span>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" /> Formato PDF Oficial
                  </div>
                </div>
              </div>

              {/* Patient Data Strip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[11px] block">Paciente:</span>
                    <strong className="text-slate-900 dark:text-white uppercase">{activeRx.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">C.I:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{activeRx.patientCedula}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Edad / Hist.:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {activeRx.patientAge} años · #{selectedPatient.historyNumber || selectedPatient.id}
                    </span>
                  </div>
                </div>
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div className="pt-1.5 border-t border-rose-200 dark:border-rose-900 flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Alerta Alergias: {selectedPatient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Rx Body (Rp.) */}
              <div className="space-y-4 py-2">
                <div className="font-bold text-sm text-sky-800 dark:text-sky-300 italic flex items-center gap-1.5">
                  <span>Rp. (Prescripción Médica)</span>
                </div>

                <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {activeRx.medications.map((m, idx) => (
                    <div key={idx} className="pt-3 first:pt-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">{m.presentation}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium mt-1">
                        Tomar: {m.dose} · {m.frequency} · {m.duration}
                      </div>
                      {m.instructions && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                          Nota: {m.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {activeRx.generalIndications && (
                  <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-950/40 rounded border border-sky-100 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-300">
                    <strong>Indicaciones del Especialista:</strong> {activeRx.generalIndications}
                  </div>
                )}
              </div>

              {/* Signature stamp */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 max-w-xs space-y-0.5">
                  <div>Válido únicamente con firma y sello del facultativo.</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{clinicConfig.clinicName}</div>
                  <div>{clinicConfig.address} · Telf: {clinicConfig.phone}</div>
                </div>

                <div className="text-center w-60 shrink-0">
                  <div className="h-14 flex items-center justify-center">
                    {activeRx.signatureDataUrl ? (
                      <img
                        src={activeRx.signatureDataUrl}
                        alt={`Firma de ${activeRx.doctorName}`}
                        className="max-h-14 object-contain"
                      />
                    ) : (
                      <span className="font-cinzel text-sky-600 dark:text-sky-400 font-bold italic text-base">
                        {activeRx.doctorName}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    Firma y Sello Profesional
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {activeRx.doctorColegiado} · {getRxMpps(activeRx)}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 no-print border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadActivePdf(activeRx)}
                  className="px-3 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => openDocumentModal('preview')}
                  className="px-2.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 rounded-lg border border-sky-200 dark:border-sky-800 transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Vista PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => openDocumentModal('email')}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Correo + PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => openDocumentModal('whatsapp')}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp + PDF</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 italic">
              No hay récipe emitido. Confeccione uno con el vademécum de la izquierda.
            </div>
          )}
        </div>

      </div>

      {activeRx && selectedPatient && (
        <RecipeDocumentModal
          isOpen={docModalOpen}
          initialMode={docModalMode}
          onClose={() => setDocModalOpen(false)}
          rx={activeRx}
          patient={selectedPatient}
          doctors={doctors}
          activeDoctor={activeDoctor}
          clinicConfig={clinicConfig}
          generateDirectWhatsAppUrl={generateDirectWhatsAppUrl}
          onUpdatePatientPhone={(newPhone) =>
            updatePatient({
              ...selectedPatient,
              phone: newPhone,
              phones: {
                ...selectedPatient.phones,
                mobile: newPhone
              }
            })
          }
          showToast={showToast}
        />
      )}
    </div>
  );
};
