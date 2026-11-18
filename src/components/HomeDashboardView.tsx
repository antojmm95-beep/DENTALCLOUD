import React, { useState, useEffect, useRef } from 'react';
import { useDental, NavTab } from '../context/DentalContext';
import {
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  Clock,
  Stethoscope,
  Building2,
  RefreshCw,
  Receipt,
  Search,
  SlidersHorizontal,
  Settings,
  ChevronDown,
  FlaskConical,
  Cake,
  CalendarClock,
  TrendingUp
} from 'lucide-react';

interface HomeDashboardViewProps {
  onOpenPatientSearch?: () => void;
}

type TopMenuKey =
  | 'mantenimiento'
  | 'plantillas'
  | 'procesos'
  | 'administrativo'
  | 'laboratorios'
  | 'auditoria'
  | 'parametros';

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({ onOpenPatientSearch }) => {
  const {
    setCurrentTab,
    exchangeRate,
    rates,
    updateRates,
    syncExchangeRatesNow,
    isSyncingRates,
    appointments,
    patients,
    activeDoctor,
    doctors,
    birthdayPatients,
    sendBirthdayGreetingWA
  } = useDental();

  const [celebrationPatient, setCelebrationPatient] = useState<any | null>(null);
  const [showBirthdayListModal, setShowBirthdayListModal] = useState(false);
  const [quickCalcAmount, setQuickCalcAmount] = useState('50');
  const [calcCurrency, setCalcCurrency] = useState<'USD' | 'EUR' | 'BINANCE'>('USD');

  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');
  const [editingCurrency, setEditingCurrency] = useState<'usdBcv' | 'eurBcv' | 'binanceUsdt' | null>(null);
  const [tempRate, setTempRate] = useState(String(exchangeRate));
  const [openMenu, setOpenMenu] = useState<TopMenuKey | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setDateString(now.toISOString().split('T')[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(ev.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(tempRate);
    if (!isNaN(num) && num > 0 && editingCurrency) {
      updateRates({ [editingCurrency]: num }, 'Edición Manual Tablero Principal');
      setEditingCurrency(null);
    }
  };

  const navigateAndEmit = (tab: NavTab, eventName?: string, detail?: string) => {
    setOpenMenu(null);
    setCurrentTab(tab);
    if (eventName && detail) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      }, 30);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter(a => a.date === todayStr || a.date === '2026-11-10');
  const confirmedApts = appointments.filter(a => a.status === 'confirmada');
  const activePatientsCount = patients.filter(p => !p.patientInactive).length;
  const activeBirthdays =
    birthdayPatients.length > 0
      ? birthdayPatients
      : patients.filter(p => !p.patientInactive && (p.id === 'pat-1' || p.birthDate?.includes('11-11'))).slice(0, 3);

  const activeCalcRate =
    calcCurrency === 'EUR' ? rates.eurBcv : calcCurrency === 'BINANCE' ? rates.binanceUsdt : rates.usdBcv;

  const TOP_MENUS: Array<{
    key: TopMenuKey;
    label: string;
    items: Array<{ label: string; action: () => void }>;
  }> = [
    {
      key: 'mantenimiento',
      label: 'Mantenimiento',
      items: [
        {
          label: 'Buscar Paciente',
          action: () => {
            setOpenMenu(null);
            onOpenPatientSearch?.();
          }
        },
        {
          label: 'Historia Clínica · Datos Personales',
          action: () => navigateAndEmit('pacientes', 'corona:open-clinical-subtab', 'datos_personales')
        },
        {
          label: 'Anamnesis & Alergias',
          action: () => navigateAndEmit('pacientes', 'corona:open-clinical-subtab', 'anamnesis')
        },
        {
          label: 'Doctores & Especialistas',
          action: () => navigateAndEmit('doctores')
        }
      ]
    },
    {
      key: 'plantillas',
      label: 'Plantillas',
      items: [
        { label: 'Presupuestos & Fases', action: () => navigateAndEmit('presupuestos') },
        { label: 'Récipes Médicos', action: () => navigateAndEmit('recipes') },
        { label: 'Consentimientos Informados', action: () => navigateAndEmit('consentimientos') },
        { label: 'Plantillas WhatsApp', action: () => navigateAndEmit('configuracion', 'corona:open-config-subtab', 'clinica') }
      ]
    },
    {
      key: 'procesos',
      label: 'Procesos Masivos',
      items: [
        { label: 'Importar Pacientes (Excel / PDF)', action: () => navigateAndEmit('configuracion', 'corona:open-config-subtab', 'importar') },
        { label: 'Campañas WhatsApp', action: () => navigateAndEmit('whatsapp') },
        {
          label: `Cumpleaños del Día (${activeBirthdays.length})`,
          action: () => {
            setOpenMenu(null);
            setShowBirthdayListModal(true);
          }
        },
        { label: 'Ajuste Masivo Tabulador', action: () => navigateAndEmit('tabulador') }
      ]
    },
    {
      key: 'administrativo',
      label: 'Administrativo',
      items: [
        { label: 'Cajas y Recibos', action: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'recibos') },
        { label: 'Cierre de Caja (Diario / Semanal / Mensual)', action: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'cierre') },
        { label: 'Multi-Pagos & Facturación SENIAT', action: () => navigateAndEmit('multi_pagos') },
        { label: 'Gestión de Cuotas', action: () => navigateAndEmit('cuotas') },
        { label: 'Gastos & Contabilidad', action: () => navigateAndEmit('administracion') }
      ]
    },
    {
      key: 'laboratorios',
      label: 'Laboratorios',
      items: [
        { label: 'Gastos de Laboratorio Dental', action: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'laboratorio') },
        { label: 'Registrar Orden / Gasto Lab', action: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'laboratorio') }
      ]
    },
    {
      key: 'auditoria',
      label: 'Auditoría',
      items: [
        { label: 'Reportes Clínicos y Financieros', action: () => navigateAndEmit('reportes') },
        { label: 'Historial de Cierres de Caja', action: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'historial') },
        { label: 'Rendimiento & Costo Hora-Sillón', action: () => navigateAndEmit('rendimiento') }
      ]
    },
    {
      key: 'parametros',
      label: 'Parámetros',
      items: [
        { label: 'Tabulador & Tasas de Cambio', action: () => navigateAndEmit('tabulador') },
        { label: 'Configuración de Clínica', action: () => navigateAndEmit('configuracion', 'corona:open-config-subtab', 'clinica') },
        { label: 'Roles y Permisos', action: () => navigateAndEmit('configuracion', 'corona:open-config-subtab', 'roles') },
        { label: 'Depuración & Respaldos', action: () => navigateAndEmit('configuracion', 'corona:open-config-subtab', 'respaldos') }
      ]
    }
  ];

  const LAUNCHER_ICONS: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    badge?: string;
    onClick: () => void;
  }> = [
    {
      id: 'buscar',
      label: 'Buscar Paciente',
      icon: Search,
      tone: 'text-sky-700 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      badge: `${activePatientsCount}`,
      onClick: () => (onOpenPatientSearch ? onOpenPatientSearch() : setCurrentTab('pacientes'))
    },
    {
      id: 'pacientes',
      label: 'Historia Clínica',
      icon: Users,
      tone: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      onClick: () => setCurrentTab('pacientes')
    },
    {
      id: 'agenda',
      label: 'Agenda / Citas',
      icon: Calendar,
      tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      badge: `${todayApts.length} hoy`,
      onClick: () => setCurrentTab('agenda')
    },
    {
      id: 'doctores',
      label: 'Doctores',
      icon: Stethoscope,
      tone: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      badge: `${doctors.length}`,
      onClick: () => setCurrentTab('doctores')
    },
    {
      id: 'pagos',
      label: 'Cajas & Recibos',
      icon: Receipt,
      tone: 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
      onClick: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'recibos')
    },
    {
      id: 'laboratorio',
      label: 'Laboratorios',
      icon: FlaskConical,
      tone: 'text-fuchsia-700 bg-fuchsia-50 dark:bg-fuchsia-950/60 border-fuchsia-200 dark:border-fuchsia-800',
      onClick: () => navigateAndEmit('pagos', 'corona:open-payments-section', 'laboratorio')
    },
    {
      id: 'multi_pagos',
      label: 'Multi-Pagos SENIAT',
      icon: DollarSign,
      tone: 'text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
      onClick: () => setCurrentTab('multi_pagos')
    },
    {
      id: 'cuotas',
      label: 'Cuotas & Crédito',
      icon: CalendarClock,
      tone: 'text-orange-700 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800',
      onClick: () => setCurrentTab('cuotas')
    },
    {
      id: 'tabulador',
      label: 'Tabulador & Tasas',
      icon: SlidersHorizontal,
      tone: 'text-sky-700 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      onClick: () => setCurrentTab('tabulador')
    },
    {
      id: 'administracion',
      label: 'Gastos & Contab.',
      icon: Building2,
      tone: 'text-slate-700 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
      onClick: () => setCurrentTab('administracion')
    },
    {
      id: 'rendimiento',
      label: 'Rendimiento',
      icon: TrendingUp,
      tone: 'text-cyan-700 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
      onClick: () => setCurrentTab('rendimiento')
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: BarChart3,
      tone: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      onClick: () => setCurrentTab('reportes')
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      tone: 'text-green-700 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800',
      onClick: () => setCurrentTab('whatsapp')
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      tone: 'text-slate-700 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
      onClick: () => setCurrentTab('configuracion')
    }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Desktop Shell Container (RHSistema Single-Screen Launcher) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-visible">
        {/* Top System Strip: Currency Rates + Dropdown Categories */}
        <div
          ref={menuContainerRef}
          className="px-4 py-2.5 bg-gradient-to-r from-slate-100 via-sky-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-1.5">
              🦷 CLINICA CORONA
            </span>
            <span className="text-slate-400">::</span>

            {/* Live 3-Currency Exchange Rate Strip */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {(
                [
                  {
                    key: 'usdBcv',
                    label: 'Dólar BCV',
                    value: rates.usdBcv,
                    unit: 'Bs/$',
                    tone: 'bg-sky-100/80 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200'
                  },
                  {
                    key: 'eurBcv',
                    label: 'Euro BCV',
                    value: rates.eurBcv,
                    unit: 'Bs/€',
                    tone: 'bg-indigo-100/80 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
                  },
                  {
                    key: 'binanceUsdt',
                    label: 'Binance',
                    value: rates.binanceUsdt,
                    unit: 'Bs/USDT',
                    tone: 'bg-amber-100/80 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }
                ] as const
              ).map(item =>
                editingCurrency === item.key ? (
                  <form key={item.key} onSubmit={handleSaveRate} className="flex items-center gap-1">
                    <span className="text-[10px] font-sans font-bold text-slate-600 dark:text-slate-300">
                      {item.label}:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={tempRate}
                      onChange={e => setTempRate(e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-sky-400 rounded outline-none font-bold text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button type="submit" className="px-1.5 py-0.5 bg-sky-600 text-white text-[10px] rounded font-bold">
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCurrency(null)}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded"
                    >
                      X
                    </button>
                  </form>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTempRate(String(item.value));
                      setEditingCurrency(item.key);
                    }}
                    className={`font-bold px-2 py-0.5 rounded border hover:opacity-90 transition flex items-center gap-1 ${item.tone}`}
                    title={`Clic para ajustar tasa ${item.label}`}
                  >
                    <span className="font-sans text-[10px] font-semibold opacity-80">{item.label}:</span>
                    <span>
                      {item.value.toFixed(2)} {item.unit}
                    </span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => syncExchangeRatesNow(false)}
                disabled={isSyncingRates}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[10px] flex items-center gap-1 disabled:opacity-60 transition"
                title="Actualizar tasas automáticamente desde fuentes públicas (BCV / Binance)"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingRates ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncingRates ? 'Actualizando...' : rates.autoSyncEnabled ? 'Auto-Sync ON' : 'Sincronizar'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive RHSistema Category Menu Bar */}
          <nav aria-label="Menú principal RHSistema" className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {TOP_MENUS.map(menu => {
              const isOpen = openMenu === menu.key;
              return (
                <div key={menu.key} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMenu(prev => (prev === menu.key ? null : menu.key))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                      isOpen
                        ? 'bg-sky-600 text-white'
                        : 'hover:bg-sky-100/70 dark:hover:bg-slate-700 hover:text-sky-700 dark:hover:text-sky-300'
                    }`}
                  >
                    <span>{menu.label}</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                  </button>

                  {isOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1.5 text-xs">
                      {menu.items.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={item.action}
                          className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300 font-medium transition"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Hero Greeting Banner */}
        <div className="p-6 lg:p-7 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-b from-white via-slate-50/60 to-white dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
              <span className="text-3xl">🦷</span>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Sistema Integral de Gestión Odontológica
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                <span>Bienvenido(a) Dr(a):</span>
                <span className="text-sky-600 dark:text-sky-400 uppercase">
                  {activeDoctor.name.replace(/^Dr\.\s*|^Dra\.\s*/i, '') || 'ANTONIO MORERA'}
                </span>
              </h1>

              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  By <strong>RHSISTEMA.COM</strong>
                </span>
                <span>·</span>
                <span>
                  Telf: <strong>+58-424-2140058</strong>
                </span>
                <span>·</span>
                <span className="text-sky-600 dark:text-sky-400">@rh_sistema</span>
                <span>·</span>
                <span className="font-mono text-emerald-600">{activeDoctor.assignedBox}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end text-center md:text-right">
            <div className="flex items-center gap-2 justify-center md:justify-end mb-1.5">
              <span className="px-3 py-1 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-sky-700 dark:text-sky-300 font-black tracking-widest text-xs uppercase rounded-lg">
                CORONA CLÍNICA ODONTOLÓGICA
              </span>
            </div>
            <div className="font-mono text-xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums flex items-center gap-2 justify-center md:justify-end">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>{timeString || '05:07:11 p. m.'}</span>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              {dateString || '2026-11-10'}
            </div>
          </div>
        </div>

        {/* Clean Desktop Launcher Icon Grid (2 Crisp Rows, No Stacked Clutter) */}
        <div className="p-5 bg-slate-50/70 dark:bg-slate-800/30">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seleccione un módulo para abrir su página dedicada
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Cada herramienta abre en pantalla independiente
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
            {LAUNCHER_ICONS.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-[1.03] hover:shadow-md cursor-pointer relative group min-h-[86px] ${item.tone}`}
                >
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 tabular-nums">
                      {item.badge}
                    </span>
                  )}
                  <Icon className="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
                  <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compact 1-Row Footer Status & Quick Rate Converter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setCurrentTab('pacientes')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-left hover:border-sky-300 transition flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Pacientes Activos</p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {activePatientsCount}
            </p>
          </div>
          <span className="text-[11px] font-bold text-sky-600">Historias →</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('agenda')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-left hover:border-sky-300 transition flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Agenda del Día</p>
            <p className="text-xl font-black text-sky-600 tabular-nums mt-0.5">{todayApts.length} citas</p>
            <p className="text-[10px] text-amber-600 font-semibold">{confirmedApts.length} confirmadas</p>
          </div>
          <span className="text-[11px] font-bold text-sky-600">Ver Agenda →</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBirthdayListModal(true)}
          className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 shadow-xs text-left hover:border-amber-400 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Cake className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">Cumpleaños Hoy</p>
              <p className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums leading-tight">
                {activeBirthdays.length} paciente(s)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Felicitar →</span>
        </button>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-sky-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Conversor Rápido Bs.</span>
            <button
              type="button"
              onClick={() => updateRates({ autoSyncEnabled: !rates.autoSyncEnabled }, 'Preferencia Auto-Sync')}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                rates.autoSyncEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              {rates.autoSyncEnabled ? 'Auto ON' : 'Manual'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <input
              type="number"
              value={quickCalcAmount}
              onChange={e => setQuickCalcAmount(e.target.value)}
              aria-label="Calculadora rápida divisa"
              className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
            />
            <select
              value={calcCurrency}
              onChange={e => setCalcCurrency(e.target.value as any)}
              aria-label="Seleccionar divisa calculadora"
              className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BINANCE">Binance</option>
            </select>
            <span className="ml-auto text-xs font-black text-sky-700 dark:text-sky-300 font-mono tabular-nums truncate">
              Bs. {((parseFloat(quickCalcAmount) || 0) * activeCalcRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL: LISTA DE CUMPLEAÑEROS DEL DÍA */}
      {showBirthdayListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Cake className="w-4 h-4" />
                <span>Cumpleañeros del Día ({activeBirthdays.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBirthdayListModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto text-xs">
              {activeBirthdays.length === 0 ? (
                <p className="text-center text-slate-400 italic py-6">
                  No hay pacientes registrados cumpliendo años hoy.
                </p>
              ) : (
                activeBirthdays.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.name} <span className="text-amber-600">({p.age} años)</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{p.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBirthdayListModal(false);
                        setCelebrationPatient(p);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Felicitar</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FELICITACIÓN DE CUMPLEAÑOS CON IMAGEN DE LA CLÍNICA */}
      {celebrationPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎂</span>
                <div>
                  <h3 className="font-black text-sm">Felicitación de Cumpleaños</h3>
                  <p className="text-[11px] text-amber-100">Mensaje oficial Clínica Corona con imagen institucional</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCelebrationPatient(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="border border-sky-200 dark:border-sky-800 rounded-2xl overflow-hidden bg-gradient-to-b from-sky-50/80 via-white to-sky-50/80 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 shadow-sm p-5 text-center relative">
                <div className="flex justify-center mb-3">
                  <div className="px-4 py-2 bg-white dark:bg-slate-950 rounded-xl shadow-xs border border-sky-100 dark:border-sky-900 flex items-center gap-2">
                    <span className="text-2xl">🦷</span>
                    <div className="text-left">
                      <div className="text-xs font-black tracking-widest text-sky-700 dark:text-sky-300 uppercase">
                        CLÍNICA CORONA
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                        Odontología Especializada
                      </div>
                    </div>
                  </div>
                </div>

                <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] rounded-full mb-2">
                  🎉 ¡FELIZ CUMPLEAÑOS, {celebrationPatient.name}! 🎉
                </div>

                <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed max-w-sm mx-auto">
                  En nombre de todo el equipo de <strong>Clínica Corona</strong>, le deseamos un día extraordinario lleno de sonrisas, salud y felicidad.
                </p>

                <div className="mt-4 p-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-600 rounded-xl max-w-xs mx-auto">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                    🎁 Regalo Aniversario Especial:
                  </span>
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 block mt-0.5">
                    20% OFF en Limpieza Dental
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Válido durante todo el mes de su cumpleaños
                  </span>
                </div>

                <div className="mt-3 text-[10px] text-slate-400 font-mono">
                  📍 Caracas, Venezuela · Telf: +58-424-2140058 · @rh_sistema
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Destinatario:</span>
                  <span className="text-slate-900 dark:text-white">{celebrationPatient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Teléfono WhatsApp:</span>
                  <span className="font-mono text-sky-600">{celebrationPatient.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Anexo Institucional:</span>
                  <span className="text-emerald-600 font-bold">Tarjeta Digital Clínica Corona Incluida</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCelebrationPatient(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendBirthdayGreetingWA(celebrationPatient);
                    setCelebrationPatient(null);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
