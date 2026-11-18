import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { Appointment } from '../types/dental';
import { X, Calendar, Clock, User, Stethoscope } from 'lucide-react';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose }) => {
  const { patients, addAppointment, setCurrentTab } = useDental();

  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [box, setBox] = useState<Appointment['box']>('Consultorio 1');
  const [dentistName, setDentistName] = useState('Dr. Alejandro Morera');
  const [treatmentType, setTreatmentType] = useState('Evaluación y Diagnóstico Inicial');
  const [notes, setNotes] = useState('');
  const [syncGoogleCalendar, setSyncGoogleCalendar] = useState(true);

  if (!isOpen) return null;

  const activePatient = patients.find(p => p.id === patientId) || patients[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    addAppointment({
      patientId: activePatient.id,
      patientName: activePatient.name,
      patientPhone: activePatient.phone,
      date,
      time,
      durationMinutes,
      box,
      dentistName,
      treatmentType,
      status: 'agendada',
      notes,
      googleCalendarSync: syncGoogleCalendar
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Agendar Nueva Cita Odontológica
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {patients.length === 0 ? (
          <div className="p-6 text-center space-y-3 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              No hay pacientes registrados aún
            </p>
            <p className="text-slate-500">
              Para agendar una cita primero registra o importa al menos un paciente desde Historia Clínica.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentTab('pacientes');
                }}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                Ir a Historia Clínica
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Seleccionar Paciente:
            </label>
            <select
              value={activePatient?.id || ''}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none focus:border-sky-500"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.cedula}) - {p.phone || 'Sin telf'}{p.patientInactive ? ' [INACTIVO]' : ''}
                </option>
              ))}
            </select>
            {activePatient?.patientInactive && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-600">
                Aviso: Paciente marcado como {activePatient.inactiveReason === 'fallecimiento' ? 'fallecido' : 'inactivo'} (las notificaciones WhatsApp permanecerán bloqueadas).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Fecha de la Cita:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Hora de Inicio:
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Consultorio Dental:
              </label>
              <select
                value={box}
                onChange={(e) => setBox(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              >
                <option value="Consultorio 1">Consultorio 1</option>
                <option value="Consultorio 2">Consultorio 2</option>
                <option value="Consultorio 3">Consultorio 3</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Odontólogo Tratante:
              </label>
              <select
                value={dentistName}
                onChange={(e) => setDentistName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              >
                <option value="Dr. Alejandro Morera">Dr. Alejandro Morera</option>
                <option value="Dra. Valentina Sardi">Dra. Valentina Sardi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Motivo de Consulta / Procedimiento Planificado:
            </label>
            <input
              type="text"
              required
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              placeholder="Ej. Restauración resina o control ortodoncia"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Notas Adicionales:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias o comentarios para recepción"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
            />
          </div>

          {/* Google Calendar Anclaje / Sync Option */}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <div>
                <div className="font-bold text-sky-900 dark:text-sky-200 text-xs">
                  Anclar a Google Calendar
                </div>
                <div className="text-[10px] text-sky-700 dark:text-sky-400">
                  Sincroniza cita y notifica la agenda del doctor
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={syncGoogleCalendar}
              onChange={(e) => setSyncGoogleCalendar(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition shadow-xs"
            >
              Confirmar y Enviar Recordatorio
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
