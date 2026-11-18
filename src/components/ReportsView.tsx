import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { paginateList } from '../utils/dentalCalc';
import { 
  BarChart3, 
  Printer, 
  Search, 
  Download, 
  Filter, 
  DollarSign, 
  Users, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  MessageSquare,
  FileText,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { 
    patients, 
    budgets, 
    payments, 
    expenses,
    secuenciaTratamientos, 
    pendingCheckoutItems,
    setCurrentTab,
    exchangeRate, 
    generateDirectWhatsAppUrl 
  } = useDental();

  const totalIngresosUsd = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalEgresosUsd = expenses.reduce((acc, e) => acc + e.amountUsd, 0);
  const netBalanceUsd = totalIngresosUsd - totalEgresosUsd;
  const maxBar = Math.max(1, totalIngresosUsd, totalEgresosUsd);

  // Report configuration state (Matching Screenshots 11.03.03 & 11.02.34)
  const [activeReportPage, setActiveReportPage] = useState<'generador' | 'balance'>('generador');
  const [reportPage, setReportPage] = useState<number>(1);
  const [reportType, setReportType] = useState<string>('trabajos_realizados');
  const [inUSD, setInUSD] = useState<boolean>(true);
  const [dateFrom, setDateFrom] = useState<string>('2026-11-01');
  const [dateTo, setDateTo] = useState<string>('2026-11-10');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('99 - TODOS');
  const [patientFilter, setPatientFilter] = useState<string>('');
  const [referralFilter, setReferralFilter] = useState<string>('TODOS');
  const [convenioFilter, setConvenioFilter] = useState<string>('TODOS');

  // Currency helper
  const formatMoney = (amount: number) => {
    if (inUSD) {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const bsAmount = amount * exchangeRate;
    return `Bs ${bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Trabajos Realizados Data (Merged from Budgets + Secuencia de Tratamiento)
  const completedFromBudgets = budgets.flatMap(b => 
    b.items
      .filter(item => item.status === 'finalizado' || item.status === 'realizado' || item.status === 'en_curso' || b.status === 'finalizado')
      .map(item => ({
        budgetId: b.id,
        folio: b.folio,
        date: b.date,
        patientName: b.patientName,
        patientId: b.patientId,
        doctorName: item.doctor || b.doctorName,
        area: item.area || '1 - PREVENTIVA Y GENERAL',
        treatmentName: item.name,
        tooth: item.toothNumber ? `#${item.toothNumber}` : 'General',
        phase: item.phase || 'fase_inicial',
        price: item.price,
        total: item.total,
        status: item.status || 'finalizado'
      }))
  );

  const completedFromSecuencia = secuenciaTratamientos.map(s => {
    const pat = patients.find(p => p.id === s.patientId);
    return {
      budgetId: `sec-${s.id}`,
      folio: 'SEC-EVO',
      date: s.date,
      patientName: pat ? pat.name : 'Paciente Registrado',
      patientId: s.patientId,
      doctorName: s.doctorName,
      area: '1 - PREVENTIVA Y GENERAL',
      treatmentName: s.procedure,
      tooth: s.toothNumber ? `#${s.toothNumber}` : 'General',
      phase: 'fase_inicial',
      price: 40.0,
      total: 40.0,
      status: 'finalizado'
    };
  });

  // Combine and deduplicate
  const completedTreatments = [...completedFromBudgets, ...completedFromSecuencia];

  // 2. Cuentas por Cobrar Data (Includes Debt Patients & Pending Checkout Items)
  const accountsReceivable = patients
    .filter(p => p.balance > 0 || pendingCheckoutItems.some(item => item.patientId === p.id))
    .map(p => {
      const patientPendingItems = pendingCheckoutItems.filter(it => it.patientId === p.id);
      const computedBalance = p.balance > 0 ? p.balance : patientPendingItems.reduce((acc, curr) => acc + curr.amountUsd, 0);
      return {
        patientId: p.id,
        patientName: p.name,
        cedula: p.cedula,
        phone: p.phone,
        balance: computedBalance,
        totalBilled: p.totalBilled,
        lastVisit: p.lastVisit || '2026-11-03',
        pendingItems: patientPendingItems,
        pendingBudgets: budgets.filter(b => b.patientId === p.id && (b.status === 'pendiente' || b.status === 'tratamiento'))
      };
    });

  // 3. Pagos a Especialistas Data
  const doctorsList = [
    { name: 'Dr. Alejandro Morera', commissionRate: 0.70, specialty: 'PREVENTIVA Y GENERAL' },
    { name: 'Dra. Valentina Sardi', commissionRate: 0.65, specialty: 'CIRUGIA / ENDODONCIA' },
    { name: 'DAYANA ORTEGA', commissionRate: 0.70, specialty: 'ORTODONCIA' },
    { name: 'Ramses Acosta', commissionRate: 0.60, specialty: 'PROTESIS' }
  ];

  const specialistPayments = doctorsList.map(doc => {
    const docTreatments = completedTreatments.filter(t => t.doctorName.toLowerCase().includes(doc.name.toLowerCase()));
    const totalProduced = docTreatments.reduce((acc, t) => acc + t.total, 0);
    const doctorCommission = totalProduced * doc.commissionRate;
    const clinicShare = totalProduced * (1 - doc.commissionRate);
    return {
      doctorName: doc.name,
      specialty: doc.specialty,
      commissionRate: doc.commissionRate * 100,
      treatmentsCount: docTreatments.length,
      totalProduced,
      doctorCommission,
      clinicShare
    };
  });

  // Filtered views
  const filteredTreatments = completedTreatments.filter(t => {
    if (selectedDoctor !== '99 - TODOS' && !t.doctorName.toLowerCase().includes(selectedDoctor.toLowerCase())) return false;
    if (patientFilter && !t.patientName.toLowerCase().includes(patientFilter.toLowerCase())) return false;
    return true;
  });

  const filteredReceivables = accountsReceivable.filter(p => {
    if (patientFilter && !p.patientName.toLowerCase().includes(patientFilter.toLowerCase()) && !p.cedula.includes(patientFilter)) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSendCollectionWhatsApp = (phone: string, patientName: string, balance: number) => {
    const message = `Estimado(a) *${patientName}*, le saludamos cordialmente de *CLINICA CORONA*. Le recordamos que presenta un saldo pendiente de *${formatMoney(balance)}* por concepto de sus tratamientos odontológicos. Para convenir su forma de pago o verificar su estado de cuenta, quedamos a su entera disposición. ¡Feliz día!`;
    const url = generateDirectWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  };

  const paginatedTreatments = paginateList(filteredTreatments, reportPage, 20);
  const paginatedReceivables = paginateList(filteredReceivables, reportPage, 20);
  const paginatedPayments = paginateList(payments, reportPage, 20);

  return (
    <div className="space-y-5">
      
      {/* Top Title Banner + Sub-page Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <span>Módulo de Reportes Clínicos y Financieros</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Formato RHSistema / RHOdont (Trabajos Realizados, Cuentas por Cobrar a Pacientes, Pagos a Especialistas)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveReportPage('generador')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeReportPage === 'generador'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Generador de Reportes
          </button>
          <button
            type="button"
            onClick={() => setActiveReportPage('balance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeReportPage === 'balance'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Balance Mensual (Ingresos vs Egresos)
          </button>
        </div>
      </div>

      {/* Suiteexo: Balance Mensual Ingresos vs Egresos */}
      {activeReportPage === 'balance' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Balance Mensual (Ingresos vs. Egresos Operativos)
            </h2>
            <p className="text-xs text-slate-500">
              Consolidado automático desde Caja / Multi-Pagos y Módulo de Gastos Administrativos
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-[11px] text-slate-400 block">Utilidad Neta del Periodo:</span>
            <strong className={`text-lg font-black tabular-nums ${netBalanceUsd >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatMoney(netBalanceUsd)}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
            <div className="flex justify-between font-bold">
              <span className="text-emerald-800 dark:text-emerald-300">Ingresos Recaudados ({payments.length} recibos)</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">{formatMoney(totalIngresosUsd)}</span>
            </div>
            <div className="h-2.5 w-full bg-emerald-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.round((totalIngresosUsd / maxBar) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 space-y-2">
            <div className="flex justify-between font-bold">
              <span className="text-rose-800 dark:text-rose-300">Egresos & Gastos Fijos ({expenses.length} registros)</span>
              <span className="font-mono text-rose-700 dark:text-rose-300 tabular-nums">{formatMoney(totalEgresosUsd)}</span>
            </div>
            <div className="h-2.5 w-full bg-rose-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all"
                style={{ width: `${Math.round((totalEgresosUsd / maxBar) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filter Window (Exact RHSistema Reportes Window Layout from Screenshots 11.03.03 & 11.02.34) */}
      {activeReportPage === 'generador' && (
      <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            Parámetros de Reporte (RHSistema)
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-sky-700 dark:text-sky-300">
              <input
                type="checkbox"
                checked={inUSD}
                onChange={(e) => setInUSD(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Expresar en Dólares (USD)</span>
            </label>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono text-slate-500">Tasa: {exchangeRate.toFixed(2)} Bs/$</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Modelo de Reporte */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Modelo de Reporte:
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="trabajos_realizados">Trabajos / Tratamientos Realizados</option>
              <option value="cuentas_cobrar">Cuentas x Cobrar a Pacientes (Deudas)</option>
              <option value="pagos_especialistas">Pagos a Especialistas (% Comisión)</option>
              <option value="balance_mensual">Balance Mensual (Ingresos vs Egresos)</option>
              <option value="caja_chica">Movimientos de Caja & Arqueo</option>
              <option value="listado_pacientes">Listado General de Pacientes</option>
              <option value="control_divisas">Control de Divisas (USD / Bs)</option>
            </select>
          </div>

          {/* Periodo de Fechas */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Periodo (Desde / Hasta):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-mono text-xs"
              />
              <span className="text-slate-400">al</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-mono text-xs"
              />
            </div>
          </div>

          {/* Doctor(a) */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Doctor(a) Tratante:
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="99 - TODOS">99 - TODOS LOS DOCTORES</option>
              <option value="CLINICA CORONA">001 - CLINICA CORONA</option>
              <option value="Alejandro Morera">002 - Dr. Alejandro Morera</option>
              <option value="Valentina Sardi">003 - Dra. Valentina Sardi</option>
              <option value="DAYANA ORTEGA">004 - DAYANA ORTEGA</option>
              <option value="Ramses Acosta">005 - Ramses Acosta</option>
            </select>
          </div>

        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400 block">
              Filtrar por Paciente:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nombre o C.I..."
                value={patientFilter}
                onChange={(e) => {
                  setPatientFilter(e.target.value);
                  setReportPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400 block">
              Referido a través de:
            </label>
            <select
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="TODOS">TODOS LOS CANALES</option>
              <option value="Instagram">Instagram (@rh_sistema)</option>
              <option value="Referencia">Referencia de Paciente</option>
              <option value="Seguro">Clave de Seguro Odontológico</option>
              <option value="Directo">Puerta / Recepción</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400 block">
              Convenios Clínicos:
            </label>
            <select
              value={convenioFilter}
              onChange={(e) => setConvenioFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="TODOS">01 - TODOS LOS CONVENIOS</option>
              <option value="Particular">Particular / Directo</option>
              <option value="Plan Corporativo">Plan Corporativo Corona</option>
              <option value="Convenio Familiar">Convenio Familiar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Output Tables */}

      {/* REPORT 1: TRABAJOS REALIZADOS */}
      {reportType === 'trabajos_realizados' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs print-area">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reporte de Trabajos y Tratamientos Realizados
              </h2>
              <span className="text-xs text-slate-500">
                Periodo: {dateFrom} al {dateTo} · Doctor: {selectedDoctor}
              </span>
            </div>
            <div className="text-right mt-2 sm:mt-0 font-mono text-xs">
              <span className="text-slate-400 block">Total Producido:</span>
              <strong className="text-base font-black text-sky-600 dark:text-sky-400">
                {formatMoney(filteredTreatments.reduce((acc, t) => acc + t.total, 0))}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Nro. Pres</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Especialidad / Área</th>
                  <th className="py-2.5 px-3">Tratamiento</th>
                  <th className="py-2.5 px-3">Pieza</th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedTreatments.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No se encontraron tratamientos realizados en el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  paginatedTreatments.items.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{t.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">{t.folio}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.patientName}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{t.area}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{t.treatmentName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{t.tooth}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{t.doctorName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(t.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paginatedTreatments.totalItems > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedTreatments.startIndex}–{paginatedTreatments.endIndex}</strong> de{' '}
                <strong className="text-slate-800 dark:text-slate-200">{paginatedTreatments.totalItems}</strong> · Página {paginatedTreatments.page} de {paginatedTreatments.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginatedTreatments.page <= 1}
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={paginatedTreatments.page >= paginatedTreatments.totalPages}
                  onClick={() => setReportPage(p => Math.min(paginatedTreatments.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT 2: CUENTAS POR COBRAR (PACIENTES CON DEUDA) */}
      {reportType === 'cuentas_cobrar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs print-area">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Reporte de Cuentas por Cobrar & Pacientes con Deuda</span>
              </h2>
              <span className="text-xs text-slate-500">
                Cobranza activa, facturas a crédito y presupuestos en ejecución
              </span>
            </div>
            <div className="text-right mt-2 sm:mt-0 font-mono text-xs">
              <span className="text-rose-500 block font-semibold">Total Cartera Vencida:</span>
              <strong className="text-base font-black text-rose-600 dark:text-rose-400">
                {formatMoney(filteredReceivables.reduce((acc, p) => acc + p.balance, 0))}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">C.I. / Documento</th>
                  <th className="py-2.5 px-3">Teléfono</th>
                  <th className="py-2.5 px-3">Última Visita</th>
                  <th className="py-2.5 px-3 text-right">Total Facturado</th>
                  <th className="py-2.5 px-3 text-right">Saldo Deudor</th>
                  <th className="py-2.5 px-3 text-center no-print">Acción de Cobranza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedReceivables.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-semibold italic">
                      ✓ No existen cuentas por cobrar pendientes. Cartera 100% al día.
                    </td>
                  </tr>
                ) : (
                  paginatedReceivables.items.map((p) => (
                    <tr key={p.patientId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.patientName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.cedula}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{p.phone}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.lastVisit}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {formatMoney(p.totalBilled)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatMoney(p.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendCollectionWhatsApp(p.phone, p.patientName, p.balance)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition"
                            title="Enviar recordatorio de cobro por WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentTab('pagos')}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition"
                            title="Ir a Cajas y Registrar Cobro en Multi-Pagos"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Cobrar en Caja</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paginatedReceivables.totalItems > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedReceivables.startIndex}–{paginatedReceivables.endIndex}</strong> de{' '}
                <strong className="text-slate-800 dark:text-slate-200">{paginatedReceivables.totalItems}</strong> · Página {paginatedReceivables.page} de {paginatedReceivables.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginatedReceivables.page <= 1}
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={paginatedReceivables.page >= paginatedReceivables.totalPages}
                  onClick={() => setReportPage(p => Math.min(paginatedReceivables.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT 3: PAGOS A ESPECIALISTAS */}
      {reportType === 'pagos_especialistas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs print-area">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Liquidación y Pagos a Especialistas Odontológicos
              </h2>
              <span className="text-xs text-slate-500">
                Porcentajes de comisión profesional (% Ganancia pactada en Mantenimiento Doctor)
              </span>
            </div>
            <div className="text-right mt-2 sm:mt-0 font-mono text-xs">
              <span className="text-slate-400 block">Total a Liquidar Doctores:</span>
              <strong className="text-base font-black text-emerald-600">
                {formatMoney(specialistPayments.reduce((acc, s) => acc + s.doctorCommission, 0))}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Especialista</th>
                  <th className="py-2.5 px-3">Especialidad</th>
                  <th className="py-2.5 px-3 text-center">% Comisión</th>
                  <th className="py-2.5 px-3 text-center">Tratamientos</th>
                  <th className="py-2.5 px-3 text-right">Producción Bruta</th>
                  <th className="py-2.5 px-3 text-right">Pago Doctor</th>
                  <th className="py-2.5 px-3 text-right">Margen Clínica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {specialistPayments.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{s.doctorName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{s.specialty}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600">{s.commissionRate}%</td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">{s.treatmentsCount}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(s.totalProduced)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-600">
                      {formatMoney(s.doctorCommission)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatMoney(s.clinicShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: CAJA & CONTROL DE DIVISAS / BALANCE MENSUAL */}
      {(reportType === 'caja_chica' || reportType === 'control_divisas' || reportType === 'listado_pacientes' || reportType === 'balance_mensual') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs print-area">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {reportType === 'balance_mensual' ? 'Detalle de Ingresos y Egresos del Mes' : 'Movimientos de Caja & Arqueo Diario'}
              </h2>
              <span className="text-xs text-slate-500">
                Ingresos recibidos en efectivo, Zelle, Pago Móvil y transferencias
              </span>
            </div>
            <div className="text-right mt-2 sm:mt-0 font-mono text-xs">
              <span className="text-slate-400 block">Total Recaudado:</span>
              <strong className="text-base font-black text-emerald-600">
                {formatMoney(payments.reduce((acc, p) => acc + p.amount, 0))}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Recibo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3">Referencia</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPayments.items.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{p.receiptNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{p.date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{p.patientName}</td>
                    <td className="py-2.5 px-3 uppercase text-[11px] font-bold text-slate-600 dark:text-slate-400">{p.method}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{p.reference}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.concept}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-600">
                      {formatMoney(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginatedPayments.totalItems > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedPayments.startIndex}–{paginatedPayments.endIndex}</strong> de{' '}
                <strong className="text-slate-800 dark:text-slate-200">{paginatedPayments.totalItems}</strong> · Página {paginatedPayments.page} de {paginatedPayments.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginatedPayments.page <= 1}
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={paginatedPayments.page >= paginatedPayments.totalPages}
                  onClick={() => setReportPage(p => Math.min(paginatedPayments.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>
      )}

    </div>
  );
};
