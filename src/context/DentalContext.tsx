import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Patient, 
  Appointment, 
  Budget, 
  BudgetItem,
  PaymentReceipt, 
  ClinicalEvolutionEntry, 
  MedicalPrescription, 
  InformedConsent, 
  WhatsAppReminder, 
  ToothCondition, 
  Role, 
  AppointmentStatus,
  ToothClinicalStatus,
  ToothSurface,
  SecuenciaTratamiento,
  ClinicalImage,
  Doctor,
  FacturaElectronicaSeniat,
  ClinicExpense,
  EquipmentItem,
  SoftwareImportPatient,
  InstallmentPlan,
  IntakeFormTemplate,
  IntakeSubmission,
  ExchangeRateLog,
  BlockedSlot,
  DoctorLiquidation,
  ClinicConfig,
  RolePermissionMatrix,
  CashClosingRecord,
  MultiCurrencyRates,
  OdontogramControlEntry,
  VademecumMedication
} from '../types/dental';
import { 
  INITIAL_PATIENTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_BUDGETS, 
  INITIAL_PAYMENTS, 
  INITIAL_EVOLUTIONS, 
  INITIAL_PRESCRIPTIONS, 
  INITIAL_CONSENTS, 
  INITIAL_WA_REMINDERS, 
  INITIAL_ODONTOGRAMS,
  INITIAL_ODONTOGRAM_CONTROLS,
  INITIAL_SECUENCIA_TRATAMIENTOS,
  INITIAL_CLINICAL_IMAGES,
  TREATMENT_CATALOG,
  DETAILED_TREATMENT_CATALOG,
  DetailedCatalogItem,
  DENTAL_VADEMECUM,
  INITIAL_DOCTORS,
  INITIAL_SENIAT_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_EQUIPMENT,
  INITIAL_INSTALLMENT_PLANS,
  INITIAL_INTAKE_TEMPLATES,
  INITIAL_INTAKE_SUBMISSIONS,
  INITIAL_RATE_HISTORY,
  INITIAL_BLOCKED_SLOTS,
  INITIAL_LIQUIDATIONS,
  DEFAULT_CLINIC_CONFIG,
  DEFAULT_ROLE_PERMISSIONS,
  INITIAL_CASH_CLOSINGS
} from '../data/mockData';
import {
  parseVoiceCommand,
  generateInstallmentSchedule,
  conciliatePaymentIntoInstallments,
  adjustCatalogPricesByPercent,
  calculateDoctorLiquidation,
  buildNewCatalogItem,
  PureCatalogSuggestedPhase,
  buildAutoSecuenciaNote,
  parseVeDolarApiPayloads,
  applyFixedFindingToOdontogram,
  sortOdontogramControlsDesc,
  isPatientNotifiable,
  upsertVademecumMedication,
  removeVademecumMedication,
  buildWhatsAppLink,
  resolvePatientWhatsAppPhone
} from '../utils/dentalCalc';
import {
  spreadsheetDateToIso,
  sanitizePatientNumericId,
  isValidCleanPatientRecord,
  partitionValidCleanPatients
} from '../utils/patientImportParser';
import {
  QrPatientIntakePayload,
  parseQrIntakeRoute,
  parseCommaListInput,
  computeAgeFromBirthDate,
  normalizeCedulaKey
} from '../utils/qrIntakeMode';

function safeStorageGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore SecurityError / QuotaExceededError in restricted QR scanner WebViews
  }
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore in restricted contexts
  }
}

