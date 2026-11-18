import React, { useState, useMemo } from 'react';
import { useDental } from '../context/DentalContext';
import { FacturaElectronicaSeniat } from '../types/dental';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  Check, 
  X, 
  Printer, 
  MessageSquare, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  QrCode, 
  ExternalLink,
  Receipt,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PendingTreatment {
  id: string;
  date: string;
  treatment: string;
  doctor: string;
  montoTrat: number;
  pagado: number;
  saldo: number;
  factSeguro: string;
  selected: boolean;
}

export const MultiPagosView: React.FC = () => {
  const { 
    selectedPatient, 
    exchangeRate, 
    emitFacturaSeniat, 
    generateDirectWhatsAppUrl,
    setCurrentTab,
    activeDoctor,
    showToast
  } = useDental();

  // Treatments to pay (seeded with exact treatments from screenshot Captura_de_pantalla_2026-11-10_172125_60b91b53.png)
  const [treatments, setTreatments] = useState<PendingTreatment[]>([
    {
      id: 'trt-1',
      date: '09/04/2025',
      treatment: 'CARIES AVANZADA - 11',
      doctor: 'ANTONIO MORERA',
      montoTrat: 40.00,
      pagado: 0.00,
      saldo: 40.00,
      factSeguro: '',
      selected: true
    },
    {
      id: 'trt-2',
      date: '09/04/2025',
      treatment: 'CARIES AVANZADA - 12',
      doctor: 'ANTONIO MORERA',
      montoTrat: 40.00,
      pagado: 0.00,
      saldo: 40.00,
      factSeguro: '',
      selected: true
    },
    {
      id: 'trt-3',
      date: '09/04/2025',
      treatment: 'CARIES AVANZADA - 13',
      doctor: 'ANTONIO MORERA',
      montoTrat: 40.00,
      pagado: 0.00,
      saldo: 40.00,
      factSeguro: '',
      selected: true
    }
  ]);

  // Payment in Bolívares (Left Table)
  const [bsPayments, setBsPayments] = useState([
    { method: 'EFECTIVO', monto: 0, banco: 'Caja Bolívares', ref: '' },
    { method: 'TARJETA DE CREDITO', monto: 0, banco: 'Punto Banesco', ref: '' },
    { method: 'CHEQUE', monto: 0, banco: 'Mercantil', ref: '' },
    { method: 'TRANSFERENCIA', monto: 0, banco: 'Banco de Venezuela', ref: '' },
    { method: 'TARJETA DEBITO', monto: 0, banco: 'Punto Mercantil', ref: '' },
    { method: 'PAGO MOVIL', monto: 0, banco: 'Banesco Pago Móvil', ref: '' },
  ]);

  // Payment in Divisas USD / EUR (Right Table)
  const [divisaPayments, setDivisaPayments] = useState([
    { method: 'EFECTIVO', monto: 120, banco: 'Caja Principal Divisas', ref: 'USD-CASH' },
    { method: 'TARJETA DE CREDITO', monto: 0, banco: 'Internacional Visa', ref: '' },
    { method: 'CHEQUE', monto: 0, banco: 'Chase', ref: '' },
    { method: 'TRANSFERENCIA', monto: 0, banco: 'Banesco Panamá', ref: '' },
    { method: 'TARJETA DEBITO', monto: 0, banco: 'Facebank', ref: '' },
    { method: 'PAGO MOVIL (ZELLE)', monto: 0, banco: 'Zelle Wells Fargo', ref: '' },
  ]);

  const [sinIgtf, setSinIgtf] = useState(false);
  const [activeSeniatInvoice, setActiveSeniatInvoice] = useState<FacturaElectronicaSeniat | null>(null);

  // Calculations
  const selectedTreatments = treatments.filter(t => t.selected);
  const totalTtosUsd = selectedTreatments.reduce((acc, t) => acc + t.saldo, 0);
  const totalTtosBs = totalTtosUsd * exchangeRate;

  const totalPaidBs = bsPayments.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  const totalPaidBsInDivisa = totalPaidBs / (exchangeRate || 1);

  const totalPaidDivisa = divisaPayments.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  const totalPaidDivisaInBs = totalPaidDivisa * exchangeRate;

  const totalPaymentsUsd = totalPaidBsInDivisa + totalPaidDivisa;
  const remainingUsd = Math.max(0, totalTtosUsd - totalPaymentsUsd);

  // SENIAT IGTF (3% on payments made in foreign currency/divisas, unless sinIgtf is checked)
  const igtfRate = sinIgtf ? 0 : 3;
  const igtfAmountUsd = sinIgtf ? 0 : (totalPaidDivisa * 0.03);
  const igtfAmountBs = igtfAmountUsd * exchangeRate;

  const toggleSelectTreatment = (id: string) => {
    setTreatments(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const handleUpdateBsPayment = (index: number, field: string, value: any) => {
    setBsPayments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleUpdateDivisaPayment = (index: number, field: string, value: any) => {
    setDivisaPayments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Quick helper: Autofill remaining into first empty payment or cash
  const handleApplyAnticipos = () => {
    if (remainingUsd > 0) {
      setDivisaPayments(prev => {
        const copy = [...prev];
        copy[0] = { ...copy[0], monto: Number((copy[0].monto + remainingUsd).toFixed(2)) };
        return copy;
      });
    }
  };

  const handleProcessPayment = () => {
    if (!selectedPatient) return;
    if (selectedTreatments.length === 0) {
      showToast('Debe seleccionar al menos un tratamiento para facturar.');
      return;
    }

    if (totalPaymentsUsd <= 0) {
      showToast('Debe ingresar un monto en Bolívares o Divisas para procesar el pago.');
      return;
    }

    const items = selectedTreatments.map(t => {
      const toothMatch = t.treatment.match(/(\d{2})$/);
      const toothNum = toothMatch ? parseInt(toothMatch[1]) : undefined;
      return {
        description: t.treatment,
        toothNumber: toothNum,
        amountUsd: t.saldo,
        amountBs: t.saldo * exchangeRate,
        isExempt: true // Servicios odontológicos están exentos de IVA según Art. 18 Num 4 Ley IVA
      };
    });

    const activeBs = bsPayments.filter(p => p.monto > 0).map(p => ({
      method: p.method,
      amountBs: p.monto,
      amountUsd: p.monto / exchangeRate,
      bank: p.banco,
      reference: p.ref || 'REF-BS'
    }));

    const activeDivisas = divisaPayments.filter(p => p.monto > 0).map(p => ({
      method: p.method,
      amountUsd: p.monto,
      bank: p.banco,
      reference: p.ref || 'USD-PAGO'
    }));

    const invoice = emitFacturaSeniat({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      patientCedula: selectedPatient.cedula.startsWith('V-') ? selectedPatient.cedula : `V-${selectedPatient.cedula}`,
      patientRif: `V-${selectedPatient.cedula.replace(/\D/g, '')}-0`,
      patientAddress: 'Caracas, Venezuela',
      patientPhone: selectedPatient.phone,
      doctorName: activeDoctor.name || 'Dr. Antonio Morera',
      items,
      subtotalUsd: totalTtosUsd,
      subtotalBs: totalTtosBs,
      exemptAmountUsd: totalTtosUsd,
      exemptAmountBs: totalTtosBs,
      taxableBaseUsd: 0,
      taxableBaseBs: 0,
      ivaRate: 0,
      ivaAmountUsd: 0,
      ivaAmountBs: 0,
      igtfRate,
      igtfAmountUsd,
      igtfAmountBs,
      totalUsd: totalTtosUsd + igtfAmountUsd,
      totalBs: totalTtosBs + igtfAmountBs,
      exchangeRate,
      paymentBreakdown: {
        bsPayments: activeBs,
        divisaPayments: activeDivisas
      }
    });

    setActiveSeniatInvoice(invoice);
  };

  const handleSendWhatsAppInvoice = (inv: FacturaElectronicaSeniat) => {
    const message = 
`🦷 *CLINICA CORONA - FACTURA ELECTRÓNICA SENIAT*
📄 *N° Factura Fiscal:* ${inv.invoiceNumber}
🔒 *N° Control SENIAT:* ${inv.controlNumber}
📅 *Fecha:* ${inv.date} ${inv.time}
👤 *Paciente:* ${inv.patientName} (${inv.patientCedula})
👨‍⚕️ *Odontólogo:* ${inv.doctorName}
🏢 *Emisor:* CLINICA CORONA, C.A. (RIF: J-31298456-0)

📋 *Tratamientos Odontológicos (Exentos IVA Art. 18):*
${inv.items.map(it => `• ${it.description}: $${it.amountUsd.toFixed(2)} (Bs. ${it.amountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})`).join('\n')}

💵 *Subtotal Servicios:* $${inv.subtotalUsd.toFixed(2)} USD (Bs. ${inv.subtotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})
🏛️ *IGTF SENIAT (3% Divisas):* $${inv.igtfAmountUsd.toFixed(2)} USD (Bs. ${inv.igtfAmountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})
💰 *TOTAL FACTURA FISCAL:* *$${inv.totalUsd.toFixed(2)} USD* (Bs. *${inv.totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}*)
📊 *Tasa Oficial:* ${inv.exchangeRate.toFixed(2)} Bs/$

🔗 *Comprobante Digital Fiscal Verificado SENIAT:*
${inv.qrCodeUrl}

_Factura Electrónica generada bajo Providencia Administrativa SENIAT para Prestaciones Médico-Odontológicas._`;

    if (!selectedPatient) return;
    const url = generateDirectWhatsAppUrl(selectedPatient.phone, message);
    window.open(url, '_blank');
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Multi-Pagos y Facturación SENIAT" />;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Window Frame: Multi Pagos (Exact Layout from Screenshot Captura_de_pantalla_2026-11-10_172125_60b91b53.png) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden text-xs">
        
        {/* Title Bar: Multi Pagos */}
        <div className="px-4 py-2 bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800 border-b border-sky-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🦷</span>
            <span className="font-bold text-sky-950 dark:text-sky-200 text-sm">
              Multi Pagos :: Facturación Electrónica SENIAT
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('pagos')}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section: Tratamientos x Pagar */}
        <div className="p-3 bg-sky-50/50 dark:bg-slate-800/40 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-800 dark:text-sky-300 text-xs uppercase tracking-wide">
              Tratamientos x Pagar
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 dark:text-slate-300">
              Paciente: <strong className="uppercase">{selectedPatient.name}</strong> ({selectedPatient.cedula})
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Tasa Oficial SENIAT: <strong className="text-sky-700 dark:text-sky-300">{exchangeRate.toFixed(2)} Bs/$</strong>
          </div>
        </div>

        {/* Table: Tratamientos x Pagar */}
        <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-sky-100/80 to-blue-50/80 dark:from-slate-800 dark:to-slate-800 text-sky-950 dark:text-sky-200 border-b border-sky-200 dark:border-slate-700 text-[11px] font-semibold">
              <tr>
                <th className="py-2 px-3 text-center w-12 border-r border-sky-200 dark:border-slate-700">Sel</th>
                <th className="py-2 px-3 text-center w-24 border-r border-sky-200 dark:border-slate-700">Fecha</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Tratamiento</th>
                <th className="py-2 px-3 border-r border-sky-200 dark:border-slate-700">Doctor(a)</th>
                <th className="py-2 px-3 text-right w-24 border-r border-sky-200 dark:border-slate-700">Monto Trat</th>
                <th className="py-2 px-3 text-right w-20 border-r border-sky-200 dark:border-slate-700">Pagado</th>
                <th className="py-2 px-3 text-right w-24 border-r border-sky-200 dark:border-slate-700">Saldo ($)</th>
                <th className="py-2 px-3 text-right w-32 border-r border-sky-200 dark:border-slate-700">Saldo Bs.</th>
                <th className="py-2 px-3 text-center w-24">Fact. Seguro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {treatments.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => toggleSelectTreatment(t.id)}
                  className={`cursor-pointer transition ${
                    t.selected 
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  <td className="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={() => toggleSelectTreatment(t.id)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                    {t.date}
                  </td>
                  <td className="py-2 px-3 font-sans font-semibold border-r border-slate-100 dark:border-slate-800">
                    {t.treatment}
                  </td>
                  <td className="py-2 px-3 font-sans uppercase border-r border-slate-100 dark:border-slate-800">
                    {t.doctor}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-100 dark:border-slate-800 tabular-nums">
                    {t.montoTrat.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-100 dark:border-slate-800 tabular-nums text-slate-400">
                    {t.pagado.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-sky-800 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800 tabular-nums">
                    {t.saldo.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 tabular-nums">
                    {(t.saldo * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400">
                    {t.factSeguro || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot className="bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-mono font-bold text-xs border-t border-emerald-300 dark:border-emerald-800">
              <tr>
                <td colSpan={6} className="py-2 px-3 text-right uppercase tracking-wider font-sans">
                  Total Tratamientos Seleccionados:
                </td>
                <td className="py-2 px-3 text-right text-sm tabular-nums border-r border-emerald-200 dark:border-emerald-800">
                  {totalTtosUsd.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-right text-sm tabular-nums border-r border-emerald-200 dark:border-emerald-800">
                  {totalTtosBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Dual Payment Section: Left = Pago en Bs. | Right = Pago en Divisa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
          
          {/* Left: Pago en Bs. (Tasa: 897,54) */}
          <div className="p-3 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sky-800 dark:text-sky-300 text-xs">
                Pago en Bs.
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">Tasa:</span>
                <input
                  type="text"
                  readOnly
                  value={exchangeRate.toFixed(2)}
                  className="w-20 px-2 py-0.5 text-center font-bold bg-sky-50 dark:bg-slate-800 border border-sky-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-1.5 px-2">F. Pago</th>
                  <th className="py-1.5 px-2 text-right w-24">Monto (Bs)</th>
                  <th className="py-1.5 px-2 text-right w-24">Monto Divisa ($)</th>
                  <th className="py-1.5 px-2 w-32">Caja / Banco</th>
                  <th className="py-1.5 px-2 w-28">Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bsPayments.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200 uppercase">
                      {row.method}
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.monto || ''}
                        onChange={(e) => handleUpdateBsPayment(idx, 'monto', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-1.5 py-1 text-right font-mono text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none focus:border-sky-500"
                      />
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {row.monto > 0 ? (row.monto / exchangeRate).toFixed(2) : '0,00'}
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        value={row.banco}
                        onChange={(e) => handleUpdateBsPayment(idx, 'banco', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        value={row.ref}
                        onChange={(e) => handleUpdateBsPayment(idx, 'ref', e.target.value)}
                        placeholder="Ref."
                        className="w-full px-1.5 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 dark:bg-slate-800 font-mono font-bold text-xs border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="py-1.5 px-2 font-sans uppercase">Total Bs:</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-slate-900 dark:text-white">
                    {totalPaidBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-sky-700 dark:text-sky-300">
                    {totalPaidBsInDivisa.toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right: Pago en Divisa (USD - EUR) */}
          <div className="p-3 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                Pago en Divisa (USD - EUR)
              </span>
              <span className="text-[11px] text-slate-400">
                Moneda Extranjera / Zelle / Efectivo
              </span>
            </div>

            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-1.5 px-2">F. Pago</th>
                  <th className="py-1.5 px-2 text-right w-28">Monto ($)</th>
                  <th className="py-1.5 px-2 w-36">Caja / Banco</th>
                  <th className="py-1.5 px-2 w-28">Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {divisaPayments.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200 uppercase">
                      {row.method}
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.monto || ''}
                        onChange={(e) => handleUpdateDivisaPayment(idx, 'monto', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-1.5 py-1 text-right font-mono text-xs border border-emerald-300 dark:border-emerald-800 rounded bg-white dark:bg-slate-800 outline-none focus:border-emerald-500 font-bold"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        value={row.banco}
                        onChange={(e) => handleUpdateDivisaPayment(idx, 'banco', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        value={row.ref}
                        onChange={(e) => handleUpdateDivisaPayment(idx, 'ref', e.target.value)}
                        placeholder="Ref."
                        className="w-full px-1.5 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-100/70 dark:bg-emerald-950/40 font-mono font-bold text-xs border-t border-emerald-300 dark:border-emerald-800">
                <tr>
                  <td className="py-1.5 px-2 font-sans uppercase text-emerald-950 dark:text-emerald-200">Total Divisa:</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-emerald-800 dark:text-emerald-300 text-sm">
                    {totalPaidDivisa.toFixed(2)}
                  </td>
                  <td colSpan={2} className="text-right text-[11px] text-slate-500 font-sans pr-2">
                    ≈ Bs. {totalPaidDivisaInBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Bottom Summary & Actions (Exact matching reference screenshot) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Summary counters */}
          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400 font-sans font-medium w-28">Total Ttos:</span>
              <strong className="text-slate-900 dark:text-white tabular-nums">${totalTtosUsd.toFixed(2)} USD</strong>
              <span className="text-slate-400 font-sans">|</span>
              <span className="text-slate-500">Bs. {totalTtosBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400 font-sans font-medium w-28">Total Pagos:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">${totalPaymentsUsd.toFixed(2)} USD</strong>
              <span className="text-slate-400 font-sans">|</span>
              <span className="text-slate-500">Bs. {(totalPaymentsUsd * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400 font-sans font-medium w-28">Total N.Créditos:</span>
              <span className="text-slate-500 tabular-nums">$0.00</span>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-rose-600 font-bold font-sans w-28">Restante:</span>
              <span className={`font-black text-sm tabular-nums ${remainingUsd > 0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                ${remainingUsd.toFixed(2)} USD
              </span>
              {remainingUsd <= 0.01 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                  PAGO COMPLETO
                </span>
              )}
            </div>
          </div>

          {/* IGTF & Fiscal Options */}
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                SENIAT IGTF (3% Divisas):
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 text-[11px]">
                <input
                  type="checkbox"
                  checked={sinIgtf}
                  onChange={(e) => setSinIgtf(e.target.checked)}
                  className="rounded text-sky-600"
                />
                <span>SIN IGTF</span>
              </label>
            </div>

            <div className="text-[11px] font-mono flex items-center justify-between text-slate-500">
              <span>Monto IGTF aplicable:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                ${igtfAmountUsd.toFixed(2)} USD (Bs. {igtfAmountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})
              </strong>
            </div>

            <button
              type="button"
              onClick={handleApplyAnticipos}
              className="w-full py-1.5 px-3 rounded border border-sky-300 dark:border-slate-600 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 text-sky-800 dark:text-sky-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <span>➡️ Aplicar Anticipos / Ajustar Restante</span>
            </button>
          </div>

          {/* Action Buttons: Confirm & Cancel */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleProcessPayment}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-2 hover:scale-105 transition"
              title="Confirmar Pago y Emitir Factura Electrónica SENIAT"
            >
              <Check className="w-5 h-5 font-black" />
              <span>Emitir Factura Electrónica SENIAT</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('pagos')}
              className="p-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold transition"
              title="Cancelar y volver"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>

      {/* Official SENIAT Electronic Invoice Preview & Delivery Modal */}
      {activeSeniatInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">
                    Factura Electrónica Fiscal :: SENIAT Homologada
                  </h3>
                  <p className="text-[10px] text-sky-100">
                    Providencia Administrativa SNAT/2024 · CLINICA CORONA C.A.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSeniatInvoice(null)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Document Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs bg-white dark:bg-slate-900">
              
              {/* Clinic Banner */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    CLINICA CORONA, C.A.
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    RIF: <strong>J-31298456-0</strong>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Av. Principal de Las Mercedes, Edif. Corona Dental, Piso 2, Caracas
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Telf: +58-424-2140058 · www.rhsistema.com
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="px-2.5 py-1 bg-sky-50 dark:bg-slate-800 rounded border border-sky-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Factura Electrónica:</span>
                    <strong className="font-mono text-sm text-sky-700 dark:text-sky-300">{activeSeniatInvoice.invoiceNumber}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    N° Control SENIAT: <strong>{activeSeniatInvoice.controlNumber}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {activeSeniatInvoice.date} {activeSeniatInvoice.time}
                  </div>
                </div>
              </div>

              {/* Patient and Doctor Information */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-sans">Datos del Paciente / Receptor:</span>
                  <strong className="text-slate-900 dark:text-white block text-xs uppercase">{activeSeniatInvoice.patientName}</strong>
                  <span className="font-mono text-slate-600 dark:text-slate-300">C.I. / RIF: {activeSeniatInvoice.patientCedula}</span>
                  <div className="text-slate-500">Telf: {activeSeniatInvoice.patientPhone}</div>
                </div>

                <div>
                  <span className="text-slate-400 block font-sans">Odontólogo Tratante:</span>
                  <strong className="text-slate-900 dark:text-white block text-xs">{activeSeniatInvoice.doctorName}</strong>
                  <span className="text-slate-500">Colegio de Odontólogos (COV-21870)</span>
                  <div className="text-slate-500 font-mono">Tasa Oficial: {activeSeniatInvoice.exchangeRate.toFixed(2)} Bs/$</div>
                </div>
              </div>

              {/* Treatments items table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                    <tr>
                      <th className="py-2 px-3 border-b">Concepto / Servicio Odontológico</th>
                      <th className="py-2 px-3 text-center w-20 border-b">IVA</th>
                      <th className="py-2 px-3 text-right w-24 border-b">Monto ($)</th>
                      <th className="py-2 px-3 text-right w-32 border-b">Monto (Bs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {activeSeniatInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-sans">
                          {it.description}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                            (E) Exento
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          ${it.amountUsd.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          Bs. {it.amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Taxes Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Base Imponible Exenta (E):</span>
                  <span>${activeSeniatInvoice.exemptAmountUsd.toFixed(2)} USD (Bs. {activeSeniatInvoice.exemptAmountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">IVA (0% Art. 18 Num. 4 Ley IVA):</span>
                  <span>Bs. 0,00</span>
                </div>
                <div className="flex justify-between py-1 bg-amber-50 dark:bg-amber-950/30 px-2 rounded text-amber-900 dark:text-amber-200">
                  <span className="font-sans font-semibold">IGTF Divisas (3% SENIAT):</span>
                  <span className="font-bold">
                    +${activeSeniatInvoice.igtfAmountUsd.toFixed(2)} USD (Bs. {activeSeniatInvoice.igtfAmountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white">
                  <span className="font-sans">TOTAL FISCAL FACTURA:</span>
                  <span>
                    ${activeSeniatInvoice.totalUsd.toFixed(2)} USD ≈ Bs. {activeSeniatInvoice.totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Security QR & Legal Legend */}
              <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <img
                  src={activeSeniatInvoice.qrCodeUrl}
                  alt="QR Fiscal SENIAT"
                  className="w-20 h-20 rounded border border-slate-200 dark:border-slate-700"
                />
                <div className="space-y-1 text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Factura Electrónica Fiscal emitida bajo Normativa del SENIAT.
                  </p>
                  <p>
                    Servicios Médico-Odontológicos Exentos de IVA según Artículo 18 numeral 4 del Decreto con Rango, Valor y Fuerza de Ley de Impuesto al Valor Agregado.
                  </p>
                  <p className="font-mono text-slate-400 truncate">
                    Hash Fiscal: {activeSeniatInvoice.digitalSignatureHash}
                  </p>
                </div>
              </div>

            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-sans">
                Factura registrada en el libro de ventas y saldo descontado del paciente.
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-600 flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Formato SENIAT</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsAppInvoice(activeSeniatInvoice)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar Factura x WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
