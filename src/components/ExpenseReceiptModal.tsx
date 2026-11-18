import React, { useEffect, useRef, useState } from 'react';
import { ClinicConfig, ClinicExpense } from '../types/dental';
import {
  EXPENSE_CATEGORY_LABELS,
  buildExpenseReceiptPdfFilename,
  computeExpenseBsEquivalent,
  exportExpenseReceiptPdf,
  formatBsVe,
  formatExpenseReceiptDate,
  resolveExpenseReceiptFolio
} from '../utils/expenseReceiptPdfExport';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  PenTool,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  X
} from 'lucide-react';

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ClinicExpense;
  clinicConfig: ClinicConfig;
  exchangeRate: number;
  issuerName?: string;
  onSaveExpenseDetails: (updated: ClinicExpense) => void;
  showToast: (msg: string) => void;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  isOpen,
  onClose,
  expense,
  clinicConfig,
  exchangeRate,
  issuerName,
  onSaveExpenseDetails,
  showToast
}) => {
  const [providerDocument, setProviderDocument] = useState(expense.providerDocument || '');
  const [paymentReference, setPaymentReference] = useState(expense.paymentReference || '');
  const [status, setStatus] = useState<'pagado' | 'pendiente'>(expense.status);
  const [notes, setNotes] = useState(expense.notes || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(
    expense.receiverSignatureDataUrl
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const folio = resolveExpenseReceiptFolio(expense);

  useEffect(() => {
    if (!isOpen) return;
    setProviderDocument(expense.providerDocument || '');
    setPaymentReference(expense.paymentReference || '');
    setStatus(expense.status);
    setNotes(expense.notes || '');
    setSignatureDataUrl(expense.receiverSignatureDataUrl);
    setStatusMessage(null);
  }, [isOpen, expense.id]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (expense.receiverSignatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = expense.receiverSignatureDataUrl;
    }

    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDraw = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setSignatureDataUrl(canvas.toDataURL('image/png'));
      }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', stopDraw);
    };
  }, [isOpen, expense.id]);

  if (!isOpen) return null;

  const buildUpdatedExpense = (): ClinicExpense => ({
    ...expense,
    receiptFolio: folio,
    providerDocument: providerDocument.trim() || undefined,
    paymentReference: paymentReference.trim() || undefined,
    status,
    notes: notes.trim() || undefined,
    receiverSignatureDataUrl: signatureDataUrl
  });

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureDataUrl(undefined);
  };

  const handleSaveDetails = () => {
    const updated = buildUpdatedExpense();
    onSaveExpenseDetails(updated);
    setStatusMessage('Datos de sustento guardados en el libro contable.');
  };

  const handleDownloadPdf = () => {
    const updated = buildUpdatedExpense();
    onSaveExpenseDetails(updated);
    const filename = exportExpenseReceiptPdf({
      expense: updated,
      clinicConfig,
      exchangeRate,
      issuerName
    });
    setStatusMessage(`Recibo PDF oficial "${filename}" generado y descargado.`);
    showToast(`Recibo de pago ${filename} descargado`);
  };

  const currentExpense = buildUpdatedExpense();
  const amountBs = computeExpenseBsEquivalent(currentExpense.amountUsd, exchangeRate);
  const categoryLabel = EXPENSE_CATEGORY_LABELS[currentExpense.category] || 'Otros Gastos Operativos';
  const plannedFilename = buildExpenseReceiptPdfFilename({
    folio,
    providerName: currentExpense.providerName
  });

  return (
    <div
      data-testid="expense-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 no-print">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Comprobante de Pago a Proveedor en PDF · {folio}
              </h3>
              <p className="text-[11px] text-slate-500">
                {currentExpense.providerName} · ${currentExpense.amountUsd.toFixed(2)} USD ({formatBsVe(amountBs)})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              data-testid="expense-receipt-download-pdf-btn"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Descargar Recibo PDF
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
              aria-label="Cerrar comprobante de pago"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formal Voucher Sheet Preview */}
            <div className="lg:col-span-7 bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm p-6 sm:p-8 print-area text-xs space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-sky-600 pb-4">
                <div className="space-y-1">
                  <div className="text-sm font-black uppercase tracking-tight text-slate-900">
                    {clinicConfig.clinicName}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600">
                    RIF: {clinicConfig.rif || 'J-31298456-0'} · Telf: {clinicConfig.phone}
                  </div>
                  <div className="text-[10px] text-slate-500 max-w-md">{clinicConfig.address}</div>
                </div>

                {/* Corona Emblem */}
                <div className="shrink-0 flex flex-col items-center text-center select-none">
                  <svg viewBox="0 0 120 110" className="w-16 h-14" aria-label="Logo Clínica Odontológica Corona">
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
                  <div className="text-xs font-extrabold tracking-wide text-slate-600 leading-none">CORONA</div>
                </div>
              </div>

              {/* Voucher Title & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black tracking-tight text-slate-950 uppercase">
                    Comprobante de Egreso / Recibo de Pago a Proveedor
                  </h4>
                  <div className="text-[11px] font-mono font-bold text-sky-700 mt-0.5">
                    Comprobante N°: {folio} · Fecha de Pago: {formatExpenseReceiptDate(currentExpense.date)}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold border ${
                    currentExpense.status === 'pagado'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                >
                  {currentExpense.status === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </div>

              {/* Provider Strip */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                  Datos del Proveedor / Beneficiario
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nombre / Razón Social</span>
                    <strong className="text-slate-950 uppercase text-[13px]">
                      {currentExpense.providerName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">C.I. / RIF</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {currentExpense.providerDocument?.trim() || '________________________'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Categoría Contable</span>
                    <span className="font-semibold text-slate-800">{categoryLabel}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Tasa BCV Referencial</span>
                    <span className="font-mono font-semibold text-slate-800">
                      Bs. {exchangeRate.toFixed(2)} / USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Rows */}
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                <div className="grid grid-cols-3 bg-slate-50 p-2.5 gap-2">
                  <span className="font-bold text-slate-600">Concepto / Descripción:</span>
                  <span className="col-span-2 font-bold text-slate-950">{currentExpense.description}</span>
                </div>
                <div className="grid grid-cols-3 p-2.5 gap-2">
                  <span className="font-bold text-slate-600">Documento / Factura N°:</span>
                  <span className="col-span-2 font-mono">{currentExpense.invoiceNumber || 'Recibo Interno'}</span>
                </div>
                <div className="grid grid-cols-3 bg-slate-50 p-2.5 gap-2">
                  <span className="font-bold text-slate-600">N° Control SENIAT:</span>
                  <span className="col-span-2 font-mono">{currentExpense.controlNumberSeniat || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 p-2.5 gap-2">
                  <span className="font-bold text-slate-600">Modalidad de Pago:</span>
                  <span className="col-span-2 font-semibold">{currentExpense.paymentMethod}</span>
                </div>
                <div className="grid grid-cols-3 bg-slate-50 p-2.5 gap-2">
                  <span className="font-bold text-slate-600">N° Referencia / Operación:</span>
                  <span className="col-span-2 font-mono">
                    {currentExpense.paymentReference?.trim() || '____________________'}
                  </span>
                </div>
                {currentExpense.notes?.trim() && (
                  <div className="grid grid-cols-3 p-2.5 gap-2">
                    <span className="font-bold text-slate-600">Observaciones:</span>
                    <span className="col-span-2 text-slate-800">{currentExpense.notes}</span>
                  </div>
                )}
              </div>

              {/* Amount Highlight */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-sky-800">
                    Monto Total Pagado al Proveedor
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-950">
                    ${currentExpense.amountUsd.toFixed(2)} USD
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Equivalente en Bolívares
                  </div>
                  <div className="text-lg font-extrabold font-mono text-sky-800">
                    {formatBsVe(amountBs)}
                  </div>
                </div>
              </div>

              {/* Legal Declaration */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 leading-relaxed">
                Por medio del presente comprobante, el proveedor o beneficiario arriba identificado hace constar que ha recibido de{' '}
                <strong className="uppercase">{clinicConfig.clinicName}</strong> (RIF: {clinicConfig.rif || 'J-31298456-0'}) la suma indicada en concepto de pago por los bienes o servicios detallados, sirviendo este documento como sustento formal, administrativo y contable del egreso efectuado.
              </div>

              {/* Dual Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-6 items-end">
                <div className="text-center">
                  <div className="h-14 flex items-center justify-center">
                    {signatureDataUrl ? (
                      <img
                        src={signatureDataUrl}
                        alt={`Firma de ${currentExpense.providerName}`}
                        className="max-h-14 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">Espacio para firma / sello</span>
                    )}
                  </div>
                  <div className="border-t border-slate-700 pt-1 text-[11px] font-bold text-slate-900">
                    RECIBÍ CONFORME (PROVEEDOR)
                  </div>
                  <div className="text-[10px] text-slate-600 uppercase">{currentExpense.providerName}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    C.I./RIF: {currentExpense.providerDocument?.trim() || '_________________'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="h-14 flex items-center justify-center">
                    <span className="font-semibold text-[11px] text-sky-700">
                      {issuerName || 'Administración Clínica Corona'}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-1 text-[11px] font-bold text-slate-900">
                    AUTORIZADO Y PAGADO POR
                  </div>
                  <div className="text-[10px] text-slate-600 uppercase">{clinicConfig.clinicName}</div>
                  <div className="text-[10px] text-slate-500">Administración y Contabilidad</div>
                </div>
              </div>
            </div>

            {/* Right Panel: Formalization & Digital Signature */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 no-print flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Formalizar Sustento de Pago</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Completa los datos opcionales (C.I./RIF, referencia o firma del proveedor) y descarga el recibo PDF oficial.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label
                    htmlFor="expense-receipt-provider-doc"
                    className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                  >
                    C.I. o RIF del Proveedor (opcional):
                  </label>
                  <input
                    id="expense-receipt-provider-doc"
                    data-testid="expense-receipt-provider-doc"
                    type="text"
                    value={providerDocument}
                    onChange={(e) => setProviderDocument(e.target.value)}
                    placeholder="Ej: V-14230981 o J-30124567-8"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="expense-receipt-reference"
                      className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      N° Referencia / Comprobante:
                    </label>
                    <input
                      id="expense-receipt-reference"
                      data-testid="expense-receipt-reference"
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Ej: 0048921 / Efectivo"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expense-receipt-status"
                      className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Estatus del Pago:
                    </label>
                    <select
                      id="expense-receipt-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'pagado' | 'pendiente')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    >
                      <option value="pagado">PAGADO</option>
                      <option value="pendiente">PENDIENTE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="expense-receipt-notes"
                    className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                  >
                    Observaciones / Sustento Adicional:
                  </label>
                  <textarea
                    id="expense-receipt-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Pago cancelado en efectivo por mantenimiento general del consultorio."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </div>

                {/* Receiver Signature Pad */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-sky-600" />
                      <span>Firma del Proveedor / Receptor (opcional):</span>
                    </span>
                    {signatureDataUrl && (
                      <button
                        type="button"
                        onClick={handleClearSignature}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
                      >
                        <RotateCcw className="w-3 h-3" /> Limpiar
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 overflow-hidden">
                    {!signatureDataUrl && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 select-none">
                        El proveedor puede firmar aquí (mouse o táctil)
                      </div>
                    )}
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={90}
                      data-testid="expense-receiver-signature-canvas"
                      className="relative z-10 w-full h-24 touch-none cursor-crosshair block"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 break-all">
                Archivo PDF: {plannedFilename}
              </div>

              {statusMessage && (
                <div
                  data-testid="expense-receipt-status-msg"
                  className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1 mt-auto">
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar Datos
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar Recibo PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
