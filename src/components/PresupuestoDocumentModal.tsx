import React, { useEffect, useState } from 'react';
import { Budget, ClinicConfig, Doctor, MultiCurrencyRates, Patient } from '../types/dental';
import {
  BudgetDisplayCurrency,
  BudgetRateSource,
  convertBudgetAmountToBs,
  formatPresupuestoDate,
  formatPresupuestoEmailContent,
  formatPresupuestoMoney,
  formatPresupuestoWhatsAppText,
  resolveBudgetRate,
  resolveDoctorCredentials
} from '../utils/budgetDocument';
import {
  buildPresupuestoPdfFile,
  buildPresupuestoPdfFilename,
  exportPresupuestoPdf
} from '../utils/budgetPdfExport';
import {
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Printer,
  Send,
  X
} from 'lucide-react';

export type PresupuestoDispatchMode = 'preview' | 'whatsapp' | 'email';

interface PresupuestoDocumentModalProps {
  isOpen: boolean;
  initialMode: PresupuestoDispatchMode;
  onClose: () => void;
  budget: Budget;
  patient: Patient;
  doctors: Doctor[];
  exchangeRate: number;
  rates?: MultiCurrencyRates;
  initialCurrencyMode?: BudgetDisplayCurrency;
  initialRateSource?: BudgetRateSource;
  clinicConfig: ClinicConfig;
  generateDirectWhatsAppUrl: (phone: string, text: string) => string;
  showToast: (msg: string) => void;
}

