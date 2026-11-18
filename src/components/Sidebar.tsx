import React from 'react';
import { useDental, NavTab } from '../context/DentalContext';
import {
  Home,
  Calendar,
  User,
  ClipboardCheck,
  FileText,
  CreditCard,
  Pill,
  MessageSquare,
  Smile,
  ShieldCheck,
  Stethoscope,
  Activity,
  Camera,
  BarChart3,
  DollarSign,
  Building2,
  TrendingUp,
  CalendarClock,
  SlidersHorizontal,
  Settings
} from 'lucide-react';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Principal',
    items: [
      { id: 'inicio', label: 'Tablero de Inicio', icon: Home },
      { id: 'agenda', label: 'Agendas & Salas', icon: Calendar }
    ]
  },
  {
    group: 'Contactos & Ingreso',
    items: [
      { id: 'pacientes', label: 'Historia Clínica', icon: User },
      { id: 'fichas_ingreso', label: 'Fichas de Ingreso', icon: ClipboardCheck, badge: 'QR' }
    ]
  },
  {
    group: 'Clínica y Archivos',
    items: [
      { id: 'odontograma', label: 'Odontodiagrama', icon: Smile },
      { id: 'secuencia_ttos', label: 'Secuencia de Ttos', icon: Activity, badge: 'Audio' },
      { id: 'imagenes', label: 'Archivos Digitales', icon: Camera },
      { id: 'recipes', label: 'Récipes Médicos', icon: Pill },
      { id: 'consentimientos', label: 'Consentimiento', icon: ShieldCheck }
    ]
  },
  {
    group: 'Caja y Presupuestos',
    items: [
      { id: 'presupuestos', label: 'Presupuestos & Fases', icon: FileText },
      { id: 'cuotas', label: 'Gestión de Cuotas', icon: CalendarClock },
      { id: 'multi_pagos', label: 'Multi-Pagos SENIAT', icon: CreditCard, badge: 'Fiscal' },
      { id: 'pagos', label: 'Cajas y Recibos', icon: DollarSign },
      { id: 'tabulador', label: 'Tabulador & Tasa', icon: SlidersHorizontal }
    ]
  },
  {
    group: 'Marketing & Personal',
    items: [
      { id: 'whatsapp', label: 'WhatsApp & Campañas', icon: MessageSquare, badge: 'Segm.' },
      { id: 'doctores', label: 'Doctores & Liquidación', icon: Stethoscope },
      { id: 'rendimiento', label: 'Rendimiento & Costos', icon: TrendingUp },
      { id: 'reportes', label: 'Reportes & Balance', icon: BarChart3 }
    ]
  },
  {
    group: 'Administración',
    items: [
      { id: 'administracion', label: 'Gastos & Contabilidad', icon: Building2 },
      { id: 'configuracion', label: 'Configuración & Roles', icon: Settings }
    ]
  }
];

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, selectedPatient, installmentPlans } = useDental();

  const overdueCuotas = installmentPlans.reduce(
    (acc, p) => acc + p.cuotas.filter(c => c.status === 'vencida').length,
    0
  );

  return (
    <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 print:hidden">
      <div className="p-3.5 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
        {NAV_GROUPS.map(group => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.group}
            </div>
            <nav className="flex flex-row lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/70 dark:border-sky-900/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.id === 'cuotas' && overdueCuotas > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-full tabular-nums">
                        {overdueCuotas}
                      </span>
                    )}

                    {item.badge && item.id !== 'agenda' && item.id !== 'cuotas' && (
                      <span className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[9px] font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Patient Active Status card in Sidebar bottom (hidden as active patient on inicio screen) */}
      <div className="hidden lg:block p-3.5 border-t border-slate-100 dark:border-slate-800">
        {currentTab === 'inicio' || !selectedPatient ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {currentTab === 'inicio' ? 'Pantalla Principal RHSistema' : 'Sin paciente activo'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              {currentTab === 'inicio'
                ? 'Seleccione un paciente desde Historia Clínica o Agenda para abrir su expediente.'
                : 'Registre o importe pacientes desde Historia Clínica para comenzar.'}
            </p>
            <button
              type="button"
              onClick={() => setCurrentTab('pacientes')}
              className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition"
            >
              {currentTab === 'inicio' ? 'Seleccionar Paciente' : 'Ir a Historia Clínica'}
            </button>
          </div>
        ) : (
          <div className={`p-3 rounded-xl border ${selectedPatient.patientInactive ? 'bg-slate-100 dark:bg-slate-800/80 border-rose-300 dark:border-rose-800' : 'bg-sky-50/70 dark:bg-slate-800/60 border-sky-100 dark:border-slate-700/60'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs ${selectedPatient.patientInactive ? 'bg-slate-600' : 'bg-sky-600'}`}>
                {selectedPatient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedPatient.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  C.I: {selectedPatient.cedula}
                </div>
              </div>
            </div>
            {selectedPatient.patientInactive && (
              <div className="mt-2 px-2 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                {selectedPatient.inactiveReason === 'fallecimiento' ? 'Fallecido · Notif. bloqueadas' : 'Inactivo · Notif. bloqueadas'}
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-sky-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Saldo:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                ${selectedPatient.balance.toFixed(2)} USD
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
