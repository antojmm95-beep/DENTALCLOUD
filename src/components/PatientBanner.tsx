import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { isPatientNotifiable } from '../utils/dentalCalc';
import {
  AlertTriangle,
  MessageSquare,
  Printer,
  ChevronDown,
  FileText,
  CreditCard,
  Phone,
  IdCard,
  UserCheck,
  BellOff,
  X
} from 'lucide-react';

type PrintableDocType = 'ficha_historia' | 'estado_cuenta';

export const PatientBanner: React.FC = () => {
  const {
    selectedPatient,
    currentTab,
    setCurrentTab,
    generateDirectWhatsAppUrl,
    exchangeRate,
    evolutions,
    budgets,
    payments,
    clinicConfig
  } = useDental();

  const [menuOpen, setMenuOpen] = useState(false);
  const [printPreviewDoc, setPrintPreviewDoc] = useState<PrintableDocType | null>(null);

  if (!selectedPatient) return null;

  const hasAllergies =
    selectedPatient.allergies &&
    selectedPatient.allergies.length > 0 &&
    !selectedPatient.allergies.every(a => a.toUpperCase() === 'NO APLICA' || a.toUpperCase() === 'NINGUNA');

  const hasSystemic =
    selectedPatient.systemicConditions &&
    selectedPatient.systemicConditions.length > 0 &&
    !selectedPatient.systemicConditions.every(s => s.toUpperCase() === 'NO APLICA' || s.toUpperCase() === 'NINGUNA');

  const waUrl = generateDirectWhatsAppUrl(
    selectedPatient.phone,
    `Hola ${selectedPatient.name.split(' ')[0]}, te escribimos desde ${clinicConfig.clinicName}.`
  );

  const patientEvolutions = evolutions.filter(e => e.patientId === selectedPatient.id);
  const patientBudgets = budgets.filter(b => b.patientId === selectedPatient.id);
  const patientPayments = payments.filter(p => p.patientId === selectedPatient.id);

  const triggerPrint = (doc: PrintableDocType) => {
    setMenuOpen(false);
    setPrintPreviewDoc(doc);
  };

  const patientBlocked = !isPatientNotifiable(selectedPatient);

  return (
    <>
      <section
        aria-label="Expediente Unificado del Paciente"
        className={`mb-5 bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-sm ${
          patientBlocked
            ? 'border-rose-300 dark:border-rose-800/80'
            : 'border-sky-200/80 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Patient Core Identity */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center flex-shrink-0 border border-sky-200 dark:border-sky-800">
              {selectedPatient.photoUrl ? (
                <img
                  src={selectedPatient.photoUrl}
                  alt={selectedPatient.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {selectedPatient.name}
                </h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedPatient.age} años
                </span>
                {patientBlocked && (
                  <span
                    data-testid="banner-inactive-badge"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold"
                  >
                    <BellOff className="w-3 h-3 text-rose-400" />
                    {selectedPatient.inactiveReason === 'fallecimiento'
                      ? `Fallecido${selectedPatient.deceasedDate ? ` (${selectedPatient.deceasedDate})` : ''} · Notif. bloqueadas`
                      : 'Inactivo · Notif. bloqueadas'}
                  </span>
                )}
                {hasAllergies && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    Alergias: {selectedPatient.allergies.join(', ')}
                  </span>
                )}
                {hasSystemic && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    Sistémica: {selectedPatient.systemicConditions.join(', ')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-400">
                {selectedPatient.historyNumber && (
                  <span
                    data-testid="banner-patient-id"
                    className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px]"
                  >
                    ID #{selectedPatient.historyNumber}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <IdCard className="w-3.5 h-3.5 text-sky-600" />
                  {selectedPatient.cedula}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-sky-600" />
                  {selectedPatient.phone || 'Sin teléfono'}
                </span>
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  Saldo Pendiente:{' '}
                  <span className={selectedPatient.balance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 font-bold'}>
                    ${selectedPatient.balance.toFixed(2)}
                  </span>{' '}
                  <span className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300 whitespace-nowrap">
                    (Bs. {(selectedPatient.balance * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {patientBlocked ? (
              <span
                title="Envío bloqueado porque el paciente está inactivo o fallecido"
                data-testid="banner-whatsapp-blocked"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed whitespace-nowrap"
              >
                <BellOff className="w-3.5 h-3.5" />
                Notif. Bloqueadas
              </span>
            ) : (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}

            {/* PDF / Imprimir Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF / Imprimir
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-40 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => triggerPrint('ficha_historia')}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    Ficha + Historia + Evoluciones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setCurrentTab('odontograma');
                      setTimeout(() => window.print(), 200);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <Printer className="w-4 h-4 text-sky-600" />
                    Odontodiagrama Clínico
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPrint('estado_cuenta')}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    Estado de Cuenta ($ y Bs.)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Patient Sub-Navigation Bar in Exact User-Requested Order */}
        <nav
          aria-label="Módulos del Paciente"
          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs font-semibold"
        >
          {(
            [
              { id: 'pacientes', label: 'Historia' },
              { id: 'odontograma', label: 'Odontodiagrama' },
              { id: 'presupuestos', label: 'Presupuesto' },
              { id: 'secuencia_ttos', label: 'Secuencia de Ttos' },
              { id: 'imagenes', label: 'Archivos' },
              { id: 'recipes', label: 'Récipes' },
              { id: 'consentimientos', label: 'Consentimientos' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                currentTab === tab.id
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {/* Printable Report Preview Modal */}
      {printPreviewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl print-area">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600">{clinicConfig.clinicName}</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {printPreviewDoc === 'ficha_historia' && 'Resumen de Historia Clínica y Evoluciones'}
                  {printPreviewDoc === 'estado_cuenta' && 'Estado de Cuenta del Paciente'}
                </h3>
                <p className="text-xs text-slate-500">
                  RIF: {clinicConfig.rif} · Tel: {clinicConfig.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrintPreviewDoc(null)}
                aria-label="Cerrar vista de impresión"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 print:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-sky-50/70 dark:bg-slate-800/70 p-3.5 rounded-xl text-xs mb-4">
              <div>
                <span className="text-slate-500">Paciente:</span>{' '}
                <strong className="text-slate-900 dark:text-white">{selectedPatient.name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Cédula:</span>{' '}
                <strong className="tabular-nums">{selectedPatient.cedula}</strong>
              </div>
              <div>
                <span className="text-slate-500">Teléfono:</span>{' '}
                <strong className="tabular-nums">{selectedPatient.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500">Alergias:</span>{' '}
                <strong className={hasAllergies ? 'text-rose-600' : ''}>
                  {selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(', ') : 'Ninguna'}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Enfermedades Sistémicas:</span>{' '}
                <strong className={hasSystemic ? 'text-amber-700' : ''}>
                  {selectedPatient.systemicConditions?.length > 0 ? selectedPatient.systemicConditions.join(', ') : 'Ninguna'}
                </strong>
              </div>
            </div>

            {printPreviewDoc === 'ficha_historia' && (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Evoluciones Registradas ({patientEvolutions.length})</h4>
                {patientEvolutions.length === 0 ? (
                  <p className="text-slate-500 italic">Sin evoluciones registradas aún.</p>
                ) : (
                  patientEvolutions.map(ev => (
                    <div key={ev.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{ev.procedure}</span>
                        <span className="tabular-nums text-slate-500">{ev.date} · {ev.doctorName}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{ev.evolutionText}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {printPreviewDoc === 'estado_cuenta' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Total Facturado</p>
                    <p className="text-base font-bold tabular-nums">${selectedPatient.totalBilled.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Saldo Pendiente USD</p>
                    <p className="text-base font-bold text-rose-600 tabular-nums">${selectedPatient.balance.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Equivalente Bs.</p>
                    <p className="text-base font-bold text-sky-600 tabular-nums">
                      Bs. {(selectedPatient.balance * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Presupuestos ({patientBudgets.length}) y Pagos ({patientPayments.length})</h4>
                  <ul className="space-y-1.5">
                    {patientPayments.map(p => (
                      <li key={p.id} className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <span>{p.receiptNumber} · {p.concept}</span>
                        <strong className="tabular-nums text-emerald-600">${p.amount.toFixed(2)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
              <button
                type="button"
                onClick={() => setPrintPreviewDoc(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
              >
                <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
