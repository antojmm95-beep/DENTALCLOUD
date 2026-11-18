import React, { useState, useMemo, useEffect } from 'react';
import { useDental } from '../context/DentalContext';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizePatientNumericId } from '../utils/patientImportParser';
import { paginateList } from '../utils/dentalCalc';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient?: (patientId: string) => void;
}

type SearchField =
  | 'nombre'
  | 'apellido'
  | 'cedula'
  | 'email'
  | 'nro_migracion'
  | 'telf_celular'
  | 'telf_habitacion'
  | 'nro_historia_rh';

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient
}) => {
  const { patients, selectedPatientId, setSelectedPatientId, setCurrentTab } = useDental();

  const [searchField, setSearchField] = useState<SearchField>('nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchField, includeInactive]);

  const formattedPatients = useMemo(() => {
    return patients
      .filter(p => includeInactive || !p.patientInactive)
      .map((p, index) => {
        const parts = p.name.trim().split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || p.name;
        const histNumber = sanitizePatientNumericId(p.historyNumber || p.migrationHistory, index + 1);
        const statusText =
          p.inactiveReason === 'fallecimiento'
            ? 'FALLECIDO'
            : p.patientInactive
              ? 'INACTIVO'
              : 'ACTIVO';

        return {
          ...p,
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          cedulaFormatted: p.cedula.startsWith('V-') || p.cedula.startsWith('E-') ? p.cedula : `V-${p.cedula}`,
          historiaMigra: histNumber,
          historiaRH: histNumber,
          telfCelular: p.phone || p.phones?.mobile || '—',
          telfHab: p.phones?.home || '—',
          emailClean: p.email || '—',
          statusText
        };
      });
  }, [patients, includeInactive]);

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return formattedPatients;

    return formattedPatients.filter(p => {
      switch (searchField) {
        case 'nombre':
          return p.firstName.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
        case 'apellido':
          return p.lastName.toLowerCase().includes(q);
        case 'cedula':
          return p.cedula.toLowerCase().includes(q) || p.cedulaFormatted.toLowerCase().includes(q);
        case 'email':
          return p.emailClean.toLowerCase().includes(q);
        case 'nro_migracion':
          return p.historiaMigra.toLowerCase().includes(q);
        case 'telf_celular':
          return p.telfCelular.toLowerCase().includes(q);
        case 'telf_habitacion':
          return p.telfHab.toLowerCase().includes(q);
        case 'nro_historia_rh':
          return String(p.historiaRH).toLowerCase().includes(q);
        default:
          return p.name.toLowerCase().includes(q);
      }
    });
  }, [formattedPatients, searchTerm, searchField]);

  const pagination = useMemo(
    () => paginateList(filteredPatients, currentPage, 20),
    [filteredPatients, currentPage]
  );

  if (!isOpen) return null;

  const handleSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (onSelectPatient) {
      onSelectPatient(patientId);
    } else {
      setCurrentTab('pacientes');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800 border-b border-sky-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sky-700 dark:text-sky-300 font-bold text-sm flex items-center gap-1.5">
              🦷 Búsqueda de Paciente
            </span>
            <span className="text-xs text-slate-400">:: RHSistema · Clínica Corona</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda de paciente"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Controls Panel */}
        <div className="p-4 bg-sky-50/40 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-6 p-3 rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
              <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 block mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                Tipo de Búsqueda
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1.5 gap-x-2 text-xs">
                {[
                  { id: 'nombre', label: 'Nombre' },
                  { id: 'apellido', label: 'Apellido' },
                  { id: 'cedula', label: 'Cédula' },
                  { id: 'email', label: 'Correo' },
                  { id: 'nro_migracion', label: 'Nro. Hist.' },
                  { id: 'telf_celular', label: 'Telf. Celular' },
                  { id: 'telf_habitacion', label: 'Telf. Hab.' },
                  { id: 'nro_historia_rh', label: 'Nro. RH' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px]">
                    <input
                      type="radio"
                      name="tipoBusqueda"
                      checked={searchField === opt.id}
                      onChange={() => setSearchField(opt.id as SearchField)}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col justify-between h-full pt-1 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Búsqueda:
                </span>
                <input
                  type="text"
                  autoFocus
                  aria-label="Campo de búsqueda de paciente"
                  placeholder={`Buscar por ${searchField.replace('_', ' ')}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-sky-300 dark:border-slate-600 rounded-md outline-none focus:ring-2 focus:ring-sky-400 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pl-7">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="rounded text-sky-600"
                  />
                  <span>Incluir Pacientes Inactivos / Fallecidos</span>
                </label>

                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 tabular-nums">
                  {filteredPatients.length} paciente(s) encontrados
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-gradient-to-r from-sky-100/95 to-blue-50/95 dark:from-slate-800 dark:to-slate-800 text-sky-950 dark:text-sky-200 border-b border-sky-200 dark:border-slate-700 text-[11px] font-semibold">
              <tr>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-center">ID Hist.</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Nombre</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Apellido</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Cédula</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Telf. Celular</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Telf. Hab.</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Email</th>
                <th className="py-2 px-3 text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {pagination.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic font-sans">
                    No se encontraron pacientes con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                pagination.items.map(p => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelect(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-100/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold'
                          : 'hover:bg-sky-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-sky-700 dark:text-sky-300">
                        {p.historiaRH}
                      </td>
                      <td className="py-2 px-3 font-sans font-medium uppercase border-r border-slate-100 dark:border-slate-800">
                        {p.firstName}
                      </td>
                      <td className="py-2 px-3 font-sans font-medium uppercase border-r border-slate-100 dark:border-slate-800">
                        {p.lastName}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {p.cedulaFormatted}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.telfCelular}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-500 whitespace-nowrap">
                        {p.telfHab}
                      </td>
                      <td className="py-2 px-3 font-sans border-r border-slate-100 dark:border-slate-800 text-slate-500 max-w-[180px] truncate">
                        {p.emailClean}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                            p.statusText === 'FALLECIDO'
                              ? 'bg-slate-800 text-white dark:bg-slate-700'
                              : p.statusText === 'INACTIVO'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {p.statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-[11px] tabular-nums">
            {pagination.totalItems === 0
              ? '0 resultados'
              : `Mostrando ${pagination.startIndex}–${pagination.endIndex} de ${pagination.totalItems} pacientes · Página ${pagination.page} de ${pagination.totalPages}`}
          </span>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs disabled:opacity-40 hover:bg-slate-100"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded font-semibold text-xs"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
