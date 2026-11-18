import React, { useState, useMemo, useEffect } from 'react';
import { useDental, NavTab } from '../context/DentalContext';
import { PaymentReceipt, CashClosingPeriod, CashClosingRecord } from '../types/dental';
import { computeCashClosingSummary, paginateList } from '../utils/dentalCalc';
import { exportCashClosingPdf } from '../utils/cashClosingPdfExport';
import { CashClosingPdfModal } from './CashClosingPdfModal';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  Plus, 
  CheckCircle2, 
  Printer, 
  MessageSquare, 
  Receipt, 
  Trash2,
  Calendar,
  Check,
  Lock,
  TrendingUp,
  TrendingDown,
  Wallet,
  FlaskConical,
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { 
    selectedPatient, 
    selectedPatientId, 
    patients,
    payments, 
    recordPayment, 
    generateDirectWhatsAppUrl,
    setCurrentTab,
    exchangeRate,
    rates,
    pendingCheckoutItems,
    removePendingCheckoutItem,
    applySaldoAFavor,
    expenses,
    addExpense,
    seniatInvoices,
    cashClosings,
    registerCashClosing,
    clinicConfig,
    showToast
  } = useDental();

  const [activeSection, setActiveSection] = useState<'recibos' | 'laboratorio' | 'cierre' | 'historial'>('recibos');
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [labPage, setLabPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [labSearch, setLabSearch] = useState('');
  const [paymentDate, setPaymentDate] = useState('2026-11-10');
  const [quantity, setQuantity] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showLabExpenseModal, setShowLabExpenseModal] = useState(false);

  // Standalone Lab Expense Form state
  const [labProvider, setLabProvider] = useState('Laboratorio Dental Corona');
  const [labDescription, setLabDescription] = useState('Confección de Corona / Trabajo Protésico');
  const [labAmountUsd, setLabAmountUsd] = useState<number>(65);
  const [labDate, setLabDate] = useState<string>('2026-11-10');
  const [labInvoice, setLabInvoice] = useState<string>('');
  const [labMethod, setLabMethod] = useState<string>('Transferencia Bancaria');
  const [labPatientId, setLabPatientId] = useState<string>(selectedPatientId);

  // Inline Lab Expense option inside Registro de Pago
  const [includeLabInPayment, setIncludeLabInPayment] = useState(false);
  const [inlineLabProvider, setInlineLabProvider] = useState('Laboratorio Dental Corona');
  const [inlineLabWork, setInlineLabWork] = useState('Trabajo Protésico / Laboratorio');
  const [inlineLabCostUsd, setInlineLabCostUsd] = useState<number>(45);

  // Cierre de Caja state (Diario / Semanal / Mensual)
  const [closingPeriod, setClosingPeriod] = useState<CashClosingPeriod>('diario');
  const [closingRefDate, setClosingRefDate] = useState<string>('2026-11-10');
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closingCashier, setClosingCashier] = useState<string>('Carolina Méndez');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [previewClosing, setPreviewClosing] = useState<CashClosingRecord | null>(null);
  const [pdfModalClosing, setPdfModalClosing] = useState<CashClosingRecord | null>(null);

  // New payment form state
  const [amount, setAmount] = useState<number>(50);
  const [method, setMethod] = useState<PaymentReceipt['method']>('transferencia');
  const [reference, setReference] = useState<string>('');
  const [concept, setConcept] = useState<string>('Multi-Pagos');
  const [doctorName, setDoctorName] = useState<string>('CLINICA CORONA');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  // New Checkout and Vale / Saldo a Favor states
  const [activeCheckoutItemId, setActiveCheckoutItemId] = useState<string | null>(null);
  const [isValeAbono, setIsValeAbono] = useState<boolean>(false);
  const [isCreditToSaldoAFavor, setIsCreditToSaldoAFavor] = useState<boolean>(false);
  const [currencyType] = useState<'USD' | 'BS' | 'USDT'>('USD');

  const patientPayments = payments.filter(p => p.patientId === selectedPatientId);
  const patientPendingItems = pendingCheckoutItems.filter(p => p.patientId === selectedPatientId);

  useEffect(() => {
    setReceiptsPage(1);
  }, [selectedPatientId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'recibos' || detail === 'laboratorio' || detail === 'cierre' || detail === 'historial') {
        setActiveSection(detail);
      }
    };
    window.addEventListener('corona:open-payments-section', handler);
    return () => window.removeEventListener('corona:open-payments-section', handler);
  }, []);

  const allLabExpenses = useMemo(
    () => expenses.filter(e => e.category === 'laboratorio'),
    [expenses]
  );

  const filteredLabExpenses = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    if (!q) return allLabExpenses;
    return allLabExpenses.filter(
      e =>
        e.providerName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.invoiceNumber || '').toLowerCase().includes(q)
    );
  }, [allLabExpenses, labSearch]);

  const paginatedReceipts = useMemo(
    () => paginateList(patientPayments, receiptsPage, 20),
    [patientPayments, receiptsPage]
  );
  const paginatedLabExpenses = useMemo(
    () => paginateList(filteredLabExpenses, labPage, 20),
    [filteredLabExpenses, labPage]
  );
  const paginatedClosings = useMemo(
    () => paginateList(cashClosings, historyPage, 20),
    [cashClosings, historyPage]
  );

  const parsedCountedCash = countedCashInput.trim() === '' ? undefined : Number(countedCashInput);
  const closingSummary = useMemo(
    () =>
      computeCashClosingSummary({
        payments,
        expenses,
        period: closingPeriod,
        referenceDate: closingRefDate,
        exchangeRate,
        countedCashUsd: Number.isFinite(parsedCountedCash as number) ? parsedCountedCash : undefined
      }),
    [payments, expenses, closingPeriod, closingRefDate, exchangeRate, parsedCountedCash]
  );

  useEffect(() => {
    setCountedCashInput(closingSummary.expectedCashUsd.toFixed(2));
  }, [closingPeriod, closingRefDate, closingSummary.expectedCashUsd]);

  const periodInvoicesCount = useMemo(
    () => seniatInvoices.filter(inv => inv.date >= closingSummary.startDate && inv.date <= closingSummary.endDate).length,
    [seniatInvoices, closingSummary.startDate, closingSummary.endDate]
  );

  const openLabModal = () => {
    setLabDate(activeSection === 'cierre' ? closingRefDate : paymentDate);
    setLabPatientId(selectedPatientId);
    setShowLabExpenseModal(true);
  };

  const handleSubmitLabExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labDescription.trim() || labAmountUsd <= 0) return;
    const pat = patients.find(p => p.id === labPatientId);
    const chosenDate = labDate || paymentDate;
    addExpense({
      date: chosenDate,
      category: 'laboratorio',
      description: pat ? `${labDescription.trim()} (${pat.name})` : labDescription.trim(),
      providerName: labProvider.trim() || 'Laboratorio Dental',
      invoiceNumber: labInvoice.trim() || `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
      amountUsd: labAmountUsd,
      amountBs: Math.round(labAmountUsd * exchangeRate * 100) / 100,
      paymentMethod: labMethod,
      status: 'pagado',
      monthCorrelation: chosenDate.slice(0, 7),
      patientId: pat?.id,
      patientName: pat?.name
    });
    setLabInvoice('');
    setShowLabExpenseModal(false);
  };

  const handleRegisterCashClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = Number.isFinite(parsedCountedCash as number)
      ? (parsedCountedCash as number)
      : closingSummary.expectedCashUsd;
    const created = registerCashClosing({
      period: closingPeriod,
      referenceDate: closingRefDate,
      startDate: closingSummary.startDate,
      endDate: closingSummary.endDate,
      cashierName: closingCashier.trim() || 'Caja Principal',
      receiptsCount: closingSummary.receiptsCount,
      invoicesCount: periodInvoicesCount,
      expensesCount: closingSummary.expensesCount,
      labExpensesCount: closingSummary.labExpensesCount,
      totalCollectedUsd: closingSummary.totalCollectedUsd,
      totalCollectedBs: closingSummary.totalCollectedBs,
      totalExpensesUsd: closingSummary.totalExpensesUsd,
      totalExpensesBs: closingSummary.totalExpensesBs,
      labExpensesUsd: closingSummary.labExpensesUsd,
      labExpensesBs: closingSummary.labExpensesBs,
      netBalanceUsd: closingSummary.netBalanceUsd,
      netBalanceBs: closingSummary.netBalanceBs,
      expectedCashUsd: closingSummary.expectedCashUsd,
      countedCashUsd: Math.round(counted * 100) / 100,
      cashDifferenceUsd: closingSummary.cashDifferenceUsd,
      methodTotalsUsd: closingSummary.methodTotalsUsd,
      notes: closingNotes.trim() || undefined
    });
    setPreviewClosing(created);
    setClosingNotes('');
  };

  const buildCurrentDraftClosing = (): CashClosingRecord => {
    const counted = Number.isFinite(parsedCountedCash as number)
      ? (parsedCountedCash as number)
      : closingSummary.expectedCashUsd;
    return {
      id: 'draft-closing',
      folio: `VISTA-${closingPeriod.toUpperCase()}`,
      period: closingPeriod,
      referenceDate: closingRefDate,
      startDate: closingSummary.startDate,
      endDate: closingSummary.endDate,
      createdAt: new Date().toISOString(),
      cashierName: closingCashier.trim() || 'Caja Principal',
      receiptsCount: closingSummary.receiptsCount,
      invoicesCount: periodInvoicesCount,
      expensesCount: closingSummary.expensesCount,
      labExpensesCount: closingSummary.labExpensesCount,
      totalCollectedUsd: closingSummary.totalCollectedUsd,
      totalCollectedBs: closingSummary.totalCollectedBs,
      totalExpensesUsd: closingSummary.totalExpensesUsd,
      totalExpensesBs: closingSummary.totalExpensesBs,
      labExpensesUsd: closingSummary.labExpensesUsd,
      labExpensesBs: closingSummary.labExpensesBs,
      netBalanceUsd: closingSummary.netBalanceUsd,
      netBalanceBs: closingSummary.netBalanceBs,
      expectedCashUsd: closingSummary.expectedCashUsd,
      countedCashUsd: Math.round(counted * 100) / 100,
      cashDifferenceUsd: closingSummary.cashDifferenceUsd,
      methodTotalsUsd: closingSummary.methodTotalsUsd,
      notes: closingNotes.trim() || undefined
    };
  };

  const handleDownloadClosingPdf = (target: CashClosingRecord) => {
    exportCashClosingPdf({
      closing: target,
      payments,
      expenses,
      exchangeRate,
      clinicConfig
    });
    showToast(`PDF Cierre_Caja_${target.folio}.pdf descargado`);
  };

  const handleStartCheckoutForTreatment = (item: typeof pendingCheckoutItems[0]) => {
    setActiveCheckoutItemId(item.id);
    setAmount(item.amountUsd);
    setConcept(`Multi-Pagos: ${item.treatmentName}`);
    setDoctorName(item.doctorName || 'CLINICA CORONA');
    setIsValeAbono(false);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || amount <= 0) return;

    if (isCreditToSaldoAFavor) {
      applySaldoAFavor(selectedPatientId, amount);
    }

    const newRec = recordPayment({
      patientId: selectedPatientId,
      patientName: selectedPatient.name,
      date: paymentDate,
      amount,
      currencyType,
      method,
      reference: reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      concept: isValeAbono ? `[VALE/ABONO] ${concept}` : concept,
      cashierName: doctorName,
      isAbonoVale: isValeAbono,
      notes: `Registrado en Caja - Tasa: ${exchangeRate.toFixed(2)} Bs/$ ${isValeAbono ? '(Vale / Abono parcial)' : ''}`
    });

    if (includeLabInPayment && inlineLabCostUsd > 0) {
      addExpense({
        date: paymentDate,
        category: 'laboratorio',
        description: `${inlineLabWork.trim() || 'Trabajo de Laboratorio'} (${selectedPatient.name})`,
        providerName: inlineLabProvider.trim() || 'Laboratorio Dental',
        invoiceNumber: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
        amountUsd: inlineLabCostUsd,
        amountBs: Math.round(inlineLabCostUsd * exchangeRate * 100) / 100,
        paymentMethod: method.replace('_', ' ').toUpperCase(),
        status: 'pagado',
        monthCorrelation: paymentDate.slice(0, 7),
        patientId: selectedPatient.id,
        patientName: selectedPatient.name
      });
    }

    if (activeCheckoutItemId) {
      removePendingCheckoutItem(activeCheckoutItemId);
      setActiveCheckoutItemId(null);
    }

    setSelectedReceipt(newRec);
    setShowPaymentModal(false);
    setReference('');
    setIsValeAbono(false);
    setIsCreditToSaldoAFavor(false);
    setIncludeLabInPayment(false);
    showToast(`Pago de $${amount} USD registrado exitosamente con método ${method.toUpperCase()}`);
  };

  const handleSendReceiptWA = (rec: PaymentReceipt) => {
    if (!selectedPatient) return;
    const amountBs = (rec.amount * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 });
    const message = 
`🧾 *CLINICA CORONA - COMPROBANTE DE PAGO*
N° Recibo: *${rec.receiptNumber}*
Paciente: *${rec.patientName}*
Fecha: ${rec.date}
Monto abonado: *$${rec.amount.toFixed(2)} USD* (≈ Bs. ${amountBs})
Forma de Pago: ${rec.method.replace('_', ' ').toUpperCase()}
Referencia / Cheque: ${rec.reference}
Concepto: ${rec.concept}
Atendido por: ${rec.cashierName || 'CLINICA CORONA'}

Saldo actual deudor: *$${selectedPatient.balance.toFixed(2)} USD*

¡Gracias por su pago!
_RHSISTEMA.COM · Clinica Corona_`;

    const url = generateDirectWhatsAppUrl(selectedPatient.phone, message);
    window.open(url, '_blank');
  };

  const SUB_TABS = [
    { id: 'pacientes', label: 'Historia' },
    { id: 'odontograma', label: 'Odontodiagrama' },
    { id: 'presupuestos', label: 'Presupuesto' },
    { id: 'secuencia_ttos', label: 'Secuencia de Ttos' },
    { id: 'imagenes', label: 'Archivos' },
    { id: 'recipes', label: 'Récipes' },
    { id: 'consentimientos', label: 'Consentimientos' },
    { id: 'pagos', label: 'Pagos y Abonos', active: true }
  ];

  return (
    <div className="space-y-4">
      
      {/* RHSistema Window Bar (Matching Screenshot 11.02.34) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        
        {/* Top Window Strip: Paciente Name */}
        <div className="px-4 py-2 bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800 border-b border-sky-200 dark:border-slate-700 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-sky-800 dark:text-sky-200">🦷 {selectedPatient ? 'Paciente:' : 'Caja Principal:'}</span>
            <strong className="text-slate-900 dark:text-white uppercase tracking-wide">
              {selectedPatient ? selectedPatient.name : 'Sin pacientes registrados'}
            </strong>
            {selectedPatient && (
              <span className="text-slate-400 font-mono">({selectedPatient.cedula})</span>
            )}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
            BCV USD: <strong>{rates.usdBcv.toFixed(2)}</strong> · EUR: <strong>{rates.eurBcv.toFixed(2)}</strong> · Binance: <strong>{rates.binanceUsdt.toFixed(2)} Bs</strong>
          </div>
        </div>

        {/* Top Mode Switcher: 4 Sub-Pages (Recibos, Gastos de Laboratorio, Cierre de Caja, Historial de Cierres) */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('recibos')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'recibos'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Recibos y Cobros</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('laboratorio')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'laboratorio'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Gastos de Laboratorio ({allLabExpenses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('cierre')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'cierre'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cierre de Caja (Diario / Semanal / Mensual)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('historial')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'historial'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial de Cierres ({cashClosings.length})</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            {cashClosings.length} cierres registrados
          </span>
        </div>

        {/* Subtabs matching screenshot 11.02.34 (shown in Recibos mode) */}
        {activeSection === 'recibos' && (
          <div className="flex items-center overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2 py-1 gap-1 text-[11px]">
            {SUB_TABS.map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentTab(tab.id as NavTab)}
                className={`px-2.5 py-1 rounded-t-md font-medium whitespace-nowrap transition-colors ${
                  tab.active
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-bold border-t-2 border-sky-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeSection === 'recibos' ? (
          !selectedPatient ? (
            <div className="p-6">
              <EmptyPatientState moduleName="Recibos y Cobros del Paciente" />
            </div>
          ) : (
          <>

        {/* Action and Balance Header Strip (Exact layout from 11.02.34) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Date selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Fecha del Pago:
              </span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-sky-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono font-medium outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Middle: Saldo Paciente & Detalle de Pago Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBalanceModal(true)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <span>👤 Saldo Paciente</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('reportes')}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <span>📑 Detalle de Pago</span>
              </button>
            </div>

            {/* Right: Balances (A Favor & Deudor con Bs destacado) */}
            <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-sky-50/50 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 block">A Favor :</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  ${(selectedPatient.saldoAFavor || 0).toFixed(2)} USD
                </span>
                <span className="block text-sm font-mono font-extrabold text-sky-700 dark:text-sky-300">
                  Bs. {((selectedPatient.saldoAFavor || 0) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[11px] font-semibold text-slate-500 block">Deudor :</span>
                <span className={`text-sm font-mono font-bold ${selectedPatient.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  ${selectedPatient.balance.toFixed(2)} USD
                </span>
                <span className="block text-sm font-mono font-extrabold text-sky-700 dark:text-sky-300">
                  Bs. {(selectedPatient.balance * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>

          {/* TRATAMIENTOS FINALIZADOS PENDIENTES DE COBRO (Auto-reflejado desde Odontodiagrama / Plan de Tratamiento) */}
          {patientPendingItems.length > 0 && (
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tratamientos Finalizados en Consulta Pendientes de Cobro ({patientPendingItems.length}):</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded">
                  Reflejado Automáticamente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patientPendingItems.map(item => (
                  <div key={item.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.treatmentName}</div>
                      <div className="text-[10px] text-slate-400">Dr(a): {item.doctorName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block">
                          ${item.amountUsd.toFixed(2)}
                        </span>
                        <span className="font-mono font-extrabold text-sky-700 dark:text-sky-300 text-xs sm:text-sm block">
                          Bs. {(item.amountUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartCheckoutForTreatment(item)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Row: Cantidad, Registro de Pago, Gasto de Laboratorio, Eliminar Pago */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400">Cantidad:</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 px-2 py-1 text-center font-mono text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 border-2 border-sky-500 text-sky-700 dark:text-sky-300 font-bold text-xs shadow-xs transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Registro de Pago</span>
              </button>

              <button
                type="button"
                onClick={openLabModal}
                className="px-4 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <FlaskConical className="w-4 h-4" />
                <span>+ Gasto de Laboratorio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedReceipt) {
                    showToast(`Pago Nro. ${selectedReceipt.receiptNumber} marcado para revisión administrativa`);
                  } else {
                    showToast('Seleccione un recibo de la tabla para anular o revisar');
                  }
                }}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Eliminar Pago</span>
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table matching Screenshot 11.02.34 (con columna Monto Bs. ampliada) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-sky-100/80 to-blue-50/80 dark:from-slate-800 dark:to-slate-800 text-sky-950 dark:text-sky-200 border-b border-sky-200 dark:border-slate-700 text-[11px] font-semibold">
              <tr>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-center w-24">Nro. Recibo</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-center w-28">Fecha</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 w-32">Nro. Cheque / Ref</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-right w-24">Monto ($)</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-right w-36">Monto (Bs.)</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700 text-center w-16">Impr.</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Concepto</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Doctor</th>
                <th className="py-2 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {paginatedReceipts.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic font-sans">
                    No existen pagos registrados aún para este paciente. Presione "Registro de Pago" para ingresar uno.
                  </td>
                </tr>
              ) : (
                paginatedReceipts.items.map((p) => {
                  const isSelected = selectedReceipt?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedReceipt(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-100/60 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 font-bold'
                          : 'hover:bg-sky-50/40 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-bold text-sky-700 dark:text-sky-400 border-r border-slate-100 dark:border-slate-800">
                        {p.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                        {p.date}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-500">
                        {p.reference}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 tabular-nums">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-black text-sky-700 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800 tabular-nums whitespace-nowrap">
                        Bs. {(p.amount * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                        <Check className="w-4 h-4 text-emerald-600 inline-block font-bold" />
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium uppercase border-r border-slate-100 dark:border-slate-800">
                        {p.concept}
                      </td>
                      <td className="py-2.5 px-3 font-sans uppercase border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {p.cashierName || 'CLINICA CORONA'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSendReceiptWA(p)}
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
                            title="Enviar recibo por WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceipt(p);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                            title="Imprimir comprobante"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {paginatedReceipts.totalItems > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedReceipts.startIndex}–{paginatedReceipts.endIndex}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{paginatedReceipts.totalItems}</strong> · Página {paginatedReceipts.page} de {paginatedReceipts.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginatedReceipts.page <= 1}
                onClick={() => setReceiptsPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                type="button"
                disabled={paginatedReceipts.page >= paginatedReceipts.totalPages}
                onClick={() => setReceiptsPage(p => Math.min(paginatedReceipts.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
          </>
          )
        ) : activeSection === 'laboratorio' ? (
          /* SUB-PÁGINA: GASTOS DE LABORATORIO DENTAL */
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-600" />
                  <span>Control de Gastos de Laboratorio Dental</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Órdenes protésicas, coronas, prótesis y técnicos dentales asociados a pacientes (descontados en Cierre de Caja).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={labSearch}
                    onChange={e => {
                      setLabSearch(e.target.value);
                      setLabPage(1);
                    }}
                    placeholder="Buscar laboratorio o trabajo..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={openLabModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Gasto de Laboratorio</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900">
                <span className="text-xs font-semibold text-violet-800 dark:text-violet-300">Total Gastos de Laboratorio ({filteredLabExpenses.length} órdenes)</span>
                <div className="text-xl font-black text-violet-700 dark:text-violet-300 font-mono tabular-nums mt-1">
                  ${filteredLabExpenses.reduce((acc, e) => acc + e.amountUsd, 0).toFixed(2)} USD
                </div>
                <div className="text-base font-extrabold text-sky-700 dark:text-sky-300 font-mono tabular-nums mt-0.5">
                  Bs. {(filteredLabExpenses.reduce((acc, e) => acc + e.amountUsd, 0) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">En Periodo de Cierre Activo ({closingPeriod.toUpperCase()})</span>
                  <div className="text-xl font-black text-sky-700 dark:text-sky-300 font-mono tabular-nums mt-1">
                    ${closingSummary.labExpensesUsd.toFixed(2)} USD
                  </div>
                  <div className="text-sm font-extrabold text-sky-800 dark:text-sky-300 font-mono tabular-nums mt-0.5">
                    Bs. {closingSummary.labExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('cierre')}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Ir a Cierre →
                </button>
              </div>
            </div>

            <div className="border border-violet-200 dark:border-violet-900/60 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-violet-50/80 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-violet-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Laboratorio / Técnico</th>
                      <th className="py-2.5 px-3">Trabajo / Paciente</th>
                      <th className="py-2.5 px-3">Orden / Fact.</th>
                      <th className="py-2.5 px-3">Forma de Pago</th>
                      <th className="py-2.5 px-3 text-right">Monto USD</th>
                      <th className="py-2.5 px-3 text-right">Equivalente Bs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {paginatedLabExpenses.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 italic font-sans">
                          No hay gastos de laboratorio registrados con los criterios actuales.
                        </td>
                      </tr>
                    ) : (
                      paginatedLabExpenses.items.map(exp => (
                        <tr key={exp.id} className="hover:bg-violet-50/40 dark:hover:bg-violet-950/20">
                          <td className="py-2.5 px-3">{exp.date}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">{exp.providerName}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">{exp.description}</td>
                          <td className="py-2.5 px-3 text-slate-500">{exp.invoiceNumber || '—'}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">{exp.paymentMethod}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-violet-700 dark:text-violet-300">
                            ${exp.amountUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-sm font-black text-sky-700 dark:text-sky-300 whitespace-nowrap">
                            Bs. {(exp.amountUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedLabExpenses.totalItems > 0 && (
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedLabExpenses.startIndex}–{paginatedLabExpenses.endIndex}</strong> de{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{paginatedLabExpenses.totalItems}</strong> · Página {paginatedLabExpenses.page} de {paginatedLabExpenses.totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={paginatedLabExpenses.page <= 1}
                      onClick={() => setLabPage(p => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      type="button"
                      disabled={paginatedLabExpenses.page >= paginatedLabExpenses.totalPages}
                      onClick={() => setLabPage(p => Math.min(paginatedLabExpenses.totalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                    >
                      Siguiente <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeSection === 'cierre' ? (
          /* CIERRE DE CAJA SECTION (DIARIO / SEMANAL / MENSUAL) */
          <div className="p-5 space-y-5">
            {/* Period Type & Reference Date Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-sky-600" />
                  <span>Cierre de Caja General — {clinicConfig.clinicName}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Periodo evaluado:{' '}
                  <strong className="text-sky-700 dark:text-sky-300 font-mono">
                    {closingSummary.startDate} al {closingSummary.endDate}
                  </strong>{' '}
                  · Tasa BCV: <strong className="font-mono">{exchangeRate.toFixed(2)} Bs/$</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 text-xs">
                  {(
                    [
                      { id: 'diario', label: 'Diario' },
                      { id: 'semanal', label: 'Semanal' },
                      { id: 'mensual', label: 'Mensual' }
                    ] as const
                  ).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setClosingPeriod(p.id)}
                      className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                        closingPeriod === p.id
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Fecha base:</span>
                  <input
                    type="date"
                    value={closingRefDate}
                    onChange={e => setClosingRefDate(e.target.value)}
                    aria-label="Fecha de referencia para cierre de caja"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs outline-none focus:border-sky-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={openLabModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>+ Gasto Laboratorio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfModalClosing(buildCurrentDraftClosing())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver PDF del Cierre</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadClosingPdf(buildCurrentDraftClosing())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            {/* 4 Summary KPIs (Bs. enlarged + Laboratorio explicitly highlighted) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <span>Ingresos Recaudados</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1">
                  ${closingSummary.totalCollectedUsd.toFixed(2)}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-800 dark:text-emerald-300 font-mono tabular-nums mt-1">
                  Bs. {closingSummary.totalCollectedBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  {closingSummary.receiptsCount} recibos · {periodInvoicesCount} fact. SENIAT
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <span>Egresos & Laboratorio</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono tabular-nums mt-1">
                  ${closingSummary.totalExpensesUsd.toFixed(2)}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-rose-800 dark:text-rose-300 font-mono tabular-nums mt-1">
                  Bs. {closingSummary.totalExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-rose-700/90 dark:text-rose-300/90 mt-0.5 font-semibold">
                  Incluye Lab: <strong className="text-violet-700 dark:text-violet-300">${closingSummary.labExpensesUsd.toFixed(2)}</strong> ({closingSummary.labExpensesCount}) · Op: ${closingSummary.operatingExpensesUsd.toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
                  <span>Saldo Neto en Caja</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <div className={`text-xl font-black font-mono tabular-nums mt-1 ${closingSummary.netBalanceUsd >= 0 ? 'text-sky-700 dark:text-sky-300' : 'text-rose-600'}`}>
                  {closingSummary.netBalanceUsd < 0 ? '-' : ''}${Math.abs(closingSummary.netBalanceUsd).toFixed(2)}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-sky-800 dark:text-sky-300 font-mono tabular-nums mt-1">
                  {closingSummary.netBalanceBs < 0 ? '-' : ''}Bs. {Math.abs(closingSummary.netBalanceBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900">
                <div className="flex items-center justify-between text-xs font-semibold text-violet-800 dark:text-violet-300">
                  <span>Gastos de Laboratorio</span>
                  <FlaskConical className="w-4 h-4 text-violet-600" />
                </div>
                <div className="text-xl font-black text-violet-700 dark:text-violet-300 font-mono tabular-nums mt-1">
                  ${closingSummary.labExpensesUsd.toFixed(2)}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-violet-800 dark:text-violet-300 font-mono tabular-nums mt-1">
                  Bs. {closingSummary.labExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-violet-700/80 dark:text-violet-300/80 mt-0.5">
                  {closingSummary.labExpensesCount} orden(es) · Efectivo esp: ${closingSummary.expectedCashUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Breakdown by Payment Method + Arqueo & Registration Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 cols: Payment Method Breakdown */}
              <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-sky-50/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Desglose por Forma de Pago ({closingPeriod.toUpperCase()})</span>
                  <span className="font-mono text-sky-700 dark:text-sky-300">
                    Total: ${closingSummary.totalCollectedUsd.toFixed(2)}
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Forma de Pago</th>
                      <th className="py-2 px-3 text-right">Monto USD ($)</th>
                      <th className="py-2 px-3 text-right">Equivalente Bs.</th>
                      <th className="py-2 px-3 text-right">% Part.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {(
                      [
                        { key: 'efectivo', label: 'Efectivo ($ / Bs)' },
                        { key: 'pago_movil', label: 'Pago Móvil' },
                        { key: 'transferencia', label: 'Transferencia Bancaria' },
                        { key: 'tarjeta_debito', label: 'Punto de Venta (Débito)' },
                        { key: 'tarjeta_credito', label: 'Punto de Venta (Crédito)' },
                        { key: 'zelle', label: 'Zelle (USD)' },
                        { key: 'binance', label: 'Binance Pay (USDT)' },
                        { key: 'paypal', label: 'PayPal' },
                        { key: 'vale_abono', label: 'Vale / Abono' }
                      ] as const
                    ).map(m => {
                      const val = closingSummary.methodTotalsUsd[m.key] || 0;
                      const pct = closingSummary.totalCollectedUsd > 0 ? (val / closingSummary.totalCollectedUsd) * 100 : 0;
                      return (
                        <tr key={m.key} className={val > 0 ? 'bg-sky-50/30 dark:bg-sky-950/20 font-semibold' : 'text-slate-400'}>
                          <td className="py-2 px-3 font-sans">{m.label}</td>
                          <td className="py-2 px-3 text-right tabular-nums">${val.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-xs sm:text-sm font-extrabold text-sky-700 dark:text-sky-300 tabular-nums whitespace-nowrap">
                            Bs. {(val * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right 5 cols: Arqueo Físico & Registrar Cierre */}
              <form
                onSubmit={handleRegisterCashClosing}
                className="lg:col-span-5 p-4 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/30 dark:bg-slate-800/40 space-y-3 text-xs"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white border-b border-sky-100 dark:border-slate-700 pb-2">
                  Arqueo y Registro de Cierre ({closingPeriod.toUpperCase()})
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Responsable / Cajero:
                  </label>
                  <input
                    type="text"
                    required
                    value={closingCashier}
                    onChange={e => setClosingCashier(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Efectivo Contado ($):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedCashInput}
                      onChange={e => setCountedCashInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-sky-400 bg-white dark:bg-slate-900 font-mono font-bold outline-none"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Diferencia Arqueo:
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-lg border font-mono font-bold ${
                        closingSummary.cashDifferenceUsd === 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                          : closingSummary.cashDifferenceUsd > 0
                          ? 'bg-sky-50 border-sky-300 text-sky-700'
                          : 'bg-rose-50 border-rose-300 text-rose-700'
                      }`}
                    >
                      {closingSummary.cashDifferenceUsd >= 0 ? '+' : ''}
                      ${closingSummary.cashDifferenceUsd.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Observaciones del Cierre:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Novedades de caja, depósitos bancarios o comprobantes pendientes..."
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Registrar Cierre de Caja</span>
                </button>
              </form>
            </div>

            {/* Active Closing Confirmation Banner */}
            {previewClosing && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <strong className="text-emerald-900 dark:text-emerald-200">
                    Cierre {previewClosing.folio} ({previewClosing.period.toUpperCase()}) guardado correctamente.
                  </strong>{' '}
                  <span className="text-emerald-700 dark:text-emerald-300">
                    Del {previewClosing.startDate} al {previewClosing.endDate} · Neto: ${previewClosing.netBalanceUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfModalClosing(previewClosing)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver PDF del Cierre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadClosingPdf(previewClosing)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Summary Links to Sub-Pages (Laboratorios & Historial) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-semibold text-violet-800 dark:text-violet-300">
                  <FlaskConical className="w-4 h-4 text-violet-600" />
                  <span>Laboratorio en este periodo ({closingSummary.labExpensesCount}):</span>
                  <strong className="font-mono">${closingSummary.labExpensesUsd.toFixed(2)} USD</strong>
                  <span className="font-mono text-sky-700 dark:text-sky-300 font-bold">
                    (Bs. {closingSummary.labExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('laboratorio')}
                  className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold hover:bg-violet-200 transition"
                >
                  Ver Detalle Laboratorio →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('historial')}
                  className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition"
                >
                  Ver Historial de Cierres ({cashClosings.length}) →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SUB-PÁGINA: HISTORIAL DE CIERRES DE CAJA */
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-600" />
                  <span>Historial de Cierres de Caja Registrados ({cashClosings.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditoría de cierres diarios, semanales y mensuales con arqueo e impacto de laboratorio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('cierre')}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                + Nuevo Cierre de Caja
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-sky-50/70 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Folio</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Periodo</th>
                      <th className="py-2.5 px-3 text-center">Recibos</th>
                      <th className="py-2.5 px-3 text-right">Ingresos ($)</th>
                      <th className="py-2.5 px-3 text-right">Egresos ($)</th>
                      <th className="py-2.5 px-3 text-right">Lab ($)</th>
                      <th className="py-2.5 px-3 text-right">Neto ($) / Bs.</th>
                      <th className="py-2.5 px-3 text-right">Dif. Arqueo</th>
                      <th className="py-2.5 px-3">Responsable</th>
                      <th className="py-2.5 px-3 text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {paginatedClosings.items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-slate-400 italic font-sans">
                          No hay cierres de caja registrados aún.
                        </td>
                      </tr>
                    ) : (
                      paginatedClosings.items.map(c => (
                        <tr key={c.id} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-sky-700 dark:text-sky-400">{c.folio}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 font-sans font-bold uppercase text-[10px]">
                              {c.period}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {c.startDate === c.endDate ? c.startDate : `${c.startDate} → ${c.endDate}`}
                          </td>
                          <td className="py-2.5 px-3 text-center">{c.receiptsCount}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                            ${c.totalCollectedUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                            ${c.totalExpensesUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-violet-700 dark:text-violet-300">
                            ${(c.labExpensesUsd || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            <div>{c.netBalanceUsd < 0 ? '-' : ''}${Math.abs(c.netBalanceUsd).toFixed(2)}</div>
                            <div className="text-xs font-extrabold text-sky-700 dark:text-sky-300 whitespace-nowrap">
                              {c.netBalanceBs < 0 ? '-' : ''}Bs. {Math.abs(c.netBalanceBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${c.cashDifferenceUsd === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {c.cashDifferenceUsd >= 0 ? '+' : ''}${c.cashDifferenceUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">
                            {c.cashierName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPdfModalClosing(c)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 font-sans font-bold text-[10px]"
                                title={`Ver detalle PDF de ${c.folio}`}
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ver PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadClosingPdf(c)}
                                aria-label={`Descargar PDF ${c.folio}`}
                                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                title={`Descargar PDF ${c.folio}`}
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedClosings.totalItems > 0 && (
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedClosings.startIndex}–{paginatedClosings.endIndex}</strong> de{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{paginatedClosings.totalItems}</strong> · Página {paginatedClosings.page} de {paginatedClosings.totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={paginatedClosings.page <= 1}
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      type="button"
                      disabled={paginatedClosings.page >= paginatedClosings.totalPages}
                      onClick={() => setHistoryPage(p => Math.min(paginatedClosings.totalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                    >
                      Siguiente <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Registro de Pago (RHSistema style) */}
      {showPaymentModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-sky-100 to-blue-50 dark:from-slate-800 dark:to-slate-800 border-b border-sky-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-sm text-sky-900 dark:text-sky-200 flex items-center gap-2">
                💳 Registro de Pago :: CLINICA CORONA
              </span>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 text-xs">
              <div className="bg-sky-50 dark:bg-slate-800/50 p-3 rounded-lg border border-sky-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block">Paciente Activo:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedPatient.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Saldo Deudor:</span>
                  <strong className="text-rose-600 font-mono text-sm">${selectedPatient.balance.toFixed(2)} USD</strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Concepto del Pago:
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Multi-Pagos o Tratamiento Odontológico"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Monto en USD ($):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-sky-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none font-mono text-base font-bold"
                  />
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                    <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">
                      Monto en Bolívares (Tasa {exchangeRate.toFixed(2)}):
                    </span>
                    <span className="text-lg sm:text-xl font-black text-sky-700 dark:text-sky-300 font-mono tabular-nums block">
                      ≈ Bs. {(amount * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Forma de Pago:
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-semibold text-xs"
                  >
                    <option value="pago_movil">Pago Móvil (Bs)</option>
                    <option value="transferencia">Transferencia Bancaria (Bs / USD)</option>
                    <option value="tarjeta_debito">Punto de Venta (Tarjeta Débito)</option>
                    <option value="tarjeta_credito">Punto de Venta (Tarjeta Crédito)</option>
                    <option value="efectivo">Efectivo ($ USD o Bs)</option>
                    <option value="zelle">Zelle (USD)</option>
                    <option value="binance">Binance Pay (USDT)</option>
                    <option value="paypal">PayPal</option>
                    <option value="vale_abono">Vale / Abono Anticipado</option>
                  </select>
                </div>
              </div>

              {/* Opciones de Vale / Abono, Saldo a Favor y Gasto de Laboratorio */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isValeAbono}
                    onChange={(e) => setIsValeAbono(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span>Registrar como Vale / Abono parcial de tratamiento</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isCreditToSaldoAFavor}
                    onChange={(e) => setIsCreditToSaldoAFavor(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Acreditar a Saldo a Favor del Paciente</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={includeLabInPayment}
                    onChange={(e) => setIncludeLabInPayment(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4"
                  />
                  <span>Incluir Gasto de Laboratorio asociado (reflejado en Cierre de Caja)</span>
                </label>

                {includeLabInPayment && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Laboratorio"
                      value={inlineLabProvider}
                      onChange={(e) => setInlineLabProvider(e.target.value)}
                      className="px-2 py-1.5 rounded border border-violet-300 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Trabajo (Corona, Prót.)"
                      value={inlineLabWork}
                      onChange={(e) => setInlineLabWork(e.target.value)}
                      className="px-2 py-1.5 rounded border border-violet-300 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs"
                    />
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Costo USD"
                      value={inlineLabCostUsd}
                      onChange={(e) => setInlineLabCostUsd(parseFloat(e.target.value) || 0)}
                      className="px-2 py-1.5 rounded border border-violet-300 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nro. Cheque / Referencia:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. REF-482019"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Doctor / Responsable:
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Procesar Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Gasto de Laboratorio */}
      {showLabExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Registrar Gasto de Laboratorio Dental
              </span>
              <button
                type="button"
                onClick={() => setShowLabExpenseModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLabExpense} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Laboratorio / Técnico Dental *
                  </label>
                  <input
                    type="text"
                    required
                    value={labProvider}
                    onChange={(e) => setLabProvider(e.target.value)}
                    placeholder="Ej. Lab Dental Corona / Cerámica Pro"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Paciente Asociado (Opcional):
                  </label>
                  <select
                    value={labPatientId}
                    onChange={(e) => setLabPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none"
                  >
                    <option value="">General / Sin paciente</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Trabajo Protésico / Descripción *
                </label>
                <input
                  type="text"
                  required
                  value={labDescription}
                  onChange={(e) => setLabDescription(e.target.value)}
                  placeholder="Ej. Corona Zirconio Pieza 21 / Prótesis Parcial"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={labDate}
                    onChange={(e) => setLabDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Orden / Factura:
                  </label>
                  <input
                    type="text"
                    value={labInvoice}
                    onChange={(e) => setLabInvoice(e.target.value)}
                    placeholder="Auto (LAB-...)"
                    className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Forma de Pago:
                  </label>
                  <select
                    value={labMethod}
                    onChange={(e) => setLabMethod(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg"
                  >
                    <option value="Transferencia Bancaria">Transferencia</option>
                    <option value="Efectivo USD">Efectivo USD</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Monto Gasto Laboratorio USD ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={labAmountUsd}
                    onChange={(e) => setLabAmountUsd(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border-2 border-violet-400 bg-white dark:bg-slate-800 rounded-lg font-mono text-base font-bold text-violet-700 dark:text-violet-300 outline-none"
                  />
                </div>
                <div className="px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                  <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">
                    Equivalente en Bolívares:
                  </span>
                  <span className="text-lg sm:text-xl font-black text-sky-700 dark:text-sky-300 font-mono tabular-nums block">
                    Bs. {(labAmountUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLabExpenseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-xs"
                >
                  Guardar Gasto de Laboratorio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Saldo Paciente */}
      {showBalanceModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>👤 Estado de Cuenta :: {selectedPatient.name}</span>
              </h3>
              <button type="button" onClick={() => setShowBalanceModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-sans">Total Presupuestado:</span>
                <span className="font-bold text-slate-900 dark:text-white">${selectedPatient.totalBilled.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-sans">Total Pagado:</span>
                <span className="font-bold text-emerald-600">
                  ${Math.max(0, selectedPatient.totalBilled - selectedPatient.balance).toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between py-1.5 bg-rose-50 dark:bg-rose-950/40 px-2 rounded">
                <span className="font-bold text-rose-700 dark:text-rose-300 font-sans">Saldo Deudor Actual:</span>
                <span className="font-black text-rose-700 dark:text-rose-300 text-sm">
                  ${selectedPatient.balance.toFixed(2)} USD
                </span>
              </div>
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 font-sans">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 block">
                  Equivalente en Bolívares (Tasa {exchangeRate.toFixed(2)} Bs/$):
                </span>
                <div className="font-mono text-xl font-black text-sky-700 dark:text-sky-300 mt-0.5 tabular-nums">
                  Bs. {(selectedPatient.balance * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="px-4 py-1.5 bg-sky-600 text-white rounded font-bold text-xs"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <CashClosingPdfModal
        isOpen={Boolean(pdfModalClosing)}
        closing={pdfModalClosing}
        payments={payments}
        expenses={expenses}
        exchangeRate={exchangeRate}
        clinicConfig={clinicConfig}
        onClose={() => setPdfModalClosing(null)}
        showToast={showToast}
      />

    </div>
  );
};
