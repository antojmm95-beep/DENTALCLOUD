import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { Appointment, AppointmentStatus, BoxType } from '../types/dental';
import { generateDoctorICSContent, paginateList } from '../utils/dentalCalc';
import { 
  Calendar, 
  Clock, 
  Plus, 
  MessageSquare, 
  Filter,
  Phone,
  ExternalLink,
  Download,
  Lock,
  Trash2,
  Building2,
  Stethoscope,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AgendaViewProps {
  onOpenNewAppointment: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ onOpenNewAppointment }) => {
  const { 
    appointments, 
    updateAppointmentStatus, 
    generateDirectWhatsAppUrl,
    setSelectedPatientId,
    setCurrentTab,
    syncAppointmentWithGoogleCalendar,
    doctors,
    blockedSlots,
    addBlockedSlot,
    removeBlockedSlot,
    clinicConfig,
    showToast
  } = useDental();

  const [boxFilter, setBoxFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'semanal' | 'lista' | 'sala' | 'profesional' | 'mes' | 'bloqueos' | 'google_cal'>('semanal');
  const [listPage, setListPage] = useState<number>(1);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('001 - CLINICA CORONA');

  // Blocked slot creation state
  const [blkDate, setBlkDate] = useState(new Date().toISOString().split('T')[0]);
  const [blkStart, setBlkStart] = useState('12:30');
  const [blkEnd, setBlkEnd] = useState('13:30');
  const [blkBox, setBlkBox] = useState<BoxType | 'TODOS'>('TODOS');
  const [blkReason, setBlkReason] = useState('Almuerzo / Esterilización');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    if (boxFilter !== 'todos' && apt.box !== boxFilter) return false;
    if (statusFilter !== 'todos' && apt.status !== statusFilter) return false;
    return true;
  });

  const paginatedList = paginateList(filteredAppointments, listPage, 20);

  // KPI metrics
  const totalToday = appointments.length;
  const completed = appointments.filter(a => a.status === 'atendido').length;

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'reprogramado':
        return {
          label: 'Reprogramado',
          className: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
        };
      case 'cancelado_paciente':
        return {
          label: 'Cancelado por el paciente',
          className: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
        };
      case 'atendido':
        return {
          label: 'Atendido',
          className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
        };
      case 'confirmada':
        return {
          label: 'Confirmada',
          className: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
        };
      case 'cancelada':
        return {
          label: 'Cancelada',
          className: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        };
      default:
        return {
          label: 'Agendada',
          className: 'text-slate-700 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
        };
    }
  };

  const handleSendWaReminder = (apt: Appointment) => {
    const text = `¡Hola ${apt.patientName.split(' ')[0]}! 🦷 Te recordamos tu cita odontológica en DentalCloud hoy a las ${apt.time} con ${apt.dentistName} en ${apt.box} para ${apt.treatmentType}. Por favor indícanos si ya vas en camino. ¡Te esperamos!`;
    const url = generateDirectWhatsAppUrl(apt.patientPhone, text);
    window.open(url, '_blank');
  };

  const handleGoToPatientChart = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentTab('pacientes');
  };

  const handleSendDailyAgendaWA = () => {
    const text = `📋 *AGENDA CLÍNICA DEL DÍA - DENTALCLOUD*\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n` +
      appointments.map(a => `• *${a.time}* - ${a.patientName} (${a.box}) -> ${a.treatmentType} [${a.status.toUpperCase()}]`).join('\n') +
      `\n\nTotal pacientes: ${appointments.length}`;
    const url = generateDirectWhatsAppUrl('+58 414 1234567', text);
    window.open(url, '_blank');
  };

  // Days of current week for RHSistema format
  const weekDays = [
    { name: 'Mar 10/11', full: 'Martes 10', date: '2026-11-10', isToday: true },
    { name: 'Mie 11/11', full: 'Miércoles 11', date: '2026-11-11', isToday: false },
    { name: 'Jue 12/11', full: 'Jueves 12', date: '2026-11-12', isToday: false },
    { name: 'Vie 13/11', full: 'Viernes 13', date: '2026-11-13', isToday: false },
    { name: 'Sab 14/11', full: 'Sábado 14', date: '2026-11-14', isToday: false },
    { name: 'Dom 15/11', full: 'Domingo 15', date: '2026-11-15', isToday: false },
    { name: 'Lun 16/11', full: 'Lunes 16', date: '2026-11-16', isToday: false }
  ];

  const timeSlots = [
    '07:00 a. m.', '07:30 a. m.',
    '08:00 a. m.', '08:30 a. m.',
    '09:00 a. m.', '09:30 a. m.',
    '10:00 a. m.', '10:30 a. m.',
    '11:00 a. m.', '11:30 a. m.',
    '12:00 p. m.', '12:30 p. m.',
    '01:00 p. m.', '01:30 p. m.',
    '02:00 p. m.', '02:30 p. m.',
    '03:00 p. m.', '03:30 p. m.',
    '04:00 p. m.', '04:30 p. m.',
    '05:00 p. m.', '05:30 p. m.'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & RHSistema Clinic Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Agenda Odontológica y Coordinación de Pacientes
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                  Google Calendar Sync ✓
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Formato RHSistema / Dentalink con asignación por Consultorio 1, 2 y 3.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSendDailyAgendaWA}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition border border-emerald-200 dark:border-emerald-800"
              title="Enviar resumen diario por WhatsApp"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Env. Agenda Diaria</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewAppointment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Cita</span>
            </button>
          </div>
        </div>

        {/* RHSistema Top Toolbar: Doctor selector, View Mode, Quick RHS buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Doctor(a):</span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="001 - CLINICA CORONA">001 - CLINICA CORONA (Todos)</option>
                <option value="Dr. Alejandro Morera">002 - Dr. Alejandro Morera (General)</option>
                <option value="Dra. Valentina Sardi">003 - Dra. Valentina Sardi (Cirugía/Endo)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(
                [
                  { id: 'semanal', label: 'Semanal' },
                  { id: 'lista', label: 'Listado de Citas' },
                  { id: 'sala', label: 'Por Sala / Box' },
                  { id: 'profesional', label: 'Por Profesional' },
                  { id: 'mes', label: 'Mes' },
                  { id: 'bloqueos', label: 'Bloqueos' },
                  { id: 'google_cal', label: 'Google Cal Doctor' }
                ] as const
              ).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    viewMode === m.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* RHSistema Color Legend Strip */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Atendido</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Reprogramado</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cancelado por el paciente</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Confirmada</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> WhatsApp Enviado</span>
          </div>
        </div>
      </div>

      {/* Consultorio Filters Strip (Consultorio 1, 2, 3) */}
      {(viewMode === 'semanal' || viewMode === 'lista' || viewMode === 'sala' || viewMode === 'profesional') && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar por Consultorio:
          </span>
          {[
            { id: 'todos', label: 'Todos los Consultorios' },
            { id: 'Consultorio 1', label: 'Consultorio 1' },
            { id: 'Consultorio 2', label: 'Consultorio 2' },
            { id: 'Consultorio 3', label: 'Consultorio 3' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setBoxFilter(item.id);
                setListPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                boxFilter === item.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setListPage(1);
            }}
            aria-label="Filtrar citas por estado"
            className="border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
          >
            <option value="todos">Todos los Estados</option>
            <option value="agendada">Agendada</option>
            <option value="confirmada">Confirmada</option>
            <option value="reprogramado">Reprogramado</option>
            <option value="atendido">Atendido</option>
            <option value="cancelado_paciente">Cancelado por el paciente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>
      )}

      {/* VIEW MODE: Por Sala / Box (Consultorio 1, 2 y 3) */}
      {viewMode === 'sala' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Consultorio 1', 'Consultorio 2', 'Consultorio 3'] as BoxType[]).map(box => {
            const boxApts = filteredAppointments.filter(a => a.box === box);
            return (
              <div key={box} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3.5 bg-sky-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-600" /> {box}
                  </span>
                  <span className="text-[11px] font-bold text-sky-600 tabular-nums">{boxApts.length} citas</span>
                </div>
                <div className="p-3 space-y-2.5 min-h-[180px]">
                  {boxApts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">Sin citas asignadas</p>
                  ) : (
                    boxApts.map(a => (
                      <div
                        key={a.id}
                        onClick={() => handleGoToPatientChart(a.patientId)}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-400 cursor-pointer bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center gap-2 font-bold">
                          <span className="text-sky-600 tabular-nums">{a.time}</span>
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${getStatusBadge(a.status).className}`}>
                            {getStatusBadge(a.status).label}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white">{a.patientName}</div>
                        <div className="text-slate-500">{a.treatmentType}</div>
                        <div className="text-[11px] text-slate-400">{a.dentistName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE: Por Profesional */}
      {viewMode === 'profesional' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {doctors.map(doc => {
            const docLast = doc.name.split(' ').slice(-1)[0].toLowerCase();
            const docApts = filteredAppointments.filter(a => a.dentistName.toLowerCase().includes(docLast));
            return (
              <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3.5 bg-sky-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Stethoscope className="w-4 h-4 text-sky-600" /> {doc.name}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{doc.assignedBox} · {docApts.length} citas</p>
                </div>
                <div className="p-3 space-y-2">
                  {docApts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">Agenda disponible</p>
                  ) : (
                    docApts.map(a => (
                      <div key={a.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="font-bold text-sky-600 tabular-nums">{a.time} · {a.box}</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{a.patientName}</div>
                        <div className="text-[11px] text-slate-500">{a.treatmentType}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE: Mes */}
      {viewMode === 'mes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vista Mensual — Noviembre 2026</h3>
            <span className="text-xs text-slate-500 tabular-nums">{appointments.length} citas programadas</span>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center font-bold text-slate-500 py-1">{d}</div>
            ))}
            {Array.from({ length: 30 }, (_, idx) => {
              const dayNum = idx + 1;
              const dayStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
              const dayApts = appointments.filter(a => a.date === dayStr);
              const isTodayCell = dayStr === todayStr || dayNum === 12;
              return (
                <div
                  key={dayNum}
                  className={`min-h-[76px] p-2 rounded-lg border ${
                    isTodayCell
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold tabular-nums ${isTodayCell ? 'text-sky-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {dayNum}
                    </span>
                    {dayApts.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-bold tabular-nums">
                        {dayApts.length}
                      </span>
                    )}
                  </div>
                  {dayApts.slice(0, 2).map(a => (
                    <div key={a.id} className="text-[10px] truncate text-slate-600 dark:text-slate-300">
                      {a.time} {a.patientName.split(' ')[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: Bloqueos Horarios */}
      {viewMode === 'bloqueos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form
            onSubmit={e => {
              e.preventDefault();
              addBlockedSlot({
                date: blkDate,
                startTime: blkStart,
                endTime: blkEnd,
                box: blkBox,
                reason: blkReason
              });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-600" /> Registrar Bloqueo (No Disponible)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Fecha
                <input type="date" value={blkDate} onChange={e => setBlkDate(e.target.value)} className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </label>
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Consultorio
                <select value={blkBox} onChange={e => setBlkBox(e.target.value as any)} className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <option value="TODOS">Todos los Consultorios</option>
                  <option value="Consultorio 1">Consultorio 1</option>
                  <option value="Consultorio 2">Consultorio 2</option>
                  <option value="Consultorio 3">Consultorio 3</option>
                </select>
              </label>
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Hora Inicio
                <input type="time" value={blkStart} onChange={e => setBlkStart(e.target.value)} className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </label>
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Hora Fin
                <input type="time" value={blkEnd} onChange={e => setBlkEnd(e.target.value)} className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </label>
            </div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300">
              Motivo del Bloqueo
              <input type="text" required value={blkReason} onChange={e => setBlkReason(e.target.value)} className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </label>
            <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold">
              Bloquear Franja Horaria
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Bloqueos Activos ({blockedSlots.length})
            </h3>
            {blockedSlots.map(b => (
              <div key={b.id} className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {b.date} · {b.startTime} - {b.endTime} ({b.box || 'TODOS'})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{b.reason}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBlockedSlot(b.id)}
                  aria-label="Eliminar bloqueo"
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE: Google Calendar por Doctor (.ics export) */}
      {viewMode === 'google_cal' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Exportar & Sincronizar Google Calendar por Doctor (.ICS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Descarga el calendario individual de cada odontólogo para importarlo en Google Calendar o Apple Calendar.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.map(doc => {
              const docLast = doc.name.split(' ').slice(-1)[0].toLowerCase();
              const docApts = appointments.filter(a => a.dentistName.toLowerCase().includes(docLast));
              const handleDownloadIcs = () => {
                const ics = generateDoctorICSContent(doc.name, clinicConfig.clinicName, docApts);
                const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `agenda-${docLast}.ics`;
                a.click();
                URL.revokeObjectURL(url);
                showToast(`Archivo .ICS descargado para ${doc.name}`);
              };
              return (
                <div key={doc.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{doc.name}</div>
                    <div className="text-slate-500">{doc.assignedBox} · {docApts.length} cita(s)</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar .ICS
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: Weekly RHSistema Time Grid */}
      {viewMode === 'semanal' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex justify-between items-center text-xs font-semibold">
            <span>Agenda Semanal de: {selectedDoctor}</span>
            <span className="font-mono">Semana del 10 al 16 de Noviembre 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200 dark:border-slate-700 font-bold font-mono">
                    Hora
                  </th>
                  {weekDays.map((d, i) => (
                    <th key={i} className={`py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-semibold ${
                      d.isToday ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold' : ''
                    }`}>
                      <div>{d.name}</div>
                      {d.isToday && <span className="text-[10px] text-sky-600 block">HOY</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {timeSlots.map((slot, sIdx) => {
                  const hour24 = slot.includes('p. m.') && !slot.startsWith('12') 
                    ? String(parseInt(slot.slice(0, 2)) + 12).padStart(2, '0') 
                    : slot.slice(0, 2);
                  const min = slot.slice(3, 5);
                  const slotTimeFormatted = `${hour24}:${min}`;

                  return (
                    <tr key={sIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {/* Hour cell */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 whitespace-nowrap text-[11px]">
                        {slot}
                      </td>

                      {/* Day Columns */}
                      {weekDays.map((day, dIdx) => {
                        // Check if an appointment starts around this slot
                        const matchingApt = appointments.find(a => 
                          (day.isToday || a.date === day.date) && 
                          (a.time === slotTimeFormatted || a.time.startsWith(hour24)) &&
                          (boxFilter === 'todos' || a.box === boxFilter)
                        );

                        return (
                          <td 
                            key={dIdx} 
                            className={`p-1 border-r border-slate-200 dark:border-slate-800 h-10 align-middle ${
                              day.isToday ? 'bg-sky-50/30 dark:bg-sky-950/20' : ''
                            }`}
                          >
                            {matchingApt && dIdx === 0 ? (
                              <div 
                                onClick={() => handleGoToPatientChart(matchingApt.patientId)}
                                className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition shadow-xs leading-tight ${
                                  matchingApt.status === 'reprogramado'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                                    : matchingApt.status === 'cancelado_paciente' || matchingApt.status === 'cancelada'
                                    ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                                    : matchingApt.status === 'atendido'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                                    : 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200'
                                }`}
                              >
                                <div className="font-bold truncate">{matchingApt.patientName}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {matchingApt.box} · {matchingApt.treatmentType.slice(0, 18)}...
                                </div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2 & List Mode: Full Detailed Appointment Flow with Google Calendar Sync */}
      {viewMode === 'lista' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            Listado Detallado de Citas ({filteredAppointments.length})
          </span>
          <span className="text-slate-400">
            Sincronización activa con Google Calendar y WhatsApp
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 font-semibold">Hora</th>
                <th className="py-3 px-3 font-semibold">Paciente</th>
                <th className="py-3 px-3 font-semibold">Consultorio</th>
                <th className="py-3 px-3 font-semibold">Tratamiento / Odontólogo</th>
                <th className="py-3 px-3 font-semibold">Estado Clínico</th>
                <th className="py-3 px-3 font-semibold text-right">Google Cal & Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {paginatedList.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No hay citas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedList.items.map((apt) => {
                  const badge = getStatusBadge(apt.status);
                  return (
                    <tr 
                      key={apt.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Hora */}
                      <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>{apt.time}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                          {apt.durationMinutes} min
                        </span>
                      </td>

                      {/* Paciente */}
                      <td className="py-3.5 px-3">
                        <div 
                          className="font-semibold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                          onClick={() => handleGoToPatientChart(apt.patientId)}
                        >
                          {apt.patientName}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{apt.patientPhone}</span>
                        </div>
                      </td>

                      {/* Consultorio (Personalizado: Consultorio 1, 2 o 3) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          apt.box === 'Consultorio 1' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                          apt.box === 'Consultorio 2' ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800' :
                          'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          🏢 {apt.box}
                        </span>
                      </td>

                      {/* Tratamiento / Odontólogo */}
                      <td className="py-3.5 px-3 max-w-[230px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {apt.treatmentType}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {apt.dentistName}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <select
                          value={apt.status}
                          aria-label={`Estado de cita de ${apt.patientName}`}
                          onChange={(e) => updateAppointmentStatus(apt.id, e.target.value as AppointmentStatus)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold outline-none cursor-pointer ${badge.className}`}
                        >
                          <option value="agendada">Agendada</option>
                          <option value="confirmada">Confirmada</option>
                          <option value="reprogramado">Reprogramado</option>
                          <option value="atendido">Atendido</option>
                          <option value="cancelado_paciente">Cancelado por el paciente</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>

                      {/* Google Calendar & Acciones */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Google Calendar 1-Click Sync */}
                          <button
                            type="button"
                            onClick={() => syncAppointmentWithGoogleCalendar(apt)}
                            title="Anclar y abrir en Google Calendar"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg transition border border-slate-300 dark:border-slate-700"
                          >
                            <span>📅 Google Cal</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </button>

                          {/* Botón WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleSendWaReminder(apt)}
                            title="Enviar recordatorio vía WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {apt.status !== 'atendido' && (
                            <button
                              type="button"
                              onClick={() => updateAppointmentStatus(apt.id, 'atendido')}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                            >
                              Atendido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {paginatedList.totalItems > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedList.startIndex}–{paginatedList.endIndex}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{paginatedList.totalItems}</strong> · Página {paginatedList.page} de {paginatedList.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginatedList.page <= 1}
                onClick={() => setListPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                type="button"
                disabled={paginatedList.page >= paginatedList.totalPages}
                onClick={() => setListPage(p => Math.min(paginatedList.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
