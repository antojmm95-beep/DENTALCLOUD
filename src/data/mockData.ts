import { 
  Patient, 
  Appointment, 
  TreatmentCatalogItem, 
  Budget, 
  PaymentReceipt, 
  ClinicalEvolutionEntry, 
  MedicalPrescription, 
  InformedConsent, 
  WhatsAppReminder, 
  ToothCondition,
  SecuenciaTratamiento,
  ClinicalImage,
  Doctor,
  FacturaElectronicaSeniat,
  ClinicExpense,
  EquipmentItem,
  DescartableProduct,
  InstallmentPlan,
  IntakeFormTemplate,
  IntakeSubmission,
  ExchangeRateLog,
  BlockedSlot,
  DoctorLiquidation,
  ClinicConfig,
  RolePermissionMatrix,
  CashClosingRecord,
  OdontogramControlEntry
} from '../types/dental';
import { CORONA_SEED_PATIENTS } from './coronaPatientsSeed';

export const INITIAL_PATIENTS: Patient[] = CORONA_SEED_PATIENTS;

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const RHSISTEMA_AREAS = [
  '1 - PREVENTIVA Y GENERAL',
  '2 - ENDODONCIA',
  '3 - PERIODONCIA',
  '4 - ORTODONCIA',
  '5 - RESTAURADORA Y PROTESIS',
  '6 - CIRUGIA',
  '7 - RADIOGRAFIAS',
  '8 - ODONTOPEDIATRIA',
  '9 - ESTETICA',
  '10 - MEDICINA BUCAL',
  '11 - LASER ASISTIDA',
  '12 - VIRTUAL',
  '13 - WATERPIK'
] as const;

export const TREATMENT_PHASES_META = [
  { id: 'fase_inicial', label: 'Fase Inicial (Higiene & Control)', desc: 'Profilaxis, raspado, tartrectomía y motivación' },
  { id: 'fase_quirurgica', label: 'Fase Quirúrgica', desc: 'Exodoncias simples y complejas, cirugías periodontales' },
  { id: 'fase_funcional_ortodoncia', label: 'Fase Funcional Ortodoncia', desc: 'Alineación, férula miorelajante, arcos y retenedores' },
  { id: 'fase_protesica', label: 'Fase Protésica & Rehabilitadora', desc: 'Coronas, carillas estéticas, prótesis y rehabilitación oral' },
  { id: 'fase_mantenimiento', label: 'Fase Mantenimiento', desc: 'Controles periódicos semestrales y profilaxis preventiva' },
] as const;

export interface DetailedCatalogItem {
  id: string;
  code: string;
  name: string;
  area: string;
  suggestedPhase: 'fase_inicial' | 'fase_quirurgica' | 'fase_funcional_ortodoncia' | 'fase_protesica' | 'fase_mantenimiento';
  basePrice: number;
}

