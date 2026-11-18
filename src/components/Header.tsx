import React from 'react';
import { useDental } from '../context/DentalContext';
import { 
  Sun, 
  Moon, 
  Calendar, 
  Search,
  Printer,
  ArrowLeft
} from 'lucide-react';

interface HeaderProps {
  onOpenNewAppointment: () => void;
  onOpenNewPatient: () => void;
  onOpenPatientSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewAppointment, onOpenNewPatient: _onOpenNewPatient, onOpenPatientSearch }) => {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    selectedPatient,
    patients,
    setSelectedPatientId,
    currentTab,
    setCurrentTab,
    rates,
    syncExchangeRatesNow,
    isSyncingRates,
    clinicConfig
  } = useDental();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors print:hidden">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        
        {/* Zone 1: Wordmark */}
        <div 
          onClick={() => setCurrentTab('inicio')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
          title="Ir a Inicio - Clínica Corona"
        >
          {clinicConfig.logoUrl ? (
            <img src={clinicConfig.logoUrl} alt={clinicConfig.clinicName} className="w-9 h-9 rounded-xl object-contain border border-sky-100" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-xs font-bold text-base">
              🦷
            </div>
          )}
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap block leading-none group-hover:text-sky-600 transition">
              CLINICA CORONA
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase font-mono tabular-nums">
              <span>
                USD {rates.usdBcv.toFixed(2)} · EUR {rates.eurBcv.toFixed(2)} · BINANCE {rates.binanceUsdt.toFixed(2)} Bs
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  syncExchangeRatesNow(false);
                }}
                disabled={isSyncingRates}
                title="Sincronizar tasas USD BCV, EUR BCV y Binance"
                className="text-sky-600 hover:text-sky-500 font-sans font-bold underline disabled:opacity-50"
              >
                {isSyncingRates ? 'Sincronizando...' : 'Sync'}
              </button>
            </div>
          </div>
        </div>

        {/* Zone 2: Patient Context (Hidden on main dashboard 'inicio' until user selects a patient) */}
        {currentTab !== 'inicio' ? (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">Paciente activo:</span>
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={patients.length === 0}
                aria-label="Seleccionar paciente activo"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none font-medium focus:border-sky-500 max-w-[190px] disabled:opacity-60"
              >
                {patients.length === 0 ? (
                  <option value="">Sin pacientes registrados</option>
                ) : (
                  patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.patientInactive ? (p.inactiveReason === 'fallecimiento' ? ' (Fallecido)' : ' (Inactivo)') : ''}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={onOpenPatientSearch}
                className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition border border-sky-200 dark:border-sky-800 flex items-center gap-1 text-[11px] font-semibold px-2"
                title="Búsqueda avanzada de paciente"
              >
                <Search className="w-3 h-3" />
                <span className="hidden xl:inline">Buscar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center text-[11px] text-slate-400 font-medium">
            <span>Panel Principal · Seleccione un módulo o paciente para iniciar</span>
          </div>
        )}

        {/* Zone 3: Quick Action, Return Home, Print & Theme Switch */}
        <div className="flex items-center gap-2 shrink-0">
          {currentTab !== 'inicio' && (
            <button
              type="button"
              onClick={() => setCurrentTab('inicio')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition whitespace-nowrap"
              title="Volver al Panel Principal (Inicio)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-600" />
              <span>Inicio</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewAppointment}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition shadow-xs whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>+ Cita</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Imprimir o Exportar PDF"
            title="Imprimir / Exportar PDF"
            className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Activar modo día' : 'Activar modo oscuro'}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isDarkMode ? 'Modo Día (Clínico)' : 'Modo Quirófano (Oscuro)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
