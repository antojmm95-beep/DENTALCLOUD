import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { Doctor, DoctorLiquidation } from '../types/dental';
import { calculateDoctorLiquidation } from '../utils/dentalCalc';
import { 
  Stethoscope, 
  Plus, 
  Percent, 
  Calendar, 
  Edit3, 
  CheckCircle2, 
  FileText,
  Printer,
  X
} from 'lucide-react';

export const DoctoresView: React.FC = () => {
  const {
    doctors,
    activeDoctor,
    setActiveDoctor,
    addDoctor,
    updateDoctor,
    setCurrentTab,
    liquidations,
    generateLiquidation,
    clinicConfig,
    exchangeRate
  } = useDental();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Liquidation form state
  const [liqDoctorId, setLiqDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [liqStart, setLiqStart] = useState<string>('2026-11-01');
  const [liqEnd, setLiqEnd] = useState<string>('2026-11-30');
  const [liqCollected, setLiqCollected] = useState<number>(doctors[0]?.monthlyProduction || 2500);
  const [liqProcCount, setLiqProcCount] = useState<number>(doctors[0]?.patientsTreatedCount || 28);
  const [previewLiq, setPreviewLiq] = useState<DoctorLiquidation | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Odontología General');
  const [colegiado, setColegiado] = useState('COV-');
  const [mpps, setMpps] = useState('MPPS-');
  const [rif, setRif] = useState('V-');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+58 ');
  const [commission, setCommission] = useState(65);
  const [assignedBox, setAssignedBox] = useState<'Consultorio 1' | 'Consultorio 2' | 'Consultorio 3'>('Consultorio 1');

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialty('Odontología Integral & Prótesis');
    setColegiado('COV-2');
    setMpps('MPPS-');
    setRif('V-');
    setEmail('');
    setPhone('+58 424 ');
    setCommission(65);
    setAssignedBox('Consultorio 1');
    setShowAddModal(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialty(doc.specialty);
    setColegiado(doc.colegiado);
    setMpps(doc.mpps || '');
    setRif(doc.rif);
    setEmail(doc.email);
    setPhone(doc.phone);
    setCommission(doc.commissionPercentage);
    setAssignedBox(doc.assignedBox);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingDoctor) {
      updateDoctor({
        ...editingDoctor,
        name,
        specialty,
        colegiado,
        mpps: mpps.trim() || 'MPPS-Pendiente',
        rif,
        email,
        phone,
        commissionPercentage: Number(commission),
        assignedBox
      });
    } else {
      addDoctor({
        name,
        specialty,
        colegiado,
        mpps: mpps.trim() || 'MPPS-Pendiente',
        rif,
        email: email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@clinicacorona.com`,
        phone,
        commissionPercentage: Number(commission),
        assignedBox,
        status: 'activo'
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-sky-600" />
            <span>Equipo de Doctores y Especialistas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de odontólogos, comisiones por producción y asignación de consultorios
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Doctor(a)</span>
        </button>
      </div>

      {/* Active Doctor Banner */}
      <div className="p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border border-sky-200 dark:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            👨‍⚕️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Doctor(a) Activo en Sesión:
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {activeDoctor.name}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>{activeDoctor.specialty}</span>
              <span>·</span>
              <span className="font-mono">{activeDoctor.colegiado}</span>
              <span>·</span>
              <span className="font-mono font-semibold text-sky-700 dark:text-sky-300">{activeDoctor.mpps}</span>
              <span>·</span>
              <span className="font-medium text-emerald-600">{activeDoctor.assignedBox}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentTab('agenda')}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-400 flex items-center gap-1.5 transition"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Ver Citas del Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('reportes')}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-400 flex items-center gap-1.5 transition"
          >
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
            <span>Liquidación {activeDoctor.commissionPercentage}%</span>
          </button>
        </div>
      </div>

      {/* Grid of Specialists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {doctors.map(doc => {
          const isActive = doc.id === activeDoctor.id;
          return (
            <div
              key={doc.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all shadow-xs ${
                isActive 
                  ? 'border-sky-500 ring-2 ring-sky-500/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    {doc.assignedBox}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                    {doc.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {doc.specialty}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleOpenEdit(doc)}
                  aria-label={`Editar datos de ${doc.name}`}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Editar datos del doctor"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs font-mono border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">Colegiado (COV):</span>
                  <span className="font-bold">{doc.colegiado}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">Registro MPPS:</span>
                  <span className="font-bold text-sky-700 dark:text-sky-300">{doc.mpps || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">RIF:</span>
                  <span>{doc.rif}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">% Comisión:</span>
                  <span className="text-emerald-600 font-bold">{doc.commissionPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">Producción Mes:</span>
                  <span className="text-slate-900 dark:text-white font-bold">${doc.monthlyProduction} USD</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {isActive ? (
                  <span className="text-xs text-sky-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Seleccionado</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveDoctor(doc)}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-700 text-xs font-semibold transition"
                  >
                    Activar en Sesión
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Liquidaciones de Profesionales (Suiteexo) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Liquidaciones de Honorarios a Especialistas</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo automático según porcentaje de comisión pactado y emisión de comprobante de pago.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Histórico emitido: <strong>{liquidations.length}</strong>
          </span>
        </div>

        {/* Liquidation Generator Form */}
        {(() => {
          const targetDoc = doctors.find(d => d.id === liqDoctorId) || doctors[0];
          const calc = calculateDoctorLiquidation(liqCollected, targetDoc?.commissionPercentage || 65);
          return (
            <form
              onSubmit={e => {
                e.preventDefault();
                const created = generateLiquidation({
                  doctorId: liqDoctorId,
                  periodStart: liqStart,
                  periodEnd: liqEnd,
                  collectedUsd: Number(liqCollected),
                  proceduresCount: Number(liqProcCount)
                });
                setPreviewLiq(created);
              }}
              className="p-4 rounded-xl bg-sky-50/60 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
            >
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Especialista
                <select
                  value={liqDoctorId}
                  onChange={e => {
                    const id = e.target.value;
                    setLiqDoctorId(id);
                    const found = doctors.find(d => d.id === id);
                    if (found) {
                      setLiqCollected(found.monthlyProduction);
                      setLiqProcCount(found.patientsTreatedCount);
                    }
                  }}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.commissionPercentage}%)</option>
                  ))}
                </select>
              </label>

              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Desde
                <input
                  type="date"
                  value={liqStart}
                  onChange={e => setLiqStart(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </label>

              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Hasta
                <input
                  type="date"
                  value={liqEnd}
                  onChange={e => setLiqEnd(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </label>

              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Recaudado Bruto ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={liqCollected}
                  onChange={e => setLiqCollected(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                />
              </label>

              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-slate-500 block">Neto a Pagar ({targetDoc?.commissionPercentage}%):</span>
                <strong className="text-sm font-black text-emerald-600 tabular-nums">
                  ${calc.payoutUsd.toFixed(2)} USD
                </strong>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
              >
                Generar Liquidación
              </button>
            </form>
          );
        })()}

        {/* Liquidations History Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Fecha Emisión</th>
                <th className="py-2.5 px-3">Especialista</th>
                <th className="py-2.5 px-3">Periodo</th>
                <th className="py-2.5 px-3 text-right">Recaudado ($)</th>
                <th className="py-2.5 px-3 text-center">% Com.</th>
                <th className="py-2.5 px-3 text-right">Pago Doctor ($)</th>
                <th className="py-2.5 px-3 text-right">Margen Clínica</th>
                <th className="py-2.5 px-3 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {liquidations.map(liq => (
                <tr key={liq.id} className="hover:bg-sky-50/30 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono text-slate-500">{liq.createdAt}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{liq.doctorName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{liq.periodStart} al {liq.periodEnd}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">${liq.collectedUsd.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600">{liq.commissionPercent}%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-600">
                    ${liq.payoutUsd.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    ${liq.clinicShareUsd.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPreviewLiq(liq)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-slate-700 dark:text-slate-200 font-semibold"
                    >
                      <Printer className="w-3 h-3" /> Recibo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Liquidation Modal */}
      {previewLiq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs print-area">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-sky-600">{clinicConfig.clinicName}</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Comprobante de Liquidación Médica</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLiq(null)}
                aria-label="Cerrar comprobante"
                className="text-slate-400 hover:text-slate-600 print:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Especialista:</span>
                <strong className="text-slate-900 dark:text-white">{previewLiq.doctorName}</strong>
              </div>
              {(() => {
                const docInfo = doctors.find(d => d.id === previewLiq.doctorId);
                return docInfo ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credenciales:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{docInfo.colegiado} · {docInfo.mpps}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between">
                <span className="text-slate-500">Periodo Liquidado:</span>
                <strong className="font-mono">{previewLiq.periodStart} al {previewLiq.periodEnd}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Producción Recaudada:</span>
                <strong className="font-mono">${previewLiq.collectedUsd.toFixed(2)} USD</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Porcentaje Pactado:</span>
                <strong className="font-mono text-sky-600">{previewLiq.commissionPercent}%</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200">Total a Liquidar (USD):</span>
                <strong className="text-base font-black text-emerald-600 tabular-nums">
                  ${previewLiq.payoutUsd.toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Equivalente en Bolívares:</span>
                <span className="font-mono tabular-nums">
                  Bs. {(previewLiq.payoutUsd * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setPreviewLiq(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Liquidación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Doctor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-sky-600" />
                <span>{editingDoctor ? 'Modificar Datos del Doctor' : 'Registrar Nuevo Doctor(a)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre Completo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dr. Antonio Morera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:border-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Especialidad:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cirugía Bucal & Implantología"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doc-cov" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Colegio Odontólogos (COV):
                  </label>
                  <input
                    id="doc-cov"
                    type="text"
                    required
                    value={colegiado}
                    onChange={(e) => setColegiado(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="doc-mpps" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Registro MPPS:
                  </label>
                  <input
                    id="doc-mpps"
                    type="text"
                    required
                    placeholder="Ej. MPPS-98412"
                    value={mpps}
                    onChange={(e) => setMpps(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="doc-rif" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  RIF Profesional:
                </label>
                <input
                  id="doc-rif"
                  type="text"
                  required
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    % Comisión Ganancia:
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={commission}
                    onChange={(e) => setCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Consultorio Asignado:
                  </label>
                  <select
                    value={assignedBox}
                    onChange={(e) => setAssignedBox(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Consultorio 1">Consultorio 1</option>
                    <option value="Consultorio 2">Consultorio 2</option>
                    <option value="Consultorio 3">Consultorio 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Teléfono Celular:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Correo Electrónico:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-xs"
                >
                  Guardar Especialista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
