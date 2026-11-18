import React, { useEffect, useState } from 'react';
import { useDental } from '../context/DentalContext';
import { 
  Budget, 
  BudgetItem, 
  TreatmentPhase
} from '../types/dental';
import { 
  RHSISTEMA_AREAS, 
  TREATMENT_PHASES_META
} from '../data/mockData';
import {
  BudgetDisplayCurrency,
  BudgetRateSource,
  convertBudgetAmountToBs,
  formatPresupuestoMoney,
  resolveBudgetRate,
  resolveDoctorCredentials
} from '../utils/budgetDocument';
import { PresupuestoDispatchMode, PresupuestoDocumentModal } from './PresupuestoDocumentModal';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Printer, 
  DollarSign, 
  MessageSquare, 
  Sparkles, 
  Mic, 
  MicOff, 
  AlertCircle,
  Filter,
  Check,
  X,
  Layers,
  Mail,
  Send,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

const FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38
];

const CUADRANTES = [
  'TODOS', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'SUP', 'INF', 'ANT'
];

export const BudgetView: React.FC = () => {
  const { 
    selectedPatient, 
    selectedPatientId, 
    budgets, 
    addBudget, 
    updateBudget, 
    updateBudgetStatus, 
    updateBudgetItem, 
    deleteBudget, 
    generateDirectWhatsAppUrl,
    setCurrentTab,
    exchangeRate,
    rates,
    addVoiceBudgetItem,
    addPendingCheckoutItem,
    createInstallmentPlan,
    catalogItems,
    doctors,
    activeDoctor,
    clinicConfig,
    showToast
  } = useDental();

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<PresupuestoDispatchMode>('preview');
  const [displayCurrency, setDisplayCurrency] = useState<BudgetDisplayCurrency>('USD');
  const [rateSource, setRateSource] = useState<BudgetRateSource>('usdBcv');
  const { rate: activeConversionRate, label: activeRateLabel } = resolveBudgetRate(rates, rateSource, exchangeRate);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeDownPayment, setFinanceDownPayment] = useState<number>(0);
  const [financeInstallments, setFinanceInstallments] = useState<number>(3);
  const [financeStartDate, setFinanceStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sub-page navigation ('lista' | 'detalle')
  const [activeBudgetPage, setActiveBudgetPage] = useState<'lista' | 'detalle'>('lista');

  // Filter state for Budgets List (Matching Screenshot 11.27.52 radio options: Presupuesto, Tratamiento, Finalizado, Todos)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'tratamiento' | 'finalizado'>('todos');

  // Active Selected Budget
  const patientBudgets = budgets.filter(b => b.patientId === selectedPatientId);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(
    patientBudgets[0]?.id || ''
  );

  const currentBudget = patientBudgets.find(b => b.id === selectedBudgetId) || patientBudgets[0];

  // New Treatment Entry Form State (Synchronized with Tabulador)
  const availableAreas = Array.from(new Set([...RHSISTEMA_AREAS, ...catalogItems.map(t => t.area)]));
  const [selectedArea, setSelectedArea] = useState<string>(availableAreas[0] || RHSISTEMA_AREAS[0]);
  const availableTreatments = catalogItems.filter(t => t.area === selectedArea);
  
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(availableTreatments[0]?.id || catalogItems[0]?.id || '');
  const selectedTreatmentItem = catalogItems.find(t => t.id === selectedTreatmentId) || availableTreatments[0] || catalogItems[0];

  // Treatment Phase (User requested: inicial, quirurgica, funcional ortodoncia, protesica, mantenimiento)
  const [selectedPhase, setSelectedPhase] = useState<TreatmentPhase>(selectedTreatmentItem?.suggestedPhase || 'fase_inicial');

  // Teeth and Quadrants
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('TODOS');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(selectedTreatmentItem?.basePrice || 35);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [assignedDoctor, setAssignedDoctor] = useState<string>(activeDoctor?.name || doctors[0]?.name || 'Dr. Antonio Morera');

  // Inline Price Editing State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);

  // Voice Assistant State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // When area changes, update treatment selection
  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    const inArea = catalogItems.filter(t => t.area === area);
    if (inArea.length > 0) {
      setSelectedTreatmentId(inArea[0].id);
      setCustomPrice(inArea[0].basePrice);
      setSelectedPhase(inArea[0].suggestedPhase);
    }
  };

  const handleTreatmentChange = (tId: string) => {
    setSelectedTreatmentId(tId);
    const item = catalogItems.find(t => t.id === tId);
    if (item) {
      setCustomPrice(item.basePrice);
      setSelectedPhase(item.suggestedPhase);
    }
  };

  const toggleToothSelection = (tooth: number) => {
    setSelectedTeeth(prev => 
      prev.includes(tooth) ? prev.filter(t => t !== tooth) : [...prev, tooth]
    );
  };

  // Add Treatment Item to Active Budget
  const handleAddTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatmentItem) return;

    const discountAmount = (customPrice * quantity * itemDiscount) / 100;
    const itemTotal = (customPrice * quantity) - discountAmount;

    const newItem: BudgetItem = {
      id: `bi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      code: selectedTreatmentItem.code,
      name: selectedTreatmentItem.name,
      area: selectedArea,
      phase: selectedPhase,
      category: selectedArea.split('-')[1]?.trim() || 'General',
      toothNumber: selectedTeeth.length === 1 ? selectedTeeth[0] : undefined,
      teeth: selectedTeeth.length > 0 ? selectedTeeth : undefined,
      quadrant: selectedQuadrant,
      quantity,
      price: customPrice,
      discount: itemDiscount,
      total: itemTotal,
      doctor: assignedDoctor,
      status: 'pendiente'
    };

    if (currentBudget) {
      const updatedItems = [...currentBudget.items, newItem];
      const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const newDiscountTotal = updatedItems.reduce((acc, i) => acc + ((i.price * i.quantity * i.discount) / 100), 0);
      const newTotal = newSubtotal - newDiscountTotal;

      updateBudget({
        ...currentBudget,
        items: updatedItems,
        subtotal: newSubtotal,
        discountTotal: newDiscountTotal,
        total: newTotal
      });
    } else {
      if (!selectedPatient) return;
      const docCreds = resolveDoctorCredentials(assignedDoctor, doctors);
      const newBud = addBudget({
        patientId: selectedPatientId,
        patientName: selectedPatient.name,
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        doctorName: docCreds.name,
        doctorColegiado: docCreds.colegiado,
        doctorMpps: docCreds.mpps,
        items: [newItem],
        subtotal: customPrice * quantity,
        discountTotal: discountAmount,
        tax: 0,
        total: itemTotal,
        status: 'pendiente',
        notes: 'Plan de tratamiento elaborado.',
        currentPhase: selectedPhase
      });
      setSelectedBudgetId(newBud.id);
    }

    // Reset teeth selections
    setSelectedTeeth([]);
  };

  // Start inline editing
  const handleStartEditItem = (item: BudgetItem) => {
    setEditingItemId(item.id);
    setEditPriceValue(item.price);
    setEditDiscountValue(item.discount || 0);
  };

  const handleSaveItemEdit = (itemId: string) => {
    if (!currentBudget) return;
    updateBudgetItem(currentBudget.id, itemId, {
      price: editPriceValue,
      discount: editDiscountValue
    });
    setEditingItemId(null);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!currentBudget) return;
    const updatedItems = currentBudget.items.filter(i => i.id !== itemId);
    const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const newDiscountTotal = updatedItems.reduce((acc, i) => acc + ((i.price * i.quantity * i.discount) / 100), 0);
    const newTotal = newSubtotal - newDiscountTotal;

    updateBudget({
      ...currentBudget,
      items: updatedItems,
      subtotal: newSubtotal,
      discountTotal: newDiscountTotal,
      total: newTotal
    });
  };

  const handleCreateNewPlan = () => {
    if (!selectedPatient) return;
    const docCreds = resolveDoctorCredentials(assignedDoctor, doctors);
    const newBud = addBudget({
      patientId: selectedPatientId,
      patientName: selectedPatient.name,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      doctorName: docCreds.name,
      doctorColegiado: docCreds.colegiado,
      doctorMpps: docCreds.mpps,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      tax: 0,
      total: 0,
      status: 'pendiente',
      notes: 'Nuevo plan de tratamiento.',
      currentPhase: 'fase_inicial'
    });
    setSelectedBudgetId(newBud.id);
    setActiveBudgetPage('detalle');
  };

  const handleDeleteActiveBudget = () => {
    if (!currentBudget) return;
    if (confirmDeleteId !== currentBudget.id) {
      setConfirmDeleteId(currentBudget.id);
      return;
    }
    deleteBudget(currentBudget.id);
    const remaining = patientBudgets.filter(b => b.id !== currentBudget.id);
    setSelectedBudgetId(remaining[0]?.id || '');
    setConfirmDeleteId(null);
  };

  const handleAcceptAndBill = () => {
    if (!currentBudget) return;
    updateBudgetStatus(currentBudget.id, 'aprobado');
    const billableItems = currentBudget.items.filter(it => it.status !== 'finalizado');
    if (billableItems.length > 0) {
      billableItems.forEach(it => {
        addPendingCheckoutItem({
          patientId: currentBudget.patientId,
          patientName: currentBudget.patientName,
          treatmentName: `${it.name}${it.toothNumber ? ` - Pz ${it.toothNumber}` : ''}`,
          amountUsd: it.total,
          doctorName: it.doctor || currentBudget.doctorName
        });
      });
    } else if (currentBudget.total > 0) {
      addPendingCheckoutItem({
        patientId: currentBudget.patientId,
        patientName: currentBudget.patientName,
        treatmentName: `Presupuesto ${currentBudget.folio}`,
        amountUsd: currentBudget.total,
        doctorName: currentBudget.doctorName
      });
    }
    showToast(`Presupuesto ${currentBudget.folio} aprobado y enviado a Multi-Pagos`);
    setCurrentTab('multi_pagos');
  };

  const handleOpenFinanceModal = () => {
    if (!currentBudget) return;
    setFinanceDownPayment(Math.round(currentBudget.total * 0.3 * 100) / 100);
    setFinanceInstallments(3);
    setFinanceStartDate(new Date().toISOString().split('T')[0]);
    setShowFinanceModal(true);
  };

  const handleCreateFinancingPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBudget) return;
    updateBudgetStatus(currentBudget.id, 'aprobado');
    createInstallmentPlan({
      patientId: currentBudget.patientId,
      patientName: currentBudget.patientName,
      budgetId: currentBudget.id,
      budgetFolio: currentBudget.folio,
      title: `Plan Presupuesto ${currentBudget.folio}`,
      totalUsd: currentBudget.total,
      downPaymentUsd: financeDownPayment,
      installmentCount: financeInstallments,
      startDate: financeStartDate
    });
    setShowFinanceModal(false);
    setCurrentTab('cuotas');
  };

  const handleOpenDispatchModal = (mode: PresupuestoDispatchMode) => {
    if (!currentBudget) return;
    setDispatchMode(mode);
    setDispatchModalOpen(true);
  };

  const handleSendViaWhatsApp = () => handleOpenDispatchModal('whatsapp');
  const handleSendByEmail = () => handleOpenDispatchModal('email');

  // Custom Phases State
  const [customPhases, setCustomPhases] = useState<string[]>(currentBudget?.customPhases || []);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [showAddPhaseInput, setShowAddPhaseInput] = useState(false);

  const handleAddCustomPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) return;
    const cleanName = newPhaseName.trim();
    if (!customPhases.includes(cleanName)) {
      const updated = [...customPhases, cleanName];
      setCustomPhases(updated);
      setSelectedPhase(cleanName as any);
      if (currentBudget) {
        updateBudget({
          ...currentBudget,
          customPhases: updated
        });
      }
      showToast(`Fase personalizada "${cleanName}" agregada al plan`);
    }
    setNewPhaseName('');
    setShowAddPhaseInput(false);
  };

  // Plan Notes State
  const [notesText, setNotesText] = useState(currentBudget?.notes || '');
  useEffect(() => {
    setNotesText(currentBudget?.notes || '');
  }, [currentBudget?.id, currentBudget?.notes]);

  const handleSaveNotes = () => {
    if (!currentBudget) return;
    updateBudget({
      ...currentBudget,
      notes: notesText
    });
    showToast('Notas del plan de tratamiento guardadas exitosamente');
  };

  const activeBudgetDoctorCreds = currentBudget
    ? resolveDoctorCredentials(currentBudget.doctorName, doctors, {
        colegiado: currentBudget.doctorColegiado,
        mpps: currentBudget.doctorMpps
      })
    : resolveDoctorCredentials(assignedDoctor, doctors);

  // Item Status Change (DentalContext atomically triggers Secuencia de Ttos + Cajas y Pagos once on finalization)
  const handleItemStatusUpdate = (itemId: string, newStatus: BudgetItem['status']) => {
    if (!currentBudget) return;
    updateBudgetItem(currentBudget.id, itemId, { status: newStatus });
  };

  // Filtered Budgets for Patient
  const filteredBudgets = patientBudgets.filter(b => {
    if (statusFilter === 'todos') return true;
    return b.status === statusFilter;
  });

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Presupuestos y Planes de Tratamiento" />;
  }

  return (
    <div className="space-y-4">

      {/* Sub-page Switcher Bar: Lista de Presupuestos | Detalle Plan Tto. */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveBudgetPage('lista')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeBudgetPage === 'lista'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lista de Presupuestos ({patientBudgets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveBudgetPage('detalle')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeBudgetPage === 'detalle'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Detalle Plan Tto. {currentBudget ? `(${currentBudget.folio})` : ''}</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-500">
          Paciente: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong>
        </span>
      </div>

      {/* SECTION 1: TOP PANEL - PLAN DE TRATAMIENTO / PRESUPUESTO (Reference Screenshot 11.27.52) */}
      {activeBudgetPage === 'lista' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Title Bar + Status Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                Plan de Tratamiento / Presupuesto
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded font-mono">
                RHSISTEMA
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Paciente: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong></span>
              <span>·</span>
              <span>C.I: {selectedPatient.cedula}</span>
              <span>·</span>
              <span>{activeRateLabel}: Bs. {activeConversionRate.toFixed(2)}</span>
              <span>·</span>
              <span>
                Dr(a). <strong className="text-slate-800 dark:text-slate-200">{activeBudgetDoctorCreds.name}</strong>{' '}
                <span className="font-mono text-sky-700 dark:text-sky-300 font-semibold">
                  ({activeBudgetDoctorCreds.colegiado} · {activeBudgetDoctorCreds.mpps})
                </span>
              </span>
            </div>
          </div>

          {/* Estatus Radios (Matching Screenshot: Presupuesto, Tratamiento, Finalizado, Todos) */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
              Filtro:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'pendiente'}
                onChange={() => setStatusFilter('pendiente')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Presupuesto (Pendiente)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'tratamiento'}
                onChange={() => setStatusFilter('tratamiento')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Tratamiento</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'finalizado'}
                onChange={() => setStatusFilter('finalizado')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Finalizado</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-sky-700 dark:text-sky-300">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'todos'}
                onChange={() => setStatusFilter('todos')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Todos</span>
            </label>
          </div>
        </div>

        {/* Action Button Bar (Matching Screenshot: + Agregar Plan Tto., Modificar, Eliminar, Imprimir, Odontodiagrama) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Plan Tto.</span>
            </button>

            {currentBudget && (
              <>
                <button
                  type="button"
                  onClick={handleAcceptAndBill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs transition"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Aceptar y Facturar</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenFinanceModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 border border-sky-200 dark:border-sky-800 rounded-lg transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Financiar en Cuotas</span>
                </button>

                {confirmDeleteId === currentBudget.id ? (
                  <div className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg px-2 py-1 text-xs">
                    <span className="text-rose-700 dark:text-rose-300 font-semibold">¿Eliminar?</span>
                    <button
                      type="button"
                      onClick={handleDeleteActiveBudget}
                      className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded hover:bg-rose-500"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-1.5 py-0.5 text-slate-600 dark:text-slate-300 hover:underline"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteActiveBudget}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Plan Tto.</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('odontograma')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 rounded-lg transition"
            >
              <span>👁️ Odontodiagrama</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDispatchModal('preview')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF Presupuesto</span>
            </button>

            <button
              type="button"
              onClick={handleSendByEmail}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/70 hover:bg-sky-200 rounded-lg transition"
              title="Enviar plan de tratamiento por correo electrónico al paciente"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Enviar por Correo al Paciente</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaWhatsApp}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Currency Converter Strip (USD / Convertir a Bs.) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-sky-50/70 dark:bg-slate-800/60 border border-sky-200/80 dark:border-slate-700 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
              <span>Convertir Presupuesto:</span>
            </span>
            <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setDisplayCurrency('USD')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  displayCurrency === 'USD'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency('BS')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  displayCurrency === 'BS'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Convertir en Bs.
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency('BOTH')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  displayCurrency === 'BOTH'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                USD + Bs.
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Tasa aplicada:
            </span>
            <select
              value={rateSource}
              onChange={(e) => setRateSource(e.target.value as BudgetRateSource)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="usdBcv">Dólar BCV (Bs. {(rates.usdBcv || exchangeRate).toFixed(2)})</option>
              <option value="eurBcv">Euro BCV (Bs. {(rates.eurBcv || exchangeRate).toFixed(2)})</option>
              <option value="binanceUsdt">Binance USDT (Bs. {(rates.binanceUsdt || exchangeRate).toFixed(2)})</option>
            </select>
          </div>
        </div>

        {/* Budgets Summary Table (Matching Screenshot 11.27.52) */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-sky-50/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                <th className="py-2.5 px-3">Nro. Pres</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3 text-right">
                  Subtotal ({displayCurrency === 'BS' ? 'Bs.' : '$'})
                </th>
                <th className="py-2.5 px-3 text-right">% Descuento</th>
                <th className="py-2.5 px-3 text-right">
                  Total Pres. ({displayCurrency === 'BS' ? 'Bs.' : '$'})
                </th>
                <th className="py-2.5 px-3">Responsable de la carga</th>
                <th className="py-2.5 px-3 text-center">Estatus</th>
                <th className="py-2.5 px-3 text-center no-print">Seleccionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                    No hay planes de tratamiento bajo este filtro de estatus.
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((b) => {
                  const isSelected = currentBudget?.id === b.id;
                  return (
                    <tr 
                      key={b.id} 
                      onClick={() => setSelectedBudgetId(b.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-sky-100/60 dark:bg-sky-950/60 font-semibold' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-sky-700 dark:text-sky-300">{b.folio}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{b.date}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {displayCurrency === 'BS'
                          ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(b.subtotal, activeConversionRate))}`
                          : `$${b.subtotal.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600">{b.discountTotal > 0 ? 'Con desc.' : '0,00'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {displayCurrency === 'BS' ? (
                          <span>Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(b.total, activeConversionRate))}</span>
                        ) : displayCurrency === 'BOTH' ? (
                          <div>
                            <div>${b.total.toFixed(2)}</div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(b.total, activeConversionRate))}
                            </div>
                          </div>
                        ) : (
                          <span>${b.total.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="uppercase font-semibold">{b.doctorName}</div>
                        {(() => {
                          const creds = resolveDoctorCredentials(b.doctorName, doctors, {
                            colegiado: b.doctorColegiado,
                            mpps: b.doctorMpps
                          });
                          return (
                            <div className="text-[10px] font-mono text-sky-700 dark:text-sky-300">
                              {creds.colegiado} · {creds.mpps}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.status === 'finalizado' || b.status === 'aprobado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          b.status === 'tratamiento' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="inline-flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 inline-block rounded-full border ${isSelected ? 'bg-sky-600 border-sky-600' : 'border-slate-300'}`} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBudgetId(b.id);
                              setActiveBudgetPage('detalle');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold text-[11px] border border-sky-200 dark:border-sky-800"
                          >
                            <span>Editar / Ver Detalle</span>
                            <ArrowRight className="w-3 h-3" />
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

      </div>
      )}

      {/* SECTION 2: DETALLE PLAN TTO. / PRESU. - RHSISTEMA DETAILED ENTRY & FASES (Screenshots 11.27.52 & 11.28.12) */}
      {activeBudgetPage === 'detalle' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
        
        {/* Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setActiveBudgetPage('lista')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Lista</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Detalle Plan Tto. / Presu. {currentBudget ? `· Presupuesto Nro. ${currentBudget.folio}` : ''}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrupación por Fases Clínicas y Especialidades / Áreas Odontológicas
              </p>
            </div>
          </div>

          {/* Quick Voice Budget dictation trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const res = addVoiceBudgetItem("Restauración resina pieza 16 por 45 dólares");
                setVoiceFeedback(res.message);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 transition"
              title="Dictado por voz inteligente"
            >
              <Mic className="w-3.5 h-3.5 text-sky-600" />
              <span>🎤 Presupuesto por Voz (IA)</span>
            </button>
          </div>
        </div>

        {voiceFeedback && (
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-xs rounded-xl flex items-center justify-between">
            <span>{voiceFeedback}</span>
            <button onClick={() => setVoiceFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {/* Phase Selector Strip (5 default phases + custom phases + Nueva Fase button) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Fase de Tratamiento:</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddPhaseInput(!showAddPhaseInput)}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>+ Nueva Fase Personalizada</span>
            </button>
          </div>

          {showAddPhaseInput && (
            <form onSubmit={handleAddCustomPhase} className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Nombre de la nueva fase (Ej. Fase Estética y Blanqueamiento)..."
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold text-slate-900 dark:text-white"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500"
              >
                Agregar Fase
              </button>
              <button
                type="button"
                onClick={() => setShowAddPhaseInput(false)}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TREATMENT_PHASES_META.map(phase => {
              const isActive = selectedPhase === phase.id;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSelectedPhase(phase.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isActive 
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-xs ring-1 ring-sky-500' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{phase.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{phase.desc}</div>
                </button>
              );
            })}

            {/* Custom Phases */}
            {customPhases.map(cPhase => {
              const isActive = selectedPhase === cPhase;
              return (
                <button
                  key={cPhase}
                  type="button"
                  onClick={() => setSelectedPhase(cPhase as any)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isActive 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-500' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold truncate flex items-center gap-1">
                    <span>✨</span>
                    <span>{cPhase}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">Personalizada</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Treatment Addition Form Grid: Especialidad, Tratamiento, Dientes, Cuadrantes, Precio (Matching Screenshot 11.27.52 & 11.28.12) */}
        <form onSubmit={handleAddTreatment} className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
            
            {/* Especialidad / Área (col 4) */}
            <div className="md:col-span-5 space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Especialidad / Área (RHSistema):
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
              >
                {availableAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Tratamiento Dropdown (col 7) */}
            <div className="md:col-span-7 space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Tratamiento Odontológico (Código & Procedimiento):
              </label>
              <select
                value={selectedTreatmentId}
                onChange={(e) => handleTreatmentChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
              >
                {availableTreatments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} (${t.basePrice})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Dientes & Cuadrantes Checkboxes (Exact visual match from Screenshot 11.27.52) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            
            {/* Dientes FDI selector (col 7) */}
            <div className="md:col-span-7 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Dientes FDI (Piezas a intervenir):
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedTeeth.length > 0 ? `Seleccionados: ${selectedTeeth.join(', ')}` : 'Ninguno (General)'}
                </span>
              </div>
              
              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {FDI_TEETH.map(tooth => {
                  const isChecked = selectedTeeth.includes(tooth);
                  return (
                    <button
                      key={tooth}
                      type="button"
                      onClick={() => toggleToothSelection(tooth)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition ${
                        isChecked 
                          ? 'bg-sky-600 text-white font-bold' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {tooth}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuadrantes selector (col 5) */}
            <div className="md:col-span-5 space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Cuadrantes:
              </span>
              <div className="grid grid-cols-4 gap-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                {CUADRANTES.map(cuad => (
                  <label key={cuad} className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="cuadrante"
                      value={cuad}
                      checked={selectedQuadrant === cuad}
                      onChange={(e) => setSelectedQuadrant(e.target.value)}
                      className="text-sky-600 focus:ring-sky-500 w-3 h-3"
                    />
                    <span>{cuad}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Pricing, Quantity & Add Button Row */}
          <div className="flex flex-wrap items-end justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Cantidad:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Precio Unitario ($):
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Descuento (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Doctor Responsable (COV / MPPS):
                </label>
                <select
                  value={assignedDoctor}
                  onChange={(e) => setAssignedDoctor(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
                >
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.name}>
                      {doc.name} ({doc.colegiado} · {doc.mpps})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Tratamiento al Plan</span>
            </button>
          </div>

        </form>

        {/* Treatments Detail Table (Matching Screenshot 11.27.52) with Inline Price Editing & Phase Labels */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                <th className="py-2.5 px-3">Diente / Cuad.</th>
                <th className="py-2.5 px-3">Tratamiento</th>
                <th className="py-2.5 px-3">Especialidad / Área</th>
                <th className="py-2.5 px-3">Fase Clínica</th>
                <th className="py-2.5 px-3 text-right">Cant.</th>
                <th className="py-2.5 px-3 text-right">
                  Sub Total ({displayCurrency === 'BS' ? 'Bs.' : '$'})
                </th>
                <th className="py-2.5 px-3 text-right">% Desc.</th>
                <th className="py-2.5 px-3 text-right">
                  Total Tto. ({displayCurrency === 'BS' ? 'Bs.' : displayCurrency === 'BOTH' ? '$ / Bs.' : '$'})
                </th>
                <th className="py-2.5 px-3">Doc</th>
                <th className="py-2.5 px-3 text-center">Estatus Tto.</th>
                <th className="py-2.5 px-3 text-center no-print">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!currentBudget || currentBudget.items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    No hay tratamientos agregados a este plan. Selecciona la especialidad y presiona "+ Agregar Tratamiento".
                  </td>
                </tr>
              ) : (
                currentBudget.items.map((item) => {
                  const isEditing = editingItemId === item.id;
                  const phaseObj = TREATMENT_PHASES_META.find(p => p.id === item.phase);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      
                      {/* Diente */}
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {item.toothNumber ? `#${item.toothNumber}` : item.quadrant || 'General'}
                      </td>

                      {/* Tratamiento */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>

                      {/* Especialidad / Área */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {item.area || '1 - PREVENTIVA Y GENERAL'}
                      </td>

                      {/* Fase */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {phaseObj?.label.split('(')[0] || 'Fase Inicial'}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {item.quantity}
                      </td>

                      {/* Subtotal (editable) */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 text-xs border border-sky-400 rounded text-right font-mono"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onClick={() => handleStartEditItem(item)}
                            className="cursor-pointer hover:underline text-slate-700 dark:text-slate-300"
                            title="Clic para editar precio en USD"
                          >
                            {displayCurrency === 'BS'
                              ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(item.price, activeConversionRate))}`
                              : `$${item.price.toFixed(2)}`}
                          </span>
                        )}
                      </td>

                      {/* Descuento (editable) */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editDiscountValue}
                            onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-12 px-1.5 py-0.5 text-xs border border-sky-400 rounded text-right font-mono"
                          />
                        ) : (
                          item.discount > 0 ? `${item.discount}%` : '-'
                        )}
                      </td>

                      {/* Total Tto. */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {displayCurrency === 'BS' ? (
                          <span>Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(item.total, activeConversionRate))}</span>
                        ) : displayCurrency === 'BOTH' ? (
                          <div>
                            <div>${item.total.toFixed(2)}</div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Bs. {formatPresupuestoMoney(convertBudgetAmountToBs(item.total, activeConversionRate))}
                            </div>
                          </div>
                        ) : (
                          <span>${item.total.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Doc */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                        {item.doctor || currentBudget.doctorName}
                      </td>

                      {/* Estatus del tratamiento (vinculado a secuencia y cobro) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1">
                          <select
                            value={item.status || 'pendiente'}
                            onChange={(e) => handleItemStatusUpdate(item.id, e.target.value as any)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border outline-none cursor-pointer transition ${
                              item.status === 'finalizado' || item.status === 'realizado'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.status === 'en_curso'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                            title="Cambiar estatus del procedimiento (Finalizado auto-registra en Secuencia de Ttos y Cajas y Pagos)"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_curso">En Curso</option>
                            <option value="finalizado">Finalizado (Cobro)</option>
                          </select>
                          {(item.status === 'finalizado' || item.status === 'realizado') && (
                            <button
                              type="button"
                              onClick={() => setCurrentTab('secuencia_ttos')}
                              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              Ver / Personalizar Secuencia →
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveItemEdit(item.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Guardar cambios"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditItem(item)}
                              className="p-1 text-slate-400 hover:text-sky-600 transition"
                              title="Modificar precio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Eliminar de plan"
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
          </table>
        </div>

        {/* Plan Totals Strip */}
        {currentBudget && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total procedimientos: <strong>{currentBudget.items.length}</strong> · Estatus: <strong className="uppercase text-sky-600">{currentBudget.status}</strong>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">
                  {displayCurrency === 'BS' ? `Referencia en Dólares (${activeRateLabel}):` : `Equivalente en Bolívares (${activeRateLabel}):`}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {displayCurrency === 'BS'
                    ? `$${currentBudget.total.toFixed(2)} USD`
                    : `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(currentBudget.total, activeConversionRate))}`}
                </span>
              </div>

              <div className="text-right pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block font-semibold">Total Presupuestado:</span>
                <span className="text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                  {displayCurrency === 'BS'
                    ? `Bs. ${formatPresupuestoMoney(convertBudgetAmountToBs(currentBudget.total, activeConversionRate))}`
                    : `$${currentBudget.total.toFixed(2)} USD`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NOTAS DEL PLAN DE TRATAMIENTO (Requerimiento explícito del usuario) */}
        {currentBudget && (
          <div className="p-4 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Notas del Plan de Tratamiento & Observaciones Adicionales:</span>
              </label>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Notas</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Escriba aquí cualquier indicación clínica adicional, acuerdos con el paciente, observaciones de las fases o consideraciones previas a la cirugía / prótesis..."
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-200 leading-relaxed"
            />
          </div>
        )}

      </div>
      )}

      {/* Modal: Financiar Presupuesto en Cuotas */}
      {showFinanceModal && currentBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Financiar Presupuesto {currentBudget.folio} en Cuotas
              </h3>
              <button
                type="button"
                onClick={() => setShowFinanceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFinancingPlan} className="space-y-3">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Monto Total Presupuestado:</span>
                <span className="font-mono font-black text-base text-sky-700 dark:text-sky-300">
                  ${currentBudget.total.toFixed(2)} USD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Inicial (USD):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={currentBudget.total}
                    step="0.01"
                    value={financeDownPayment}
                    onChange={(e) => setFinanceDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Cantidad de Cuotas:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={financeInstallments}
                    onChange={(e) => setFinanceInstallments(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Fecha de 1era Cuota:
                </label>
                <input
                  type="date"
                  value={financeStartDate}
                  onChange={(e) => setFinanceStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono"
                />
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 flex justify-between font-mono">
                <span>Saldo financiado: ${Math.max(0, currentBudget.total - financeDownPayment).toFixed(2)}</span>
                <span>Cuota aprox.: ${(Math.max(0, currentBudget.total - financeDownPayment) / Math.max(1, financeInstallments)).toFixed(2)}/mes</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinanceModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-xs"
                >
                  Crear Plan y Ver Cuotas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentBudget && (
        <PresupuestoDocumentModal
          isOpen={dispatchModalOpen}
          initialMode={dispatchMode}
          onClose={() => setDispatchModalOpen(false)}
          budget={currentBudget}
          patient={selectedPatient}
          doctors={doctors}
          exchangeRate={exchangeRate}
          rates={rates}
          initialCurrencyMode={displayCurrency}
          initialRateSource={rateSource}
          clinicConfig={clinicConfig}
          generateDirectWhatsAppUrl={generateDirectWhatsAppUrl}
          showToast={showToast}
        />
      )}

    </div>
  );
};
