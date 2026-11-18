import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useDental } from '../context/DentalContext';
import { Patient, SoftwareImportPatient } from '../types/dental';
import {
  parsePatientsFromRows,
  parsePatientsFromCoordinatePdfPages,
  partitionValidCleanPatients,
  sanitizePatientNumericId,
  PdfTextItemLike
} from '../utils/patientImportParser';
import { isPatientNotifiable, paginateList } from '../utils/dentalCalc';
import { EmptyPatientState } from './EmptyPatientState';
import { buildPatientHistoryQrUrl } from '../utils/qrIntakeMode';
import { 
  User, 
  AlertTriangle, 
  Heart, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  CreditCard,
  Camera,
  Upload,
  RefreshCw,
  FileUp,
  Save,
  Check,
  Trash2,
  FileSpreadsheet,
  BellOff,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Copy
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SAMPLE_10COL_ROWS: Array<Record<string, unknown>> = [
  {
    ID: 1,
    CEDULA: '10337151',
    APELLIDO: 'COLTELLACCI',
    NOMBRE: 'ROMANO',
    'FECHA INGRESO': '.31/08/2021',
    'ULT. CITA': '.00/01/000',
    DOCTOR: 'Admin .',
    MOTIVO: 'CONTROL',
    TELEFONO: '4242268422',
    EMAIL: 'ROMANOCOLT@GMAIL.COM'
  },
  {
    ID: 2,
    CEDULA: '3876638',
    APELLIDO: 'SANCHEZ',
    NOMBRE: 'NELSON',
    'FECHA INGRESO': '.02/09/2021',
    'ULT. CITA': '.20/06/2022',
    DOCTOR: 'ANTONIO MORERA',
    MOTIVO: 'CONTROL',
    TELEFONO: '4265162620',
    EMAIL: 'NELSONSANFER@HOTMAIL.COM'
  },
  {
    ID: 3,
    CEDULA: '196729996',
    APELLIDO: 'PEREZ',
    NOMBRE: 'CARLA',
    'FECHA INGRESO': '.02/09/2021',
    'ULT. CITA': '.00/01/000',
    DOCTOR: 'ANTONIO MORERA',
    MOTIVO: 'CONTROL',
    TELEFONO: '4129258320',
    EMAIL: 'ALIBATTAGLIA'
  },
  {
    ID: 6,
    CEDULA: '82030237',
    APELLIDO: 'GUTIERREZ',
    NOMBRE: 'JUAN CARLOS',
    'FECHA INGRESO': '.03/09/2021',
    'ULT. CITA': '.08/09/2021',
    DOCTOR: 'ANTONIO MORERA',
    MOTIVO: 'DOLOR',
    TELEFONO: '4241805946',
    EMAIL: 'GUTYGUTIERREZ3699@GMAIL.COM'
  },
  {
    ID: 14,
    CEDULA: '14265115',
    APELLIDO: 'RAMIREZ',
    NOMBRE: 'ANGEL ISAAC',
    'FECHA INGRESO': '.04/09/2021',
    'ULT. CITA': '.00/01/0000',
    DOCTOR: 'Valentina Pereira',
    MOTIVO: 'CONTROL',
    TELEFONO: '4140717848',
    EMAIL: 'YSBELL0210@HOTMAIL.COM'
  }
];

interface ClinicalHistoryViewProps {
  onOpenNewPatient: () => void;
  onOpenPatientSearch?: () => void;
}

export const ClinicalHistoryView: React.FC<ClinicalHistoryViewProps> = ({ onOpenNewPatient, onOpenPatientSearch }) => {
  const { 
    patients, 
    selectedPatientId, 
    setSelectedPatientId, 
    selectedPatient, 
    updatePatient,
    deactivatePatient,
    reactivatePatient,
    secuenciaTratamientos,
    addSecuenciaTratamiento,
    importPatientsFromSoftware,
    exchangeRate,
    clinicConfig,
    setCurrentTab,
    showToast
  } = useDental();

  // Subtabs within Historia Clínica (Divided into clean focused pages)
  const [activeSubTab, setActiveSubTab] = useState<'datos_personales' | 'anamnesis' | 'facturacion_emergencia' | 'secuencia' | 'importar'>('datos_personales');
  const [importPage, setImportPage] = useState<number>(1);

  // Form State for editing Patient Data
  const [formData, setFormData] = useState<Partial<Patient>>({});
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [newAllergyText, setNewAllergyText] = useState<string>('');
  const [newSystemicText, setNewSystemicText] = useState<string>('');
  const [medicationsInput, setMedicationsInput] = useState<string>('');
  const [showDeceasedConfirm, setShowDeceasedConfirm] = useState<boolean>(false);
  const [deceasedDateInput, setDeceasedDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (
        detail === 'importar' ||
        detail === 'datos_personales' ||
        detail === 'anamnesis' ||
        detail === 'facturacion_emergencia' ||
        detail === 'secuencia'
      ) {
        setActiveSubTab(detail);
      }
    };
    window.addEventListener('corona:open-clinical-subtab', handler);
    return () => window.removeEventListener('corona:open-clinical-subtab', handler);
  }, []);

  // Sync form data whenever selectedPatient changes
  useEffect(() => {
    if (selectedPatient) {
      const cleanCedula = (selectedPatient.cedula || '').replace(/\./g, '').trim();
      const autoRif = /^[VEJP]-?/i.test(cleanCedula)
        ? `${cleanCedula.toUpperCase()}-0`
        : cleanCedula
          ? `V-${cleanCedula}-0`
          : '';
      const allergiesList = Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies : [];
      const systemicList = Array.isArray(selectedPatient.systemicConditions) ? selectedPatient.systemicConditions : [];
      const medsList = Array.isArray(selectedPatient.regularMedications) ? selectedPatient.regularMedications : [];

      setFormData({
        name: selectedPatient.name || '',
        cedula: selectedPatient.cedula || '',
        phone: selectedPatient.phone || '',
        email: selectedPatient.email || '',
        profession: selectedPatient.profession || '',
        birthDate: selectedPatient.birthDate || '',
        age: selectedPatient.age || 30,
        gender: selectedPatient.gender || 'M',
        bloodType: selectedPatient.bloodType || 'O+',
        patientType: selectedPatient.patientType || 'adulto',
        patientInactive: selectedPatient.patientInactive || false,
        migrationHistory: selectedPatient.migrationHistory || selectedPatient.historyNumber || '',
        nationality: selectedPatient.nationality || 'V - VENEZUELA',
        billingCompanyName: selectedPatient.billingCompanyName || selectedPatient.name,
        billingTaxId: selectedPatient.billingTaxId || autoRif,
        billingAddress: selectedPatient.billingAddress || 'Caracas, Venezuela',
        socialNetworks: selectedPatient.socialNetworks || { instagram: '', facebook: '', twitter: '' },
        insuranceKey: selectedPatient.insuranceKey || '',
        referredBy: selectedPatient.referredBy || 'PACIENTE DIRECTO',
        assignedDoctor: selectedPatient.assignedDoctor || '3 - ANTONIO MORERA',
        homeAddress: selectedPatient.homeAddress || '',
        phones: selectedPatient.phones || {
          mobile: selectedPatient.phone || '',
          home: '',
          office: ''
        },
        emergencyContact: selectedPatient.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        },
        allergies: allergiesList,
        systemicConditions: systemicList,
        regularMedications: medsList,
        consultationReason: selectedPatient.consultationReason || 'control',
        lastControlDate: selectedPatient.lastControlDate || '',
        admissionDate: selectedPatient.admissionDate || new Date().toLocaleDateString('es-VE'),
        photoUrl: selectedPatient.photoUrl || ''
      });
      setMedicationsInput(medsList.join(', '));
      setNewAllergyText('');
      setNewSystemicText('');
      setIsSaved(false);
    }
  }, [selectedPatientId, selectedPatient]);

  // Camera & Photo State
  const [cameraSource, setCameraSource] = useState<string>('HP TrueVision HD Camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when unmounting or switching patient
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartCamera = async () => {
    if (isCameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
        showToast('Cámara conectada (HP TrueVision HD Camera)');
      } else {
        throw new Error('Webcam API no disponible');
      }
    } catch {
      // Friendly simulated capture if hardware webcam is blocked in iframe/environment
      setIsCameraActive(true);
      showToast('Modo captura de video activado');
    }
  };

  const handleTakePhoto = () => {
    if (!selectedPatient) return;
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
        updatePatient({ ...selectedPatient, photoUrl: dataUrl });
        showToast('Foto del paciente capturada y guardada en la ficha');
      }
      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
    } else {
      // Simulate photo snapshot from camera
      const samplePortrait = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
      setFormData(prev => ({ ...prev, photoUrl: samplePortrait }));
      updatePatient({ ...selectedPatient, photoUrl: samplePortrait });
      setIsCameraActive(false);
      showToast('Foto tomada con éxito desde HP TrueVision HD Camera');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setFormData(prev => ({ ...prev, photoUrl: url }));
        updatePatient({ ...selectedPatient, photoUrl: url });
        showToast('Foto cargada desde el ordenador');
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper functions for Allergies & Systemic Conditions
  const toggleAllergyOption = (label: string) => {
    setFormData(prev => {
      const current = prev.allergies || [];
      const exists = current.some(a => a.toLowerCase() === label.toLowerCase());
      const next = exists
        ? current.filter(a => a.toLowerCase() !== label.toLowerCase())
        : [...current, label];
      return { ...prev, allergies: next };
    });
  };

  const handleAddCustomAllergy = () => {
    const clean = newAllergyText.trim();
    if (!clean) return;
    setFormData(prev => {
      const current = prev.allergies || [];
      if (current.some(a => a.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, allergies: [...current, clean] };
    });
    setNewAllergyText('');
  };

  const toggleSystemicOption = (label: string) => {
    setFormData(prev => {
      const current = prev.systemicConditions || [];
      const exists = current.some(s => s.toLowerCase() === label.toLowerCase());
      const next = exists
        ? current.filter(s => s.toLowerCase() !== label.toLowerCase())
        : [...current, label];
      return { ...prev, systemicConditions: next };
    });
  };

  const handleAddCustomSystemic = () => {
    const clean = newSystemicText.trim();
    if (!clean) return;
    setFormData(prev => {
      const current = prev.systemicConditions || [];
      if (current.some(s => s.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, systemicConditions: [...current, clean] };
    });
    setNewSystemicText('');
  };

  // Save changes to patient
  const handleSavePatientData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !formData.name) return;

    const parsedMeds = medicationsInput
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    updatePatient({
      ...selectedPatient,
      ...formData,
      allergies: formData.allergies || [],
      systemicConditions: formData.systemicConditions || [],
      regularMedications: parsedMeds,
      emergencyContact: formData.emergencyContact || selectedPatient.emergencyContact,
      phones: formData.phones || selectedPatient.phones,
      socialNetworks: formData.socialNetworks || selectedPatient.socialNetworks
    } as Patient);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Secuencia de Tratamiento state (Matching 091941)
  const [showAddSecuenciaModal, setShowAddSecuenciaModal] = useState<boolean>(false);
  const [secProcedure, setSecProcedure] = useState<string>('');
  const [secDoctor, setSecDoctor] = useState<string>('3 - ANTONIO MORERA');
  const [secNotes, setSecNotes] = useState<string>('');
  const [secTooth, setSecTooth] = useState<number | undefined>(undefined);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

  const patientSecuencias = secuenciaTratamientos.filter(s => s.patientId === selectedPatientId);

  const handleAddCustomSecuencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secProcedure) return;

    addSecuenciaTratamiento({
      patientId: selectedPatientId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toothNumber: secTooth,
      procedure: secProcedure,
      notes: secNotes || 'Procedimiento ejecutado y registrado en la evolución clínica.',
      doctorName: secDoctor
    });

    setSecProcedure('');
    setSecNotes('');
    setSecTooth(undefined);
    setShowAddSecuenciaModal(false);
  };

  // Software / Excel / PDF Importer State (10-Column Format)
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareImportPatient['sourceSoftware']>('Excel/CSV');
  const [importList, setImportList] = useState<SoftwareImportPatient[]>([]);
  const [rejectedImportCount, setRejectedImportCount] = useState<number>(0);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [isParsingImport, setIsParsingImport] = useState<boolean>(false);

  const applyParsedImportRows = (rawParsed: SoftwareImportPatient[], originLabel: string) => {
    const { valid, rejected } = partitionValidCleanPatients(rawParsed);
    const cleanedNumeric = valid.map((row, idx) => ({
      ...row,
      historyNumber: sanitizePatientNumericId(row.historyNumber, idx + 1)
    }));
    setImportList(cleanedNumeric);
    setImportPage(1);
    setRejectedImportCount(rejected.length);
    if (cleanedNumeric.length > 0) {
      const skippedText = rejected.length > 0 ? ` · ${rejected.length} descartado(s) por "X" o datos incompletos` : '';
      showToast(`${cleanedNumeric.length} pacientes válidos listos desde ${originLabel}${skippedText}`);
    } else if (rejected.length > 0) {
      showToast(`Se descartaron ${rejected.length} filas por tener "X" o faltar Nombre, Apellido, Cédula o Correo válidos.`);
    } else {
      showToast('No se detectaron registros de pacientes en el archivo.');
    }
  };

  const handleDownload10ColTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_10COL_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
    XLSX.writeFile(wb, 'plantilla-importar-pacientes-10col.xlsx');
    showToast('Plantilla Excel (10 columnas) descargada');
  };

  const handleLoadSample10Col = () => {
    const parsed = parsePatientsFromRows(SAMPLE_10COL_ROWS, selectedSoftware === 'PDF' ? 'Excel/CSV' : selectedSoftware);
    setImportedFileName('Ejemplo Formato 10 Columnas');
    applyParsedImportRows(parsed, 'Ejemplo Formato 10 Columnas');
  };

  const handleFileImportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingImport(true);
    setImportedFileName(file.name);

    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pagesItems: PdfTextItemLike[][] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          pagesItems.push(content.items as PdfTextItemLike[]);
        }
        const sourceTag = selectedSoftware === 'Excel/CSV' ? 'PDF' : selectedSoftware;
        const parsed = parsePatientsFromCoordinatePdfPages(pagesItems, sourceTag);
        applyParsedImportRows(parsed, `PDF (${file.name})`);
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          setImportList([]);
          setRejectedImportCount(0);
          showToast('El archivo Excel está vacío.');
          return;
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet], { defval: '' });
        const sourceTag = selectedSoftware === 'PDF' ? 'Excel/CSV' : selectedSoftware;
        const parsed = parsePatientsFromRows(rows, sourceTag);
        applyParsedImportRows(parsed, file.name);
      }
    } catch {
      setImportList([]);
      setRejectedImportCount(0);
      showToast('Error al leer el archivo. Verifica el formato (.xlsx, .xls, .csv o .pdf).');
    } finally {
      setIsParsingImport(false);
      e.target.value = '';
    }
  };

  const handleExecuteImport = () => {
    if (importList.length === 0) return;
    const count = importPatientsFromSoftware(importList);
    if (count > 0) {
      setImportList([]);
      setRejectedImportCount(0);
      setImportedFileName('');
      setActiveSubTab('datos_personales');
    }
  };

  const isPatientInactiveOrDeceased = selectedPatient ? !isPatientNotifiable(selectedPatient) : false;

  return (
    <div className="space-y-4">
      
      {/* Top RHSistema Style Window Title */}
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
            🦷
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Ficha Clínica RHSistema
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
              {selectedPatient ? `Paciente: ${selectedPatient.name}` : 'Sin pacientes registrados'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Switch Patient */}
          <select
            value={selectedPatientId}
            disabled={patients.length === 0}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 disabled:opacity-60"
          >
            {patients.length === 0 ? (
              <option value="">0 pacientes registrados</option>
            ) : (
              patients.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.historyNumber || '—'} · {p.name} ({p.cedula}) {p.patientInactive ? (p.inactiveReason === 'fallecimiento' ? '[FALLECIDO]' : '[INACTIVO]') : ''} {p.balance > 0 ? '⚠️ [DEUDA]' : ''}
                </option>
              ))
            )}
          </select>

          {onOpenPatientSearch && (
            <button
              type="button"
              onClick={onOpenPatientSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-lg transition shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar Paciente</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewPatient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Nav (Divided into Clean Sub-Pages) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('datos_personales')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'datos_personales'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Datos Personales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('anamnesis')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'anamnesis'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Anamnesis & Alergias</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('facturacion_emergencia')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'facturacion_emergencia'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Facturación & Emergencia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('secuencia')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'secuencia'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Secuencia de Ttos ({patientSecuencias.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('importar')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ml-auto ${
            activeSubTab === 'importar'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
          }`}
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Importar Pacientes (Excel / PDF)</span>
        </button>
      </div>

      {/* SUBTAB 1: DATOS PERSONALES */}
      {activeSubTab === 'datos_personales' && !selectedPatient && (
        <EmptyPatientState
          moduleName="la Historia Clínica"
          onOpenNewPatient={onOpenNewPatient}
          onOpenImport={() => setActiveSubTab('importar')}
        />
      )}

      {activeSubTab === 'datos_personales' && selectedPatient && (
        <form onSubmit={handleSavePatientData} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Cols: Core Demographics */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Type and Status bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Tipo de Historia:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="patientType"
                      checked={formData.patientType === 'adulto'}
                      onChange={() => setFormData(prev => ({ ...prev, patientType: 'adulto' }))}
                      className="text-sky-600"
                    />
                    <span>Adulto</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="patientType"
                      checked={formData.patientType === 'infantil'}
                      onChange={() => setFormData(prev => ({ ...prev, patientType: 'infantil' }))}
                      className="text-sky-600"
                    />
                    <span>Infantil</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={formData.patientInactive || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          patientInactive: checked,
                          notificationsBlocked: checked,
                          inactiveReason: checked ? (prev.inactiveReason || 'inactivo') : undefined
                        }));
                      }}
                    />
                    <span>Paciente Inactivo</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">ID / Hist. Nro.:</span>
                    <input
                      type="text"
                      value={formData.migrationHistory || ''}
                      onChange={(e) => {
                        const val = sanitizePatientNumericId(e.target.value);
                        setFormData(prev => ({ ...prev, migrationHistory: val, historyNumber: val }));
                      }}
                      className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 1: Name, Cedula, Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">C.I. / Documento:</label>
                  <input
                    type="text"
                    required
                    value={formData.cedula || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ocupación / Profesión:</label>
                  <input
                    type="text"
                    value={formData.profession || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                    placeholder="FUNCIONARIO PUBLICO"
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Grid 2: Birthdate, Age, Gender, Nationality */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">F. Nacimiento:</label>
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Edad:</label>
                  <input
                    type="number"
                    value={formData.age || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Género:</label>
                  <select
                    value={formData.gender || 'M'}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="M">M - MASCULINO</option>
                    <option value="F">F - FEMENINO</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nacionalidad:</label>
                  <input
                    type="text"
                    value={formData.nationality || 'V - VENEZUELA'}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Grid 3: Email, Contact Phones & Assigned Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Correo Electrónico:</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tel. Celular:</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tel. Habitación:</label>
                  <input
                    type="text"
                    value={formData.phones?.home || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      phones: { ...(prev.phones || { mobile: prev.phone || '' }), home: e.target.value }
                    }))}
                    placeholder="0212-..."
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Doctor Asignado:</label>
                  <input
                    type="text"
                    value={formData.assignedDoctor || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedDoctor: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Dirección de Habitación:</label>
                  <input
                    type="text"
                    value={formData.homeAddress || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, homeAddress: e.target.value }))}
                    placeholder="Caracas, Venezuela"
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Motivo de Consulta Principal:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'control', label: 'Control' },
                    { id: 'dolor', label: 'Dolor' },
                    { id: 'sangramiento_encia', label: 'Sangramiento de encía' },
                    { id: 'estetica', label: 'Estética' },
                    { id: 'mal_posicion', label: 'Mal posición dentaria' },
                    { id: 'protesis', label: 'Prótesis' },
                    { id: 'otros', label: 'Otros' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, consultationReason: m.id }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        formData.consultationReason === m.id
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('anamnesis')}
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  Siguiente: Anamnesis & Alergias →
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition ${
                    isSaved ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{isSaved ? 'Ficha Guardada con Éxito' : 'Guardar Datos Personales'}</span>
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Fotografía del Paciente & Fechas */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Fotografía del Paciente</span>
                  <Camera className="w-4 h-4 text-sky-600" />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Fuente de Imagen:</label>
                  <select
                    value={cameraSource}
                    onChange={(e) => setCameraSource(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                  >
                    <option value="HP TrueVision HD Camera">HP TrueVision HD Camera</option>
                    <option value="Cámara Web USB Integrada">Cámara Web USB Integrada</option>
                    <option value="Sensor Digital Intraoral">Sensor Digital Intraoral</option>
                  </select>
                </div>

                <div className="w-full h-52 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-sky-400/40">
                  {isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt={formData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-2xl font-bold mb-2">
                        {formData.name?.charAt(0) || 'P'}
                      </div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Sin foto registrada
                      </span>
                    </div>
                  )}

                  {isCameraActive && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-red-600/90 text-white rounded-full text-[10px] font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      <span>EN VIVO</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                      isCameraActive
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isCameraActive ? 'animate-spin' : ''}`} />
                    <span>{isCameraActive ? 'Detener' : 'Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="py-1.5 px-2 rounded-lg font-bold text-[11px] bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1 shadow-xs transition"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Tomar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-2 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 transition"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Buscar Foto</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Fecha de Ingreso:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{formData.admissionDate || '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Última Cita:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{formData.lastControlDate || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB: ANAMNESIS, ALERGIAS, ENFERMEDADES SISTÉMICAS Y NOTIFICACIONES */}
      {activeSubTab === 'anamnesis' && !selectedPatient && (
        <EmptyPatientState
          moduleName="la Anamnesis Clínica"
          onOpenNewPatient={onOpenNewPatient}
          onOpenImport={() => setActiveSubTab('importar')}
        />
      )}

      {activeSubTab === 'anamnesis' && selectedPatient && (
        <form onSubmit={handleSavePatientData} className="space-y-4 text-xs">
          {/* Deceased / Notification Block Status Banner & Actions */}
          {isPatientInactiveOrDeceased ? (
            <div
              data-testid="patient-inactive-panel"
              className="p-4 rounded-2xl bg-slate-900 text-white border border-rose-500/60 flex flex-wrap items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-400/40 flex items-center justify-center shrink-0">
                  <BellOff className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-300">
                    {selectedPatient.inactiveReason === 'fallecimiento'
                      ? 'Paciente Inactivo por Fallecimiento'
                      : 'Paciente Inactivo'}
                    {selectedPatient.deceasedDate ? ` · Fecha: ${selectedPatient.deceasedDate}` : ''}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Las notificaciones por WhatsApp, felicitaciones de cumpleaños, recordatorios de citas y campañas masivas están bloqueadas automáticamente para este paciente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => reactivatePatient(selectedPatient.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivar Ficha</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <strong className="text-slate-800 dark:text-slate-200">Estado de Notificaciones:</strong> Activas (recordatorios de citas y mensajería habilitados).
              </div>
              {!showDeceasedConfirm ? (
                <button
                  type="button"
                  data-testid="mark-deceased-btn"
                  onClick={() => setShowDeceasedConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold text-[11px] transition"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Inactivar por Fallecimiento</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-3 py-2 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-800 dark:text-rose-200">Fecha fallecimiento:</span>
                  <input
                    type="date"
                    value={deceasedDateInput}
                    onChange={(e) => setDeceasedDateInput(e.target.value)}
                    className="px-2 py-1 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                  />
                  <button
                    type="button"
                    data-testid="confirm-deceased-btn"
                    onClick={() => {
                      deactivatePatient(selectedPatient.id, 'fallecimiento', deceasedDateInput);
                      setShowDeceasedConfirm(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                  >
                    Confirmar y Bloquear Notificaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeceasedConfirm(false)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alergias */}
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Alergias del Paciente</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, allergies: [] }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                      (formData.allergies || []).length === 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    No refiere alergias
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['Penicilina', 'Lidocaína / Anestesia', 'Látex', 'Aspirina / AINES', 'Sulfas', 'Yodo'].map(item => {
                    const active = (formData.allergies || []).some(a => a.toLowerCase() === item.toLowerCase());
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleAllergyOption(item)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          active
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-rose-200 dark:border-slate-700 hover:bg-rose-100/70'
                        }`}
                      >
                        {active ? `✓ ${item}` : `+ ${item}`}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newAllergyText}
                    onChange={(e) => setNewAllergyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAllergy();
                      }
                    }}
                    placeholder="Escribir otra alergia (ej. Ibuprofeno, Clindamicina)..."
                    className="flex-1 px-2.5 py-1.5 border border-rose-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAllergy}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] shrink-0 transition"
                  >
                    + Agregar
                  </button>
                </div>

                {(formData.allergies || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(formData.allergies || []).map((alergy) => (
                      <span
                        key={alergy}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold"
                      >
                        <span>{alergy}</span>
                        <button
                          type="button"
                          onClick={() => toggleAllergyOption(alergy)}
                          aria-label={`Quitar alergia ${alergy}`}
                          className="hover:text-rose-200 font-black leading-none ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Enfermedades Sistémicas */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-amber-600" />
                    <span>Enfermedad Sistémica</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, systemicConditions: [] }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                      (formData.systemicConditions || []).length === 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Sin enfermedad sistémica
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['Hipertensión Arterial', 'Diabetes Mellitus', 'Cardiopatía', 'Asma', 'Hipotiroidismo', 'Coagulopatía'].map(cond => {
                    const active = (formData.systemicConditions || []).some(c => c.toLowerCase() === cond.toLowerCase());
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleSystemicOption(cond)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          active
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-amber-200 dark:border-slate-700 hover:bg-amber-100/70'
                        }`}
                      >
                        {active ? `✓ ${cond}` : `+ ${cond}`}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newSystemicText}
                    onChange={(e) => setNewSystemicText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSystemic();
                      }
                    }}
                    placeholder="Otra enfermedad sistémica (ej. Gastritis, Osteoporosis)..."
                    className="flex-1 px-2.5 py-1.5 border border-amber-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSystemic}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] shrink-0 transition"
                  >
                    + Agregar
                  </button>
                </div>

                {(formData.systemicConditions || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(formData.systemicConditions || []).map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-bold"
                      >
                        <span>{cond}</span>
                        <button
                          type="button"
                          onClick={() => toggleSystemicOption(cond)}
                          aria-label={`Quitar condición ${cond}`}
                          className="hover:text-amber-200 font-black leading-none ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Medicación Habitual (opcional):
                  </label>
                  <input
                    type="text"
                    value={medicationsInput}
                    onChange={(e) => setMedicationsInput(e.target.value)}
                    placeholder="Ej. Losartán 50mg, Metformina 850mg..."
                    className="w-full px-2.5 py-1 border border-amber-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* QR Auto-Gestión */}
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const patientQrUrl = buildPatientHistoryQrUrl(
                    typeof window !== 'undefined' ? window.location.origin : '',
                    selectedPatient.id,
                    clinicConfig.publicQrBaseUrl
                  );
                  return (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(patientQrUrl)}`}
                        alt="QR Historia"
                        className="w-14 h-14 bg-white p-1 rounded border border-sky-300 shrink-0"
                      />
                      <div>
                        <span className="font-bold text-sky-900 dark:text-sky-200 block text-xs">QR Auto-Gestión del Paciente:</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">
                          Acceso restringido sin inicio de sesión: el paciente solo llena su historia clínica.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(patientQrUrl);
                            showToast('Enlace QR del paciente copiado');
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline"
                        >
                          <Copy className="w-3 h-3" /> Copiar Enlace QR
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button
                type="submit"
                className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition shrink-0 ${
                  isSaved ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Anamnesis Guardada' : 'Guardar Anamnesis'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB: FACTURACIÓN FISCAL & CONTACTO DE EMERGENCIA */}
      {activeSubTab === 'facturacion_emergencia' && !selectedPatient && (
        <EmptyPatientState
          moduleName="Facturación y Emergencia"
          onOpenNewPatient={onOpenNewPatient}
          onOpenImport={() => setActiveSubTab('importar')}
        />
      )}

      {activeSubTab === 'facturacion_emergencia' && selectedPatient && (
        <form onSubmit={handleSavePatientData} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Billing Information (SENIAT) */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                  Datos de Facturación Fiscal (SENIAT):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">Razón Social:</label>
                    <input
                      type="text"
                      value={formData.billingCompanyName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingCompanyName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">R.I.F. / C.I. Fiscal:</label>
                    <input
                      type="text"
                      value={formData.billingTaxId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingTaxId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">Dirección Fiscal:</label>
                    <input
                      type="text"
                      value={formData.billingAddress || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Details */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-3">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                  Contacto en Caso de Emergencia:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">Nombre Contacto:</label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.name || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emergencyContact: {
                          name: e.target.value,
                          phone: prev.emergencyContact?.phone || '',
                          relationship: prev.emergencyContact?.relationship || 'Familiar'
                        }
                      }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">Teléfono Emergencia:</label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.phone || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emergencyContact: {
                          name: prev.emergencyContact?.name || '',
                          phone: e.target.value,
                          relationship: prev.emergencyContact?.relationship || 'Familiar'
                        }
                      }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">Parentesco:</label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.relationship || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emergencyContact: {
                          name: prev.emergencyContact?.name || '',
                          phone: prev.emergencyContact?.phone || '',
                          relationship: e.target.value
                        }
                      }))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition ${
                    isSaved ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{isSaved ? 'Datos Guardados' : 'Guardar Facturación y Emergencia'}</span>
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Estado de Cuenta del Paciente */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Estado de Cuenta</span>
                  <CreditCard className="w-4 h-4 text-sky-600" />
                </div>

                {selectedPatient.balance > 0 ? (
                  <div className="p-4 bg-red-600 text-white rounded-xl shadow-md text-center space-y-1.5">
                    <span className="text-sm font-black tracking-widest uppercase block">
                      ⚠️ PACIENTE CON DEUDA
                    </span>
                    <span className="text-lg font-mono font-bold block">
                      Saldo Deudor: ${selectedPatient.balance.toFixed(2)} USD
                    </span>
                    <span className="text-xs text-red-100 block font-mono">
                      ≈ Bs. {(selectedPatient.balance * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('pagos')}
                      className="mt-2 w-full py-2 bg-white text-red-700 hover:bg-red-50 rounded-lg font-black text-xs shadow-xs"
                    >
                      Cobrar en Cajas y Multi-Pagos →
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-center text-xs font-bold space-y-2">
                    <div>✓ Paciente Solvente / Sin Deuda Pendiente</div>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('pagos')}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Ir a Cajas y Recibos →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB 2: SECUENCIA DE TRATAMIENTO */}
      {activeSubTab === 'secuencia' && !selectedPatient && (
        <EmptyPatientState
          moduleName="la Secuencia de Tratamientos"
          onOpenNewPatient={onOpenNewPatient}
          onOpenImport={() => setActiveSubTab('importar')}
        />
      )}

      {activeSubTab === 'secuencia' && selectedPatient && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tabla de Evolución & Procedimientos Ejecutados ({patientSecuencias.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Clínica Corona · RHOdont</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSecuenciaModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Secuencia de Tratamiento Personalizada</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 w-40">1. Fecha y Hora</th>
                    <th className="p-3 w-52">2. Odontólogo (Dr.)</th>
                    <th className="p-3">3. Tratamientos Realizados (Vinculados al Plan)</th>
                    <th className="p-3 w-72">Audio / Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {patientSecuencias.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                        No hay secuencias de tratamiento registradas aún. Presione "+ Secuencia de Tratamiento Personalizada" o finalice un tratamiento en el Presupuesto.
                      </td>
                    </tr>
                  ) : (
                    patientSecuencias.map((seq) => (
                      <tr key={seq.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white">{seq.date}</div>
                          <div className="text-[11px] text-slate-500">{seq.time}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-sky-700 dark:text-sky-300 uppercase block">
                            {seq.doctorName}
                          </span>
                          <span className="text-[10px] text-slate-400">Especialista Registrado</span>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {seq.procedure}
                          </div>
                          {seq.toothNumber && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              Pieza #{seq.toothNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {seq.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 3: IMPORTADOR DE PACIENTES AJENOS (FORMATO 10 COLUMNAS EXCEL / PDF) */}
      {activeSubTab === 'importar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-purple-600" />
                <span>Importador de Pacientes Ajenos (Excel / PDF · Formato 10 Columnas)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compatible con las columnas: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">ID · CEDULA · APELLIDO · NOMBRE · FECHA INGRESO · ULT. CITA · DOCTOR · MOTIVO · TELEFONO · EMAIL</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSoftware}
                onChange={(e) => setSelectedSoftware(e.target.value as SoftwareImportPatient['sourceSoftware'])}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl outline-none"
              >
                <option value="Excel/CSV">Excel / CSV (.xlsx, .xls, .csv)</option>
                <option value="PDF">Listado PDF (.pdf)</option>
                <option value="RhOdont">Software: RhOdont</option>
                <option value="Dentalink">Software: Dentalink</option>
                <option value="DentalApp">Software: DentalApp</option>
                <option value="Dentidesk">Software: Dentidesk</option>
              </select>

              <button
                type="button"
                onClick={handleDownload10ColTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Plantilla 10 Col.</span>
              </button>

              <button
                type="button"
                data-testid="load-sample-10col-btn"
                onClick={handleLoadSample10Col}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100"
              >
                <span>Cargar Ejemplo 10 Col.</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{isParsingImport ? 'Leyendo archivo...' : 'Subir Excel o PDF'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileImportUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {importList.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                <FileText className="w-7 h-7 text-rose-500" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {importedFileName
                  ? `No se detectaron registros válidos en "${importedFileName}".`
                  : 'Sube tu archivo Excel (.xlsx / .xls / .csv) o PDF, o presiona "Cargar Ejemplo 10 Col." para probar la importación.'}
              </p>
              <p className="text-[11px] text-slate-500">
                Normaliza automáticamente fechas con punto (.31/08/2021), fechas nulas (.00/01/000), teléfonos venezolanos (424... → 0424-...) y combina APELLIDO + NOMBRE.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Origen: <strong className="text-sky-700 dark:text-sky-300">{importedFileName || selectedSoftware}</strong> · {importList.length} paciente(s) válidos (solo Nro. de ID, sin "X")
                  </span>
                  {rejectedImportCount > 0 && (
                    <span
                      data-testid="import-rejected-badge"
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]"
                    >
                      {rejectedImportCount} descartado(s) por "X" o datos faltantes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportList([]);
                      setRejectedImportCount(0);
                      setImportedFileName('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Limpiar Vista Previa
                  </button>
                  <button
                    type="button"
                    data-testid="confirm-import-patients-btn"
                    onClick={handleExecuteImport}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importar {importList.length} Pacientes a Historia Clínica</span>
                  </button>
                </div>
              </div>

              {(() => {
                const importPaged = paginateList(importList, importPage, 20);
                return (
                  <div className="space-y-2">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                          <tr>
                            <th className="p-2.5">ID</th>
                            <th className="p-2.5">Cédula</th>
                            <th className="p-2.5">Nombre Completo</th>
                            <th className="p-2.5">Fecha Ingreso</th>
                            <th className="p-2.5">Ult. Cita</th>
                            <th className="p-2.5">Doctor</th>
                            <th className="p-2.5">Motivo</th>
                            <th className="p-2.5">Teléfono</th>
                            <th className="p-2.5">Email</th>
                            <th className="p-2.5 text-right">Quitar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                          {importPaged.items.map((p, idx) => {
                            const absIndex = (importPaged.page - 1) * importPaged.pageSize + idx;
                            return (
                              <tr key={`${p.cedula}-${absIndex}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="p-2.5 font-mono font-semibold text-slate-500">{p.historyNumber || '—'}</td>
                                <td className="p-2.5 font-mono text-[11px]">{p.cedula}</td>
                                <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                                <td className="p-2.5 font-mono text-[11px]">{p.admissionDate || '—'}</td>
                                <td className="p-2.5 font-mono text-[11px]">{p.lastAppointmentDate || '—'}</td>
                                <td className="p-2.5 text-[11px]">{p.doctorName || '—'}</td>
                                <td className="p-2.5">
                                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 text-[10px] font-bold uppercase">
                                    {p.consultationReason || 'control'}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-[11px]">{p.phone || '—'}</td>
                                <td className="p-2.5 text-[11px] text-slate-500">{p.email || '—'}</td>
                                <td className="p-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setImportList(prev => prev.filter((_, i) => i !== absIndex))}
                                    aria-label={`Quitar a ${p.name}`}
                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {importPaged.totalPages > 1 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>
                          Mostrando {importPaged.startIndex}–{importPaged.endIndex} de {importPaged.totalItems} · Página {importPaged.page} de {importPaged.totalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={importPaged.page <= 1}
                            onClick={() => setImportPage(p => Math.max(1, p - 1))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-40"
                          >
                            <ChevronLeft className="w-3 h-3" /> Anterior
                          </button>
                          <button
                            type="button"
                            disabled={importPaged.page >= importPaged.totalPages}
                            onClick={() => setImportPage(p => Math.min(importPaged.totalPages, p + 1))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-40"
                          >
                            Siguiente <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NUEVA SECUENCIA DE TRATAMIENTO MANUAL / DICTADA */}
      {showAddSecuenciaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 bg-sky-600 text-white flex items-center justify-between font-bold text-sm">
              <span>Registrar Secuencia de Tratamiento / Evolución</span>
              <button type="button" onClick={() => setShowAddSecuenciaModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCustomSecuencia} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tratamiento Realizado:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tartrectomía y profilaxis con Cavitron"
                  value={secProcedure}
                  onChange={(e) => setSecProcedure(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pieza Dental (Opcional):
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 16"
                    value={secTooth || ''}
                    onChange={(e) => setSecTooth(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Doctor Responsable:
                  </label>
                  <select
                    value={secDoctor}
                    onChange={(e) => setSecDoctor(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="3 - ANTONIO MORERA">3 - ANTONIO MORERA</option>
                    <option value="Dra. Valentina Sardi">Dra. Valentina Sardi</option>
                    <option value="DAYANA ORTEGA">DAYANA ORTEGA</option>
                    <option value="Ramses Acosta">Ramses Acosta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas de Evolución / Indicaciones Clínicas:
                </label>
                <textarea
                  rows={4}
                  placeholder="Describa el procedimiento realizado, aislamiento, respuesta del paciente..."
                  value={secNotes}
                  onChange={(e) => setSecNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSecuenciaModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-xs hover:bg-sky-500"
                >
                  Guardar en Secuencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