export const DETAILED_TREATMENT_CATALOG: DetailedCatalogItem[] = [
  // 1 - PREVENTIVA Y GENERAL
  { id: 'tc-0001', code: '0001', name: '0001 - TARTRECTOMIA Y PULIDO', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 35 },
  { id: 'tc-0199', code: '0199', name: '0199 - TARTRECTOMIA Y PULIDO MODERADA', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 40 },
  { id: 'tc-0200', code: '0200', name: '0200 - TARTRECTOMIA Y PULIDO AVANZADA', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 50 },
  { id: 'tc-0277', code: '0277', name: '0277 - CONSULTA / EVALUACION CLINICA', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 30 },
  { id: 'tc-0308', code: '0308', name: '0308 - AJUSTE OCLUSAL Y PULIDO', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_funcional_ortodoncia', basePrice: 25 },
  { id: 'tc-0002', code: '0002', name: '0002 - CARIES INICIAL (RESINA 1 CARA)', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 35 },
  { id: 'tc-0003', code: '0003', name: '0003 - CARIES MODERADA (RESINA 2 CARAS)', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 45 },
  { id: 'tc-0004', code: '0004', name: '0004 - CARIES AVANZADA (RECONSTRUCCION)', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 60 },
  { id: 'tc-0077', code: '0077', name: '0077 - IONÓMERO DE VIDRIO', area: '1 - PREVENTIVA Y GENERAL', suggestedPhase: 'fase_inicial', basePrice: 40 },

  // 2 - ENDODONCIA
  { id: 'tc-0009', code: '0009', name: '0009 - ENDODONCIA MONORADICULAR', area: '2 - ENDODONCIA', suggestedPhase: 'fase_inicial', basePrice: 120 },
  { id: 'tc-0010', code: '0010', name: '0010 - ENDODONCIA BIRRADICULAR', area: '2 - ENDODONCIA', suggestedPhase: 'fase_inicial', basePrice: 150 },
  { id: 'tc-0011', code: '0011', name: '0011 - ENDODONCIA MULTIRRADICULAR', area: '2 - ENDODONCIA', suggestedPhase: 'fase_inicial', basePrice: 190 },
  { id: 'tc-0339', code: '0339', name: '0339 - PROVISIONAL ENDODONTICO', area: '2 - ENDODONCIA', suggestedPhase: 'fase_inicial', basePrice: 25 },

  // 3 - PERIODONCIA
  { id: 'tc-0224', code: '0224', name: '0224 - CUELLOS EXPUESTOS / DESENSIBILIZACION', area: '3 - PERIODONCIA', suggestedPhase: 'fase_inicial', basePrice: 35 },
  { id: 'tc-0041', code: '0041', name: '0041 - RASPADO Y ALISADO POR CUADRANTE', area: '3 - PERIODONCIA', suggestedPhase: 'fase_inicial', basePrice: 60 },

  // 4 - ORTODONCIA
  { id: 'tc-0012', code: '0012', name: '0012 - FERULA MIORELAJANTE', area: '4 - ORTODONCIA', suggestedPhase: 'fase_funcional_ortodoncia', basePrice: 95 },
  { id: 'tc-0296', code: '0296', name: '0296 - RETENEDORES (PAR)', area: '4 - ORTODONCIA', suggestedPhase: 'fase_funcional_ortodoncia', basePrice: 80 },
  { id: 'tc-0375', code: '0375', name: '0375 - RETIRO DE ORTODONCIA', area: '4 - ORTODONCIA', suggestedPhase: 'fase_funcional_ortodoncia', basePrice: 50 },

  // 5 - RESTAURADORA Y PROTESIS
  { id: 'tc-0144', code: '0144', name: '0144 - CLASE V', area: '5 - RESTAURADORA Y PROTESIS', suggestedPhase: 'fase_protesica', basePrice: 45 },
  { id: 'tc-0175', code: '0175', name: '0175 - CEMENTADO DE CORONA', area: '5 - RESTAURADORA Y PROTESIS', suggestedPhase: 'fase_protesica', basePrice: 30 },
  { id: 'tc-0197', code: '0197', name: '0197 - CARILLA DE RESINA', area: '5 - RESTAURADORA Y PROTESIS', suggestedPhase: 'fase_protesica', basePrice: 70 },
  { id: 'tc-0210', code: '0210', name: '0210 - CORONA LIBRE DE METAL ZIRCONIO', area: '5 - RESTAURADORA Y PROTESIS', suggestedPhase: 'fase_protesica', basePrice: 280 },

  // 6 - CIRUGIA
  { id: 'tc-0005', code: '0005', name: '0005 - EXODONCIA SIMPLE', area: '6 - CIRUGIA', suggestedPhase: 'fase_quirurgica', basePrice: 45 },
  { id: 'tc-0006', code: '0006', name: '0006 - EXODONCIA COMPLEJA', area: '6 - CIRUGIA', suggestedPhase: 'fase_quirurgica', basePrice: 80 },
  { id: 'tc-0007', code: '0007', name: '0007 - CIRUGIA TERCER MOLAR RETENIDO', area: '6 - CIRUGIA', suggestedPhase: 'fase_quirurgica', basePrice: 130 },

  // 7 - RADIOGRAFIAS
  { id: 'tc-0040', code: '0040', name: '0040 - TOMA DE RX PERIAPICAL', area: '7 - RADIOGRAFIAS', suggestedPhase: 'fase_inicial', basePrice: 15 },
  { id: 'tc-0214', code: '0214', name: '0214 - PANORAMICA DIGITAL', area: '7 - RADIOGRAFIAS', suggestedPhase: 'fase_inicial', basePrice: 35 },

  // 9 - ESTETICA
  { id: 'tc-0013', code: '0013', name: '0013 - TOXINA BOTULINICA FACIAL', area: '9 - ESTETICA', suggestedPhase: 'fase_protesica', basePrice: 180 },
  { id: 'tc-0014', code: '0014', name: '0014 - TOXINA BOTULINICA TERAPEUTICO', area: '9 - ESTETICA', suggestedPhase: 'fase_funcional_ortodoncia', basePrice: 220 },
  { id: 'tc-0015', code: '0015', name: '0015 - FULL FACE TOXINA BOTULINICA', area: '9 - ESTETICA', suggestedPhase: 'fase_protesica', basePrice: 350 }
];

export const TREATMENT_CATALOG: TreatmentCatalogItem[] = [
  { id: 'cat-1', code: 'DIAG-01', name: 'Evaluación y Diagnóstico Clínico + Rx Periapical', category: 'Diagnóstico', basePrice: 30 },
  { id: 'cat-2', code: 'OPER-01', name: 'Restauración Resina Fotocurada (1 Cara)', category: 'Operatoria', basePrice: 40 },
  { id: 'cat-3', code: 'OPER-02', name: 'Restauración Resina Fotocurada Compuesta (2 Caras)', category: 'Operatoria', basePrice: 55 },
  { id: 'cat-4', code: 'OPER-03', name: 'Reconstrucción Estética Resina de Alta Estética', category: 'Operatoria', basePrice: 75 },
  { id: 'cat-5', code: 'ENDO-01', name: 'Tratamiento de Conducto Unirradicular', category: 'Endodoncia', basePrice: 120 },
  { id: 'cat-6', code: 'ENDO-02', name: 'Tratamiento de Conducto Molar Multirradicular', category: 'Endodoncia', basePrice: 190 },
  { id: 'cat-7', code: 'PERIO-01', name: 'Profilaxis Dental Ultrasónica y Aeropulido', category: 'Periodoncia', basePrice: 45 },
  { id: 'cat-8', code: 'PERIO-02', name: 'Raspado y Alisado Radicular por Cuadrante', category: 'Periodoncia', basePrice: 60 },
  { id: 'cat-9', code: 'CIR-01', name: 'Exodoncia Simple de Pieza Dental', category: 'Cirugía', basePrice: 45 },
  { id: 'cat-10', code: 'CIR-02', name: 'Cirugía Exodoncia Tercer Molar Incluido', category: 'Cirugía', basePrice: 130 },
  { id: 'cat-11', code: 'PROT-01', name: 'Corona de Porcelana Libre de Metal (Zirconio)', category: 'Prótesis', basePrice: 280 },
  { id: 'cat-12', code: 'EST-01', name: 'Blanqueamiento Dental LED en Consultorio', category: 'Estética', basePrice: 150 },
  { id: 'cat-13', code: 'ORTO-01', name: 'Control Mensual de Ortodoncia', category: 'Ortodoncia', basePrice: 35 }
];

export const INITIAL_ODONTOGRAMS: Record<string, Record<number, ToothCondition>> = {};

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_PAYMENTS: PaymentReceipt[] = [];

export const INITIAL_EVOLUTIONS: ClinicalEvolutionEntry[] = [];

export const INITIAL_PRESCRIPTIONS: MedicalPrescription[] = [];

export const CONSENT_TEMPLATES: Record<string, { title: string; text: string; risks: string[] }> = {
  exodoncia: {
    title: 'Consentimiento Informado para Exodoncia y Cirugía Oral',
    text: 'He sido informado(a) de forma clara y suficiente sobre el diagnóstico, la naturaleza de la condición o enfermedad que padece el paciente y su evolución natural, los objetivos de los tratamientos propuestos, alternativas, consecuencias derivadas, beneficios y riesgos comunes de la intervención.',
    risks: [
      'Dolor, inflamación y hematoma en la zona quirúrgica durante los primeros días.',
      'Hemorragia leve postoperatoria controlable con compresión de gasa.',
      'Alveolitis seca (infección o pérdida del coágulo) en caso de no seguir las pautas de reposo y no fumar.',
      'Posible parestesia o adormecimiento transitorio en labios o lengua en exodoncias de molares inferiores.'
    ]
  },
  terceros_molares: {
    title: 'Consentimiento Informado · Odontectomía de Terceros Molares',
    text: 'He sido informado(a) que el tratamiento consiste en la extracción quirúrgica del/los terceros molares, pudiendo incluir anestesia local y/o sedación, incisión y levantamiento de colgajo, osteotomía, odontosección, regularización del lecho quirúrgico, sutura e indicaciones postoperatorias.',
    risks: [
      'Dolor, inflamación (edema), trismus (limitación de apertura bucal) y hematoma postoperatorio.',
      'Infección postoperatoria o alveolitis (dolor intenso por pérdida del coágulo).',
      'Comunicación bucosinusal y/o sinusitis en molares superiores.',
      'Alteración sensitiva (hormigueo, adormecimiento) del labio, mentón o lengua por cercanía a nervios (alveolar inferior o lingual), temporal o raramente permanente.'
    ]
  },
  endodoncia: {
    title: 'Consentimiento Informado para Tratamiento de Conducto (Endodoncia)',
    text: 'Por medio del presente documento autorizo al equipo clínico la realización del tratamiento endodóntico en la(s) pieza(s) indicada(s). Entiendo que este procedimiento busca salvar la pieza dental natural eliminando el tejido pulpar infectado o inflamado irreversiblemente.',
    risks: [
      'Molestia o sensibilidad post-operatoria a la percusión durante 48 a 72 horas.',
      'Posibilidad de fractura de instrumentos finos en conductos estrechos o calcificados.',
      'Fragilidad posterior de la pieza que ameritará restauración definitiva (incrustación o corona).'
    ]
  },
  operatoria: {
    title: 'Consentimiento Informado para Operatoria Dental y Restauraciones Estéticas',
    text: 'Doy mi conformidad para la realización de limpiezas cavitarias y obturaciones con resinas compuestas de fotocurado. Se me ha explicado el color, técnica de adhesión y pronóstico.',
    risks: [
      'Sensibilidad térmica transitoria al frío o calor durante los primeros días post-operatorios.',
      'Necesidad de ajuste oclusal si se percibe contacto alto al morder.',
      'Si la caries era excesivamente profunda, posible necesidad futura de tratamiento de conducto.'
    ]
  },
  implantes: {
    title: 'Consentimiento Informado para Colocación de Implantes Dentales',
    text: 'Autorizo la intervención quirúrgica en tres fases (Quirúrgica, Tornillo de Cicatrización y Fase Protésica) para la inserción de implante(s) de titanio biocompatible en el hueso maxilar o mandibular para posterior rehabilitación protésica.',
    risks: [
      'Cada caso es individualizado y los tiempos de las fases pueden variar según osteointegración y valoración clínica.',
      'Necesidad de injerto óseo u otro procedimiento reconstructivo si la altura o ancho óseo disponible es insuficiente.',
      'Riesgo biológico de no osteointegración, inflamación o infección postquirúrgica.',
      'Requiere control anual con protesista y cirujano y resguardo de etiquetas de identificación del implante.'
    ]
  },
  blanqueamiento: {
    title: 'Consentimiento Informado para Blanqueamiento Dental en Clínica',
    text: 'Acepto el tratamiento de aclaramiento dental mediante geles de peróxido de hidrógeno activados por luz LED. Comprendo que el grado de blanqueamiento depende de factores intrínsecos de mis dientes.',
    risks: [
      'Sensibilidad dental transitoria durante 24 a 48 horas post-sesión.',
      'Irritación gingival leve transitoria.',
      'Las resinas o coronas previas no cambian de color y podrían requerir recambio estético posterior.'
    ]
  }
};

export const INITIAL_CONSENTS: InformedConsent[] = [];

export const INITIAL_WA_REMINDERS: WhatsAppReminder[] = [];

export const DENTAL_VADEMECUM = [
  { name: 'Amoxicilina', presentation: 'Cápsulas 500 mg', defaultDose: '1 cápsula', defaultFreq: 'Cada 8 horas', defaultDur: 'Por 7 días', instructions: 'Tomar con un vaso con agua al inicio de comidas. Completar el ciclo.' },
  { name: 'Amoxicilina + Ácido Clavulánico', presentation: 'Comprimidos 875/125 mg', defaultDose: '1 comprimido', defaultFreq: 'Cada 12 horas', defaultDur: 'Por 7 días', instructions: 'En infecciones moderadas o severas con foco periapical o celulitis.' },
  { name: 'Ibuprofeno', presentation: 'Tabletas 600 mg', defaultDose: '1 tableta', defaultFreq: 'Cada 8 horas', defaultDur: 'Por 3 a 5 días', instructions: 'Antiinflamatorio y analgésico. Tomar con alimentos.' },
  { name: 'Ketorolaco Trometamina', presentation: 'Tabletas Sublinguales 10 mg', defaultDose: '1 tableta sublingual', defaultFreq: 'Cada 8 horas', defaultDur: 'Máximo por 3 días', instructions: 'Dejar disolver debajo de la lengua. Dolor agudo post-quirúrgico.' },
  { name: 'Dexketoprofeno', presentation: 'Comprimidos 25 mg', defaultDose: '1 comprimido', defaultFreq: 'Cada 8 horas', defaultDur: 'Por 3 días', instructions: 'Rápido inicio analgésico post-exodoncia.' },
  { name: 'Paracetamol (Acetaminofén)', presentation: 'Tabletas 500 mg / 1 g', defaultDose: '1 tableta (500mg o 1g)', defaultFreq: 'Cada 6 a 8 horas', defaultDur: 'Según dolor', instructions: 'De elección en pacientes alérgicos a AINEs o hipertensos.' },
  { name: 'Clorhexidina Digluconato 0.12%', presentation: 'Enjuague bucal 250 ml', defaultDose: '15 ml sin diluir', defaultFreq: 'Cada 12 horas', defaultDur: 'Por 7 a 10 días', instructions: 'Enjuagar por 60 segundos tras el cepillado. No enjuagar con agua después.' }
];

export const INITIAL_SECUENCIA_TRATAMIENTOS: SecuenciaTratamiento[] = [];

export const INITIAL_CLINICAL_IMAGES: ClinicalImage[] = [];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Antonio Morera',
    specialty: 'Odontología Integral & Prótesis',
    colegiado: 'COV-21870',
    mpps: 'MPPS-98412',
    rif: 'V-15165183-2',
    email: 'nanigrippaforense@gmail.com',
    phone: '+58 424 2140058',
    commissionPercentage: 70,
    assignedBox: 'Consultorio 1',
    status: 'activo',
    patientsTreatedCount: 142,
    monthlyProduction: 4850
  },
  {
    id: 'doc-2',
    name: 'Dr. Alejandro Morera',
    specialty: 'Cirugía Bucal & Maxilofacial',
    colegiado: 'COV-19432',
    mpps: 'MPPS-87321',
    rif: 'V-14238912-1',
    email: 'alejandro.morera@clinicacorona.com',
    phone: '+58 414 3298172',
    commissionPercentage: 65,
    assignedBox: 'Consultorio 2',
    status: 'activo',
    patientsTreatedCount: 98,
    monthlyProduction: 3920
  },
  {
    id: 'doc-3',
    name: 'Dra. Dayana Ortega',
    specialty: 'Ortodoncia & Ortopedia Dentofacial',
    colegiado: 'COV-24519',
    mpps: 'MPPS-104512',
    rif: 'V-20184912-5',
    email: 'dayana.ortega@clinicacorona.com',
    phone: '+58 412 8761234',
    commissionPercentage: 60,
    assignedBox: 'Consultorio 3',
    status: 'activo',
    patientsTreatedCount: 115,
    monthlyProduction: 3450
  },
  {
    id: 'doc-4',
    name: 'Dr. Ramses Acosta',
    specialty: 'Endodoncia Microscópica',
    colegiado: 'COV-22104',
    mpps: 'MPPS-91205',
    rif: 'V-18765432-8',
    email: 'ramses.acosta@clinicacorona.com',
    phone: '+58 416 5544332',
    commissionPercentage: 65,
    assignedBox: 'Consultorio 1',
    status: 'activo',
    patientsTreatedCount: 76,
    monthlyProduction: 2800
  }
];

