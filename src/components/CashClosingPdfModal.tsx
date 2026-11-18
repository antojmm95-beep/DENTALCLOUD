import React, { useMemo } from 'react';
import {
  CashClosingRecord,
  ClinicConfig,
  ClinicExpense,
  PaymentReceipt
} from '../types/dental';
import { filterCashClosingMovements } from '../utils/dentalCalc';
import { exportCashClosingPdf } from '../utils/cashClosingPdfExport';
import {
  Download,
  FileText,
  FlaskConical,
  Lock,
  Printer,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';

interface CashClosingPdfModalProps {
  isOpen: boolean;
  closing: CashClosingRecord | null;
  payments: PaymentReceipt[];
  expenses: ClinicExpense[];
  exchangeRate: number;
  clinicConfig: ClinicConfig;
  onClose: () => void;
  showToast: (msg: string) => void;
}

const METHOD_LABELS: Array<{ key: keyof CashClosingRecord['methodTotalsUsd']; label: string }> = [
  { key: 'efectivo', label: 'Efectivo ($ / Bs)' },
  { key: 'pago_movil', label: 'Pago Móvil' },
  { key: 'transferencia', label: 'Transferencia Bancaria' },
  { key: 'tarjeta_debito', label: 'Punto de Venta (Débito)' },
  { key: 'tarjeta_credito', label: 'Punto de Venta (Crédito)' },
  { key: 'zelle', label: 'Zelle (USD)' },
  { key: 'binance', label: 'Binance Pay (USDT)' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'vale_abono', label: 'Vale / Abono' }
];

function formatBs(usd: number, rate: number): string {
  return (usd * rate).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export const CashClosingPdfModal: React.FC<CashClosingPdfModalProps> = ({
  isOpen,
  closing,
  payments,
  expenses,
  exchangeRate,
  clinicConfig,
  onClose,
  showToast
}) => {
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;

  const { periodPayments, periodLabExpenses, periodOperatingExpenses } = useMemo(() => {
    if (!closing) {
      return { periodPayments: [], periodLabExpenses: [], periodOperatingExpenses: [] };
    }
    return filterCashClosingMovements(payments, expenses, closing.startDate, closing.endDate);
  }, [closing, payments, expenses]);

  if (!isOpen || !closing) return null;

  const handleDownloadPdf = () => {
    exportCashClosingPdf({
      closing,
      payments,
      expenses,
      exchangeRate: safeRate,
      clinicConfig
    });
    showToast(`PDF Cierre_Caja_${closing.folio}.pdf descargado correctamente`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle PDF del Cierre de Caja ${closing.folio}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Comprobante PDF de Cierre de Caja · {closing.folio} ({closing.period.toUpperCase()})
              </h3>
              <p className="text-[11px] text-slate-500">
                Del {closing.startDate} al {closing.endDate} · Responsable: {closing.cashierName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle PDF del cierre de caja"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm p-6 sm:p-8 print-area text-xs space-y-5">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-sky-700 font-black text-sm uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>Cierre de Caja General ({closing.period.toUpperCase()})</span>
                </div>
                <div className="text-base font-black text-slate-950 uppercase">{clinicConfig.clinicName}</div>
                <div className="text-[11px] text-slate-600">
                  RIF: <span className="font-mono">{clinicConfig.rif}</span> · Tlf: {clinicConfig.phone}
                </div>
              </div>

              <div className="sm:text-right space-y-1 font-mono text-[11px]">
                <div className="font-black text-sm text-sky-700">Folio: {closing.folio}</div>
                <div>
                  Período: <strong>{closing.startDate}</strong> al <strong>{closing.endDate}</strong>
                </div>
                <div>
                  Responsable: <strong className="font-sans">{closing.cashierName}</strong>
                </div>
                <div>Tasa BCV: {safeRate.toFixed(2)} Bs/$</div>
              </div>
            </div>

            {/* 4 Consolidated KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-800">
                  <span>Ingresos Recaudados</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                  ${closing.totalCollectedUsd.toFixed(2)}
                </div>
                <div className="text-xs font-extrabold text-emerald-800 font-mono">
                  Bs. {closing.totalCollectedBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-700/80 mt-0.5">
                  {closing.receiptsCount} recibos · {closing.invoicesCount} fact.
                </div>
              </div>

              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-rose-800">
                  <span>Egresos Totales</span>
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                  ${closing.totalExpensesUsd.toFixed(2)}
                </div>
                <div className="text-xs font-extrabold text-rose-800 font-mono">
                  Bs. {closing.totalExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-rose-700/80 mt-0.5">
                  {closing.expensesCount} egresos en período
                </div>
              </div>

              <div className="p-3 rounded-xl border border-violet-200 bg-violet-50/70">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-violet-800">
                  <span>Gastos de Laboratorio</span>
                  <FlaskConical className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black text-violet-700 font-mono mt-0.5">
                  ${(closing.labExpensesUsd || 0).toFixed(2)}
                </div>
                <div className="text-xs font-extrabold text-violet-800 font-mono">
                  Bs. {(closing.labExpensesBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-violet-700/80 mt-0.5">
                  {closing.labExpensesCount ?? periodLabExpenses.length} orden(es) lab
                </div>
              </div>

              <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/80">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-sky-800">
                  <span>Saldo Neto en Caja</span>
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div className={`text-base font-black font-mono mt-0.5 ${closing.netBalanceUsd >= 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                  {closing.netBalanceUsd < 0 ? '-' : ''}${Math.abs(closing.netBalanceUsd).toFixed(2)}
                </div>
                <div className="text-xs font-extrabold text-sky-800 font-mono">
                  {closing.netBalanceBs < 0 ? '-' : ''}Bs. {Math.abs(closing.netBalanceBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Arqueo de Efectivo */}
            <div className="px-4 py-2.5 rounded-lg bg-sky-50 border border-sky-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span>
                Efectivo Esperado: <strong>${closing.expectedCashUsd.toFixed(2)}</strong>
              </span>
              <span>
                Efectivo Contado: <strong>${closing.countedCashUsd.toFixed(2)}</strong>
              </span>
              <span className={closing.cashDifferenceUsd === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                Diferencia Arqueo: {closing.cashDifferenceUsd >= 0 ? '+' : ''}${closing.cashDifferenceUsd.toFixed(2)}
              </span>
            </div>

            {/* 1. Breakdown by Payment Method */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                1. Desglose de Ingresos por Forma de Pago
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">Forma de Pago</th>
                      <th className="py-1.5 px-3 text-right">Monto USD</th>
                      <th className="py-1.5 px-3 text-right">Equivalente Bs.</th>
                      <th className="py-1.5 px-3 text-right">% Part.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {METHOD_LABELS.map((m) => {
                      const val = closing.methodTotalsUsd[m.key] || 0;
                      const pct = closing.totalCollectedUsd > 0 ? (val / closing.totalCollectedUsd) * 100 : 0;
                      return (
                        <tr key={m.key} className={val > 0 ? 'bg-sky-50/30 font-semibold text-slate-900' : 'text-slate-400'}>
                          <td className="py-1.5 px-3 font-sans">{m.label}</td>
                          <td className="py-1.5 px-3 text-right">${val.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-sky-700">Bs. {formatBs(val, safeRate)}</td>
                          <td className="py-1.5 px-3 text-right">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Receipts Included in Period */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Recibos de Pacientes Incluidos en este Cierre ({periodPayments.length})</span>
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-emerald-200">
                    <tr>
                      <th className="py-1.5 px-3">Nro. Recibo</th>
                      <th className="py-1.5 px-3">Fecha</th>
                      <th className="py-1.5 px-3">Paciente</th>
                      <th className="py-1.5 px-3">Concepto / Forma Pago</th>
                      <th className="py-1.5 px-3 text-right">USD ($)</th>
                      <th className="py-1.5 px-3 text-right">Equiv. Bs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {periodPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic font-sans">
                          No hay recibos dentro del rango de este cierre.
                        </td>
                      </tr>
                    ) : (
                      periodPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-1.5 px-3 font-bold text-sky-700">{p.receiptNumber}</td>
                          <td className="py-1.5 px-3">{p.date}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold">{p.patientName}</td>
                          <td className="py-1.5 px-3 font-sans">
                            {p.concept} <span className="text-slate-400">({p.method.replace('_', ' ')})</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">${p.amount.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-sky-700">Bs. {formatBs(p.amount, safeRate)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Lab Expenses Included in Period */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-violet-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-violet-600" />
                <span>3. Gastos de Laboratorio Descontados ({periodLabExpenses.length})</span>
              </h4>
              <div className="border border-violet-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-violet-50 text-violet-900 font-bold border-b border-violet-200">
                    <tr>
                      <th className="py-1.5 px-3">Fecha</th>
                      <th className="py-1.5 px-3">Laboratorio</th>
                      <th className="py-1.5 px-3">Trabajo / Paciente</th>
                      <th className="py-1.5 px-3">Orden</th>
                      <th className="py-1.5 px-3 text-right">USD ($)</th>
                      <th className="py-1.5 px-3 text-right">Equiv. Bs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {periodLabExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic font-sans">
                          No hay gastos de laboratorio en este período.
                        </td>
                      </tr>
                    ) : (
                      periodLabExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="py-1.5 px-3">{exp.date}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold">{exp.providerName}</td>
                          <td className="py-1.5 px-3 font-sans">{exp.description}</td>
                          <td className="py-1.5 px-3 text-slate-500">{exp.invoiceNumber || '—'}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-violet-700">${exp.amountUsd.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-sky-700">Bs. {formatBs(exp.amountUsd, safeRate)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Operating Expenses */}
            {periodOperatingExpenses.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-rose-800 uppercase text-[11px] tracking-wider">
                  4. Otros Egresos Operativos ({periodOperatingExpenses.length})
                </h4>
                <div className="border border-rose-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                      <tr>
                        <th className="py-1.5 px-3">Fecha</th>
                        <th className="py-1.5 px-3">Proveedor</th>
                        <th className="py-1.5 px-3">Descripción</th>
                        <th className="py-1.5 px-3 text-right">USD ($)</th>
                        <th className="py-1.5 px-3 text-right">Equiv. Bs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {periodOperatingExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="py-1.5 px-3">{exp.date}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold">{exp.providerName}</td>
                          <td className="py-1.5 px-3 font-sans">{exp.description}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-rose-700">${exp.amountUsd.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-sky-700">Bs. {formatBs(exp.amountUsd, safeRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Observations & Signatures */}
            {closing.notes?.trim() && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                <strong className="block text-slate-800 mb-0.5">Observaciones del Cierre:</strong>
                <p className="text-slate-700 whitespace-pre-line">{closing.notes.trim()}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-10 pt-8">
              <div className="text-center">
                <div className="border-t border-slate-800 pt-1 font-semibold">Firma Responsable / Cajero</div>
                <div className="text-[10px] text-slate-600">{closing.cashierName}</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-800 pt-1 font-semibold">Visto Bueno Administración</div>
                <div className="text-[10px] text-slate-600">{clinicConfig.clinicName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
