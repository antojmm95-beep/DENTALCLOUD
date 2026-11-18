import React, { useMemo, useState } from 'react';
import { useDental } from '../context/DentalContext';
import { OdontogramTooth } from './OdontogramTooth';
import { ToothClinicalStatus, ToothSurface } from '../types/dental';
import { buildAutoSecuenciaNote, sortOdontogramControlsDesc } from '../utils/dentalCalc';
import { formatPresupuestoDate } from '../utils/budgetDocument';
import { EmptyPatientState } from './EmptyPatientState';
import {
  Printer,
  Edit3,
  ArrowRight,
  RotateCcw,
  Plus,
  CheckSquare,
  Calendar,
  Check,
  X
} from 'lucide-react';

const ADULT_TEETH = {
  q1: [18, 17, 16, 15, 14, 13, 12, 11],
  q2: [21, 22, 23, 24, 25, 26, 27, 28],
  q4: [48, 47, 46, 45, 44, 43, 42, 41],
  q3: [31, 32, 33, 34, 35, 36, 37, 38]
};

const PEDIATRIC_TEETH = {
  q5: [55, 54, 53, 52, 51],
  q6: [61, 62, 63, 64, 65],
  q8: [85, 84, 83, 82, 81],
  q7: [71, 72, 73, 74, 75]
};

interface HallazgoItem {
  id: string;
  name: string;
  colorType: 'red' | 'yellow' | 'blue';
  clinicalStatus: ToothClinicalStatus;
}

const HALLAZGOS_LIST: HallazgoItem[] = [
  { id: 'abrasion', name: 'ABRASION', colorType: 'red', clinicalStatus: 'caries' },
  { id: 'bruxismo', name: 'BRUXISMO', colorType: 'red', clinicalStatus: 'caries' },
  { id: 'caries', name: 'CARIES', colorType: 'red', clinicalStatus: 'caries' },
  { id: 'caries_inicial', name: 'CARIES INICIAL (MANCHA BLANCA)', colorType: 'yellow', clinicalStatus: 'caries' },
  { id: 'cuellos', name: 'CUELLOS EXPUESTOS', colorType: 'yellow', clinicalStatus: 'caries' },
  { id: 'pigmentado', name: 'DIENTE PIGMENTADO', colorType: 'yellow', clinicalStatus: 'caries' },
  { id: 'restauracion', name: 'RESTAURACIÓN EN BUEN ESTADO', colorType: 'blue', clinicalStatus: 'obturado' }
];

interface FixedFindingOption {
  id: string;
  label: string;
  status: ToothClinicalStatus | 'clear';
  textColor: string;
  icon: React.ReactNode;
}

const FIXED_FINDINGS: FixedFindingOption[] = [
  {
    id: 'ausente',
    label: 'Diente Ausente (Línea Azul)',
    status: 'ausente',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: <span className="w-1 h-4 bg-blue-600 inline-block font-mono font-bold shrink-0" />
  },
  {
    id: 'extraccion_indicada',
    label: 'Diente Indicado para Extracción (X Roja)',
    status: 'extraccion_indicada',
    textColor: 'text-red-600 dark:text-red-400',
    icon: <span className="font-bold font-mono text-sm leading-none shrink-0">✕</span>
  },
  {
    id: 'clear',
    label: 'Eliminar Selección / Sano',
    status: 'clear',
    textColor: 'text-slate-600 dark:text-slate-300',
    icon: <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
  },
  {
    id: 'corona',
    label: 'Corona en Buen Estado (Azul)',
    status: 'corona',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 bg-blue-100 inline-block shrink-0" />
  },
  {
    id: 'implante',
    label: 'Implante Instalado (Azul)',
    status: 'implante',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: <span className="text-xs shrink-0">🔩</span>
  },
  {
    id: 'necesidad_implante',
    label: 'Necesidad de Implante (Rojo)',
    status: 'necesidad_implante',
    textColor: 'text-red-600 dark:text-red-400',
    icon: <span className="text-xs shrink-0">🔩</span>
  },
  {
    id: 'endodoncia',
    label: 'Endodoncia (Raya Roja)',
    status: 'endodoncia',
    textColor: 'text-red-600 dark:text-red-400',
    icon: <span className="w-1 h-3.5 bg-red-600 inline-block font-mono shrink-0" />
  }
];