export const INITIAL_SENIAT_INVOICES: FacturaElectronicaSeniat[] = [];

export const INITIAL_EXPENSES: ClinicExpense[] = [
  {
    id: 'exp-1',
    date: '2026-11-01',
    category: 'alquiler',
    description: 'Canon fijo de arrendamiento local comercial piso 2',
    providerName: 'Inmobiliaria Las Mercedes C.A.',
    invoiceNumber: 'FACT-00918',
    controlNumberSeniat: '00-01982',
    amountUsd: 800,
    amountBs: 718032,
    paymentMethod: 'Transferencia Bancaria',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-2',
    date: '2026-11-02',
    category: 'telefonia',
    description: 'Servicio de Internet Fibra Óptica 300Mbps + Telefonía fija',
    providerName: 'Inter Fibra / Cantv',
    invoiceNumber: 'INT-48201',
    amountUsd: 65,
    amountBs: 58340.10,
    paymentMethod: 'Pago Móvil',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-3',
    date: '2026-11-03',
    category: 'servicios_publicos',
    description: 'Servicio de Electricidad Comercial Trifásica',
    providerName: 'Corpoelec',
    invoiceNumber: 'NIC-918237',
    amountUsd: 45,
    amountBs: 40389.30,
    paymentMethod: 'Pago Móvil',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-4',
    date: '2026-11-04',
    category: 'contador',
    description: 'Honorarios profesionales Contabilidad mensual y Libros de Compra/Venta',
    providerName: 'Lcda. María Elena Rivas (CPC-48219)',
    invoiceNumber: 'HON-2026-11',
    amountUsd: 150,
    amountBs: 134631,
    paymentMethod: 'Transferencia Bancaria',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-5',
    date: '2026-11-05',
    category: 'alcaldia',
    description: 'Patente de Actividades Económicas y Aseo Urbano Fospuca',
    providerName: 'Alcaldía de Chacao / Fospuca',
    invoiceNumber: 'MUN-78192',
    controlNumberSeniat: '00-98127',
    amountUsd: 120,
    amountBs: 107704.80,
    paymentMethod: 'Punto de Venta',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-6',
    date: '2026-11-06',
    category: 'seniat',
    description: 'Declaración anticipada ISLR y Retenciones IGTF 3%',
    providerName: 'SENIAT Gerencia Regional',
    invoiceNumber: 'SENIAT-DECL-48291',
    amountUsd: 190,
    amountBs: 170532.60,
    paymentMethod: 'Transferencia Portal SENIAT',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-7',
    date: '2026-11-07',
    category: 'ivss',
    description: 'Aporte Patronal Seguro Social Obligatorio (IVSS) Nómina clínica',
    providerName: 'Instituto Venezolano de los Seguros Sociales',
    invoiceNumber: 'TIUNA-48912',
    amountUsd: 55,
    amountBs: 49364.70,
    paymentMethod: 'Transferencia',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-8',
    date: '2026-11-08',
    category: 'inces',
    description: 'Aporte Trimestral INCES 2% patronal',
    providerName: 'INCES Sede Principal',
    invoiceNumber: 'INC-2026-Q4',
    amountUsd: 35,
    amountBs: 31413.90,
    paymentMethod: 'Transferencia',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-9',
    date: '2026-11-09',
    category: 'faov',
    description: 'Fondo de Ahorro Obligatorio para la Vivienda (FAOV)',
    providerName: 'Banavih',
    invoiceNumber: 'FAOV-91823',
    amountUsd: 30,
    amountBs: 26926.20,
    paymentMethod: 'Transferencia',
    status: 'pagado',
    monthCorrelation: '2026-11'
  },
  {
    id: 'exp-10',
    date: '2026-11-10',
    category: 'materiales',
    description: 'Insumos dentales: Anestesia Scandonest, Resinas Filtek, baberos, eyectores y guantes nitrilo',
    providerName: 'Depósito Dental Caracas C.A.',
    invoiceNumber: 'FACT-48190',
    controlNumberSeniat: '00-004812',
    amountUsd: 450,
    amountBs: 403893,
    paymentMethod: 'Zelle / Divisa',
    status: 'pagado',
    monthCorrelation: '2026-11'
  }
];

