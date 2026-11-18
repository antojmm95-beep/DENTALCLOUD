export type Role = 'recepcion' | 'doctor' | 'paciente' | 'admin';

export type AppointmentStatus =
  | 'agendada'
  | 'confirmada'
  | 'reprogramado'
  | 'atendido'
  | 'cancelado_paciente'
  | 'cancelada';

export type ToothSurface = 'V' | 'L' | 'M' | 'D' | 'O'; // Vestibular, Lingual/Palatino, Mesial, Distal, Oclusal

export type ToothClinicalStatus = 
  | 'sano'
  | 'caries' // Rojo
  | 'ausente' // Azul
  | 'obturado' // Restauraciones en buen estado (Azul)
  | 'extraccion_indicada' // X roja
  | 'implante' // Azul con tornillito
  | 'necesidad_implante' // Rojo con tornillito
  | 'endodoncia' // Raya vertical roja
  | 'corona'; // Toda la cara pintada de azul

export interface ToothCondition {
  number: number;
  wholeStatus?: ToothClinicalStatus;
  surfaces: Partial<Record<ToothSurface, ToothClinicalStatus>>;
  notes?: string;
  treatmentName?: string;
  cost?: number;
  statusSequence?: 'pendiente' | 'en_tratamiento' | 'finalizado';
  implantCadCam?: {
    brand?: string;
    diameter?: string;
    length?: string;
    torque?: string;
    material?: string;
    shade?: string;
    laboratory?: string;
  };
}

export interface OdontogramControlEntry {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  doctorName: string;
  notes?: string;
}

export type BoxType = 'Consultorio 1' | 'Consultorio 2' | 'Consultorio 3';

export interface PatientGuardian {
  name: string;
  cedula: string;
  phone: string;
  email: string;
  relationship: string;
  isMinor: boolean;
}

export interface Patient {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  email: string;
  birthDate?: string;
  age: number;
  gender: 'M' | 'F' | 'Otro';
  bloodType: string;
  allergies: string[];
  systemicConditions: string[]; // Hipertensión, Diabetes, etc.
  regularMedications: string[];
  isMinor?: boolean;
  guardian?: PatientGuardian;
  profession?: string; // Ocupación / Profesión
  historyNumber?: string;
  consultationReason?: 'control' | 'dolor' | 'sangramiento_encia' | 'estetica' | 'mal_posicion' | 'protesis' | 'otros' | string;
  patientType?: 'adulto' | 'infantil';
  patientInactive?: boolean;
  inactiveReason?: 'fallecimiento' | 'traslado' | 'inactivo' | string;
  deceasedDate?: string;
  notificationsBlocked?: boolean;
  migrationHistory?: string;
  nationality?: string; // e.g. "V - VENEZUELA"
  billingCompanyName?: string; // Razón Social Facturación
  billingTaxId?: string; // RIF Facturación
  billingAddress?: string;
  socialNetworks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  insuranceKey?: string;
  referredBy?: string;
  assignedDoctor?: string;
  homeAddress?: string;
  phones?: {
    mobile?: string;
    home?: string;
    office?: string;
  };
  lastControlDate?: string;
  admissionDate?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  balance: number;
  saldoAFavor?: number; // Saldo a favor del paciente
  totalBilled: number;
  lastVisit?: string;
  nextAppointment?: string;
  photoUrl?: string;
  convenio?: string;
}

export interface DescartableProduct {
  id: string;
  code: number;
  name: string;
  brand: string;
  specification: string;
  price: number;
  applications: number;
  inventory: string;
  costPerUse: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  box: BoxType;
  dentistName: string;
  treatmentType: string;
  status: AppointmentStatus;
  notes?: string;
  arrivedAt?: string; // timestamp when entered waiting room
  waReminderSent: boolean;
  waConfirmed: boolean;
  googleCalendarEventId?: string;
  googleCalendarSync?: boolean;
}

