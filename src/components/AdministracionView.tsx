import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { ClinicExpense, ExpenseCategory } from '../types/dental';
import { paginateList } from '../utils/dentalCalc';
import { ExpenseReceiptModal } from './ExpenseReceiptModal';
import { 
  Building2, 
  Receipt, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  FileSpreadsheet, 
  FileText,
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ShieldCheck, 
  Landmark, 
  Lightbulb, 
  PhoneCall, 
  Droplet, 
  Calculator, 
  PieChart, 
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  alquiler: { label: 'Canon de Alquiler', icon: Building2, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/60' },
  telefonia: { label: 'Telefonía / Internet (CANTV/Inter)', icon: PhoneCall, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/60' },
  servicios_publicos: { label: 'Servicios Públicos (Luz / Agua)', icon: Lightbulb, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/60' },
  contador: { label: 'Honorarios Contador', icon: Calculator, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/60' },
  alcaldia: { label: 'Alcaldía / Fospuca / Aseo', icon: Landmark, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/60' },
  seniat: { label: 'SENIAT (Tributos / Retenciones)', icon: ShieldCheck, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/60' },
  inces: { label: 'INCES', icon: Landmark, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/60' },
  ivss: { label: 'IVSS (Seguro Social)', icon: Landmark, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-950/60' },
  faov: { label: 'FAOV (Banavih)', icon: Landmark, color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950/60' },
  materiales: { label: 'Materiales e Insumos Dentales', icon: Receipt, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-950/60' },
  laboratorio: { label: 'Gastos de Laboratorio Dental', icon: Receipt, color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-950/60' },
  otros: { label: 'Otros Gastos Operativos', icon: Receipt, color: 'text-slate-600', bgColor: 'bg-slate-50 dark:bg-slate-800' }
};

export const AdministracionView: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    updateExpense,
    deleteExpense, 
    exchangeRate, 
    payments, 
    seniatInvoices,
    clinicConfig,
    activeDoctor,
    setCurrentTab,
    showToast 
  } = useDental();

  const [activeAdminPage, setActiveAdminPage] = useState<'libro' | 'resumen'>('libro');
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeReceiptExpenseId, setActiveReceiptExpenseId] = useState<string | null>(null);

  // New Expense Form State
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('alquiler');
  const [formDescription, setFormDescription] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formProviderDoc, setFormProviderDoc] = useState('');
  const [formInvoice, setFormInvoice] = useState('');
  const [formControlSeniat, setFormControlSeniat] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formAmountUsd, setFormAmountUsd] = useState<number>(100);
  const [formMethod, setFormMethod] = useState('Transferencia Bancaria');
  const [formStatus, setFormStatus] = useState<'pagado' | 'pendiente'>('pagado');

  // Filtered expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchMonth = !selectedMonth || exp.monthCorrelation === selectedMonth;
    const matchCat = selectedCategory === 'todos' || exp.category === selectedCategory;
    const matchSearch = !searchTerm || 
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.invoiceNumber && exp.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchMonth && matchCat && matchSearch;
  });

  const paginatedExpenses = paginateList(filteredExpenses, ledgerPage, 20);

  // Totals
  const totalExpensesUsd = filteredExpenses.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const totalExpensesBs = totalExpensesUsd * exchangeRate;

  // Monthly Income for Correlation Ledger
  const monthlyIncomeUsd = payments.reduce((acc, p) => acc + p.amount, 0);
  const monthlyIncomeBs = monthlyIncomeUsd * exchangeRate;
  const netBalanceUsd = monthlyIncomeUsd - totalExpensesUsd;
  const netBalanceBs = netBalanceUsd * exchangeRate;

  const activeReceiptExpense = activeReceiptExpenseId
    ? expenses.find((e) => e.id === activeReceiptExpenseId) || null
    : null;

  const submitNewExpense = (openReceiptAfterSave: boolean) => {
    if (!formDescription.trim() || formAmountUsd <= 0) return;

    const created = addExpense({
      date: new Date().toISOString().split('T')[0],
      category: formCategory,
      description: formDescription.trim(),
      providerName: formProvider.trim() || 'Proveedor General',
      providerDocument: formProviderDoc.trim() || undefined,
      invoiceNumber: formInvoice.trim() || `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      controlNumberSeniat: formControlSeniat.trim() || `00-${Math.floor(10000 + Math.random() * 90000)}`,
      paymentReference: formReference.trim() || undefined,
      amountUsd: formAmountUsd,
      amountBs: formAmountUsd * exchangeRate,
      paymentMethod: formMethod,
      status: formStatus,
      monthCorrelation: selectedMonth
    });

    setFormDescription('');
    setFormProvider('');
    setFormProviderDoc('');
    setFormInvoice('');
    setFormControlSeniat('');
    setFormReference('');
    setFormAmountUsd(100);
    setShowAddModal(false);

    if (openReceiptAfterSave && created?.id) {
      setActiveReceiptExpenseId(created.id);
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    submitNewExpense(false);
  };

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Categoria', 'Concepto', 'Proveedor', 'Factura Nro', 'Control SENIAT', 'Monto USD', 'Monto Bs', 'Forma Pago', 'Estatus'];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.category,
      `"${e.description}"`,
      `"${e.providerName}"`,
      e.invoiceNumber || '',
      e.controlNumberSeniat || '',
      e.amountUsd.toFixed(2),
      (e.amountUsd * exchangeRate).toFixed(2),
      e.paymentMethod,
      e.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Correlacion_Gastos_ClinicaCorona_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Libro de gastos exportado en CSV para el contador');
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner: Module Header + Sub-page Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  Módulo Administrativo & Fiscal
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 rounded">
                  SENIAT Providencia 00071
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Administración de Gastos & Libro del Contador
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control de canon de arrendamiento, nómina parafiscal (IVSS, INCES, FAOV), servicios públicos y correlación contable.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentTab('multi_pagos')}
              className="px-3.5 py-2 text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>Facturación Electrónica SENIAT</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-200 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Exportar para Contador (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveAdminPage('libro')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeAdminPage === 'libro'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Libro de Gastos ({filteredExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminPage('resumen')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeAdminPage === 'resumen'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Resumen Contable & SENIAT
          </button>
        </div>
      </div>

      {/* KPI Cards: Resumen Financiero Mensual para Contador */}
      {activeAdminPage === 'resumen' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Gastos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Gastos Operativos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              ${totalExpensesUsd.toFixed(2)} USD
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              ≈ Bs {totalExpensesBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Mes: {selectedMonth}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredExpenses.length} comprobantes</span>
          </div>
        </div>

        {/* Ingresos en Caja */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ingresos Totales (Caja)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              ${monthlyIncomeUsd.toFixed(2)} USD
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              ≈ Bs {monthlyIncomeBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tratamientos facturados</span>
            <span className="font-semibold text-emerald-600">{payments.length} recibos</span>
          </div>
        </div>

        {/* Balance Neto */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Balance Contable Neto</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalanceUsd >= 0 ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black font-mono tabular-nums ${netBalanceUsd >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600'}`}>
              ${netBalanceUsd.toFixed(2)} USD
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              ≈ Bs {netBalanceBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Margen Operativo</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {monthlyIncomeUsd > 0 ? `${((netBalanceUsd / monthlyIncomeUsd) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Facturación Fiscal Emitida */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">SENIAT Electrónico</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {seniatInvoices.length} Facturas
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              IGTF 3% Divisas Declarado
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>RIF J-41258963-0</span>
            <span className="font-semibold text-sky-600">Al día</span>
          </div>
        </div>

      </div>
      )}

      {/* Main Ledger Section */}
      {activeAdminPage === 'libro' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            
            {/* Mes de Correlación */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Mes:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Categoría Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setLedgerPage(1);
              }}
              className="px-3 py-1 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="todos">Todas las categorías</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor o concepto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setLedgerPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2.5">Fecha</th>
                <th className="px-2 py-2.5">Categoría</th>
                <th className="px-2 py-2.5">Descripción / Concepto</th>
                <th className="px-2 py-2.5">Proveedor / Entidad</th>
                <th className="px-2 py-2.5">Factura / SENIAT</th>
                <th className="px-2 py-2.5 text-right">Monto ($)</th>
                <th className="px-2 py-2.5 text-right">Monto (Bs.)</th>
                <th className="px-2 py-2.5 text-center">Estatus</th>
                <th className="px-2 py-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-800 dark:text-slate-200">
              {paginatedExpenses.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No se encontraron gastos registrados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.items.map((exp) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.otros;
                  const Icon = meta.icon;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-2 py-2.5 font-mono text-[11px] whitespace-nowrap">{exp.date}</td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold max-w-[128px] ${meta.bgColor} ${meta.color}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 font-semibold max-w-[140px] truncate" title={exp.description}>
                        {exp.description}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={exp.providerName}>
                        {exp.providerName}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[10px] whitespace-nowrap leading-tight">
                        <div className="text-slate-600 dark:text-slate-300">{exp.invoiceNumber || 'S/N'}</div>
                        <div className="text-sky-600 dark:text-sky-400">{exp.controlNumberSeniat || '-'}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        ${exp.amountUsd.toFixed(2)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        Bs. {(exp.amountUsd * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          exp.status === 'pagado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {exp.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            data-testid="expense-receipt-pdf-btn"
                            onClick={() => setActiveReceiptExpenseId(exp.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold transition"
                            title="Emitir o descargar recibo PDF de pago al proveedor"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Recibo PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpense(exp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-right uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                    Total Gastos del Período:
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                    ${totalExpensesUsd.toFixed(2)} USD
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Bs. {totalExpensesBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {paginatedExpenses.totalItems > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedExpenses.startIndex}–{paginatedExpenses.endIndex}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{paginatedExpenses.totalItems}</strong> · Página {paginatedExpenses.page} de {paginatedExpenses.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginatedExpenses.page <= 1}
                onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                type="button"
                disabled={paginatedExpenses.page >= paginatedExpenses.totalPages}
                onClick={() => setLedgerPage(p => Math.min(paginatedExpenses.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* MODAL: REGISTRAR NUEVO GASTO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <span>Registrar Gasto de la Clínica</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría de Gasto:
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Proveedor / Beneficiario:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Inversiones Inmobiliarias C.A."
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción / Concepto del Gasto:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Canon mensual consultorio odontológico mes Noviembre"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    N° Factura del Proveedor:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-003841"
                    value={formInvoice}
                    onChange={(e) => setFormInvoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    N° Control SENIAT:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 00-008234"
                    value={formControlSeniat}
                    onChange={(e) => setFormControlSeniat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Monto en USD ($):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formAmountUsd}
                    onChange={(e) => setFormAmountUsd(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono font-bold text-sky-700 dark:text-sky-300"
                  />
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ≈ Bs. {(formAmountUsd * exchangeRate).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Forma de Pago:
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-white"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo USD">Efectivo USD</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    C.I. / RIF Proveedor:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. V-14230981 / J-..."
                    value={formProviderDoc}
                    onChange={(e) => setFormProviderDoc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    N° Referencia Pago:
                  </label>
                  <input
                    type="text"
                    placeholder="Ref. / Efectivo"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Estatus:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'pagado' | 'pendiente')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="pagado">PAGADO</option>
                    <option value="pendiente">PENDIENTE</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Guardar en Libro
                </button>
                <button
                  type="button"
                  data-testid="save-expense-and-open-pdf-btn"
                  onClick={() => submitNewExpense(true)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Guardar y Emitir Recibo PDF</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {activeReceiptExpense && (
        <ExpenseReceiptModal
          isOpen={Boolean(activeReceiptExpense)}
          onClose={() => setActiveReceiptExpenseId(null)}
          expense={activeReceiptExpense}
          clinicConfig={clinicConfig}
          exchangeRate={exchangeRate}
          issuerName={activeDoctor?.name}
          onSaveExpenseDetails={updateExpense}
          showToast={showToast}
        />
      )}

    </div>
  );
};