export const INITIAL_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-1',
    name: 'Unidad Dental Odontológica Integral (Sillón + Turbina + Lámpara LED)',
    category: 'unidad_dental',
    purchasePriceUsd: 4800,
    purchaseDate: '2023-01-15',
    usefulLifeYears: 10,
    monthlyDepreciationUsd: 40.00,
    hourlyDepreciationUsd: 0.25
  },
  {
    id: 'eq-2',
    name: 'Compresor Silencioso Libre de Aceite Grado Médico 2HP',
    category: 'compresor',
    purchasePriceUsd: 1200,
    purchaseDate: '2023-03-20',
    usefulLifeYears: 8,
    monthlyDepreciationUsd: 12.50,
    hourlyDepreciationUsd: 0.08
  },
  {
    id: 'eq-3',
    name: 'Equipo de Rayos X Intraoral Portátil + Sensor Digital HD',
    category: 'rayos_x',
    purchasePriceUsd: 2500,
    purchaseDate: '2024-02-10',
    usefulLifeYears: 5,
    monthlyDepreciationUsd: 41.67,
    hourlyDepreciationUsd: 0.26
  },
  {
    id: 'eq-4',
    name: 'Autoclave Digital Clase B 18L Esterilización Hospitalaria',
    category: 'autoclave',
    purchasePriceUsd: 1800,
    purchaseDate: '2023-06-01',
    usefulLifeYears: 6,
    monthlyDepreciationUsd: 25.00,
    hourlyDepreciationUsd: 0.16
  },
  {
    id: 'eq-5',
    name: 'Lámpara de Fotocurado LED Alta Potencia (2 Unidades)',
    category: 'lampara_fotocurado',
    purchasePriceUsd: 300,
    purchaseDate: '2024-05-18',
    usefulLifeYears: 3,
    monthlyDepreciationUsd: 8.33,
    hourlyDepreciationUsd: 0.05
  },
  {
    id: 'eq-6',
    name: 'Micromotor Eléctrico y Turbinas Neumáticas de Alta Velocidad',
    category: 'pieza_mano',
    purchasePriceUsd: 600,
    purchaseDate: '2024-08-12',
    usefulLifeYears: 3,
    monthlyDepreciationUsd: 16.67,
    hourlyDepreciationUsd: 0.10
  }
];