export interface SecuenciaTratamiento {
  id: string;
  patientId: string;
  date: string;
  time: string;
  toothNumber?: number;
  procedure: string;
  notes: string;
  doctorName: string;
  audioDuration?: string;
  transcript?: string;
  audioRecordingUrl?: string; // audio recording dataUrl or audio track
  isAutomated?: boolean;
  linkedBudgetId?: string;
}

export interface ClinicalImage {
  id: string;
  patientId: string;
  title: string;
  category:
    | 'radiografia_periapical'
    | 'radiografia_panoramica'
    | 'foto_intraoral'
    | 'foto_extraoral'
    | 'control_evolucion'
    | 'tomografia'
    | 'documento_consentimiento';
  date: string;
  url: string;
  stlDataBase64?: string;
  notes?: string;
  toothNumber?: number;
}

export interface TreatmentCatalogItem {
  id: string;
  code: string;
  name: string;
  category: 'Diagnóstico' | 'Operatoria' | 'Endodoncia' | 'Periodoncia' | 'Cirugía' | 'Ortodoncia' | 'Prótesis' | 'Estética';
  basePrice: number;
}

export type TreatmentPhase = 
  | 'fase_inicial' 
  | 'fase_quirurgica' 
  | 'fase_funcional_ortodoncia' 
  | 'fase_protesica' 
  | 'fase_mantenimiento';

export type BudgetStatus = 'pendiente' | 'tratamiento' | 'finalizado' | 'borrador' | 'enviado' | 'aprobado' | 'rechazado';

export interface BudgetItem {
  id: string;
  toothNumber?: number;
  teeth?: number[];
  surface?: string;
  treatmentId?: string;
  code?: string;
  name: string;
  category: string;
  area?: string; // Especialidad RHSistema (1 - PREVENTIVA, 2 - ENDODONCIA, etc.)
  phase?: TreatmentPhase | string; // Fase inicial, quirúrgica, etc. o personalizada
  quadrant?: string; // SUP, INF, Cuadrante I, etc.
  quantity: number;
  price: number;
  discount: number; // percentage
  total: number;
  doctor?: string;
  status?: 'pendiente' | 'en_curso' | 'finalizado' | 'realizado';
}