export const OdontogramView: React.FC = () => {
  const {
    selectedPatient,
    odontograms,
    odontogramControls,
    addOdontogramControl,
    selectedPatientId,
    setToothSurface,
    setToothWholeStatus,
    setMultipleTeethWholeStatus,
    setToothStatusSequence,
    clearTooth,
    getToothCondition,
    setCurrentTab,
    addPendingCheckoutItem,
    addSecuenciaTratamiento,
    updatePatient,
    doctors,
    activeDoctor,
    showToast
  } = useDental();

  const [activeTool, setActiveTool] = useState<ToothClinicalStatus>('caries');
  const [activeToolMode, setActiveToolMode] = useState<'surface' | 'whole' | 'clear'>('surface');
  const [selectedToothNumber, setSelectedToothNumber] = useState<number>(16);
  const [selectionType, setSelectionType] = useState<string>('Superficie Oclusal / Cara');
  const [activeHallazgoName, setActiveHallazgoName] = useState<string>('CARIES');

  // Multi-select batch mode for Hallazgos Fijos
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [multiSelectedTeeth, setMultiSelectedTeeth] = useState<number[]>([]);

  // Últimos Controles state
  const patientControls = useMemo(() => {
    const list = odontogramControls.filter(c => c.patientId === selectedPatientId);
    return sortOdontogramControlsDesc(list);
  }, [odontogramControls, selectedPatientId]);

  const [selectedControlId, setSelectedControlId] = useState<string>('');
  const activeControl = patientControls.find(c => c.id === selectedControlId) || patientControls[0];

  const [showAddControlForm, setShowAddControlForm] = useState<boolean>(false);
  const [newControlDate, setNewControlDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newControlDoctor, setNewControlDoctor] = useState<string>(activeDoctor?.name || doctors[0]?.name || 'Dr. Antonio Morera');
  const [newControlNotes, setNewControlNotes] = useState<string>('');

  const patientOdontogram = odontograms[selectedPatientId] || {};
  const selectedToothCondition = getToothCondition(selectedPatientId, selectedToothNumber);

  const toggleMultiTooth = (toothNum: number) => {
    setSelectedToothNumber(toothNum);
    setMultiSelectedTeeth(prev =>
      prev.includes(toothNum) ? prev.filter(n => n !== toothNum) : [...prev, toothNum]
    );
  };

  const handleToothSelect = (toothNum: number) => {
    setSelectedToothNumber(toothNum);
    if (multiSelectMode) {
      setMultiSelectedTeeth(prev =>
        prev.includes(toothNum) ? prev.filter(n => n !== toothNum) : [...prev, toothNum]
      );
      return;
    }

    if (activeToolMode === 'whole') {
      setToothWholeStatus(toothNum, activeTool);
      showToast(`${activeHallazgoName} aplicado en pieza #${toothNum} (clic en más piezas para continuar)`);
    } else if (activeToolMode === 'clear') {
      clearTooth(toothNum);
    }
  };

  const handleSurfaceClick = (toothNum: number, surface: ToothSurface) => {
    setSelectedToothNumber(toothNum);
    if (multiSelectMode) {
      toggleMultiTooth(toothNum);
      return;
    }

    if (activeToolMode === 'whole') {
      setToothWholeStatus(toothNum, activeTool);
      showToast(`${activeHallazgoName} aplicado en pieza #${toothNum}`);
      return;
    }

    if (activeToolMode === 'clear') {
      clearTooth(toothNum);
      return;
    }

    setToothSurface(toothNum, surface, activeTool);
  };

  const handleSelectFixedFinding = (finding: FixedFindingOption) => {
    setActiveHallazgoName(finding.label);
    if (finding.status === 'clear') {
      setActiveToolMode('clear');
      setSelectionType('Pieza Dental Completa');
      if (multiSelectMode && multiSelectedTeeth.length > 0) {
        setMultipleTeethWholeStatus(multiSelectedTeeth, 'clear');
        setMultiSelectedTeeth([]);
      } else {
        showToast('Herramienta activa: Eliminar Selección / Sano — haz clic en las piezas a limpiar');
      }
      return;
    }

    setActiveTool(finding.status);
    setActiveToolMode('whole');
    setSelectionType('Pieza Dental Completa');

    if (multiSelectMode && multiSelectedTeeth.length > 0) {
      setMultipleTeethWholeStatus(multiSelectedTeeth, finding.status);
      setMultiSelectedTeeth([]);
    } else {
      showToast(`"${finding.label}" activo: haz clic sobre cualquier pieza para aplicarlo en múltiples dientes`);
    }
  };

  const handleApplyBatchToSelected = () => {
    if (multiSelectedTeeth.length === 0) return;
    if (activeToolMode === 'clear') {
      setMultipleTeethWholeStatus(multiSelectedTeeth, 'clear');
    } else if (activeToolMode === 'whole') {
      setMultipleTeethWholeStatus(multiSelectedTeeth, activeTool);
    } else {
      // Fallback if user toggled multi-select while a surface tool was active
      setMultipleTeethWholeStatus(multiSelectedTeeth, activeTool);
    }
    setMultiSelectedTeeth([]);
  };

  const handleCreateControl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newControlDate) return;
    const created = addOdontogramControl({
      patientId: selectedPatientId,
      date: newControlDate,
      doctorName: newControlDoctor.trim() || 'Dr. Antonio Morera',
      notes: newControlNotes.trim() || 'Control evolutivo de odontodiagrama registrado.'
    });
    setSelectedControlId(created.id);
    setNewControlNotes('');
    setShowAddControlForm(false);
  };

  // Status Sequence: Pendiente -> En Tratamiento -> Finalizado (Cobro)
  const handleToothStatusChange = (toothNum: number, status: 'pendiente' | 'en_tratamiento' | 'finalizado') => {
    if (!selectedPatient) return;
    const existing = getToothCondition(selectedPatientId, toothNum);
    const alreadyFinalized = existing?.statusSequence === 'finalizado';
    setToothStatusSequence(toothNum, status);

    if (status === 'finalizado' && !alreadyFinalized) {
      const treatmentDesc = existing?.treatmentName || `Tratamiento y Restauración Pieza #${toothNum}`;
      const price = existing?.cost || 40;

      addSecuenciaTratamiento({
        patientId: selectedPatient.id,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toothNumber: toothNum,
        procedure: treatmentDesc,
        notes: buildAutoSecuenciaNote({
          procedureName: treatmentDesc,
          toothNumber: toothNum
        }),
        doctorName: activeDoctor.name || 'Dr. Antonio Morera',
        isAutomated: true
      });

      addPendingCheckoutItem({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        treatmentName: `${treatmentDesc} - Pieza #${toothNum}`,
        amountUsd: price,
        doctorName: activeDoctor.name || 'Dr. Antonio Morera'
      });

      updatePatient({
        ...selectedPatient,
        balance: selectedPatient.balance + price,
        totalBilled: selectedPatient.totalBilled + price
      });

      showToast(`Pieza #${toothNum} finalizada: Reflejada en Secuencia de Tratamiento y Cuentas por Cobrar`);
    } else if (status === 'finalizado' && alreadyFinalized) {
      showToast(`Pieza #${toothNum} ya se encuentra finalizada en Secuencia y Cobros`);
    } else {
      showToast(`Estatus pieza #${toothNum}: ${status.toUpperCase()}`);
    }
  };

  const renderArchRow = (teeth: number[], isUpper: boolean) =>
    teeth.map((num) => (
      <OdontogramTooth
        key={num}
        number={num}
        condition={patientOdontogram[num]}
        isSelected={!multiSelectMode && selectedToothNumber === num}
        isBatchSelected={multiSelectMode && multiSelectedTeeth.includes(num)}
        onSelect={handleToothSelect}
        onSurfaceClick={handleSurfaceClick}
        isUpper={isUpper}
        onStatusChange={handleToothStatusChange}
      />
    ));

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="el Odontodiagrama Clínico" />;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">

      {/* Top Header & Patient Bar */}
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
            🦷
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              RHSistema Odontodiagrama
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
              Paciente: {selectedPatient.name} (C.I. {selectedPatient.cedula})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !multiSelectMode;
              setMultiSelectMode(next);
              if (!next) setMultiSelectedTeeth([]);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border shadow-xs transition ${
              multiSelectMode
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{multiSelectMode ? 'Selección Múltiple Activa' : 'Selección Múltiple'}</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Modo edición de Odontodiagrama habilitado')}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Modificar</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('secuencia_ttos')}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <span>Ver Secuencia de Ttos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Column */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">

          {/* Últimos Controles con Fechas + Botón + Nuevo Control */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs text-xs">
            <div className="px-2.5 py-2 bg-sky-100 dark:bg-sky-950/80 border-b border-sky-200 dark:border-sky-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-950 dark:text-sky-200">
                <Calendar className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
                <span>Últimos Controles ({patientControls.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddControlForm(v => !v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-2xs"
                title="Registrar nueva fecha de control odontológico"
              >
                <Plus className="w-3 h-3" />
                <span>Nuevo Control</span>
              </button>
            </div>

            {showAddControlForm && (
              <form onSubmit={handleCreateControl} className="p-2.5 bg-sky-50/70 dark:bg-slate-800/70 border-b border-sky-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                      Fecha Control:
                    </label>
                    <input
                      type="date"
                      required
                      value={newControlDate}
                      onChange={(e) => setNewControlDate(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-[11px] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                      Responsable:
                    </label>
                    <select
                      value={newControlDoctor}
                      onChange={(e) => setNewControlDoctor(e.target.value)}
                      className="w-full px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-[11px] font-semibold"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                    Observación del Control:
                  </label>
                  <input
                    type="text"
                    value={newControlNotes}
                    onChange={(e) => setNewControlNotes(e.target.value)}
                    placeholder="Ej. Control evolutivo, ajuste oclusal..."
                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-[11px]"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddControlForm(false)}
                    className="px-2 py-1 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                  >
                    Guardar Fecha
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2 w-24">Fecha</th>
                    <th className="p-2">Respon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patientControls.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-3 text-center text-slate-400 italic text-[11px]">
                        Sin controles previos. Pulsa "+ Nuevo Control".
                      </td>
                    </tr>
                  ) : (
                    patientControls.map((ctrl) => {
                      const isRowActive = activeControl?.id === ctrl.id;
                      return (
                        <tr
                          key={ctrl.id}
                          onClick={() => setSelectedControlId(ctrl.id)}
                          className={`cursor-pointer transition ${
                            isRowActive
                              ? 'bg-sky-50/90 dark:bg-sky-900/40 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-2 font-mono font-bold whitespace-nowrap align-top">
                            <span className="inline-flex items-center gap-1">
                              <span className={`text-[9px] ${isRowActive ? 'text-sky-700 dark:text-sky-300' : 'text-transparent'}`}>▶</span>
                              <span>{formatPresupuestoDate(ctrl.date)}</span>
                            </span>
                          </td>
                          <td className="p-2 text-slate-800 dark:text-slate-200">
                            <div className="font-bold truncate max-w-[140px]" title={ctrl.doctorName}>
                              {ctrl.doctorName}
                            </div>
                            {ctrl.notes && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={ctrl.notes}>
                                {ctrl.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {activeControl?.notes && (
              <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                <strong className="text-sky-700 dark:text-sky-300">{formatPresupuestoDate(activeControl.date)}:</strong>{' '}
                {activeControl.notes}
              </div>
            )}
          </div>

          {/* Tipo de Selección */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Tipo de Selección:
            </label>
            <select
              value={selectionType}
              onChange={(e) => setSelectionType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="Superficie Oclusal / Cara">Superficie Oclusal / Cara</option>
              <option value="Pieza Dental Completa">Pieza Dental Completa</option>
              <option value="Selección Múltiple por Lote">Selección Múltiple por Lote</option>
            </select>
          </div>

          {/* Catálogo de Hallazgos Clínicos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs text-xs">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Catálogo de Hallazgos Clínicos</span>
              <span className="text-[10px] text-slate-400">Clic para aplicar</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2 w-12 text-center">F | B</th>
                  <th className="p-2">Hallazgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {HALLAZGOS_LIST.map((h) => {
                  const isActive = activeToolMode === 'surface' && activeHallazgoName === h.name;
                  return (
                    <tr
                      key={h.id}
                      onClick={() => {
                        setActiveHallazgoName(h.name);
                        setActiveTool(h.clinicalStatus);
                        setActiveToolMode('surface');
                        setSelectionType('Superficie Oclusal / Cara');
                      }}
                      className={`cursor-pointer transition ${
                        isActive
                          ? 'bg-sky-100 dark:bg-sky-950/60 font-bold ring-1 ring-inset ring-sky-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-2 text-center">
                        <span
                          className={`inline-block w-4 h-4 rounded-xs ${
                            h.colorType === 'red'
                              ? 'bg-red-600'
                              : h.colorType === 'blue'
                                ? 'bg-blue-600'
                                : 'bg-yellow-400'
                          }`}
                        />
                      </td>
                      <td className="p-2 text-slate-800 dark:text-slate-200">
                        {h.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hallazgos Fijos Box — Sticky Multi-Tooth & Batch Multi-Select */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Hallazgos Fijos
              </span>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                Multi-diente activo
              </span>
            </div>

            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              Selecciona una opción fija y haz clic en varias piezas seguidas, o activa <strong>Selección Múltiple</strong>.
            </p>

            <div className="space-y-1">
              {FIXED_FINDINGS.map((finding) => {
                const isActive =
                  (finding.status === 'clear' && activeToolMode === 'clear') ||
                  (finding.status !== 'clear' && activeToolMode === 'whole' && activeTool === finding.status);
                return (
                  <button
                    key={finding.id}
                    type="button"
                    onClick={() => handleSelectFixedFinding(finding)}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between gap-2 font-semibold transition border ${
                      isActive
                        ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-400 ring-1 ring-sky-400 shadow-2xs'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${finding.textColor}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {finding.icon}
                      <span className="truncate">{finding.label}</span>
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Center / Right Column: Cross-Quadrant Odontodiagrama */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 sm:p-4 shadow-xs space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Esquema Gráfico FDI Clínico (Dentición Permanente & Decidua)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold">
                Herramienta Activa: {activeHallazgoName}
                {activeToolMode !== 'surface' ? ' (Modo Multi-Diente)' : ''} · Pieza #{selectedToothNumber}
              </span>
            </div>
          </div>

          {/* Multi-select batch bar */}
          {multiSelectMode && (
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                  Selección Múltiple: {multiSelectedTeeth.length} pieza(s)
                </span>
                {multiSelectedTeeth.length > 0 && (
                  <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">
                    [{[...multiSelectedTeeth].sort((a, b) => a - b).join(', ')}]
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={multiSelectedTeeth.length === 0}
                  onClick={handleApplyBatchToSelected}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition shadow-2xs"
                >
                  Aplicar "{activeHallazgoName}" a {multiSelectedTeeth.length} pieza(s)
                </button>
                <button
                  type="button"
                  disabled={multiSelectedTeeth.length === 0}
                  onClick={() => setMultiSelectedTeeth([])}
                  className="px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-40 font-semibold"
                >
                  Limpiar selección
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelectMode(false);
                    setMultiSelectedTeeth([]);
                  }}
                  className="p-1 text-indigo-500 hover:text-indigo-700"
                  title="Salir de selección múltiple"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="relative py-2 select-none">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-blue-600 -translate-x-1/2 z-0 hidden sm:block pointer-events-none" />

            {/* SECTION 1: PERMANENT UPPER ARCH */}
            <div className="relative z-10 mb-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1 pb-1">
                <span>18 - 11 (SUPERIOR DERECHO)</span>
                <span className="text-sky-600 font-extrabold uppercase">Maxilar Superior</span>
                <span>21 - 28 (SUPERIOR IZQUIERDO)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
                <div className="grid grid-cols-8 gap-0.5 pr-1">
                  {renderArchRow(ADULT_TEETH.q1, true)}
                </div>
                <div className="grid grid-cols-8 gap-0.5 pl-1">
                  {renderArchRow(ADULT_TEETH.q2, true)}
                </div>
              </div>
            </div>

            {/* SECTION 2: DECIDUOUS UPPER */}
            <div className="relative z-10 my-2">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
                <div className="grid grid-cols-8 gap-0.5 pr-1">
                  <div className="col-span-3" />
                  {renderArchRow(PEDIATRIC_TEETH.q5, true)}
                </div>
                <div className="grid grid-cols-8 gap-0.5 pl-1">
                  {renderArchRow(PEDIATRIC_TEETH.q6, true)}
                  <div className="col-span-3" />
                </div>
              </div>
            </div>

            {/* Horizontal Blue Divider */}
            <div className="relative my-3">
              <div className="w-full h-0.5 bg-blue-600" />
            </div>

            {/* SECTION 3: DECIDUOUS LOWER */}
            <div className="relative z-10 my-2">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
                <div className="grid grid-cols-8 gap-0.5 pr-1">
                  <div className="col-span-3" />
                  {renderArchRow(PEDIATRIC_TEETH.q8, false)}
                </div>
                <div className="grid grid-cols-8 gap-0.5 pl-1">
                  {renderArchRow(PEDIATRIC_TEETH.q7, false)}
                  <div className="col-span-3" />
                </div>
              </div>
            </div>

            {/* SECTION 4: PERMANENT LOWER ARCH */}
            <div className="relative z-10 mt-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1 pb-1">
                <span>48 - 41 (INFERIOR DERECHO)</span>
                <span className="text-sky-600 font-extrabold uppercase">Mandíbula Inferior</span>
                <span>31 - 38 (INFERIOR IZQUIERDO)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
                <div className="grid grid-cols-8 gap-0.5 pr-1">
                  {renderArchRow(ADULT_TEETH.q4, false)}
                </div>
                <div className="grid grid-cols-8 gap-0.5 pl-1">
                  {renderArchRow(ADULT_TEETH.q3, false)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tooth Action & Status Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Pieza Seleccionada: <strong className="text-sky-600 text-sm tabular-nums">#{selectedToothNumber}</strong>
              </span>
              <span className="text-slate-400">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Estatus Clínico:</span>
                <select
                  value={selectedToothCondition?.statusSequence || 'pendiente'}
                  onChange={(e) => handleToothStatusChange(selectedToothNumber, e.target.value as any)}
                  className={`px-2 py-0.5 rounded font-bold text-xs border outline-none ${
                    selectedToothCondition?.statusSequence === 'finalizado'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedToothCondition?.statusSequence === 'en_tratamiento'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_tratamiento">En Tratamiento</option>
                  <option value="finalizado">Finalizado (Cobro)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clearTooth(selectedToothNumber)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Pieza #{selectedToothNumber}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