export const INITIAL_DESCARTABLES: DescartableProduct[] = [
  { id: 'desc-1', code: 101, name: 'Anestesia Cárpule Lidocaína 2% con Epinefrina 1:100.000', brand: 'New Stetic', specification: 'Cárpule de vidrio 1.8ml', price: 0.65, applications: 1, inventory: '180 cárpules', costPerUse: 0.65 },
  { id: 'desc-2', code: 102, name: 'Anestesia Mepivacaína 3% sin Vasoconstrictor (Scandonest)', brand: 'Septodont', specification: 'Cárpule 1.8ml pacientes hipertensos', price: 0.90, applications: 1, inventory: '95 cárpules', costPerUse: 0.90 },
  { id: 'desc-3', code: 103, name: 'Aguja Dental Descartable Corta 30G', brand: 'Septodont', specification: 'Calibre 30G x 21mm', price: 0.15, applications: 1, inventory: '240 unidades', costPerUse: 0.15 },
  { id: 'desc-4', code: 104, name: 'Aguja Dental Descartable Larga 27G Troncular', brand: 'Septodont', specification: 'Calibre 27G x 32mm', price: 0.15, applications: 1, inventory: '180 unidades', costPerUse: 0.15 },
  { id: 'desc-5', code: 105, name: 'Resina Compuesta Filtek Z350 XT Nanoparticulada', brand: '3M ESPE', specification: 'Jeringa 4g (A1, A2, A3, OA2)', price: 38.00, applications: 30, inventory: '14 jeringas', costPerUse: 1.27 },
  { id: 'desc-6', code: 106, name: 'Sistema Adhesivo Single Bond Universal con Silano', brand: '3M ESPE', specification: 'Frasco 5ml fotocurado', price: 45.00, applications: 60, inventory: '6 frascos', costPerUse: 0.75 },
  { id: 'desc-7', code: 107, name: 'Ácido Fosfórico Grabador 37% Ultra-Etch', brand: 'Ultradent', specification: 'Jeringa 1.2ml con puntas dispensadoras', price: 12.00, applications: 25, inventory: '18 jeringas', costPerUse: 0.48 },
  { id: 'desc-8', code: 108, name: 'Dique de Goma Azul Sin Látex Mediano', brand: 'Sanctuary', specification: 'Caja 36 hojas 6x6 pulgadas', price: 18.00, applications: 36, inventory: '8 cajas', costPerUse: 0.50 },
  { id: 'desc-9', code: 109, name: 'Clamps Dentales de Acero Inoxidable (Amortización)', brand: 'Hu-Friedy', specification: 'Set molares y premolares', price: 20.00, applications: 200, inventory: '24 clamps', costPerUse: 0.10 },
  { id: 'desc-10', code: 110, name: 'Eyector de Saliva Descartable Desechable c/Filtro', brand: 'Crosstex', specification: 'Paquete 100 unidades translúcido', price: 8.00, applications: 100, inventory: '900 unidades', costPerUse: 0.08 },
  { id: 'desc-11', code: 111, name: 'Babero Odontológico Plastificado Triple Capa + Servilleta', brand: 'Medicom', specification: 'Impermeable alta absorción', price: 0.12, applications: 1, inventory: '450 unidades', costPerUse: 0.12 },
  { id: 'desc-12', code: 112, name: 'Guantes de Nitrilo Quirúrgico No Estériles Sin Talco', brand: 'Unigloves', specification: 'Par azul cobalto tallas S/M', price: 0.40, applications: 1, inventory: '8 cajas (800u)', costPerUse: 0.40 },
  { id: 'desc-13', code: 113, name: 'Mascarilla Quirúrgica Termosellada Triple Capa BFE 98%', brand: '3M', specification: 'Ajuste nasal elásticos suaves', price: 0.10, applications: 1, inventory: '500 unidades', costPerUse: 0.10 },
  { id: 'desc-14', code: 114, name: 'Gorro y Cubre-Zapatos Descartables Enfermería', brand: 'Diprofa', specification: 'Tela no tejida hipoalergénica', price: 0.10, applications: 1, inventory: '350 unidades', costPerUse: 0.10 },
  { id: 'desc-15', code: 115, name: 'Vaso Plástico Descartable Clínico 5oz', brand: 'Selva', specification: 'Paquete 100 vasos', price: 4.00, applications: 100, inventory: '12 paquetes', costPerUse: 0.04 },
  { id: 'desc-16', code: 116, name: 'Puntas Mezcladoras para Silicona de Adición Automix', brand: 'Zhermack', specification: 'Amarillas / Azules relación 1:1', price: 0.55, applications: 1, inventory: '120 unidades', costPerUse: 0.55 },
  { id: 'desc-17', code: 117, name: 'Pasta Profiláctica Cleanic con Fluoruro de Sodio', brand: 'Kerr', specification: 'Pote 100g sabor menta', price: 14.00, applications: 40, inventory: '5 potes', costPerUse: 0.35 },
  { id: 'desc-18', code: 118, name: 'Cepillos Profilácticos y Copas de Goma Mandril', brand: 'TDV', specification: 'Cerdas nylon suaves', price: 0.30, applications: 1, inventory: '160 unidades', costPerUse: 0.30 },
  { id: 'desc-19', code: 119, name: 'Discos y Tiras de Pulido Sof-Lex Diamantados', brand: '3M ESPE', specification: 'Grano fino y extra-fino', price: 0.25, applications: 1, inventory: '200 unidades', costPerUse: 0.25 },
  { id: 'desc-20', code: 120, name: 'Cemento Resinoso RelyX U200 Auto-Adhesivo', brand: '3M ESPE', specification: 'Clicker 11g pasta-pasta', price: 75.00, applications: 25, inventory: '3 clickers', costPerUse: 3.00 },
  { id: 'desc-21', code: 121, name: 'Conos de Gutapercha y Puntas de Papel Calibradas', brand: 'Meta Biomed', specification: 'Segunda serie 15-40 / conicidad .04', price: 16.00, applications: 20, inventory: '12 cajas', costPerUse: 0.80 },
  { id: 'desc-22', code: 122, name: 'Fresas de Diamante y Carburo Tungsteno (Desgaste/Amortización)', brand: 'Komet / Jota', specification: 'Turbina alta velocidad FG', price: 3.00, applications: 5, inventory: '60 fresas', costPerUse: 0.60 }
];