export interface Budget {
  id: string;
  folio: string;
  patientId: string;
  patientName: string;
  date: string;
  validUntil: string;
  doctorName: string;
  doctorColegiado?: string;
  doctorMpps?: string;
  items: BudgetItem[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  total: number;
  status: BudgetStatus;
  notes?: string;
  paymentPlan?: string;
  currentPhase?: TreatmentPhase | string;
  customPhases?: string[];
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  patientId: string;
  patientName: string;
  budgetId?: string;
  treatmentRefId?: string;
  date: string;
  amount: number;
  currencyType?: 'BS' | 'USD' | 'EUR' | 'USDT';
  method: 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'zelle' | 'pago_movil' | 'binance' | 'paypal' | 'vale_abono';
  reference: string;
  concept: string;
  cashierName: string;
  notes?: string;
  isAbonoVale?: boolean;
  saldoAFavorUtilizado?: number;
}

export interface ClinicalEvolutionEntry {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctorName: string;
  procedure: string;
  evolutionText: string;
  diagnoses: string[];
  anesthesiaUsed?: string;
  recommendations: string;
  nextStep?: string;
}

export interface Medication {
  name: string;
  presentation: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface VademecumMedication {
  id: string;
  name: string;
  presentation: string;
  defaultDose: string;
  defaultFreq: string;
  defaultDur: string;
  instructions: string;
  isCustom?: boolean;
}

export interface MedicalPrescription {
  id: string;
  folio: string;
  patientId: string;
  patientName: string;
  patientCedula: string;
  patientAge: number;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorColegiado: string;
  doctorMpps?: string;
  medications: Medication[];
  generalIndications: string;
  signed: boolean;
  signatureDataUrl?: string;
}

export type ConsentProcedureType =
  | 'exodoncia'
  | 'terceros_molares'
  | 'implantes'
  | 'endodoncia'
  | 'ortodoncia'
  | 'blanqueamiento'
  | 'operatoria';

export interface InformedConsent {
  id: string;
  folio: string;
  patientId: string;
  patientName: string;
  patientCedula: string;
  patientAge?: number;
  procedureType: ConsentProcedureType;
  procedureTitle: string;
  content: string;
  risks: string[];
  doctorName: string;
  doctorColegiado?: string;
  doctorMpps?: string;
  signedDate: string;
  patientSignature?: string;
  doctorSignature?: string;
  isSigned: boolean;
  diagnosis?: string;
  proposedTreatment?: string;
  alternativeTreatments?: string;
  expectedBenefits?: string;
  consentDecision?: 'consiento' | 'no_consiento';
  representativeName?: string;
  witnessName?: string;
  anesthesiaModality?: 'local' | 'local_sedacion';
  imagingStudies?: {
    panoramica: boolean;
    periapical: boolean;
    cbctTac: boolean;
  };
  prosthodontistName?: string;
  implantIdentification?: string;
}

export interface WhatsAppReminder {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  appointmentId?: string;
  type: 'recordatorio_24h' | 'confirmacion_inmediata' | 'presupuesto' | 'recipe_digital' | 'postoperatorio';
  message: string;
  scheduledTime: string;
  status: 'pendiente' | 'enviado' | 'respondido';
  sentAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  colegiado: string; // COV Nro
  mpps: string; // Registro MPPS
  rif: string;
  email: string;
  phone: string;
  commissionPercentage: number;
  assignedBox: BoxType;
  status: 'activo' | 'inactivo';
  patientsTreatedCount: number;
  monthlyProduction: number;
}

export interface FacturaElectronicaSeniat {
  id: string;
  invoiceNumber: string; // FACT-00004289
  controlNumber: string; // 00-003418
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  patientCedula: string;
  patientRif?: string;
  patientAddress: string;
  patientPhone: string;
  doctorName: string;
  items: Array<{
    description: string;
    toothNumber?: number;
    amountUsd: number;
    amountBs: number;
    isExempt: boolean;
  }>;
  subtotalUsd: number;
  subtotalBs: number;
  exemptAmountUsd: number;
  exemptAmountBs: number;
  taxableBaseUsd: number;
  taxableBaseBs: number;
  ivaRate: number; // 0%
  ivaAmountUsd: number;
  ivaAmountBs: number;
  igtfRate: number; // 3%
  igtfAmountUsd: number;
  igtfAmountBs: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  paymentBreakdown: {
    bsPayments: Array<{ method: string; amountBs: number; amountUsd: number; bank: string; reference: string }>;
    divisaPayments: Array<{ method: string; amountUsd: number; bank: string; reference: string }>;
  };
  qrCodeUrl: string;
  digitalSignatureHash: string;
}

export type ExpenseCategory = 
  | 'laboratorio'
  | 'alquiler'
  | 'telefonia'
  | 'servicios_publicos'
  | 'contador'
  | 'alcaldia'
  | 'seniat'
  | 'inces'
  | 'ivss'
  | 'faov'
  | 'materiales'
  | 'otros';

export interface ClinicExpense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  providerName: string;
  providerDocument?: string;
  patientId?: string;
  patientName?: string;
  invoiceNumber?: string;
  controlNumberSeniat?: string;
  paymentReference?: string;
  receiptFolio?: string;
  notes?: string;
  receiverSignatureDataUrl?: string;
  amountUsd: number;
  amountBs: number;
  paymentMethod: string;
  status: 'pagado' | 'pendiente';
  monthCorrelation: string; // e.g. "2026-11"
  receiptUrl?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'unidad_dental' | 'compresor' | 'rayos_x' | 'autoclave' | 'lampara_fotocurado' | 'pieza_mano' | 'otro';
  purchasePriceUsd: number;
  purchaseDate: string;
  usefulLifeYears: number; // e.g., 5 or 10 years
  monthlyDepreciationUsd: number;
  hourlyDepreciationUsd: number; // based on monthly operating hours (e.g. 160h)
}

export interface HourlyOperatingCost {
  monthlyFixedExpensesUsd: number;
  monthlyOperatingHours: number; // e.g. 160 hrs
  fixedCostPerHourUsd: number;
  equipmentDepreciationPerHourUsd: number;
  totalCostPerHourUsd: number;
  totalCostPerMinuteUsd: number;
}

export interface SoftwareImportPatient {
  name: string;
  firstName?: string;
  lastName?: string;
  cedula: string;
  phone: string;
  email: string;
  balance: number;
  historyNumber?: string;
  admissionDate?: string;
  lastAppointmentDate?: string;
  doctorName?: string;
  consultationReason?: string;
  sourceSoftware: 'Dentalink' | 'RhOdont' | 'DentalApp' | 'Dentidesk' | 'Excel/CSV' | 'PDF';
}

export interface CuotaItem {
  number: number;
  dueDate: string;
  amountUsd: number;
  paidUsd: number;
  status: 'pendiente' | 'vencida' | 'pagada';
  paidDate?: string;
}

export interface InstallmentPlan {
  id: string;
  patientId: string;
  patientName: string;
  budgetId?: string;
  budgetFolio?: string;
  title: string;
  totalUsd: number;
  cuotas: CuotaItem[];
  createdAt: string;
}

export interface IntakeFormField {
  id: string;
  section: string;
  label: string;
  type: 'text' | 'checkbox' | 'textarea' | 'select' | 'date';
  required?: boolean;
  options?: string[];
}

export interface IntakeFormTemplate {
  id: string;
  name: string;
  description: string;
  fields: IntakeFormField[];
}

export interface IntakeSubmission {
  id: string;
  templateId: string;
  templateName: string;
  patientName: string;
  cedula: string;
  phone: string;
  email: string;
  birthDate?: string;
  allergies?: string;
  systemicConditions?: string;
  answers: Record<string, string | boolean>;
  signatureDataUrl?: string;
  submittedAt: string;
  status: 'pendiente_revision' | 'paciente_creado';
}

export interface ExchangeRateLog {
  id: string;
  date: string;
  rate: number;
  eurRate?: number;
  binanceRate?: number;
  source: string;
}

export interface MultiCurrencyRates {
  usdBcv: number;
  eurBcv: number;
  binanceUsdt: number;
  autoSyncEnabled: boolean;
  lastUpdated: string;
  sourceLabel: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  box?: BoxType | 'TODOS';
  doctorName?: string;
  reason: string;
}

export interface DoctorLiquidation {
  id: string;
  doctorId: string;
  doctorName: string;
  periodStart: string;
  periodEnd: string;
  collectedUsd: number;
  commissionPercent: number;
  payoutUsd: number;
  clinicShareUsd: number;
  proceduresCount: number;
  createdAt: string;
  status: 'borrador' | 'liquidado';
}

export interface ClinicConfig {
  clinicName: string;
  rif: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  waCountryCode: string;
  waTemplateReminder: string;
  igftRate: number;
  publicQrBaseUrl?: string;
}

export type RolePermissionMatrix = Record<Role, Record<string, boolean>>;

export type CashClosingPeriod = 'diario' | 'semanal' | 'mensual';

export interface CashClosingRecord {
  id: string;
  folio: string;
  period: CashClosingPeriod;
  referenceDate: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  cashierName: string;
  receiptsCount: number;
  invoicesCount: number;
  expensesCount: number;
  labExpensesCount?: number;
  totalCollectedUsd: number;
  totalCollectedBs: number;
  totalExpensesUsd: number;
  totalExpensesBs: number;
  labExpensesUsd?: number;
  labExpensesBs?: number;
  netBalanceUsd: number;
  netBalanceBs: number;
  expectedCashUsd: number;
  countedCashUsd: number;
  cashDifferenceUsd: number;
  methodTotalsUsd: Record<string, number>;
  notes?: string;
}

