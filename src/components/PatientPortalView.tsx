import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  CreditCard, 
  MessageSquare, 
  Pill, 
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const PatientPortalView: React.FC = () => {
  const { 
    selectedPatient, 
    budgets, 
    updateBudgetStatus, 
    appointments, 
    prescriptions,
    generateDirectWhatsAppUrl,
    setCurrentTab
  } = useDental();

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Active budget for patient
  const patientBudget = selectedPatient
    ? budgets.find(b => b.patientId === selectedPatient.id && b.status !== 'rechazado') || budgets[0]
    : undefined;
  const patientApt = selectedPatient ? appointments.find(a => a.patientId === selectedPatient.id) : undefined;
  const patientRx = selectedPatient ? prescriptions.find(p => p.patientId === selectedPatient.id) : undefined;

  const handleApproveBudget = () => {
    if (patientBudget) {
      updateBudgetStatus(patientBudget.id, 'aprobado');
      setPaymentSuccess(true);
    }
  };

  const handleConsultDoubts = () => {
    if (!selectedPatient) return;
    const text = `Hola DentalCloud 👋 Soy ${selectedPatient.name}, tengo una consulta sobre mi presupuesto dental ${patientBudget?.folio || ''}. ¿Podrían orientarme?`;
    const url = generateDirectWhatsAppUrl('+58 414 1234567', text);
    window.open(url, '_blank');
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="el Portal del Paciente" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Patient Welcome Hero with Soft Blue Gradient */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Portal de Salud Dental del Paciente</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Hola, {selectedPatient.name}
          </h2>
          <p className="text-sky-100 text-sm mt-1 max-w-xl">
            Bienvenido a tu expediente digital en DentalCloud. Aquí puedes revisar tus citas, dar tu aprobación a presupuestos y consultar tus recetas médicas.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-sky-100">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-sky-300" />
              <span>Expediente Clínico Protegido</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <CreditCard className="w-4 h-4 text-sky-300" />
              <span>Saldo Pendiente: ${selectedPatient.balance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Appointment & Pending Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Next Appointment Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Próxima Cita Programada</span>
              </h3>
              <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded text-xs font-semibold">
                Confirmada
              </span>
            </div>

            {patientApt ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {patientApt.treatmentType}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    <span>Hoy a las {patientApt.time} ({patientApt.durationMinutes} min)</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Especialista: <strong>{patientApt.dentistName}</strong> · {patientApt.box}
                  </div>
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Por favor presentarse 10 minutos antes en recepción para realizar su recepción previa.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No tienes citas programadas por el momento.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              type="button"
              onClick={handleConsultDoubts}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Confirmar o Reagendar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Digital Prescription Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-sky-600" />
                <span>Mis Medicamentos Prescritos</span>
              </h3>
              <span className="text-xs text-slate-400">Activo</span>
            </div>

            {patientRx ? (
              <div className="space-y-2.5 text-xs">
                {patientRx.medications.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {m.name} ({m.presentation})
                    </div>
                    <div className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5">
                      {m.dose} · {m.frequency} · {m.duration}
                    </div>
                    {m.instructions && (
                      <div className="text-[10px] text-slate-500 mt-0.5 italic">
                        {m.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No tienes prescripciones médicas activas.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => setCurrentTab('recipes')}
              className="w-full py-2 px-3 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-lg transition flex items-center justify-center gap-1"
            >
              <span>Ver Récipe Oficial Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Budget Review & Instant Approval Card */}
      {patientBudget && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Presupuesto Dental Planificado ({patientBudget.folio})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Diseñado por el {patientBudget.doctorName} tras tu última consulta diagnóstica.
              </p>
            </div>

            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase self-start sm:self-auto ${
              patientBudget.status === 'aprobado'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {patientBudget.status === 'aprobado' ? '✓ Presupuesto Aprobado' : 'Pendiente de Aprobación'}
            </span>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 text-xs">
            {patientBudget.items.map((it) => (
              <div key={it.id} className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-700/60 last:border-b-0">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {it.toothNumber ? `Pieza #${it.toothNumber}: ` : ''}{it.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">{it.category}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ${it.total}
                </span>
              </div>
            ))}

            <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-900 dark:text-white">Total a Invertir:</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono text-lg tabular-nums">
                ${patientBudget.total} USD
              </span>
            </div>
          </div>

          {paymentSuccess ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              🎉 ¡Muchas gracias! Has aprobado tu plan de tratamiento odontológico. Recepción se pondrá en contacto por WhatsApp para agendar tus sesiones de atención.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {patientBudget.status !== 'aprobado' && (
                <button
                  type="button"
                  onClick={handleApproveBudget}
                  className="flex-1 py-3 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Tratamiento y Reservar Inicio</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleConsultDoubts}
                className="flex-1 py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>Consultar Dudas o Opciones de Pago</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
