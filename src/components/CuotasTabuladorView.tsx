import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { RHSISTEMA_AREAS, TREATMENT_PHASES_META } from '../data/mockData';
import { PureCatalogSuggestedPhase } from '../utils/dentalCalc';
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Plus,
  DollarSign,
  TrendingUp,
  Search,
  Percent,
  ArrowLeftRight,
  History,
  X,
  RefreshCw
} from 'lucide-react';

interface CuotasTabuladorViewProps {
  initialSection?: 'cuotas' | 'tabulador';
}

export const CuotasTabuladorView: React.FC<CuotasTabuladorViewProps> = ({ initialSection = 'cuotas' }) => {
  const {
    installmentPlans,
    createInstallmentPlan,
    payInstallmentAmount,
    patients,
    selectedPatient,
    exchangeRate,
    rates,
    updateRates,
    syncExchangeRatesNow,
    isSyncingRates,
    rateHistory,
    catalogItems,
    adjustCatalogPrices,
    updateCatalogItemPrice,
    addCatalogItem,
    generateDirectWhatsAppUrl,
    clinicConfig
  } = useDental();

  const [section, setSection] = useState<'cuotas' | 'tabulador'>(initialSection);
  const [cuotaFilter, setCuotaFilter] = useState<'todas' | 'pendiente' | 'vencida' | 'pagada'>('todas');

  // New Plan Form
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planPatientId, setPlanPatientId] = useState(selectedPatient?.id || patients[0]?.id || '');
  const [planTitle, setPlanTitle] = useState('Plan Rehabilitación Oral');
  const [planTotalUsd, setPlanTotalUsd] = useState(300);
  const [planDownUsd, setPlanDownUsd] = useState(60);
  const [planCount, setPlanCount] = useState(4);
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Tabulador & 3-Currency states
  const [usdInput, setUsdInput] = useState(String(rates.usdBcv));
  const [eurInput, setEurInput] = useState(String(rates.eurBcv));
  const [binanceInput, setBinanceInput] = useState(String(rates.binanceUsdt));
  const [calcUsd, setCalcUsd] = useState('100');
  const [calcCurrency, setCalcCurrency] = useState<'USD' | 'EUR' | 'BINANCE'>('USD');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('TODAS');
  const [bulkPercent, setBulkPercent] = useState('10');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');

  // New Procedure Form states
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [newProcCode, setNewProcCode] = useState('');
  const [newProcName, setNewProcName] = useState('');
  const [newProcArea, setNewProcArea] = useState<string>(RHSISTEMA_AREAS[0]);
  const [customAreaName, setCustomAreaName] = useState('');
  const [newProcPhase, setNewProcPhase] = useState<PureCatalogSuggestedPhase>('fase_inicial');
  const [newProcPrice, setNewProcPrice] = useState('45');

  // Sync if user switches sidebar between Cuotas and Tabulador
  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  React.useEffect(() => {
    setUsdInput(String(rates.usdBcv));
    setEurInput(String(rates.eurBcv));
    setBinanceInput(String(rates.binanceUsdt));
  }, [rates.usdBcv, rates.eurBcv, rates.binanceUsdt]);

  const totalFinanced = installmentPlans.reduce((s, p) => s + p.totalUsd, 0);
  const allCuotas = installmentPlans.flatMap(p =>
    p.cuotas.map(c => ({ ...c, planId: p.id, patientName: p.patientName, patientId: p.patientId, title: p.title }))
  );
  const overdueCuotas = allCuotas.filter(c => c.status === 'vencida');
  const pendingReceivable = allCuotas
    .filter(c => c.status !== 'pagada')
    .reduce((s, c) => s + Math.max(0, c.amountUsd - c.paidUsd), 0);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPat = patients.find(p => p.id === planPatientId) || selectedPatient;
    if (!targetPat) return;
    createInstallmentPlan({
      patientId: targetPat.id,
      patientName: targetPat.name,
      title: planTitle,
      totalUsd: Number(planTotalUsd),
      downPaymentUsd: Number(planDownUsd),
      installmentCount: Number(planCount),
      startDate: planStartDate
    });
    setShowNewPlan(false);
  };

  const handlePayNextCuota = (planId: string) => {
    const plan = installmentPlans.find(p => p.id === planId);
    if (!plan) return;
    const next = plan.cuotas.find(c => c.status !== 'pagada');
    if (!next) return;
    const owed = Math.max(0, Math.round((next.amountUsd - next.paidUsd) * 100) / 100);
    payInstallmentAmount(planId, owed, 'pago_movil');
  };

  const catalogAreas = Array.from(new Set([...RHSISTEMA_AREAS, ...catalogItems.map(i => i.area)]));

  const handleAddProcedureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcName.trim()) return;
    const resolvedArea = newProcArea === '__CUSTOM__' ? customAreaName.trim().toUpperCase() || RHSISTEMA_AREAS[0] : newProcArea;
    addCatalogItem({
      code: newProcCode,
      name: newProcName,
      area: resolvedArea,
      suggestedPhase: newProcPhase,
      basePrice: parseFloat(newProcPrice) || 1
    });
    setNewProcCode('');
    setNewProcName('');
    setCustomAreaName('');
    setNewProcPrice('45');
    setShowAddProcedure(false);
  };

  const filteredCatalog = catalogItems.filter(
    it =>
      (areaFilter === 'TODAS' || it.area === areaFilter) &&
      (it.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        it.area.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        it.code.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  const selectedCalcRate =
    calcCurrency === 'EUR' ? rates.eurBcv : calcCurrency === 'BINANCE' ? rates.binanceUsdt : rates.usdBcv;
  const calcBsValue = (parseFloat(calcUsd) || 0) * selectedCalcRate;

  return (
    <div className="space-y-6">
      {/* Header + Sub-nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {section === 'cuotas' ? 'Gestión de Cuotas y Financiamiento' : 'Tabulador de Servicios & Tasa BCV'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {section === 'cuotas'
              ? 'Control de cuotas pendientes, vencidas con mora, abonos automáticos y recordatorios WhatsApp.'
              : 'Conversor USD / Bs en tiempo real, ajuste porcentual masivo de tarifas e historial de tasas.'}
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSection('cuotas')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              section === 'cuotas'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-sky-600'
            }`}
          >
            Gestión de Cuotas
          </button>
          <button
            type="button"
            onClick={() => setSection('tabulador')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              section === 'tabulador'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-sky-600'
            }`}
          >
            Tabulador & Tasa
          </button>
        </div>
      </div>

      {section === 'cuotas' ? (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Cartera Financiada Activa</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                ${totalFinanced.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                {installmentPlans.length} planes activos
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
              <p className="text-xs font-semibold text-rose-600">Cuotas Vencidas (Mora)</p>
              <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{overdueCuotas.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Requieren gestión de cobro</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-sky-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-sky-600">Saldo Por Cobrar</p>
              <p className="text-2xl font-bold text-sky-600 mt-1 tabular-nums">
                ${pendingReceivable.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                Bs. {(pendingReceivable * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Filter Bar + Create Plan Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {(['todas', 'pendiente', 'vencida', 'pagada'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCuotaFilter(st)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${
                    cuotaFilter === st
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowNewPlan(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo Plan de Cuotas
            </button>
          </div>

          {showNewPlan && (
            <form
              onSubmit={handleCreatePlan}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-sky-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Paciente
                <select
                  value={planPatientId}
                  onChange={e => setPlanPatientId(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Concepto / Tratamiento
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={e => setPlanTitle(e.target.value)}
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Total ($) / Inicial ($)
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={planTotalUsd}
                    onChange={e => setPlanTotalUsd(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                  />
                  <input
                    type="number"
                    min="0"
                    value={planDownUsd}
                    onChange={e => setPlanDownUsd(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                  />
                </div>
              </label>

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Cuotas / 1ra Fecha
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={planCount}
                    onChange={e => setPlanCount(Number(e.target.value))}
                    className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                  />
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={e => setPlanStartDate(e.target.value)}
                    className="flex-1 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Generar Cuotas
              </button>
            </form>
          )}

          {/* Plans List */}
          <div className="space-y-4">
            {installmentPlans.map(plan => {
              const pat = patients.find(p => p.id === plan.patientId);
              const visibleCuotas = plan.cuotas.filter(
                c => cuotaFilter === 'todas' || c.status === cuotaFilter
              );
              const hasPending = plan.cuotas.some(c => c.status !== 'pagada');
              const overdueCount = plan.cuotas.filter(c => c.status === 'vencida').length;

              return (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  <div className="p-4 bg-sky-50/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-sky-600" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{plan.patientName}</h3>
                        {overdueCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> {overdueCount} vencida(s)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {plan.title} · Financiado: <strong className="tabular-nums">${plan.totalUsd.toFixed(2)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {pat && (
                        <a
                          href={generateDirectWhatsAppUrl(
                            pat.phone,
                            `Hola ${pat.name.split(' ')[0]}, te recordamos tu plan de cuotas (${plan.title}) en ${clinicConfig.clinicName}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Recordar WA
                        </a>
                      )}
                      {hasPending && (
                        <button
                          type="button"
                          onClick={() => handlePayNextCuota(plan.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Cobrar Próxima Cuota
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5">Cuota #</th>
                          <th className="px-4 py-2.5">Vencimiento</th>
                          <th className="px-4 py-2.5">Monto USD</th>
                          <th className="px-4 py-2.5">Equivalente Bs.</th>
                          <th className="px-4 py-2.5">Pagado</th>
                          <th className="px-4 py-2.5">Estatus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {visibleCuotas.map(c => (
                          <tr key={c.number} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2.5 font-bold tabular-nums">Cuota {c.number}</td>
                            <td className="px-4 py-2.5 tabular-nums">{c.dueDate}</td>
                            <td className="px-4 py-2.5 font-semibold tabular-nums">${c.amountUsd.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-slate-500 tabular-nums">
                              Bs. {(c.amountUsd * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">${c.paidUsd.toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              {c.status === 'pagada' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Pagada
                                </span>
                              )}
                              {c.status === 'vencida' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Vencida
                                </span>
                              )}
                              {c.status === 'pendiente' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 font-semibold">
                                  Pendiente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Multi-Currency Exchange Rates + Live Calculator + History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                  <TrendingUp className="w-4 h-4" /> Tasas BCV & Binance
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateRates({ autoSyncEnabled: !rates.autoSyncEnabled }, 'Configuración Auto-Sync')}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      rates.autoSyncEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {rates.autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => syncExchangeRatesNow(false)}
                    disabled={isSyncingRates}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingRates ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="font-semibold text-slate-600 dark:text-slate-300">
                  Dólar BCV
                  <input
                    type="number"
                    step="0.01"
                    value={usdInput}
                    onChange={e => setUsdInput(e.target.value)}
                    aria-label="Tasa Dólar BCV"
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tabular-nums"
                  />
                </label>
                <label className="font-semibold text-slate-600 dark:text-slate-300">
                  Euro BCV
                  <input
                    type="number"
                    step="0.01"
                    value={eurInput}
                    onChange={e => setEurInput(e.target.value)}
                    aria-label="Tasa Euro BCV"
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tabular-nums"
                  />
                </label>
                <label className="font-semibold text-slate-600 dark:text-slate-300">
                  Binance USDT
                  <input
                    type="number"
                    step="0.01"
                    value={binanceInput}
                    onChange={e => setBinanceInput(e.target.value)}
                    aria-label="Tasa Binance USDT"
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-slate-800 text-sm font-bold tabular-nums"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  {rates.sourceLabel} · {rates.lastUpdated}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateRates(
                      {
                        usdBcv: parseFloat(usdInput) || rates.usdBcv,
                        eurBcv: parseFloat(eurInput) || rates.eurBcv,
                        binanceUsdt: parseFloat(binanceInput) || rates.binanceUsdt
                      },
                      'Actualización Tabulador (USD / EUR / Binance)'
                    )
                  }
                  className="shrink-0 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
                >
                  Guardar Tasas
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                  <ArrowLeftRight className="w-4 h-4" /> Calculadora Multi-Moneda ⇄ Bs.
                </div>
                <select
                  value={calcCurrency}
                  onChange={e => setCalcCurrency(e.target.value as any)}
                  aria-label="Divisa de calculadora tabulador"
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="USD">Dólar BCV</option>
                  <option value="EUR">Euro BCV</option>
                  <option value="BINANCE">Binance USDT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-500">
                  Monto ({calcCurrency})
                  <input
                    type="number"
                    value={calcUsd}
                    onChange={e => setCalcUsd(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </label>
                <div className="text-xs font-semibold text-slate-500">
                  Equivalente en Bolívares
                  <div className="mt-1 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 tabular-nums">
                    Bs. {calcBsValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm mb-2">
                <History className="w-4 h-4 text-sky-600" /> Historial de Tasas
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto text-xs">
                {rateHistory.map(r => (
                  <div key={r.id} className="flex justify-between items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 tabular-nums shrink-0">{r.date}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{r.source}</span>
                    <strong className="text-sky-600 tabular-nums whitespace-nowrap">
                      {r.rate.toFixed(2)}
                      {r.eurRate ? ` · €${r.eurRate.toFixed(2)}` : ''}
                      {r.binanceRate ? ` · B:${r.binanceRate.toFixed(2)}` : ''} Bs
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Price Adjustment + Search + Area Filter + Add Procedure Button */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar tratamiento por código, nombre o área..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <select
                  value={areaFilter}
                  onChange={e => setAreaFilter(e.target.value)}
                  aria-label="Filtrar tabulador por área o especialidad"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="TODAS">Todas las Especialidades / Áreas ({catalogItems.length})</option>
                  {catalogAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-sky-600" /> Ajuste:
                </span>
                <input
                  type="number"
                  value={bulkPercent}
                  onChange={e => setBulkPercent(e.target.value)}
                  aria-label="Porcentaje de ajuste masivo"
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => adjustCatalogPrices(parseFloat(bulkPercent) || 0)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold"
                >
                  Aplicar %
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProcedure(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {showAddProcedure ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddProcedure ? 'Cerrar Formulario' : 'Agregar Procedimiento'}</span>
                </button>
              </div>
            </div>

            {showAddProcedure && (
              <form
                onSubmit={handleAddProcedureSubmit}
                className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sky-950 dark:text-sky-200 text-sm">
                    Nuevo Procedimiento Odontológico en Tabulador
                  </h3>
                  <span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                    Se sincroniza automáticamente con Presupuestos & Fases
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <label className="md:col-span-4 font-semibold text-slate-700 dark:text-slate-200">
                    Área o Especialidad *
                    <select
                      value={newProcArea}
                      onChange={e => setNewProcArea(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      {catalogAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                      <option value="__CUSTOM__">+ Crear Nueva Especialidad / Área...</option>
                    </select>
                  </label>

                  {newProcArea === '__CUSTOM__' && (
                    <label className="md:col-span-4 font-semibold text-slate-700 dark:text-slate-200">
                      Nombre de Nueva Especialidad *
                      <input
                        type="text"
                        required
                        placeholder="Ej. 14 - IMPLANTOLOGIA AVANZADA"
                        value={customAreaName}
                        onChange={e => setCustomAreaName(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </label>
                  )}

                  <label className="md:col-span-2 font-semibold text-slate-700 dark:text-slate-200">
                    Código (Opcional)
                    <input
                      type="text"
                      placeholder="Auto (0376)"
                      value={newProcCode}
                      onChange={e => setNewProcCode(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </label>

                  <label className={`${newProcArea === '__CUSTOM__' ? 'md:col-span-6' : 'md:col-span-6'} font-semibold text-slate-700 dark:text-slate-200`}>
                    Nombre del Procedimiento Odontológico *
                    <input
                      type="text"
                      required
                      placeholder="Ej. Implante Osteointegrado de Titanio"
                      value={newProcName}
                      onChange={e => setNewProcName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </label>

                  <label className="md:col-span-4 font-semibold text-slate-700 dark:text-slate-200">
                    Fase Clínica Sugerida
                    <select
                      value={newProcPhase}
                      onChange={e => setNewProcPhase(e.target.value as PureCatalogSuggestedPhase)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      {TREATMENT_PHASES_META.map(ph => (
                        <option key={ph.id} value={ph.id}>{ph.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="md:col-span-3 font-semibold text-slate-700 dark:text-slate-200">
                    Tarifa USD ($) *
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      required
                      value={newProcPrice}
                      onChange={e => setNewProcPrice(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold tabular-nums"
                    />
                  </label>

                  <div className="md:col-span-2 flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">Equiv. en Bs:</span>
                    <div className="mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                      Bs. {((parseFloat(newProcPrice) || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex items-end justify-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                    >
                      Guardar en Tabulador
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Catalog Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-sky-50/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Procedimiento Odontológico</th>
                    <th className="px-4 py-3">Especialidad / Área</th>
                    <th className="px-4 py-3">Tarifa USD ($)</th>
                    <th className="px-4 py-3">Tarifa Bolívares</th>
                    <th className="px-4 py-3 text-right">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCatalog.map(item => (
                    <tr key={item.id} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-slate-500">{item.code}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.area}</td>
                      <td className="px-4 py-2.5 font-bold text-sky-600 tabular-nums">
                        {editingPriceId === item.id ? (
                          <input
                            type="number"
                            value={editingPriceVal}
                            onChange={e => setEditingPriceVal(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-sky-400 text-xs tabular-nums"
                          />
                        ) : (
                          `$${item.basePrice.toFixed(2)}`
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                        Bs. {(item.basePrice * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {editingPriceId === item.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateCatalogItemPrice(item.id, parseFloat(editingPriceVal) || item.basePrice);
                              setEditingPriceId(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                          >
                            Guardar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPriceId(item.id);
                              setEditingPriceVal(String(item.basePrice));
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-slate-700 dark:text-slate-200 rounded text-[11px] font-semibold"
                          >
                            Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