export const INITIAL_INSTALLMENT_PLANS: InstallmentPlan[] = [];

export const INITIAL_INTAKE_TEMPLATES: IntakeFormTemplate[] = [
  {
    id: 'tpl-anamnesis-general',
    name: 'Ficha de Ingreso & Anamnesis Clínica Integral',
    description: 'Cuestionario médico-odontológico previo a primera consulta con firma digital en sala o WhatsApp.',
    fields: [
      { id: 'f-motivo', section: 'Motivo de Consulta', label: 'Motivo principal de su visita hoy', type: 'select', required: true, options: ['Control preventivo', 'Dolor dental agudo', 'Estética / Blanqueamiento', 'Ortodoncia', 'Prótesis / Implantes', 'Urgencia'] },
      { id: 'f-dolor-frio', section: 'Antecedentes Dentales', label: '¿Presenta sensibilidad o dolor al frío/calor?', type: 'checkbox' },
      { id: 'f-sangrado', section: 'Antecedentes Dentales', label: '¿Le sangran las encías al cepillarse?', type: 'checkbox' },
      { id: 'f-bruxismo', section: 'Antecedentes Dentales', label: '¿Aprieta o rechina los dientes al dormir?', type: 'checkbox' },
      { id: 'f-hipertension', section: 'Antecedentes Médicos', label: 'Hipertensión Arterial / Cardiopatía', type: 'checkbox' },
      { id: 'f-diabetes', section: 'Antecedentes Médicos', label: 'Diabetes Mellitus', type: 'checkbox' },
      { id: 'f-embarazo', section: 'Antecedentes Médicos', label: '¿Se encuentra embarazada o en lactancia?', type: 'checkbox' },
      { id: 'f-medicamentos', section: 'Medicación y Alergias', label: 'Medicamentos que toma actualmente', type: 'textarea' },
      { id: 'f-notas', section: 'Observaciones', label: 'Comentarios adicionales para el odontólogo', type: 'textarea' }
    ]
  },
  {
    id: 'tpl-pediatria',
    name: 'Ficha Odontopediátrica (Menores de Edad)',
    description: 'Evaluación para pacientes infantiles con datos del representante y hábitos orales.',
    fields: [
      { id: 'f-repres', section: 'Representante Legal', label: 'Nombre completo del padre/madre o representante', type: 'text', required: true },
      { id: 'f-biberon', section: 'Hábitos Infantiles', label: '¿Usa chupón o biberón nocturno?', type: 'checkbox' },
      { id: 'f-succion', section: 'Hábitos Infantiles', label: '¿Presenta succión digital o respiración bucal?', type: 'checkbox' },
      { id: 'f-primera-vez', section: 'Antecedentes', label: '¿Es su primera experiencia odontológica?', type: 'checkbox' }
    ]
  }
];