export const PresupuestoDocumentModal: React.FC<PresupuestoDocumentModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  budget,
  patient,
  doctors,
  exchangeRate,
  rates,
  initialCurrencyMode = 'USD',
  initialRateSource = 'usdBcv',
  clinicConfig,
  generateDirectWhatsAppUrl,
  showToast
}) => {
  const [mode, setMode] = useState<PresupuestoDispatchMode>(initialMode);
  const [currencyMode, setCurrencyMode] = useState<BudgetDisplayCurrency>(initialCurrencyMode);
  const [rateSource, setRateSource] = useState<BudgetRateSource>(initialRateSource);
  const [attachPdfOnSend, setAttachPdfOnSend] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const doctor = resolveDoctorCredentials(budget.doctorName, doctors, {
    colegiado: budget.doctorColegiado,
    mpps: budget.doctorMpps
  });

  const { rate: activeRate, label: rateLabel } = resolveBudgetRate(rates, rateSource, exchangeRate);

  const [waText, setWaText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setCurrencyMode(initialCurrencyMode);
    setRateSource(initialRateSource);
    setDispatchStatus(null);
  }, [isOpen, initialMode, initialCurrencyMode, initialRateSource]);

  useEffect(() => {
    if (!isOpen) return;
    const params = { budget, patient, doctor, exchangeRate: activeRate, clinicConfig };
    setWaText(formatPresupuestoWhatsAppText(params));
    const mail = formatPresupuestoEmailContent(params);
    setEmailSubject(mail.subject);
    setEmailBody(mail.body);
  }, [isOpen, budget, patient, activeRate, clinicConfig, doctor.colegiado, doctor.mpps, doctor.name]);

  if (!isOpen) return null;

  const plannedPdfFilename = buildPresupuestoPdfFilename({
    folio: budget.folio,
    currencyMode,
    patientName: patient.name
  });

  const handleDownloadPdf = () => {
    const filename = exportPresupuestoPdf({
      budget,
      patient,
      doctor,
      exchangeRate: activeRate,
      clinicConfig,
      currencyMode,
      rateLabel
    });
    setDispatchStatus(`PDF ${filename} descargado correctamente.`);
    showToast(`PDF oficial ${filename} descargado`);
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado al portapapeles`);
    } catch {
      showToast(`No se pudo copiar automáticamente; selecciona el texto manualmente`);
    }
  };

  const handleOpenWhatsApp = async () => {
    const pdfParams = {
      budget,
      patient,
      doctor,
      exchangeRate: activeRate,
      clinicConfig,
      currencyMode,
      rateLabel
    };

    if (attachPdfOnSend) {
      const { doc, file, filename } = buildPresupuestoPdfFile(pdfParams);

      // 1. Si el dispositivo soporta Web Share API con archivos PDF (móvil / tablet / navegador compatible),
      // envía el PDF adjunto directo al selector de WhatsApp.
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `Presupuesto ${budget.folio} - ${patient.name}`,
            text: waText
          });
          setDispatchStatus(`PDF ${filename} compartido directamente por WhatsApp.`);
          showToast(`Presupuesto y archivo ${filename} compartidos por WhatsApp`);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
          // Si Web Share falla en iframe/desktop, continúa con descarga automática + WhatsApp Web
        }
      }

      // 2. Respaldo universal para escritorio/navegador: descarga automática inmediata del PDF + apertura del chat de WhatsApp
      doc.save(filename);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(waText).catch(() => {});
      }
      const url = generateDirectWhatsAppUrl(patient.phone, waText);
      window.open(url, '_blank');
      setDispatchStatus(
        `PDF "${filename}" descargado automáticamente y chat de WhatsApp abierto (adjunta o arrastra el archivo recién descargado en el chat).`
      );
      showToast(`PDF ${filename} descargado y WhatsApp abierto para ${patient.name}`);
      return;
    }

    const url = generateDirectWhatsAppUrl(patient.phone, waText);
    window.open(url, '_blank');
    setDispatchStatus(`Abriendo chat de WhatsApp para ${patient.name}.`);
    showToast(`Abriendo WhatsApp para ${patient.name}`);
  };

  const handleOpenEmail = () => {
    if (attachPdfOnSend) {
      const filename = exportPresupuestoPdf({
        budget,
        patient,
        doctor,
        exchangeRate: activeRate,
        clinicConfig,
        currencyMode,
        rateLabel
      });
      setDispatchStatus(`PDF "${filename}" descargado para adjuntar al borrador de correo.`);
    }
    const recipient = patient.email || '';
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    showToast(
      attachPdfOnSend
        ? `PDF descargado y correo generado para ${recipient || patient.name}`
        : `Borrador de correo generado para ${recipient || patient.name}`
    );
  };

  const formatPdfCellAmount = (usdAmount: number) => {
    if (currencyMode === 'BS') {
      return `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(usdAmount, activeRate))}`;
    }
    return `$${formatPresupuestoMoney(usdAmount)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Documento Oficial de Presupuesto · {budget.folio}
              </h3>
              <p className="text-[11px] text-slate-500">
                {doctor.name} ({doctor.colegiado} · {doctor.mpps})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  mode === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Formato PDF
              </button>
              <button
                type="button"
                onClick={() => setMode('whatsapp')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  mode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  mode === 'email'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Correo
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Descargar PDF
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa del presupuesto"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Currency Conversion Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-sky-50/70 dark:bg-slate-800/60 border-b border-sky-100 dark:border-slate-800 text-xs no-print">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
              <span>Moneda del PDF:</span>
            </span>
            <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setCurrencyMode('USD')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  currencyMode === 'USD'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('BS')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  currencyMode === 'BS'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Convertido a Bs.
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('BOTH')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  currencyMode === 'BOTH'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                USD + Bs.
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Tasa de Conversión:
            </label>
            <select
              value={rateSource}
              onChange={(e) => setRateSource(e.target.value as BudgetRateSource)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="usdBcv">
                Dólar BCV (Bs. {(rates?.usdBcv || exchangeRate).toFixed(2)})
              </option>
              <option value="eurBcv">
                Euro BCV (Bs. {(rates?.eurBcv || exchangeRate).toFixed(2)})
              </option>
              <option value="binanceUsdt">
                Binance USDT (Bs. {(rates?.binanceUsdt || exchangeRate).toFixed(2)})
              </option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <div className={`grid gap-6 ${mode === 'preview' ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-12'}`}>
            {/* Official Presupuesto Sheet (Sin Secuencia de Tratamientos ni Forma de Pago) */}
            <div
              className={`${
                mode === 'preview' ? '' : 'lg:col-span-7'
              } bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm p-6 sm:p-8 print-area text-xs space-y-5`}
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 text-[12px] leading-snug">
                  <div className="font-bold text-slate-950">
                    Nro. Presupuesto: <span className="font-mono">{budget.folio}</span>
                  </div>
                  <div>
                    Fecha Presupuesto: <span className="font-mono">{formatPresupuestoDate(budget.date)}</span>
                  </div>
                  <div>
                    Paciente: <strong className="uppercase">{patient.name}</strong>
                  </div>
                  <div>
                    C.I.: <span className="font-mono">{patient.cedula}</span>
                  </div>
                  <div>
                    Doctor(a): <strong className="uppercase">{doctor.name}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-sky-800 font-semibold">
                    {doctor.colegiado} · {doctor.mpps}
                  </div>
                  <div>
                    Historia Nro. <span className="font-mono">{patient.historyNumber || patient.id}</span>
                  </div>
                  {currencyMode !== 'USD' && (
                    <div className="text-[11px] font-mono text-emerald-700 font-bold pt-0.5">
                      Moneda: Bolívares ({rateLabel}: Bs. {activeRate.toFixed(2)})
                    </div>
                  )}
                </div>

                {/* Corona Logo */}
                <div className="shrink-0 flex flex-col items-center text-center select-none">
                  <svg viewBox="0 0 120 110" className="w-24 h-22" aria-label="Logo Clínica Odontológica Corona">
                    <path
                      d="M36 18 C22 18, 16 32, 20 50 C24 68, 30 96, 39 98 C46 99, 48 76, 60 76 C72 76, 74 99, 81 98 C90 96, 96 68, 100 50 C104 32, 98 18, 84 18 C73 18, 66 26, 60 26 C54 26, 47 18, 36 18 Z"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M38 56 Q60 74 84 50"
                      fill="none"
                      stroke="#0369a1"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-lg font-extrabold tracking-wide text-slate-500 leading-none -mt-1">
                    CORONA
                  </div>
                  <div className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                    CLÍNICA ODONTOLÓGICA
                  </div>
                </div>
              </div>

              {/* Treatments Table */}
              <div className="pt-2">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-y-2 border-slate-800 text-slate-900 font-bold">
                      <th className="py-1.5 px-2 text-center w-12">Cant.</th>
                      <th className="py-1.5 px-2 text-left">Tratamiento</th>
                      <th className="py-1.5 px-2 text-right w-28">
                        Prec. Unit.{currencyMode === 'BS' ? ' (Bs.)' : currencyMode === 'USD' ? ' ($)' : ''}
                      </th>
                      <th className="py-1.5 px-2 text-right w-28">
                        Sub Total{currencyMode === 'BS' ? ' (Bs.)' : currencyMode === 'USD' ? ' ($)' : ''}
                      </th>
                      <th className="py-1.5 px-2 text-right w-32">
                        Total{currencyMode === 'BS' ? ' (Bs.)' : currencyMode === 'USD' ? ' ($)' : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b-2 border-slate-800">
                    {budget.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                          Sin procedimientos registrados en este presupuesto.
                        </td>
                      </tr>
                    ) : (
                      budget.items.map((it) => {
                        const sub = it.price * it.quantity;
                        return (
                          <tr key={it.id}>
                            <td className="py-1.5 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-1.5 px-2 uppercase font-medium">
                              {it.name}
                              {it.toothNumber ? ` (PZ ${it.toothNumber})` : ''}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                              <div>{formatPdfCellAmount(it.price)}</div>
                              {currencyMode === 'BOTH' && (
                                <div className="text-[10px] text-slate-500">
                                  Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(it.price, activeRate))}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                              <div>{formatPdfCellAmount(sub)}</div>
                              {currencyMode === 'BOTH' && (
                                <div className="text-[10px] text-slate-500">
                                  Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(sub, activeRate))}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                              <div>{formatPdfCellAmount(it.total)}</div>
                              {currencyMode === 'BOTH' && (
                                <div className="text-[10px] text-sky-700 font-bold">
                                  Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(it.total, activeRate))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Totals Block */}
                <div className="flex justify-end pt-2.5">
                  <div className="w-80 space-y-1 text-right">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Sub Total:</span>
                      <span className="font-mono tabular-nums">
                        {currencyMode === 'BS'
                          ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.subtotal, activeRate))}`
                          : `$${formatPresupuestoMoney(budget.subtotal)}`}
                      </span>
                    </div>
                    {budget.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Descuento:</span>
                        <span className="font-mono tabular-nums">
                          {currencyMode === 'BS'
                            ? `-Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.discountTotal, activeRate))}`
                            : `-$${formatPresupuestoMoney(budget.discountTotal)}`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-200">
                      <span>Total:</span>
                      <span className="font-mono tabular-nums">
                        {currencyMode === 'BS'
                          ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.total, activeRate))}`
                          : currencyMode === 'BOTH'
                            ? `$${formatPresupuestoMoney(budget.total)} / Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.total, activeRate))}`
                            : `$${formatPresupuestoMoney(budget.total)} USD`}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono">
                      {currencyMode === 'BS'
                        ? `Ref. $${formatPresupuestoMoney(budget.total)} USD (${rateLabel}: ${activeRate.toFixed(2)} Bs/$)`
                        : `Equiv. Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(budget.total, activeRate))} (${rateLabel}: ${activeRate.toFixed(2)})`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota */}
              {budget.notes?.trim() && (
                <div className="space-y-1 pt-1">
                  <div className="font-bold text-slate-900">Nota:</div>
                  <p className="whitespace-pre-line text-slate-800 leading-relaxed">{budget.notes.trim()}</p>
                </div>
              )}

              {/* Signatures & Footer */}
              <div className="pt-12 space-y-5">
                <div className="grid grid-cols-2 gap-10 pt-4">
                  <div className="text-center">
                    <div className="border-t border-slate-800 pt-1 font-semibold">Firma Doctor</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{doctor.name}</div>
                    <div className="text-[10px] font-mono text-sky-800 font-semibold">
                      {doctor.colegiado} · {doctor.mpps}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-slate-800 pt-1 font-semibold">Firma Paciente</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 uppercase">{patient.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{patient.cedula}</div>
                  </div>
                </div>

                <div className="text-center text-[10.5px] text-slate-700 pt-2">
                  Nota: dicho presupuesto puede estar sujeto a cambio durante el desarrollo de su tratamiento
                </div>

                <div className="text-center text-[10px] text-slate-600 border-t border-slate-200 pt-2.5 space-y-0.5 uppercase">
                  <div className="font-semibold text-slate-800">{clinicConfig.address}</div>
                  <div>
                    TLF: {clinicConfig.phone} · @CLINICA_CORONA (IG)
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Panel (WhatsApp or Email) */}
            {mode !== 'preview' && (
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 no-print flex flex-col">
                {mode === 'whatsapp' ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Enviar Plan por WhatsApp</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Destinatario: <strong>{patient.name}</strong> ({patient.phone || 'Sin teléfono'})
                        </p>
                      </div>
                    </div>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 flex flex-col gap-1.5">
                      <span>Mensaje estructurado (incluye Doctor, COV, MPPS y Secuencia):</span>
                      <textarea
                        rows={16}
                        value={waText}
                        onChange={(e) => setWaText(e.target.value)}
                        className="w-full flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono leading-relaxed outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachPdfOnSend}
                        onChange={(e) => setAttachPdfOnSend(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="leading-snug">
                        <strong className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Adjuntar PDF automáticamente al enviar
                        </strong>
                        <span className="block text-[10px] font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 break-all">
                          {plannedPdfFilename} ({currencyMode})
                        </span>
                      </span>
                    </label>

                    {dispatchStatus && (
                      <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{dispatchStatus}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(waText, 'Mensaje de WhatsApp')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Texto
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{attachPdfOnSend ? 'Enviar por WhatsApp + PDF' : 'Enviar por WhatsApp'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-sky-600" />
                          <span>Enviar Plan por Correo</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Para: <strong>{patient.email || 'paciente@correo.com'}</strong>
                        </p>
                      </div>
                    </div>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block space-y-1">
                      <span>Asunto del Correo:</span>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 flex flex-col gap-1.5">
                      <span>Cuerpo del Correo (formato oficial con MPPS y Secuencia):</span>
                      <textarea
                        rows={14}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono leading-relaxed outline-none focus:border-sky-500"
                      />
                    </label>

                    <label className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachPdfOnSend}
                        onChange={(e) => setAttachPdfOnSend(e.target.checked)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="leading-snug">
                        <strong className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Generar y descargar PDF al abrir correo
                        </strong>
                        <span className="block text-[10px] font-mono text-sky-700 dark:text-sky-300 mt-0.5 break-all">
                          {plannedPdfFilename} ({currencyMode})
                        </span>
                      </span>
                    </label>

                    {dispatchStatus && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{dispatchStatus}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(emailBody, 'Contenido del correo')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Texto
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEmail}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{attachPdfOnSend ? 'Enviar Correo + PDF' : 'Abrir Cliente de Correo'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