function safeParseJson<T>(key: string, fallback: T): T {
  const saved = safeStorageGet(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export type NavTab = 
  | 'inicio'
  | 'agenda' 
  | 'pacientes' 
  | 'fichas_ingreso'
  | 'doctores'
  | 'odontograma' 
  | 'presupuestos' 
  | 'secuencia_ttos'
  | 'imagenes'
  | 'pagos' 
  | 'multi_pagos'
  | 'cuotas'
  | 'tabulador'
  | 'administracion'
  | 'rendimiento'
  | 'reportes'
  | 'recipes' 
  | 'consentimientos' 
  | 'whatsapp'
  | 'configuracion';

interface DentalContextType {
  // Navigation & Role
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isPatientKioskLocked: boolean;
  setIsPatientKioskLocked: (locked: boolean) => void;

  // Currency & Rate (RHSistema Venezuela: Dólar BCV, Euro BCV, Binance USDT)
  exchangeRate: number;
  setExchangeRate: (rate: number, source?: string) => void;
  rates: MultiCurrencyRates;
  updateRates: (next: Partial<Pick<MultiCurrencyRates, 'usdBcv' | 'eurBcv' | 'binanceUsdt' | 'autoSyncEnabled'>>, source?: string) => void;
  syncExchangeRatesNow: (silent?: boolean) => Promise<void>;
  isSyncingRates: boolean;
  rateHistory: ExchangeRateLog[];

  // Selected Patient
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  selectedPatient: Patient | undefined;

  // Data Stores
  patients: Patient[];
  appointments: Appointment[];
  budgets: Budget[];
  payments: PaymentReceipt[];
  evolutions: ClinicalEvolutionEntry[];
  prescriptions: MedicalPrescription[];
  consents: InformedConsent[];
  waReminders: WhatsAppReminder[];
  odontograms: Record<string, Record<number, ToothCondition>>;
  
  // Actions
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  addAppointment: (newApt: Omit<Appointment, 'id' | 'waReminderSent' | 'waConfirmed'>) => void;
  addPatient: (newPatient: Omit<Patient, 'id' | 'balance' | 'totalBilled'>) => Patient;
  updatePatient: (patient: Patient) => void;
  deactivatePatient: (patientId: string, reason: 'fallecimiento' | 'traslado' | 'inactivo', date?: string) => void;
  reactivatePatient: (patientId: string) => void;
  clearAllPatients: () => void;
  cleanInvalidPatients: () => { removedCount: number; fixedIdsCount: number };

  // Odontogram Actions & Control History
  odontogramControls: OdontogramControlEntry[];
  addOdontogramControl: (entry: Omit<OdontogramControlEntry, 'id'>) => OdontogramControlEntry;
  setToothSurface: (toothNumber: number, surface: ToothSurface, status: ToothClinicalStatus) => void;
  setToothWholeStatus: (toothNumber: number, status: ToothClinicalStatus) => void;
  setMultipleTeethWholeStatus: (toothNumbers: number[], status: ToothClinicalStatus | 'clear') => void;
  setToothStatusSequence: (toothNumber: number, status: 'pendiente' | 'en_tratamiento' | 'finalizado') => void;
  clearTooth: (toothNumber: number) => void;
  getToothCondition: (patientId: string, toothNumber: number) => ToothCondition | undefined;

  // Budget Actions
  addBudget: (budget: Omit<Budget, 'id' | 'folio'>) => Budget;
  updateBudget: (budget: Budget) => void;
  updateBudgetStatus: (budgetId: string, status: Budget['status']) => void;
  updateBudgetItem: (budgetId: string, itemId: string, fields: Partial<BudgetItem>) => void;
  deleteBudget: (budgetId: string) => void;
  addOdontogramItemToActiveBudget: (toothNumber: number, treatmentName: string, price: number) => void;

  // Payment Actions & Cierre de Caja
  recordPayment: (payment: Omit<PaymentReceipt, 'id' | 'receiptNumber'>) => PaymentReceipt;
  cashClosings: CashClosingRecord[];
  registerCashClosing: (record: Omit<CashClosingRecord, 'id' | 'folio' | 'createdAt'>) => CashClosingRecord;

  // Clinical & Evolution Actions
  addEvolutionEntry: (entry: Omit<ClinicalEvolutionEntry, 'id'>) => void;

  // Prescriptions & Consents & Vademecum
  addPrescription: (prescription: Omit<MedicalPrescription, 'id' | 'folio'>) => MedicalPrescription;
  saveConsent: (consent: Omit<InformedConsent, 'id' | 'folio'>) => InformedConsent;
  vademecumItems: VademecumMedication[];
  addVademecumMedication: (item: {
    name: string;
    presentation: string;
    defaultDose?: string;
    defaultFreq?: string;
    defaultDur?: string;
    instructions?: string;
  }) => VademecumMedication;
  deleteVademecumMedication: (id: string) => void;

  // WhatsApp Actions
  sendWhatsAppMessage: (reminderId: string, customPhone?: string, customText?: string) => void;
  scheduleWhatsAppReminder: (reminder: Omit<WhatsAppReminder, 'id' | 'status'>) => void;
  generateDirectWhatsAppUrl: (phone: string, text: string) => string;
  autoRemindersEnabled: boolean;
  setAutoRemindersEnabled: (enabled: boolean) => void;

  // Secuencia de Tratamientos & Conversaciones grabadas
  secuenciaTratamientos: SecuenciaTratamiento[];
  addSecuenciaTratamiento: (entry: Omit<SecuenciaTratamiento, 'id'>) => SecuenciaTratamiento;
  updateSecuenciaTratamiento: (entry: SecuenciaTratamiento) => void;
  deleteSecuenciaTratamiento: (id: string) => void;

  // Fotografías y Radiografías Control
  clinicalImages: ClinicalImage[];
  addClinicalImage: (image: Omit<ClinicalImage, 'id'>) => ClinicalImage;
  deleteClinicalImage: (id: string) => void;

  // Google Calendar Integration
  syncAppointmentWithGoogleCalendar: (apt: Appointment) => string;

  // Presupuesto por Voz
  addVoiceBudgetItem: (spokenText: string) => { success: boolean; message: string };

  // Toast feedback
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Doctors & Specialists
  doctors: Doctor[];
  activeDoctor: Doctor;
  setActiveDoctor: (doc: Doctor) => void;
  addDoctor: (doc: Omit<Doctor, 'id' | 'patientsTreatedCount' | 'monthlyProduction'>) => void;
  updateDoctor: (doc: Doctor) => void;

  // Facturación Electrónica SENIAT
  seniatInvoices: FacturaElectronicaSeniat[];
  emitFacturaSeniat: (invoice: Omit<FacturaElectronicaSeniat, 'id' | 'invoiceNumber' | 'controlNumber' | 'qrCodeUrl' | 'digitalSignatureHash'>) => FacturaElectronicaSeniat;

  // Administración & Gastos Operativos del Consultorio
  expenses: ClinicExpense[];
  addExpense: (expense: Omit<ClinicExpense, 'id'>) => ClinicExpense;
  updateExpense: (expense: ClinicExpense) => void;
  deleteExpense: (id: string) => void;

  // Rendimiento Clínico & Depreciación
  equipment: EquipmentItem[];
  addEquipment: (eq: Omit<EquipmentItem, 'id' | 'monthlyDepreciationUsd' | 'hourlyDepreciationUsd'>) => void;
  importPatientsFromSoftware: (importedList: SoftwareImportPatient[]) => number;

  // Concatenación Caja y Pagos con Tratamientos Finalizados
  pendingCheckoutItems: Array<{ id: string; patientId: string; patientName: string; treatmentName: string; amountUsd: number; amountBs: number; doctorName: string; date: string }>;
  addPendingCheckoutItem: (item: { patientId: string; patientName: string; treatmentName: string; amountUsd: number; doctorName: string }) => void;
  removePendingCheckoutItem: (id: string) => void;

  // Cumpleañeros del Día
  birthdayPatients: Patient[];
  sendBirthdayGreetingWA: (patient: Patient) => void;

  // Saldo a Favor y Abonos del Paciente
  applySaldoAFavor: (patientId: string, amount: number) => void;

  // Suiteexo: Cuotas & Financiamiento
  installmentPlans: InstallmentPlan[];
  createInstallmentPlan: (params: {
    patientId: string;
    patientName: string;
    budgetId?: string;
    budgetFolio?: string;
    title: string;
    totalUsd: number;
    downPaymentUsd: number;
    installmentCount: number;
    startDate: string;
  }) => InstallmentPlan;
  payInstallmentAmount: (planId: string, amountUsd: number, method?: PaymentReceipt['method']) => void;

  // Suiteexo: Tabulador Editable
  catalogItems: DetailedCatalogItem[];
  adjustCatalogPrices: (percentDelta: number) => void;
  updateCatalogItemPrice: (id: string, newPrice: number) => void;
  addCatalogItem: (item: {
    code?: string;
    name: string;
    area: string;
    suggestedPhase?: PureCatalogSuggestedPhase;
    basePrice: number;
  }) => DetailedCatalogItem;

  // Suiteexo: Fichas de Ingreso & Auto-Registro QR
  intakeTemplates: IntakeFormTemplate[];
  intakeSubmissions: IntakeSubmission[];
  createIntakeTemplate: (tpl: Omit<IntakeFormTemplate, 'id'>) => IntakeFormTemplate;
  submitIntakeForm: (sub: Omit<IntakeSubmission, 'id' | 'submittedAt' | 'status'>) => IntakeSubmission;
  createPatientFromIntake: (submissionId: string) => Patient | null;
  registerPatientFromQrIntake: (
    payload: QrPatientIntakePayload & { signatureDataUrl?: string }
  ) => { patient: Patient; submission: IntakeSubmission; isExisting: boolean };

  // Suiteexo: Bloqueos de Agenda
  blockedSlots: BlockedSlot[];
  addBlockedSlot: (slot: Omit<BlockedSlot, 'id'>) => void;
  removeBlockedSlot: (id: string) => void;

  // Suiteexo: Liquidaciones Profesionales
  liquidations: DoctorLiquidation[];
  generateLiquidation: (params: {
    doctorId: string;
    periodStart: string;
    periodEnd: string;
    collectedUsd: number;
    proceduresCount: number;
  }) => DoctorLiquidation;

  // Suiteexo: Configuración Clínica & Roles
  clinicConfig: ClinicConfig;
  updateClinicConfig: (cfg: ClinicConfig) => void;
  rolePermissions: RolePermissionMatrix;
  updateRolePermission: (role: Role, permKey: string, allowed: boolean) => void;
}

const DentalContext = createContext<DentalContextType | undefined>(undefined);

export const DentalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State from LocalStorage or Defaults
  const [currentRole, setCurrentRole] = useState<Role>('recepcion');
  const [currentTab, setCurrentTab] = useState<NavTab>('inicio');
  const [isPatientKioskLocked, setIsPatientKioskLocked] = useState<boolean>(false);
  const [rates, setRatesState] = useState<MultiCurrencyRates>(() => {
    const savedRate = safeStorageGet('dentalcloud_rate');
    const savedMulti = safeStorageGet('dentalcloud_rates_multi');
    const fallbackUsd = savedRate ? Number(savedRate) : 911.62;
    if (savedMulti) {
      try {
        const parsed = JSON.parse(savedMulti) as MultiCurrencyRates;
        return {
          usdBcv: parsed.usdBcv > 0 ? parsed.usdBcv : fallbackUsd,
          eurBcv: parsed.eurBcv > 0 ? parsed.eurBcv : 1009.34,
          binanceUsdt: parsed.binanceUsdt > 0 ? parsed.binanceUsdt : 1071.22,
          autoSyncEnabled: parsed.autoSyncEnabled !== undefined ? parsed.autoSyncEnabled : true,
          lastUpdated: parsed.lastUpdated || new Date().toISOString().slice(0, 16).replace('T', ' '),
          sourceLabel: parsed.sourceLabel || 'BCV Oficial + Binance P2P'
        };
      } catch {
        // ignore
      }
    }
    return {
      usdBcv: Number.isFinite(fallbackUsd) && fallbackUsd > 0 ? fallbackUsd : 911.62,
      eurBcv: 1009.34,
      binanceUsdt: 1071.22,
      autoSyncEnabled: true,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sourceLabel: 'BCV Oficial + Binance P2P'
    };
  });
  const [isSyncingRates, setIsSyncingRates] = useState<boolean>(false);
  const exchangeRate = rates.usdBcv;
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return safeStorageGet('dentalcloud_dark') === 'true';
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    if (
      safeStorageGet('dentalcloud_patients_reset_v3') !== 'done' ||
      safeStorageGet('dentalcloud_corona_pdf_seed_v5') !== 'done'
    ) {
      const keysToReset = [
        'dentalcloud_patients',
        'dentalcloud_appointments',
        'dentalcloud_budgets',
        'dentalcloud_payments',
        'dentalcloud_evolutions',
        'dentalcloud_prescriptions',
        'dentalcloud_consents',
        'dentalcloud_wa_reminders',
        'dentalcloud_odontograms',
        'dentalcloud_odontogram_controls',
        'dentalcloud_secuencias',
        'dentalcloud_images',
        'dentalcloud_seniat_invoices',
        'dentalcloud_installment_plans',
        'dentalcloud_intake_submissions'
      ];
      keysToReset.forEach(k => safeStorageRemove(k));
      safeStorageSet('dentalcloud_patients_reset_v3', 'done');
      safeStorageSet('dentalcloud_patients_cleanup_v4', 'done');
      safeStorageSet('dentalcloud_corona_pdf_seed_v5', 'done');
      return INITIAL_PATIENTS;
    }
    const saved = safeStorageGet('dentalcloud_patients');
    if (!saved) return INITIAL_PATIENTS;
    try {
      const parsed = JSON.parse(saved) as Patient[];
      if (safeStorageGet('dentalcloud_patients_cleanup_v4') !== 'done') {
        const cleaned = parsed
          .filter(p =>
            isValidCleanPatientRecord({
              name: p.name || '',
              cedula: p.cedula || '',
              email: p.email || ''
            })
          )
          .map((p, idx) => {
            const cleanNum = sanitizePatientNumericId(p.historyNumber || p.migrationHistory, idx + 1);
            return {
              ...p,
              historyNumber: cleanNum,
              migrationHistory: cleanNum
            };
          });
        safeStorageSet('dentalcloud_patients_cleanup_v4', 'done');
        return cleaned;
      }
      return parsed.map((p, idx) => {
        const cleanHist = p.historyNumber
          ? sanitizePatientNumericId(p.historyNumber, idx + 1)
          : String(idx + 1);
        const cleanMigra = p.migrationHistory
          ? sanitizePatientNumericId(p.migrationHistory, idx + 1)
          : cleanHist;
        return cleanHist !== p.historyNumber || cleanMigra !== p.migrationHistory
          ? { ...p, historyNumber: cleanHist, migrationHistory: cleanMigra }
          : p;
      });
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => patients[0]?.id || '');

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const parsed = safeParseJson<Array<Omit<Appointment, 'status'> & { status: string }>>(
      'dentalcloud_appointments',
      INITIAL_APPOINTMENTS as Array<Omit<Appointment, 'status'> & { status: string }>
    );
    return parsed.map((apt) => ({
      ...apt,
      status:
        apt.status === 'en_sala' || apt.status === 'en_atencion'
          ? 'confirmada'
          : (apt.status as AppointmentStatus),
    }));
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => safeParseJson('dentalcloud_budgets', INITIAL_BUDGETS));

  const [payments, setPayments] = useState<PaymentReceipt[]>(() => safeParseJson('dentalcloud_payments', INITIAL_PAYMENTS));

  const [evolutions, setEvolutions] = useState<ClinicalEvolutionEntry[]>(() => safeParseJson('dentalcloud_evolutions', INITIAL_EVOLUTIONS));

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => safeParseJson('dentalcloud_prescriptions', INITIAL_PRESCRIPTIONS));

  const [consents, setConsents] = useState<InformedConsent[]>(() => safeParseJson('dentalcloud_consents', INITIAL_CONSENTS));

  const [waReminders, setWaReminders] = useState<WhatsAppReminder[]>(() => safeParseJson('dentalcloud_wa_reminders', INITIAL_WA_REMINDERS));

  const [odontograms, setOdontograms] = useState<Record<string, Record<number, ToothCondition>>>(() => safeParseJson('dentalcloud_odontograms', INITIAL_ODONTOGRAMS));

  const [odontogramControls, setOdontogramControls] = useState<OdontogramControlEntry[]>(() => safeParseJson('dentalcloud_odontogram_controls', INITIAL_ODONTOGRAM_CONTROLS));

  const [secuenciaTratamientos, setSecuenciaTratamientos] = useState<SecuenciaTratamiento[]>(() => safeParseJson('dentalcloud_secuencias', INITIAL_SECUENCIA_TRATAMIENTOS));

  const [clinicalImages, setClinicalImages] = useState<ClinicalImage[]>(() => safeParseJson('dentalcloud_images', INITIAL_CLINICAL_IMAGES));

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const parsed = safeParseJson<Doctor[]>('dentalcloud_doctors', INITIAL_DOCTORS);
    return parsed.map(d => {
      const fallback = INITIAL_DOCTORS.find(init => init.id === d.id);
      return { ...d, mpps: d.mpps || fallback?.mpps || 'MPPS-Pendiente' };
    });
  });

  const [activeDoctor, setActiveDoctor] = useState<Doctor>(() => doctors[0] || INITIAL_DOCTORS[0]);

  const [seniatInvoices, setSeniatInvoices] = useState<FacturaElectronicaSeniat[]>(() => safeParseJson('dentalcloud_seniat_invoices', INITIAL_SENIAT_INVOICES));

  const [expenses, setExpenses] = useState<ClinicExpense[]>(() => safeParseJson('dentalcloud_expenses', INITIAL_EXPENSES));

  const [equipment, setEquipment] = useState<EquipmentItem[]>(() => safeParseJson('dentalcloud_equipment', INITIAL_EQUIPMENT));

  const [pendingCheckoutItems, setPendingCheckoutItems] = useState<Array<{ id: string; patientId: string; patientName: string; treatmentName: string; amountUsd: number; amountBs: number; doctorName: string; date: string }>>([]);

  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>(() => safeParseJson('dentalcloud_installment_plans', INITIAL_INSTALLMENT_PLANS));

  const [catalogItems, setCatalogItems] = useState<DetailedCatalogItem[]>(() => safeParseJson('dentalcloud_catalog_items', DETAILED_TREATMENT_CATALOG));

  const [vademecumItems, setVademecumItems] = useState<VademecumMedication[]>(() => {
    const fallback: VademecumMedication[] = DENTAL_VADEMECUM.map((item, idx) => ({
      id: `vad-${idx + 1}`,
      ...item,
      isCustom: false
    }));
    const parsed = safeParseJson<VademecumMedication[]>('dentalcloud_vademecum', fallback);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  });

  const [rateHistory, setRateHistory] = useState<ExchangeRateLog[]>(() => safeParseJson('dentalcloud_rate_history', INITIAL_RATE_HISTORY));

  const [intakeTemplates, setIntakeTemplates] = useState<IntakeFormTemplate[]>(() => safeParseJson('dentalcloud_intake_templates', INITIAL_INTAKE_TEMPLATES));

  const [intakeSubmissions, setIntakeSubmissions] = useState<IntakeSubmission[]>(() => safeParseJson('dentalcloud_intake_submissions', INITIAL_INTAKE_SUBMISSIONS));

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(() => safeParseJson('dentalcloud_blocked_slots', INITIAL_BLOCKED_SLOTS));

  const [liquidations, setLiquidations] = useState<DoctorLiquidation[]>(() => safeParseJson('dentalcloud_liquidations', INITIAL_LIQUIDATIONS));

  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(() => safeParseJson('dentalcloud_clinic_config', DEFAULT_CLINIC_CONFIG));

  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(() => safeParseJson('dentalcloud_role_permissions', DEFAULT_ROLE_PERMISSIONS));

  const [cashClosings, setCashClosings] = useState<CashClosingRecord[]>(() => safeParseJson('dentalcloud_cash_closings', INITIAL_CASH_CLOSINGS));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to LocalStorage safely
  useEffect(() => {
    safeStorageSet('dentalcloud_installment_plans', JSON.stringify(installmentPlans));
  }, [installmentPlans]);

  useEffect(() => {
    safeStorageSet('dentalcloud_catalog_items', JSON.stringify(catalogItems));
  }, [catalogItems]);

  useEffect(() => {
    safeStorageSet('dentalcloud_vademecum', JSON.stringify(vademecumItems));
  }, [vademecumItems]);

  useEffect(() => {
    safeStorageSet('dentalcloud_rate_history', JSON.stringify(rateHistory));
  }, [rateHistory]);

  useEffect(() => {
    safeStorageSet('dentalcloud_intake_templates', JSON.stringify(intakeTemplates));
  }, [intakeTemplates]);

  useEffect(() => {
    safeStorageSet('dentalcloud_intake_submissions', JSON.stringify(intakeSubmissions));
  }, [intakeSubmissions]);

  useEffect(() => {
    safeStorageSet('dentalcloud_blocked_slots', JSON.stringify(blockedSlots));
  }, [blockedSlots]);

  useEffect(() => {
    safeStorageSet('dentalcloud_liquidations', JSON.stringify(liquidations));
  }, [liquidations]);

  useEffect(() => {
    safeStorageSet('dentalcloud_clinic_config', JSON.stringify(clinicConfig));
  }, [clinicConfig]);

  useEffect(() => {
    safeStorageSet('dentalcloud_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    safeStorageSet('dentalcloud_cash_closings', JSON.stringify(cashClosings));
  }, [cashClosings]);

  useEffect(() => {
    safeStorageSet('dentalcloud_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    safeStorageSet('dentalcloud_equipment', JSON.stringify(equipment));
  }, [equipment]);

  useEffect(() => {
    safeStorageSet('dentalcloud_doctors', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    safeStorageSet('dentalcloud_seniat_invoices', JSON.stringify(seniatInvoices));
  }, [seniatInvoices]);

  useEffect(() => {
    safeStorageSet('dentalcloud_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    safeStorageSet('dentalcloud_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    safeStorageSet('dentalcloud_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    safeStorageSet('dentalcloud_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    safeStorageSet('dentalcloud_evolutions', JSON.stringify(evolutions));
  }, [evolutions]);

  useEffect(() => {
    safeStorageSet('dentalcloud_prescriptions', JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    safeStorageSet('dentalcloud_consents', JSON.stringify(consents));
  }, [consents]);

  useEffect(() => {
    safeStorageSet('dentalcloud_wa_reminders', JSON.stringify(waReminders));
  }, [waReminders]);

  useEffect(() => {
    safeStorageSet('dentalcloud_odontograms', JSON.stringify(odontograms));
  }, [odontograms]);

  useEffect(() => {
    safeStorageSet('dentalcloud_odontogram_controls', JSON.stringify(odontogramControls));
  }, [odontogramControls]);

  useEffect(() => {
    safeStorageSet('dentalcloud_secuencias', JSON.stringify(secuenciaTratamientos));
  }, [secuenciaTratamientos]);

  useEffect(() => {
    safeStorageSet('dentalcloud_images', JSON.stringify(clinicalImages));
  }, [clinicalImages]);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      safeStorageSet('dentalcloud_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      safeStorageSet('dentalcloud_dark', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Selected Patient computed
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // Keep selectedPatientId coherent if patients change
  useEffect(() => {
    if (patients.length === 0 && selectedPatientId !== '') {
      setSelectedPatientId('');
    } else if (patients.length > 0 && !patients.some(p => p.id === selectedPatientId)) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Actions
  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(apt => (apt.id === id ? { ...apt, status } : apt)));
    const labels: Record<AppointmentStatus, string> = {
      agendada: 'Agendada',
      confirmada: 'Confirmada',
      reprogramado: 'Reprogramado',
      atendido: 'Atendido',
      cancelado_paciente: 'Cancelado por el paciente',
      cancelada: 'Cancelada',
    };
    showToast(`Estado de cita actualizado a: ${labels[status]}`);
  };

  const addAppointment = (newApt: Omit<Appointment, 'id' | 'waReminderSent' | 'waConfirmed'>) => {
    const id = `apt-${Date.now()}`;
    const apt: Appointment = {
      ...newApt,
      id,
      waReminderSent: false,
      waConfirmed: false
    };
    setAppointments(prev => [apt, ...prev]);

    const targetPat = patients.find(p => p.id === apt.patientId);
    const canNotify = targetPat ? isPatientNotifiable(targetPat) : true;

    // Automatically queue a WhatsApp reminder ONLY if patient is active / notifiable
    if (autoRemindersEnabled && canNotify) {
      const waReminder: WhatsAppReminder = {
        id: `wa-${Date.now()}`,
        patientId: apt.patientId,
        patientName: apt.patientName,
        phone: apt.patientPhone,
        appointmentId: id,
        type: 'recordatorio_24h',
        message: `¡Hola ${apt.patientName.split(' ')[0]}! 🦷 Te confirmamos tu cita odontológica para el día ${apt.date} a las ${apt.time} con ${apt.dentistName} en ${apt.box}. Responde a este mensaje para confirmar o reagendar. ¡Te esperamos en ${clinicConfig.clinicName}!`,
        scheduledTime: `${apt.date} 08:00 AM`,
        status: 'pendiente'
      };
      setWaReminders(prev => [waReminder, ...prev]);
    }

    showToast(
      canNotify
        ? `Cita agendada para ${apt.patientName}`
        : `Cita agendada para ${apt.patientName} (notificaciones WhatsApp bloqueadas)`
    );
  };

  const getNextNumericHistoryNumber = (list: Patient[]): string => {
    const maxNum = list.reduce((max, p) => {
      const num = parseInt(sanitizePatientNumericId(p.historyNumber || p.migrationHistory, 0), 10);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return String(maxNum + 1);
  };

  const addPatient = (newPatientData: Omit<Patient, 'id' | 'balance' | 'totalBilled'>): Patient => {
    const id = `pat-${Date.now()}`;
    const numericHist = newPatientData.historyNumber
      ? sanitizePatientNumericId(newPatientData.historyNumber, patients.length + 1)
      : getNextNumericHistoryNumber(patients);
    const newPat: Patient = {
      ...newPatientData,
      historyNumber: numericHist,
      migrationHistory: newPatientData.migrationHistory
        ? sanitizePatientNumericId(newPatientData.migrationHistory, patients.length + 1)
        : numericHist,
      id,
      balance: 0,
      totalBilled: 0
    };
    setPatients(prev => [newPat, ...prev]);
    setSelectedPatientId(id);
    showToast(`Paciente ${newPat.name} registrado con éxito`);
    return newPat;
  };

  const updatePatient = (updated: Patient) => {
    const cleanHist = updated.historyNumber
      ? sanitizePatientNumericId(updated.historyNumber)
      : updated.historyNumber;
    const cleanMigra = updated.migrationHistory
      ? sanitizePatientNumericId(updated.migrationHistory)
      : updated.migrationHistory;
    const normalized: Patient = {
      ...updated,
      historyNumber: cleanHist || cleanMigra,
      migrationHistory: cleanMigra || cleanHist
    };
    setPatients(prev => prev.map(p => p.id === normalized.id ? normalized : p));
    showToast(`Ficha de ${normalized.name} actualizada`);
  };

  const deactivatePatient = (
    patientId: string,
    reason: 'fallecimiento' | 'traslado' | 'inactivo',
    date?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              patientInactive: true,
              inactiveReason: reason,
              deceasedDate: reason === 'fallecimiento' ? date || today : undefined,
              notificationsBlocked: true
            }
          : p
      )
    );
    // Cancel pending WhatsApp reminders for this patient immediately
    setWaReminders(prev => prev.filter(r => r.patientId !== patientId || r.status === 'enviado'));
    const targetName = patients.find(p => p.id === patientId)?.name || 'Paciente';
    showToast(
      reason === 'fallecimiento'
        ? `${targetName} inactivado por fallecimiento. Todas las notificaciones fueron bloqueadas.`
        : `${targetName} marcado como inactivo. Notificaciones bloqueadas.`
    );
  };

  const reactivatePatient = (patientId: string) => {
    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              patientInactive: false,
              inactiveReason: undefined,
              deceasedDate: undefined,
              notificationsBlocked: false
            }
          : p
      )
    );
    const targetName = patients.find(p => p.id === patientId)?.name || 'Paciente';
    showToast(`Ficha de ${targetName} reactivada`);
  };

  const clearAllPatients = () => {
    setPatients([]);
    setSelectedPatientId('');
    setAppointments([]);
    setBudgets([]);
    setPayments([]);
    setEvolutions([]);
    setPrescriptions([]);
    setConsents([]);
    setWaReminders([]);
    setOdontograms({});
    setOdontogramControls([]);
    setSecuenciaTratamientos([]);
    setClinicalImages([]);
    setSeniatInvoices([]);
    setInstallmentPlans([]);
    setPendingCheckoutItems([]);
    setIntakeSubmissions([]);
    showToast('Todos los registros de pacientes fueron eliminados correctamente');
  };

  const cleanInvalidPatients = (): { removedCount: number; fixedIdsCount: number } => {
    let removedCount = 0;
    let fixedIdsCount = 0;

    const cleanedList = patients
      .filter(p => {
        const ok = isValidCleanPatientRecord({
          name: p.name || '',
          cedula: p.cedula || '',
          email: p.email || ''
        });
        if (!ok) removedCount++;
        return ok;
      })
      .map((p, idx) => {
        const cleanHist = sanitizePatientNumericId(p.historyNumber || p.migrationHistory, idx + 1);
        const cleanMigra = p.migrationHistory
          ? sanitizePatientNumericId(p.migrationHistory, idx + 1)
          : cleanHist;
        if (cleanHist !== p.historyNumber || cleanMigra !== p.migrationHistory) {
          fixedIdsCount++;
        }
        return {
          ...p,
          historyNumber: cleanHist,
          migrationHistory: cleanMigra
        };
      });

    setPatients(cleanedList);
    if (!cleanedList.some(p => p.id === selectedPatientId)) {
      setSelectedPatientId(cleanedList[0]?.id || '');
    }

    showToast(
      `Depuración lista: ${removedCount} registro(s) con "X" o datos incompletos eliminados · ${fixedIdsCount} ID(s) corregidos`
    );
    return { removedCount, fixedIdsCount };
  };

  // Odontogram Actions
  const getToothCondition = (patientId: string, toothNumber: number): ToothCondition | undefined => {
    return odontograms[patientId]?.[toothNumber];
  };

  const setToothSurface = (toothNumber: number, surface: ToothSurface, status: ToothClinicalStatus) => {
    if (!selectedPatientId) return;
    setOdontograms(prev => {
      const patientData = { ...(prev[selectedPatientId] || {}) };
      const currentTooth = patientData[toothNumber] || {
        number: toothNumber,
        surfaces: {}
      };

      const updatedSurfaces = { ...currentTooth.surfaces, [surface]: status };
      patientData[toothNumber] = {
        ...currentTooth,
        surfaces: updatedSurfaces
      };

      return {
        ...prev,
        [selectedPatientId]: patientData
      };
    });

    // If marked as caries or necesidad_implante, offer quick item to budget
    if (status === 'caries') {
      addOdontogramItemToActiveBudget(toothNumber, `Restauración Resina Superficie ${surface} Pz ${toothNumber}`, 45);
    }
  };

  const setToothStatusSequence = (toothNumber: number, status: 'pendiente' | 'en_tratamiento' | 'finalizado') => {
    if (!selectedPatientId) return;
    setOdontograms(prev => {
      const patientData = { ...(prev[selectedPatientId] || {}) };
      const currentTooth = patientData[toothNumber] || {
        number: toothNumber,
        surfaces: {}
      };
      patientData[toothNumber] = {
        ...currentTooth,
        statusSequence: status
      };
      return {
        ...prev,
        [selectedPatientId]: patientData
      };
    });
  };

  const setToothWholeStatus = (toothNumber: number, status: ToothClinicalStatus) => {
    if (!selectedPatientId) return;
    setOdontograms(prev => {
      const patientData = { ...(prev[selectedPatientId] || {}) };
      const currentTooth = patientData[toothNumber] || {
        number: toothNumber,
        surfaces: {}
      };

      patientData[toothNumber] = {
        ...currentTooth,
        wholeStatus: status
      };

      return {
        ...prev,
        [selectedPatientId]: patientData
      };
    });

    if (status === 'necesidad_implante') {
      addOdontogramItemToActiveBudget(toothNumber, `Colocación de Implante Pieza ${toothNumber}`, 450);
    } else if (status === 'endodoncia') {
      addOdontogramItemToActiveBudget(toothNumber, `Tratamiento Endodóntico Pieza ${toothNumber}`, 120);
    }
  };

  const clearTooth = (toothNumber: number) => {
    if (!selectedPatientId) return;
    setOdontograms(prev => ({
      ...prev,
      [selectedPatientId]: applyFixedFindingToOdontogram(prev[selectedPatientId] || {}, [toothNumber], 'clear')
    }));
    showToothClearedToast(toothNumber);
  };

  const setMultipleTeethWholeStatus = (toothNumbers: number[], status: ToothClinicalStatus | 'clear') => {
    if (!selectedPatientId || !toothNumbers || toothNumbers.length === 0) return;
    setOdontograms(prev => ({
      ...prev,
      [selectedPatientId]: applyFixedFindingToOdontogram(prev[selectedPatientId] || {}, toothNumbers, status)
    }));

    if (status === 'necesidad_implante' || status === 'endodoncia') {
      toothNumbers.forEach(num => {
        if (status === 'necesidad_implante') {
          addOdontogramItemToActiveBudget(num, `Colocación de Implante Pieza ${num}`, 450);
        } else if (status === 'endodoncia') {
          addOdontogramItemToActiveBudget(num, `Tratamiento Endodóntico Pieza ${num}`, 120);
        }
      });
    }
    showToast(
      status === 'clear'
        ? `${toothNumbers.length} pieza(s) restablecida(s) a estado Sano`
        : `Hallazgo aplicado a ${toothNumbers.length} pieza(s): ${toothNumbers.join(', ')}`
    );
  };

  const addOdontogramControl = (entry: Omit<OdontogramControlEntry, 'id'>): OdontogramControlEntry => {
    const newEntry: OdontogramControlEntry = {
      ...entry,
      id: `ctrl-${Date.now()}`
    };
    setOdontogramControls(prev => sortOdontogramControlsDesc([newEntry, ...prev]));
    const dateParts = (entry.date || '').split('-');
    const formatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : entry.date;
    setPatients(prev =>
      prev.map(p => (p.id === entry.patientId ? { ...p, lastControlDate: formatted } : p))
    );
    showToast(`Control odontológico registrado (${formatted})`);
    return newEntry;
  };

  const showToothClearedToast = (tooth: number) => {
    showToast(`Pieza ${tooth} restablecida a estado Sano`);
  };

  // Budget Actions
  const addOdontogramItemToActiveBudget = (toothNumber: number, treatmentName: string, price: number) => {
    if (!selectedPatientId || !selectedPatient) return;
    setBudgets(prev => {
      const activeBudget = prev.find(b => b.patientId === selectedPatientId && b.status !== 'aprobado');
      const newItem = {
        id: `bi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        toothNumber,
        name: treatmentName,
        category: 'Operatoria',
        quantity: 1,
        price,
        discount: 0,
        total: price
      };

      if (activeBudget) {
        const updatedItems = [...activeBudget.items, newItem];
        const newTotal = updatedItems.reduce((acc, curr) => acc + curr.total, 0);
        return prev.map(b => b.id === activeBudget.id ? {
          ...b,
          items: updatedItems,
          subtotal: newTotal,
          total: newTotal
        } : b);
      } else {
        // Create new draft budget
        const newBudget: Budget = {
          id: `bud-${Date.now()}`,
          folio: `PRE-2026-00${prev.length + 1}`,
          patientId: selectedPatientId,
          patientName: selectedPatient.name,
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          doctorName: 'Dr. Alejandro Morera',
          items: [newItem],
          subtotal: price,
          discountTotal: 0,
          tax: 0,
          total: price,
          status: 'borrador',
          notes: 'Presupuesto vinculado directamente desde el Odontograma clínico.'
        };
        return [newBudget, ...prev];
      }
    });
    showToast(`Añadido al Presupuesto: Pz ${toothNumber} ($${price})`);
  };

  const updateRates = (
    next: Partial<Pick<MultiCurrencyRates, 'usdBcv' | 'eurBcv' | 'binanceUsdt' | 'autoSyncEnabled'>>,
    source = 'Actualización Manual Clínica'
  ) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated: MultiCurrencyRates = {
      usdBcv: next.usdBcv && Number.isFinite(next.usdBcv) && next.usdBcv > 0 ? Math.round(next.usdBcv * 100) / 100 : rates.usdBcv,
      eurBcv: next.eurBcv && Number.isFinite(next.eurBcv) && next.eurBcv > 0 ? Math.round(next.eurBcv * 100) / 100 : rates.eurBcv,
      binanceUsdt: next.binanceUsdt && Number.isFinite(next.binanceUsdt) && next.binanceUsdt > 0 ? Math.round(next.binanceUsdt * 100) / 100 : rates.binanceUsdt,
      autoSyncEnabled: next.autoSyncEnabled !== undefined ? next.autoSyncEnabled : rates.autoSyncEnabled,
      lastUpdated: timestamp,
      sourceLabel: source
    };
    setRatesState(updated);
    safeStorageSet('dentalcloud_rate', String(updated.usdBcv));
    safeStorageSet('dentalcloud_rates_multi', JSON.stringify(updated));

    if (
      next.usdBcv !== undefined ||
      next.eurBcv !== undefined ||
      next.binanceUsdt !== undefined
    ) {
      const logEntry: ExchangeRateLog = {
        id: `rate-${Date.now()}`,
        date: timestamp,
        rate: updated.usdBcv,
        eurRate: updated.eurBcv,
        binanceRate: updated.binanceUsdt,
        source
      };
      setRateHistory(prev => [logEntry, ...prev].slice(0, 20));
    }
    showToast(`Tasas actualizadas · USD BCV: ${updated.usdBcv.toFixed(2)} | EUR: ${updated.eurBcv.toFixed(2)} | Binance: ${updated.binanceUsdt.toFixed(2)} Bs`);
  };

  const setExchangeRate = (rate: number, source = 'Actualización Manual Clínica') => {
    if (!Number.isFinite(rate) || rate <= 0) return;
    updateRates({ usdBcv: rate }, source);
  };

  const syncExchangeRatesNow = async (silent = false) => {
    setIsSyncingRates(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const [dolaresRes, eurosRes] = await Promise.all([
        fetch('https://ve.dolarapi.com/v1/dolares', { signal: controller.signal }),
        fetch('https://ve.dolarapi.com/v1/euros', { signal: controller.signal })
      ]);
      const dolaresJson = dolaresRes.ok ? await dolaresRes.json() : null;
      const eurosJson = eurosRes.ok ? await eurosRes.json() : null;
      const parsed = parseVeDolarApiPayloads(dolaresJson, eurosJson, {
        usdBcv: rates.usdBcv,
        eurBcv: rates.eurBcv,
        binanceUsdt: rates.binanceUsdt
      });
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const updated: MultiCurrencyRates = {
        ...rates,
        ...parsed,
        lastUpdated: timestamp,
        sourceLabel: 'Auto-Sync BCV & Binance'
      };
      setRatesState(updated);
      safeStorageSet('dentalcloud_rate', String(updated.usdBcv));
      safeStorageSet('dentalcloud_rates_multi', JSON.stringify(updated));
      if (!silent) {
        const logEntry: ExchangeRateLog = {
          id: `rate-${Date.now()}`,
          date: timestamp,
          rate: updated.usdBcv,
          eurRate: updated.eurBcv,
          binanceRate: updated.binanceUsdt,
          source: 'Sincronización Automática (USD BCV / EUR BCV / Binance)'
        };
        setRateHistory(prev => [logEntry, ...prev].slice(0, 20));
        showToast(`Tasas sincronizadas · USD ${updated.usdBcv.toFixed(2)} · EUR ${updated.eurBcv.toFixed(2)} · Binance ${updated.binanceUsdt.toFixed(2)} Bs`);
      }
    } catch {
      if (!silent) {
        showToast('Tasas mantenidas localmente (sin respuesta de red externa)');
      }
    } finally {
      clearTimeout(timer);
      setIsSyncingRates(false);
    }
  };

  useEffect(() => {
    if (!rates.autoSyncEnabled) return;
    if (typeof window !== 'undefined') {
      const qrCheck = parseQrIntakeRoute(window.location.search, window.location.pathname);
      if (qrCheck.isQrIntakeLocked) return;
    }
    syncExchangeRatesNow(true);
    const interval = setInterval(() => {
      syncExchangeRatesNow(true);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.autoSyncEnabled]);

  const addBudget = (budgetData: Omit<Budget, 'id' | 'folio'>): Budget => {
    const id = `bud-${Date.now()}`;
    const folio = String(budgets.length + 9047).padStart(7, '0');
    const newBudget: Budget = {
      ...budgetData,
      id,
      folio
    };
    setBudgets(prev => [newBudget, ...prev]);
    showToast(`Presupuesto Nro. ${folio} generado`);
    return newBudget;
  };

  const updateBudget = (updated: Budget) => {
    setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
    showToast(`Presupuesto ${updated.folio} actualizado`);
  };

  const updateBudgetItem = (budgetId: string, itemId: string, fields: Partial<BudgetItem>) => {
    const targetBudget = budgets.find(b => b.id === budgetId);
    const targetItem = targetBudget?.items.find(it => it.id === itemId);

    const newPrice = fields.price !== undefined ? fields.price : (targetItem?.price ?? 0);
    const newDiscount = fields.discount !== undefined ? fields.discount : (targetItem?.discount ?? 0);
    const newQty = fields.quantity !== undefined ? fields.quantity : (targetItem?.quantity ?? 1);
    const discAmount = (newPrice * newQty * newDiscount) / 100;
    const computedTotal = Math.round(((newPrice * newQty) - discAmount) * 100) / 100;
    const nextStatus = fields.status !== undefined ? fields.status : targetItem?.status;
    const wasFinalized = targetItem?.status === 'finalizado' || targetItem?.status === 'realizado';
    const isNowFinalized = nextStatus === 'finalizado' || nextStatus === 'realizado';
    const shouldAutomateFinalization = Boolean(targetBudget && targetItem && isNowFinalized && !wasFinalized);

    setBudgets(prev => prev.map(b => {
      if (b.id !== budgetId) return b;
      const updatedItems = b.items.map(it => {
        if (it.id !== itemId) return it;
        const p = fields.price !== undefined ? fields.price : it.price;
        const d = fields.discount !== undefined ? fields.discount : it.discount;
        const q = fields.quantity !== undefined ? fields.quantity : it.quantity;
        const t = Math.round(((p * q) - ((p * q * d) / 100)) * 100) / 100;
        return {
          ...it,
          ...fields,
          status: fields.status !== undefined ? fields.status : it.status,
          price: p,
          discount: d,
          quantity: q,
          total: t
        };
      });

      const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const newDiscountTotal = updatedItems.reduce((acc, i) => acc + ((i.price * i.quantity * i.discount) / 100), 0);
      const newTotal = newSubtotal - newDiscountTotal;

      return {
        ...b,
        items: updatedItems,
        subtotal: newSubtotal,
        discountTotal: newDiscountTotal,
        total: newTotal
      };
    }));

    // Auto-reflect ONCE in Secuencia de Tratamientos & Cajas/Cobranzas
    if (shouldAutomateFinalization && targetBudget && targetItem) {
      const doctorFinal = fields.doctor || targetItem.doctor || targetBudget.doctorName || activeDoctor.name || 'Dr. Antonio Morera';
      const procedureFull = `${targetItem.name}${targetItem.toothNumber ? ` - Pieza #${targetItem.toothNumber}` : ''}`;

      addSecuenciaTratamiento({
        patientId: targetBudget.patientId,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toothNumber: targetItem.toothNumber,
        procedure: targetItem.name,
        notes: buildAutoSecuenciaNote({
          procedureName: targetItem.name,
          toothNumber: targetItem.toothNumber,
          phase: targetItem.phase as string | undefined
        }),
        doctorName: doctorFinal,
        isAutomated: true,
        linkedBudgetId: targetBudget.id
      });

      addPendingCheckoutItem({
        patientId: targetBudget.patientId,
        patientName: targetBudget.patientName,
        treatmentName: procedureFull,
        amountUsd: computedTotal,
        doctorName: doctorFinal
      });

      setPatients(prev => prev.map(p => {
        if (p.id === targetBudget.patientId) {
          return {
            ...p,
            balance: p.balance + computedTotal,
            totalBilled: p.totalBilled + computedTotal
          };
        }
        return p;
      }));

      showToast(`"${procedureFull}" finalizado: agregado automáticamente a Secuencia de Ttos (editable) y Cuentas por Cobrar`);
    } else {
      showToast('Detalle de tratamiento actualizado');
    }
  };

  const deleteBudget = (budgetId: string) => {
    const target = budgets.find(b => b.id === budgetId);
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
    showToast(`Presupuesto ${target ? target.folio : ''} eliminado del sistema`);
  };

  const updateBudgetStatus = (budgetId: string, status: Budget['status']) => {
    const targetBudget = budgets.find(b => b.id === budgetId);

    setBudgets(prev => prev.map(b => {
      if (b.id === budgetId) {
        const items = status === 'finalizado' 
          ? b.items.map(it => ({ ...it, status: 'finalizado' as const }))
          : b.items;
        return { ...b, status, items };
      }
      return b;
    }));

    if (targetBudget && status === 'finalizado') {
      const unfinalizedItems = targetBudget.items.filter(
        it => it.status !== 'finalizado' && it.status !== 'realizado'
      );
      let addedBalance = 0;

      unfinalizedItems.forEach(it => {
        const procFull = `${it.name}${it.toothNumber ? ` - Pieza #${it.toothNumber}` : ''}`;
        const docName = it.doctor || targetBudget.doctorName || activeDoctor.name || 'Dr. Antonio Morera';
        addedBalance += it.total;

        addSecuenciaTratamiento({
          patientId: targetBudget.patientId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toothNumber: it.toothNumber,
          procedure: it.name,
          notes: buildAutoSecuenciaNote({
            procedureName: it.name,
            toothNumber: it.toothNumber,
            phase: it.phase as string | undefined
          }),
          doctorName: docName,
          isAutomated: true,
          linkedBudgetId: targetBudget.id
        });

        addPendingCheckoutItem({
          patientId: targetBudget.patientId,
          patientName: targetBudget.patientName,
          treatmentName: procFull,
          amountUsd: it.total,
          doctorName: docName
        });
      });

      if (addedBalance > 0) {
        setPatients(prev => prev.map(p => {
          if (p.id === targetBudget.patientId) {
            return {
              ...p,
              balance: p.balance + addedBalance,
              totalBilled: p.totalBilled + addedBalance
            };
          }
          return p;
        }));
      }
    } else if (targetBudget && (status === 'aprobado' || status === 'tratamiento') && targetBudget.status !== 'aprobado' && targetBudget.status !== 'tratamiento') {
      setPatients(prev => prev.map(p => {
        if (p.id === targetBudget.patientId) {
          return {
            ...p,
            balance: p.balance + targetBudget.total,
            totalBilled: p.totalBilled + targetBudget.total
          };
        }
        return p;
      }));
    }

    showToast(`Estatus de Presupuesto: ${status.toUpperCase()}`);
  };

  // Payment Recording
  const recordPayment = (paymentData: Omit<PaymentReceipt, 'id' | 'receiptNumber'>): PaymentReceipt => {
    const id = `pay-${Date.now()}`;
    const receiptNumber = `REC-2026-0${payments.length + 200}`;
    const newReceipt: PaymentReceipt = {
      ...paymentData,
      id,
      receiptNumber
    };
    setPayments(prev => [newReceipt, ...prev]);

    // Deduct patient balance
    setPatients(prev => prev.map(p => {
      if (p.id === paymentData.patientId) {
        return {
          ...p,
          balance: Math.max(0, p.balance - paymentData.amount)
        };
      }
      return p;
    }));

    showToast(`Pago de $${paymentData.amount} registrado (${receiptNumber})`);
    return newReceipt;
  };

  const registerCashClosing = (
    recordData: Omit<CashClosingRecord, 'id' | 'folio' | 'createdAt'>
  ): CashClosingRecord => {
    const id = `close-${Date.now()}`;
    const folio = `CIE-2026-${String(cashClosings.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const createdAt = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const created: CashClosingRecord = {
      ...recordData,
      id,
      folio,
      createdAt
    };
    setCashClosings(prev => [created, ...prev]);
    showToast(`Cierre de caja ${created.period.toUpperCase()} registrado (${folio})`);
    return created;
  };

  // Clinical Evolutions
  const addEvolutionEntry = (entryData: Omit<ClinicalEvolutionEntry, 'id'>) => {
    const id = `evo-${Date.now()}`;
    const newEntry: ClinicalEvolutionEntry = {
      ...entryData,
      id
    };
    setEvolutions(prev => [newEntry, ...prev]);
    showToast('Nota de evolución clínica guardada en expediente');
  };

  // Prescriptions & Vademecum
  const addPrescription = (prescriptionData: Omit<MedicalPrescription, 'id' | 'folio'>): MedicalPrescription => {
    const id = `rx-${Date.now()}`;
    const folio = `REC-2026-00${prescriptions.length + 40}`;
    const newRx: MedicalPrescription = {
      ...prescriptionData,
      id,
      folio
    };
    setPrescriptions(prev => [newRx, ...prev]);
    showToast(`Récipe odontológico ${folio} emitido`);
    return newRx;
  };

  const addVademecumMedication = (item: {
    name: string;
    presentation: string;
    defaultDose?: string;
    defaultFreq?: string;
    defaultDur?: string;
    instructions?: string;
  }): VademecumMedication => {
    const { list, saved, isUpdate } = upsertVademecumMedication(vademecumItems, item);
    setVademecumItems(list);
    showToast(
      isUpdate
        ? `Medicamento "${saved.name}" actualizado en el vademécum`
        : `Medicamento "${saved.name}" agregado al vademécum`
    );
    return saved;
  };

  const deleteVademecumMedication = (id: string) => {
    setVademecumItems(prev => removeVademecumMedication(prev, id));
    showToast('Medicamento eliminado del vademécum');
  };

  // Consents
  const saveConsent = (consentData: Omit<InformedConsent, 'id' | 'folio'>): InformedConsent => {
    const id = `con-${Date.now()}`;
    const folio = `CI-2026-00${consents.length + 25}`;
    const newConsent: InformedConsent = {
      ...consentData,
      id,
      folio
    };
    setConsents(prev => [newConsent, ...prev]);
    showToast(`Consentimiento firmado y archivado legalmente`);
    return newConsent;
  };

  // WhatsApp helpers
  const generateDirectWhatsAppUrl = (phone: string, text: string): string => {
    const code = (clinicConfig.waCountryCode || '58').replace(/[^0-9]/g, '') || '58';
    return buildWhatsAppLink(phone, text, code);
  };

  const sendWhatsAppMessage = (reminderId: string, customPhone?: string, customText?: string) => {
    const reminder = waReminders.find(r => r.id === reminderId);
    const targetPatientObj = patients.find(p => p.id === (reminder?.patientId || selectedPatientId));
    if (targetPatientObj && !isPatientNotifiable(targetPatientObj)) {
      showToast('Notificación bloqueada: el paciente está marcado como Inactivo / Fallecido');
      return;
    }

    const resolved = resolvePatientWhatsAppPhone(
      targetPatientObj || selectedPatient,
      customPhone || reminder?.phone,
      clinicConfig.waCountryCode || '58'
    );
    const targetPhone = resolved.rawPhone;
    const targetText =
      customText ||
      reminder?.message ||
      `Hola ${selectedPatient?.name || ''}, te escribimos de ${clinicConfig.clinicName}.`;

    if (!resolved.normalizedPhone) {
      showToast('No hay número telefónico disponible para enviar WhatsApp');
      return;
    }

    const url = generateDirectWhatsAppUrl(resolved.normalizedPhone, targetText);

    // Mark as sent in state
    setWaReminders(prev => prev.map(r => r.id === reminderId ? {
      ...r,
      status: 'enviado',
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } : r));

    // Open WhatsApp in new tab or app
    window.open(url, '_blank');
    showToast('Abriendo WhatsApp y mensaje enviado a cola ✓');
  };

  const scheduleWhatsAppReminder = (reminderData: Omit<WhatsAppReminder, 'id' | 'status'>) => {
    const targetPat = patients.find(p => p.id === reminderData.patientId);
    if (targetPat && !isPatientNotifiable(targetPat)) {
      showToast('Recordatorio bloqueado: el paciente está inactivo o fallecido');
      return;
    }
    const id = `wa-${Date.now()}`;
    const reminder: WhatsAppReminder = {
      ...reminderData,
      id,
      status: 'pendiente'
    };
    setWaReminders(prev => [reminder, ...prev]);
    showToast('Recordatorio programado en el bot de WhatsApp');
  };

  // Secuencia de Tratamientos Actions
  const addSecuenciaTratamiento = (entryData: Omit<SecuenciaTratamiento, 'id'>): SecuenciaTratamiento => {
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEntry: SecuenciaTratamiento = {
      ...entryData,
      id
    };
    setSecuenciaTratamientos(prev => [newEntry, ...prev]);
    return newEntry;
  };

  const updateSecuenciaTratamiento = (updated: SecuenciaTratamiento) => {
    setSecuenciaTratamientos(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    showToast('Secuencia de tratamiento personalizada y guardada');
  };

  const deleteSecuenciaTratamiento = (id: string) => {
    setSecuenciaTratamientos(prev => prev.filter(s => s.id !== id));
    showToast('Registro eliminado de la secuencia');
  };

  // Clinical Images Actions
  const addClinicalImage = (imageData: Omit<ClinicalImage, 'id'>): ClinicalImage => {
    const id = `img-${Date.now()}`;
    const newImg: ClinicalImage = {
      ...imageData,
      id
    };
    setClinicalImages(prev => [newImg, ...prev]);
    showToast(`Imagen ${newImg.title} guardada en expediente`);
    return newImg;
  };

  const deleteClinicalImage = (id: string) => {
    setClinicalImages(prev => prev.filter(img => img.id !== id));
    showToast('Imagen eliminada del expediente');
  };

  // Google Calendar Integration
  const syncAppointmentWithGoogleCalendar = (apt: Appointment): string => {
    const cleanDate = apt.date.replace(/-/g, '');
    const [hours, minutes] = apt.time.split(':');
    const startHour = (hours || '10').padStart(2, '0');
    const startMin = (minutes || '00').padStart(2, '0');

    // End time
    const startObj = new Date(`${apt.date}T${startHour}:${startMin}:00`);
    const endObj = new Date(startObj.getTime() + (apt.durationMinutes || 45) * 60000);
    const endHour = String(endObj.getHours()).padStart(2, '0');
    const endMin = String(endObj.getMinutes()).padStart(2, '0');

    const dates = `${cleanDate}T${startHour}${startMin}00/${cleanDate}T${endHour}${endMin}00`;
    const title = `🦷 Cita Dental: ${apt.patientName} (${apt.treatmentType})`;
    const details = `Cita Odontológica en DentalCloud\nPaciente: ${apt.patientName}\nTeléfono: ${apt.patientPhone}\nTratamiento: ${apt.treatmentType}\nConsultorio: ${apt.box}\nDoctor: ${apt.dentistName}\nNotas: ${apt.notes || 'Sin notas adicionales'}`;
    const location = `DentalCloud - ${apt.box}`;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;

    setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, googleCalendarSync: true } : a));
    window.open(url, '_blank');
    showToast(`Abriendo Google Calendar para cita de ${apt.patientName}`);
    return url;
  };

  // Voice Budget Assistant
  const addVoiceBudgetItem = (spokenText: string): { success: boolean; message: string } => {
    const { toothNumber, price: detectedPrice } = parseVoiceCommand(spokenText);
    let price = detectedPrice;

    let treatmentName = spokenText;
    const lower = spokenText.toLowerCase();

    if (lower.includes('resina') || lower.includes('obturaci') || lower.includes('caries')) {
      treatmentName = toothNumber ? `Restauración Resina Pieza ${toothNumber}` : 'Restauración Resina Fotocurada';
      if (!price) price = 45;
    } else if (lower.includes('profilaxis') || lower.includes('limpieza')) {
      treatmentName = 'Profilaxis Dental Ultrasónica y Aeropulido';
      if (!price) price = 45;
    } else if (lower.includes('endodoncia') || lower.includes('conducto')) {
      treatmentName = toothNumber ? `Tratamiento de Conducto Pieza ${toothNumber}` : 'Tratamiento de Conducto';
      if (!price) price = 120;
    } else if (lower.includes('corona') || lower.includes('zirconio')) {
      treatmentName = toothNumber ? `Corona Zirconio Pieza ${toothNumber}` : 'Corona de Porcelana Libre de Metal';
      if (!price) price = 280;
    } else if (lower.includes('extracc') || lower.includes('exodoncia') || lower.includes('sacar')) {
      treatmentName = toothNumber ? `Exodoncia Pieza ${toothNumber}` : 'Exodoncia Simple de Pieza Dental';
      if (!price) price = 45;
    } else if (lower.includes('blanqueamiento')) {
      treatmentName = 'Blanqueamiento Dental LED en Consultorio';
      if (!price) price = 150;
    } else if (lower.includes('ortodoncia') || lower.includes('control') || lower.includes('bracket')) {
      treatmentName = 'Control Mensual de Ortodoncia';
      if (!price) price = 35;
    }

    const finalPrice = price || 45;
    addOdontogramItemToActiveBudget(toothNumber || 16, treatmentName, finalPrice);
    const msg = `Presupuesto por voz: ${treatmentName} ($${finalPrice})`;
    return { success: true, message: msg };
  };

  // Doctor Handlers
  const addDoctor = (docData: Omit<Doctor, 'id' | 'patientsTreatedCount' | 'monthlyProduction'>) => {
    const newDoc: Doctor = {
      ...docData,
      id: `doc-${Date.now()}`,
      patientsTreatedCount: 0,
      monthlyProduction: 0
    };
    setDoctors(prev => [...prev, newDoc]);
    showToast(`Dr(a). ${newDoc.name} agregado al equipo`);
  };

  const updateDoctor = (doc: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === doc.id ? doc : d));
    if (activeDoctor.id === doc.id) {
      setActiveDoctor(doc);
    }
    showToast(`Perfil de ${doc.name} actualizado`);
  };

  // Facturación Electrónica SENIAT Handler
  const emitFacturaSeniat = (invoiceData: Omit<FacturaElectronicaSeniat, 'id' | 'invoiceNumber' | 'controlNumber' | 'qrCodeUrl' | 'digitalSignatureHash'>): FacturaElectronicaSeniat => {
    const invoiceSeq = seniatInvoices.length + 4290;
    const controlSeq = seniatInvoices.length + 3419;
    const invoiceNumber = `FACT-${String(invoiceSeq).padStart(8, '0')}`;
    const controlNumber = `00-${String(controlSeq).padStart(6, '0')}`;
    const hash = 'SENIAT-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const qrData = `SENIAT|RIF:J-31298456-0|FACT:${invoiceNumber}|CTRL:${controlNumber}|MONTO_BS:${invoiceData.totalBs.toFixed(2)}|IGTF_BS:${invoiceData.igtfAmountBs.toFixed(2)}|FECHA:${invoiceData.date}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;

    const newInvoice: FacturaElectronicaSeniat = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      invoiceNumber,
      controlNumber,
      qrCodeUrl,
      digitalSignatureHash: hash
    };

    setSeniatInvoices(prev => [newInvoice, ...prev]);

    // Deduct patient balance
    setPatients(prev => prev.map(p => {
      if (p.id === invoiceData.patientId) {
        return {
          ...p,
          balance: Math.max(0, p.balance - invoiceData.subtotalUsd)
        };
      }
      return p;
    }));

    // Record corresponding payment receipt in cash ledger
    const payRec: PaymentReceipt = {
      id: `pay-${Date.now()}`,
      receiptNumber: `REC-${invoiceNumber}`,
      patientId: invoiceData.patientId,
      patientName: invoiceData.patientName,
      date: invoiceData.date,
      amount: invoiceData.subtotalUsd,
      method: invoiceData.paymentBreakdown.divisaPayments.length > 0 ? 'efectivo' : 'pago_movil',
      reference: controlNumber,
      concept: `Factura Fiscal SENIAT ${invoiceNumber} (${invoiceData.items.length} tratamientos)`,
      cashierName: invoiceData.doctorName,
      notes: `Factura Electrónica SENIAT Control N° ${controlNumber} - IGTF: $${invoiceData.igtfAmountUsd.toFixed(2)}`
    };
    setPayments(prev => [payRec, ...prev]);

    showToast(`Factura Electrónica SENIAT ${invoiceNumber} emitida con éxito`);
    return newInvoice;
  };

  // Expense Handlers
  const addExpense = (expenseData: Omit<ClinicExpense, 'id'>): ClinicExpense => {
    const yearStr = (expenseData.date || new Date().toISOString().split('T')[0]).slice(0, 4) || '2026';
    const nextSeq = expenses.length + 1;
    const newExp: ClinicExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      receiptFolio: expenseData.receiptFolio?.trim() || `CE-${yearStr}-${String(nextSeq).padStart(4, '0')}`
    };
    setExpenses(prev => [newExp, ...prev]);
    showToast(`Gasto "${newExp.description}" registrado (${newExp.receiptFolio})`);
    return newExp;
  };

  const updateExpense = (updated: ClinicExpense) => {
    setExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    showToast(`Comprobante de pago "${updated.providerName}" actualizado`);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast('Gasto eliminado de administración');
  };

  // Equipment Handlers (Depreciation)
  const addEquipment = (eqData: Omit<EquipmentItem, 'id' | 'monthlyDepreciationUsd' | 'hourlyDepreciationUsd'>) => {
    const monthlyDep = eqData.purchasePriceUsd / (eqData.usefulLifeYears * 12);
    const hourlyDep = monthlyDep / 160;
    const newEq: EquipmentItem = {
      ...eqData,
      id: `eq-${Date.now()}`,
      monthlyDepreciationUsd: Number(monthlyDep.toFixed(2)),
      hourlyDepreciationUsd: Number(hourlyDep.toFixed(2))
    };
    setEquipment(prev => [...prev, newEq]);
    showToast(`Equipo "${newEq.name}" agregado a inventario`);
  };

  // Software Patient Import (Formato 10 columnas / Excel / PDF / Otros softwares)
  const importPatientsFromSoftware = (importedList: SoftwareImportPatient[]): number => {
    const existingCedulas = new Set(
      patients
        .map(p => (p.cedula || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
        .filter(c => c && !c.startsWith('SINCI') && !c.startsWith('PDF'))
    );

    // Filtrar obligatoriamente: sin "X" en nombre/apellido/cédula y con nombre, apellido, cédula y correo válidos
    const { valid: cleanItems, rejected } = partitionValidCleanPatients(importedList);

    const newPatients: Patient[] = [];
    const baseTimestamp = Date.now();
    let nextSeq = patients.reduce((max, p) => {
      const n = parseInt(sanitizePatientNumericId(p.historyNumber || p.migrationHistory, 0), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    cleanItems.forEach((item, idx) => {
      const normalizedCi = (item.cedula || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (normalizedCi) {
        if (existingCedulas.has(normalizedCi)) {
          return;
        }
        existingCedulas.add(normalizedCi);
      }

      nextSeq += 1;
      const cleanNumericId = sanitizePatientNumericId(item.historyNumber, nextSeq);

      const isoLastVisit =
        spreadsheetDateToIso(item.lastAppointmentDate || '') ||
        spreadsheetDateToIso(item.admissionDate || '') ||
        new Date().toISOString().split('T')[0];

      newPatients.push({
        id: `pat-import-${baseTimestamp}-${idx}`,
        name: item.name,
        cedula: item.cedula,
        phone: item.phone || '',
        email: item.email || '',
        age: 30,
        gender: 'M',
        bloodType: 'O+',
        nationality: 'V - VENEZUELA',
        patientType: 'adulto',
        allergies: [],
        systemicConditions: [],
        regularMedications: [],
        historyNumber: cleanNumericId,
        migrationHistory: cleanNumericId,
        admissionDate: item.admissionDate || undefined,
        lastControlDate: item.lastAppointmentDate || undefined,
        assignedDoctor: item.doctorName || 'Clínica Corona',
        consultationReason: item.consultationReason || 'control',
        phones: {
          mobile: item.phone || ''
        },
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        },
        balance: item.balance || 0,
        saldoAFavor: 0,
        totalBilled: item.balance || 0,
        lastVisit: isoLastVisit
      });
    });

    if (newPatients.length === 0) {
      showToast(
        rejected.length > 0
          ? `0 pacientes importados (${rejected.length} descartados por "X" o falta de nombre/apellido/cédula/correo)`
          : 'No se importaron pacientes nuevos (cédulas duplicadas o archivo vacío)'
      );
      return 0;
    }

    setPatients(prev => [...newPatients, ...prev]);
    if (!selectedPatientId) {
      setSelectedPatientId(newPatients[0].id);
    }
    const skippedNote = rejected.length > 0 ? ` (${rejected.length} descartados por datos incompletos o con "X")` : '';
    showToast(`${newPatients.length} pacientes válidos importados${skippedNote}`);
    return newPatients.length;
  };

  // Pending Checkout & Treatment Integration
  const addPendingCheckoutItem = (item: { patientId: string; patientName: string; treatmentName: string; amountUsd: number; doctorName: string }) => {
    const newItem = {
      id: `pco-${Date.now()}`,
      patientId: item.patientId,
      patientName: item.patientName,
      treatmentName: item.treatmentName,
      amountUsd: item.amountUsd,
      amountBs: item.amountUsd * exchangeRate,
      doctorName: item.doctorName,
      date: new Date().toISOString().split('T')[0]
    };
    setPendingCheckoutItems(prev => [newItem, ...prev]);
    showToast(`Tratamiento "${item.treatmentName}" enviado a Cajas y Pagos`);
  };

  const removePendingCheckoutItem = (id: string) => {
    setPendingCheckoutItems(prev => prev.filter(i => i.id !== id));
  };

  // Birthday Patients (excluye pacientes inactivos / fallecidos)
  const birthdayPatients = patients.filter(p => {
    if (!isPatientNotifiable(p)) return false;
    if (!p.birthDate) return false;
    const today = new Date();
    const parts = p.birthDate.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return m === (today.getMonth() + 1) && d === today.getDate();
    }
    return false;
  });

  const sendBirthdayGreetingWA = (patient: Patient) => {
    if (!isPatientNotifiable(patient)) {
      showToast('Notificación bloqueada: el paciente está inactivo o fallecido.');
      return;
    }
    const text = 
`🎉🎂 *¡FELIZ CUMPLEAÑOS TE DESEA CLINICA CORONA!* 🎂🎉

Estimado(a) *${patient.name}*,
De parte de todo el equipo de odontólogos de *Clínica Corona*, le enviamos nuestras más afectuosas felicitaciones en su día especial. Deseamos que disfrute de este día con alegría, salud y una sonrisa sana y brillante.

🎁 *Detalle Especial de Cumpleaños:* Le obsequiamos un *20% de descuento* en su próxima limpieza dental profunda o tratamiento profiláctico durante su mes aniversario.

¡Feliz cumpleaños!
_CLINICA CORONA · Salud y Estética Dental Integral_
📍 Caracas, Venezuela · Telf: +58-424-2140058`;

    const url = generateDirectWhatsAppUrl(patient.phone, text);
    window.open(url, '_blank');
    showToast(`Felicitación de cumpleaños enviada por WhatsApp a ${patient.name}`);
  };

  const applySaldoAFavor = (patientId: string, amount: number) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          saldoAFavor: (p.saldoAFavor || 0) + amount
        };
      }
      return p;
    }));
    showToast(`Abono / Saldo a favor de $${amount} acreditado al paciente`);
  };

  // Suiteexo: Cuotas & Financiamiento
  const createInstallmentPlan = (params: {
    patientId: string;
    patientName: string;
    budgetId?: string;
    budgetFolio?: string;
    title: string;
    totalUsd: number;
    downPaymentUsd: number;
    installmentCount: number;
    startDate: string;
  }): InstallmentPlan => {
    const todayStr = new Date().toISOString().split('T')[0];
    const generated = generateInstallmentSchedule(
      params.totalUsd,
      params.downPaymentUsd,
      params.installmentCount,
      params.startDate,
      todayStr
    );
    const plan: InstallmentPlan = {
      id: `plan-${Date.now()}`,
      patientId: params.patientId,
      patientName: params.patientName,
      budgetId: params.budgetId,
      budgetFolio: params.budgetFolio,
      title: params.title,
      totalUsd: Math.max(0, params.totalUsd - params.downPaymentUsd),
      cuotas: generated,
      createdAt: todayStr
    };
    setInstallmentPlans(prev => [plan, ...prev]);

    if (params.downPaymentUsd > 0) {
      recordPayment({
        patientId: params.patientId,
        patientName: params.patientName,
        budgetId: params.budgetId,
        date: todayStr,
        amount: params.downPaymentUsd,
        currencyType: 'USD',
        method: 'efectivo',
        reference: `INI-${Date.now().toString().slice(-5)}`,
        concept: `Inicial Plan de Cuotas: ${params.title}`,
        cashierName: activeDoctor.name
      });
    }

    showToast(`Plan de ${params.installmentCount} cuotas creado para ${params.patientName}`);
    return plan;
  };

  const payInstallmentAmount = (
    planId: string,
    amountUsd: number,
    method: PaymentReceipt['method'] = 'pago_movil'
  ) => {
    const plan = installmentPlans.find(p => p.id === planId);
    if (!plan || amountUsd <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const { updatedCuotas } = conciliatePaymentIntoInstallments(plan.cuotas, amountUsd);
    const finalCuotas = updatedCuotas.map(c => ({
      ...c,
      paidDate: c.status === 'pagada' ? c.paidDate || todayStr : undefined
    }));

    setInstallmentPlans(prev =>
      prev.map(p => (p.id === planId ? { ...p, cuotas: finalCuotas } : p))
    );

    recordPayment({
      patientId: plan.patientId,
      patientName: plan.patientName,
      budgetId: plan.budgetId,
      date: todayStr,
      amount: amountUsd,
      currencyType: 'USD',
      method,
      reference: `CUOTA-${Date.now().toString().slice(-5)}`,
      concept: `Abono a cuota(s) — ${plan.title}`,
      cashierName: activeDoctor.name
    });
  };

  // Suiteexo: Tabulador Editable
  const adjustCatalogPrices = (percentDelta: number) => {
    setCatalogItems(prev => adjustCatalogPricesByPercent(prev, percentDelta));
    showToast(`Tarifario ajustado en ${percentDelta > 0 ? '+' : ''}${percentDelta}%`);
  };

  const updateCatalogItemPrice = (id: string, newPrice: number) => {
    setCatalogItems(prev =>
      prev.map(it => (it.id === id ? { ...it, basePrice: Math.max(1, newPrice) } : it))
    );
    showToast('Tarifa actualizada en el tabulador');
  };

  const addCatalogItem = (item: {
    code?: string;
    name: string;
    area: string;
    suggestedPhase?: PureCatalogSuggestedPhase;
    basePrice: number;
  }): DetailedCatalogItem => {
    const created = buildNewCatalogItem(catalogItems, item);
    setCatalogItems(prev => [created, ...prev]);
    showToast(`Procedimiento "${created.name}" agregado a ${created.area}`);
    return created;
  };

  // Suiteexo: Fichas de Ingreso
  const createIntakeTemplate = (tpl: Omit<IntakeFormTemplate, 'id'>): IntakeFormTemplate => {
    const created: IntakeFormTemplate = { ...tpl, id: `tpl-${Date.now()}` };
    setIntakeTemplates(prev => [created, ...prev]);
    showToast(`Plantilla "${created.name}" guardada`);
    return created;
  };

  const submitIntakeForm = (
    sub: Omit<IntakeSubmission, 'id' | 'submittedAt' | 'status'>
  ): IntakeSubmission => {
    const created: IntakeSubmission = {
      ...sub,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'pendiente_revision'
    };
    setIntakeSubmissions(prev => [created, ...prev]);
    showToast(`Ficha de ingreso recibida de ${created.patientName}`);
    return created;
  };

  const createPatientFromIntake = (submissionId: string): Patient | null => {
    const sub = intakeSubmissions.find(s => s.id === submissionId);
    if (!sub) return null;

    const computedAge = computeAgeFromBirthDate(sub.birthDate);
    const allergiesList = parseCommaListInput(sub.allergies || '');
    const conditionsList = parseCommaListInput(sub.systemicConditions || '');

    const cleanCedula = sub.cedula.replace(/\./g, '').trim();
    const billingRif = /^[VEJP]-?/i.test(cleanCedula)
      ? `${cleanCedula.toUpperCase()}-0`
      : `V-${cleanCedula}-0`;

    const createdPatient = addPatient({
      name: sub.patientName,
      cedula: sub.cedula,
      phone: sub.phone,
      email: sub.email,
      birthDate: sub.birthDate,
      age: computedAge,
      gender: 'F',
      bloodType: 'O+',
      historyNumber: getNextNumericHistoryNumber(patients),
      billingCompanyName: sub.patientName,
      billingTaxId: billingRif,
      admissionDate: new Date().toLocaleDateString('es-VE'),
      allergies: allergiesList,
      systemicConditions: conditionsList,
      regularMedications: [],
      emergencyContact: {
        name: 'Declarado en Ficha Digital',
        phone: sub.phone,
        relationship: 'Familiar'
      },
      lastVisit: new Date().toISOString().split('T')[0]
    });

    setIntakeSubmissions(prev =>
      prev.map(s => (s.id === submissionId ? { ...s, status: 'paciente_creado' } : s))
    );
    return createdPatient;
  };

  const registerPatientFromQrIntake = (
    payload: QrPatientIntakePayload & { signatureDataUrl?: string }
  ): { patient: Patient; submission: IntakeSubmission; isExisting: boolean } => {
    const normalizedName = payload.name.trim().toUpperCase();
    const normalizedCedula = payload.cedula.trim().toUpperCase();
    const cedulaKey = normalizeCedulaKey(normalizedCedula);

    const existing =
      (payload.patientId ? patients.find(p => p.id === payload.patientId) : undefined) ||
      (cedulaKey
        ? patients.find(p => normalizeCedulaKey(p.cedula || '') === cedulaKey)
        : undefined);

    const parsedAllergies = parseCommaListInput(payload.allergies || '');
    const parsedConditions = parseCommaListInput(payload.systemicConditions || '');
    const parsedMeds = parseCommaListInput(payload.regularMedications || '');
    const computedAge = computeAgeFromBirthDate(payload.birthDate);
    const todayIso = new Date().toISOString().split('T')[0];

    let savedPatient: Patient;
    if (existing) {
      savedPatient = {
        ...existing,
        name: normalizedName || existing.name,
        cedula: normalizedCedula || existing.cedula,
        phone: payload.phone.trim() || existing.phone,
        email: payload.email.trim() || existing.email,
        birthDate: payload.birthDate || existing.birthDate,
        age: payload.birthDate ? computedAge : existing.age,
        gender: payload.gender || existing.gender,
        profession: payload.profession?.trim() || existing.profession,
        allergies: parsedAllergies.length > 0 ? parsedAllergies : existing.allergies,
        systemicConditions:
          parsedConditions.length > 0 ? parsedConditions : existing.systemicConditions,
        regularMedications:
          parsedMeds.length > 0 ? parsedMeds : existing.regularMedications || [],
        emergencyContact:
          payload.emergencyContact &&
          (payload.emergencyContact.name || payload.emergencyContact.phone)
            ? {
                name:
                  payload.emergencyContact.name.trim() ||
                  existing.emergencyContact?.name ||
                  '',
                phone:
                  payload.emergencyContact.phone.trim() ||
                  existing.emergencyContact?.phone ||
                  '',
                relationship:
                  payload.emergencyContact.relationship.trim() ||
                  existing.emergencyContact?.relationship ||
                  'Familiar'
              }
            : existing.emergencyContact,
        lastVisit: todayIso
      };
      setPatients(prev => prev.map(p => (p.id === existing.id ? savedPatient : p)));
      setSelectedPatientId(savedPatient.id);
    } else {
      const cleanCedula = normalizedCedula.replace(/\./g, '').trim();
      const billingRif = /^[VEJPG]-?/i.test(cleanCedula)
        ? `${cleanCedula}-0`
        : `V-${cleanCedula}-0`;
      const nextNum = getNextNumericHistoryNumber(patients);
      const newId = `pat-${Date.now()}`;

      savedPatient = {
        id: newId,
        historyNumber: nextNum,
        migrationHistory: nextNum,
        name: normalizedName,
        cedula: normalizedCedula,
        phone: payload.phone.trim(),
        email: payload.email.trim(),
        birthDate: payload.birthDate || undefined,
        age: computedAge,
        gender: payload.gender || 'F',
        bloodType: 'O+',
        profession: payload.profession?.trim() || 'Particular',
        nationality: 'V - VENEZUELA',
        billingCompanyName: normalizedName,
        billingTaxId: billingRif,
        billingAddress: clinicConfig.address || 'Caracas, Venezuela',
        admissionDate: new Date().toLocaleDateString('es-VE'),
        lastVisit: todayIso,
        balance: 0,
        totalBilled: 0,
        allergies: parsedAllergies,
        systemicConditions: parsedConditions,
        regularMedications: parsedMeds,
        emergencyContact: {
          name: payload.emergencyContact?.name?.trim() || 'Contacto Registrado',
          phone: payload.emergencyContact?.phone?.trim() || payload.phone.trim(),
          relationship: payload.emergencyContact?.relationship?.trim() || 'Familiar'
        }
      };

      setPatients(prev => [savedPatient, ...prev]);
      setSelectedPatientId(savedPatient.id);
    }

    const submission: IntakeSubmission = {
      id: `sub-${Date.now()}`,
      templateId: payload.templateId || 'tpl-anamnesis-general',
      templateName: payload.templateName || 'Historia Clínica Digital QR',
      patientName: savedPatient.name,
      cedula: savedPatient.cedula,
      phone: savedPatient.phone,
      email: savedPatient.email,
      birthDate: savedPatient.birthDate,
      allergies: payload.allergies?.trim() || 'Ninguna',
      systemicConditions: payload.systemicConditions?.trim() || 'Ninguna',
      answers: payload.answers || {},
      signatureDataUrl: payload.signatureDataUrl,
      submittedAt: new Date().toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'paciente_creado'
    };

    setIntakeSubmissions(prev => [submission, ...prev]);
    showToast(
      existing
        ? `Historia Clínica de ${savedPatient.name} actualizada`
        : `Paciente ${savedPatient.name} registrado (#${savedPatient.historyNumber})`
    );

    return {
      patient: savedPatient,
      submission,
      isExisting: Boolean(existing)
    };
  };

  // Suiteexo: Bloqueos de Agenda
  const addBlockedSlot = (slot: Omit<BlockedSlot, 'id'>) => {
    const created: BlockedSlot = { ...slot, id: `blk-${Date.now()}` };
    setBlockedSlots(prev => [created, ...prev]);
    showToast(`Horario bloqueado el ${slot.date} (${slot.startTime}-${slot.endTime})`);
  };

  const removeBlockedSlot = (id: string) => {
    setBlockedSlots(prev => prev.filter(b => b.id !== id));
    showToast('Bloqueo horario eliminado');
  };

  // Suiteexo: Liquidaciones de Profesionales
  const generateLiquidation = (params: {
    doctorId: string;
    periodStart: string;
    periodEnd: string;
    collectedUsd: number;
    proceduresCount: number;
  }): DoctorLiquidation => {
    const doc = doctors.find(d => d.id === params.doctorId) || doctors[0];
    const { payoutUsd, clinicShareUsd } = calculateDoctorLiquidation(
      params.collectedUsd,
      doc.commissionPercentage
    );
    const created: DoctorLiquidation = {
      id: `liq-${Date.now()}`,
      doctorId: doc.id,
      doctorName: doc.name,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      collectedUsd: params.collectedUsd,
      commissionPercent: doc.commissionPercentage,
      payoutUsd,
      clinicShareUsd,
      proceduresCount: params.proceduresCount,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'liquidado'
    };
    setLiquidations(prev => [created, ...prev]);
    showToast(`Liquidación generada para ${doc.name}: $${payoutUsd.toFixed(2)}`);
    return created;
  };

  // Suiteexo: Configuración Clínica & Roles
  const updateClinicConfig = (cfg: ClinicConfig) => {
    setClinicConfig(cfg);
    showToast('Configuración de clínica guardada correctamente');
  };

  const updateRolePermission = (role: Role, permKey: string, allowed: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [permKey]: allowed
      }
    }));
    showToast('Permiso de rol actualizado');
  };

  return (
    <DentalContext.Provider value={{
      currentRole,
      setCurrentRole,
      currentTab,
      setCurrentTab,
      isDarkMode,
      toggleDarkMode,
      isPatientKioskLocked,
      setIsPatientKioskLocked,
      selectedPatientId,
      setSelectedPatientId,
      selectedPatient,
      patients,
      appointments,
      budgets,
      payments,
      evolutions,
      prescriptions,
      consents,
      waReminders,
      odontograms,
      odontogramControls,
      addOdontogramControl,
      secuenciaTratamientos,
      addSecuenciaTratamiento,
      updateSecuenciaTratamiento,
      deleteSecuenciaTratamiento,
      clinicalImages,
      addClinicalImage,
      deleteClinicalImage,
      syncAppointmentWithGoogleCalendar,
      addVoiceBudgetItem,
      updateAppointmentStatus,
      addAppointment,
      addPatient,
      updatePatient,
      deactivatePatient,
      reactivatePatient,
      clearAllPatients,
      cleanInvalidPatients,
      setToothSurface,
      setToothWholeStatus,
      setMultipleTeethWholeStatus,
      setToothStatusSequence,
      clearTooth,
      getToothCondition,
      exchangeRate,
      setExchangeRate,
      rates,
      updateRates,
      syncExchangeRatesNow,
      isSyncingRates,
      rateHistory,
      addBudget,
      updateBudget,
      updateBudgetStatus,
      updateBudgetItem,
      deleteBudget,
      addOdontogramItemToActiveBudget,
      recordPayment,
      cashClosings,
      registerCashClosing,
      addEvolutionEntry,
      addPrescription,
      vademecumItems,
      addVademecumMedication,
      deleteVademecumMedication,
      saveConsent,
      sendWhatsAppMessage,
      scheduleWhatsAppReminder,
      generateDirectWhatsAppUrl,
      autoRemindersEnabled,
      setAutoRemindersEnabled,
      toastMessage,
      showToast,
      doctors,
      activeDoctor,
      setActiveDoctor,
      addDoctor,
      updateDoctor,
      seniatInvoices,
      emitFacturaSeniat,
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      equipment,
      addEquipment,
      importPatientsFromSoftware,
      pendingCheckoutItems,
      addPendingCheckoutItem,
      removePendingCheckoutItem,
      birthdayPatients,
      sendBirthdayGreetingWA,
      applySaldoAFavor,
      installmentPlans,
      createInstallmentPlan,
      payInstallmentAmount,
      catalogItems,
      adjustCatalogPrices,
      updateCatalogItemPrice,
      addCatalogItem,
      intakeTemplates,
      intakeSubmissions,
      createIntakeTemplate,
      submitIntakeForm,
      createPatientFromIntake,
      registerPatientFromQrIntake,
      blockedSlots,
      addBlockedSlot,
      removeBlockedSlot,
      liquidations,
      generateLiquidation,
      clinicConfig,
      updateClinicConfig,
      rolePermissions,
      updateRolePermission
    }}>
      {children}
    </DentalContext.Provider>
  );
};

export const useDental = () => {
  const context = useContext(DentalContext);
  if (!context) {
    throw new Error('useDental must be used within a DentalProvider');
  }
  return context;
};