export const INITIAL_INTAKE_SUBMISSIONS: IntakeSubmission[] = [];

export const INITIAL_RATE_HISTORY: ExchangeRateLog[] = [
  { id: 'rate-1', date: '2026-11-12 08:30', rate: 897.54, source: 'BCV Oficial (Apertura)' },
  { id: 'rate-2', date: '2026-11-11 13:00', rate: 894.20, source: 'BCV Oficial (Cierre)' },
  { id: 'rate-3', date: '2026-11-10 09:00', rate: 890.15, source: 'BCV Oficial' }
];

export const INITIAL_BLOCKED_SLOTS: BlockedSlot[] = [
  {
    id: 'blk-1',
    date: new Date().toISOString().split('T')[0],
    startTime: '12:30',
    endTime: '13:30',
    box: 'TODOS',
    doctorName: 'Todos',
    reason: 'Receso de Almuerzo & Esterilización Autoclave'
  }
];

export const INITIAL_LIQUIDATIONS: DoctorLiquidation[] = [
  {
    id: 'liq-1',
    doctorId: 'doc-1',
    doctorName: 'Dr. Antonio Morera',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    collectedUsd: 4850,
    commissionPercent: 70,
    payoutUsd: 3395,
    clinicShareUsd: 1455,
    proceduresCount: 64,
    createdAt: '2026-11-01',
    status: 'liquidado'
  },
  {
    id: 'liq-2',
    doctorId: 'doc-2',
    doctorName: 'Dr. Alejandro Morera',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    collectedUsd: 3920,
    commissionPercent: 65,
    payoutUsd: 2548,
    clinicShareUsd: 1372,
    proceduresCount: 41,
    createdAt: '2026-11-01',
    status: 'liquidado'
  }
];

