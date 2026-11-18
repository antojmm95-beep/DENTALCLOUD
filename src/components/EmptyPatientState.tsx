import React from 'react';
import { useDental } from '../context/DentalContext';
import { UserPlus, Upload, Users } from 'lucide-react';

interface EmptyPatientStateProps {
  moduleName?: string;
  onOpenNewPatient?: () => void;
  onOpenImport?: () => void;
}

export const EmptyPatientState: React.FC<EmptyPatientStateProps> = ({
  moduleName = 'este módulo clínico',
  onOpenNewPatient,
  onOpenImport
}) => {
  const { patients, setCurrentTab } = useDental();

  const handleGoImport = () => {
    if (onOpenImport) {
      onOpenImport();
      return;
    }
    setCurrentTab('pacientes');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('corona:open-clinical-subtab', { detail: 'importar' }));
    }, 20);
  };

  const handleGoNew = () => {
    if (onOpenNewPatient) {
      onOpenNewPatient();
      return;
    }
    setCurrentTab('pacientes');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center shadow-xs max-w-2xl mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
        <Users className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
        {patients.length === 0 ? 'No hay pacientes registrados en el sistema' : 'Sin paciente seleccionado'}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
        {patients.length === 0
          ? `La base de pacientes está limpia. Registra un nuevo paciente o importa tu listado en formato Excel / PDF para usar ${moduleName}.`
          : `Selecciona un paciente desde la barra superior o el buscador para trabajar en ${moduleName}.`}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleGoNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{onOpenNewPatient ? '+ Nuevo Paciente' : 'Ir a Historia Clínica'}</span>
        </button>

        <button
          type="button"
          onClick={handleGoImport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
        >
          <Upload className="w-4 h-4" />
          <span>Importar Pacientes (Excel / PDF)</span>
        </button>
      </div>
    </div>
  );
};