export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
  clinicName: 'Clínica Odontológica Corona',
  rif: 'J-31298456-0',
  phone: '0212-6830229 / 0426-4042305',
  email: 'contacto@clinicacorona.com',
  address: 'Ciudad Tiuna, Complejo Urbanístico Simón Bolívar, Av. Principal, Torre A11 PB Local L2, Fuerte Tiuna - Caracas',
  logoUrl: '',
  waCountryCode: '58',
  waTemplateReminder: '¡Hola {paciente}! 👋 Te recordamos tu cita en *{clinica}* el día *{fecha}* a las *{hora}* con *{doctor}* ({box}). Por favor confirma tu asistencia respondiendo este mensaje.',
  igftRate: 3,
  publicQrBaseUrl: ''
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMatrix = {
  admin: {
    ver_tablero: true,
    gestionar_agendas: true,
    editar_historia: true,
    odontograma_3d: true,
    crear_presupuestos: true,
    cobrar_caja_seniat: true,
    gestionar_cuotas: true,
    editar_tabulador: true,
    ver_liquidaciones: true,
    configurar_clinica: true
  },
  doctor: {
    ver_tablero: true,
    gestionar_agendas: true,
    editar_historia: true,
    odontograma_3d: true,
    crear_presupuestos: true,
    cobrar_caja_seniat: false,
    gestionar_cuotas: false,
    editar_tabulador: false,
    ver_liquidaciones: true,
    configurar_clinica: false
  },
  recepcion: {
    ver_tablero: true,
    gestionar_agendas: true,
    editar_historia: false,
    odontograma_3d: false,
    crear_presupuestos: true,
    cobrar_caja_seniat: true,
    gestionar_cuotas: true,
    editar_tabulador: false,
    ver_liquidaciones: false,
    configurar_clinica: false
  },
  paciente: {
    ver_tablero: false,
    gestionar_agendas: false,
    editar_historia: false,
    odontograma_3d: false,
    crear_presupuestos: false,
    cobrar_caja_seniat: false,
    gestionar_cuotas: false,
    editar_tabulador: false,
    ver_liquidaciones: false,
    configurar_clinica: false
  }
};

export const INITIAL_CASH_CLOSINGS: CashClosingRecord[] = [
  {
    id: 'close-1',
    folio: 'CIE-2026-001',
    period: 'mensual',
    referenceDate: '2026-10-31',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    createdAt: '2026-10-31 18:15',
    cashierName: 'Carolina Méndez',
    receiptsCount: 1,
    invoicesCount: 0,
    expensesCount: 0,
    totalCollectedUsd: 190,
    totalCollectedBs: 170532.6,
    totalExpensesUsd: 0,
    totalExpensesBs: 0,
    netBalanceUsd: 190,
    netBalanceBs: 170532.6,
    expectedCashUsd: 0,
    countedCashUsd: 0,
    cashDifferenceUsd: 0,
    methodTotalsUsd: {
      tarjeta_debito: 190
    },
    notes: 'Cierre mensual octubre 2026 verificado sin novedades.'
  }
];

export const INITIAL_ODONTOGRAM_CONTROLS: OdontogramControlEntry[] = [];

