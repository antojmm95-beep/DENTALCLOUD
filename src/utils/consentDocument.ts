import { ConsentProcedureType } from '../types/dental';

export interface ConsentImagingStudies {
  panoramica: boolean;
  periapical: boolean;
  cbctTac: boolean;
}

export interface ConsentFormState {
  diagnosis: string;
  proposedTreatment: string;
  alternativeTreatments: string;
  expectedBenefits: string;
  consentDecision: 'consiento' | 'no_consiento';
  representativeName: string;
  witnessName: string;
  anesthesiaModality: 'local' | 'local_sedacion';
  imagingStudies: ConsentImagingStudies;
  prosthodontistName: string;
  implantIdentification: string;
}

export interface ConsentTemplateDefinition {
  id: ConsentProcedureType;
  shortLabel: string;
  specialtyBadge: string;
  title: string;
  subtitle?: string;
  text: string;
  risks: string[];
  frequentRisks?: string[];
  possibleComplications?: string[];
  defaultDiagnosis: string;
  defaultTreatment: string;
  defaultAlternatives: string;
  defaultBenefits: string;
}

export const SURGICAL_CONSENT_TEMPLATES: Record<ConsentProcedureType, ConsentTemplateDefinition> = {
  exodoncia: {
    id: 'exodoncia',
    shortLabel: 'Cirugía Oral / Exodoncia',
    specialtyBadge: 'Cirugía Bucal y Maxilofacial',
    title: 'CONSENTIMIENTO INFORMADO · CIRUGÍA ORAL Y EXODONCIA',
    subtitle: 'Declaración de consentimiento informado general para exodoncia e intervención quirúrgica oral',
    text: 'He sido informado(a) de forma clara y suficiente sobre el diagnóstico, la naturaleza de la condición o enfermedad que padece el paciente y su evolución natural, los objetivos de los tratamientos propuestos, así como las alternativas de tratamiento, descripción de las consecuencias derivadas del tratamiento o intervención, beneficios, riesgos comunes del tratamiento y posibles complicaciones que puedan desencadenar algún riesgo. Adicionalmente, seré informado(a) en cada momento y a mi requerimiento sobre la evolución del proceso.',
    risks: [
      'Dolor, inflamación (edema) y hematoma en la zona quirúrgica durante los primeros días.',
      'Hemorragia leve o moderada postoperatoria controlable con compresión de gasa estéril.',
      'Alveolitis seca o infección postoperatoria (pérdida del coágulo), especialmente si no se cumplen las pautas de reposo y abstinencia de tabaco.',
      'Lesión de dientes vecinos, restauraciones, fractura radicular o parestesia transitoria en zonas cercanas a trayectos nerviosos.'
    ],
    defaultDiagnosis: 'Pieza dental con indicación de exodoncia simple o quirúrgica.',
    defaultTreatment: 'Exodoncia / Cirugía bucal bajo anestesia local e indicaciones postoperatorias.',
    defaultAlternatives: 'Valoración endodóntica/rehabilitadora si la estructura dental fuese recuperable; de lo contrario, no existen alternativas conservadoras.',
    defaultBenefits: 'Eliminación del foco infeccioso o doloroso, prevención de complicaciones locales y preparación para futura rehabilitación protésica o implantológica.'
  },
  terceros_molares: {
    id: 'terceros_molares',
    shortLabel: 'Terceros Molares (Cordales)',
    specialtyBadge: 'Cirugía Bucal · Cordales',
    title: 'CONSENTIMIENTO INFORMADO · TERCEROS MOLARES',
    subtitle: 'Odontectomía de terceros molares',
    text: 'He sido informado(a) que el tratamiento consiste en la extracción quirúrgica de uno o varios terceros molares (cordales), lo cual puede incluir aplicación de anestesia local (y/o sedación si se acuerda), incisión y levantamiento de colgajo, osteotomía (remoción de hueso) y/o odontosección (sección del diente), lavado y regularización del lecho quirúrgico, sutura e indicaciones postoperatorias con control y retiro de puntos si corresponde.',
    frequentRisks: [
      'Dolor, inflamación (edema), trismus (limitación para abrir la boca) y hematoma.',
      'Sangrado leve/moderado y malestar general.',
      'Inflamación de garganta, molestias al tragar y dolor irradiado (oído/mandíbula).',
      'Dehiscencia de sutura, retención de alimentos y halitosis transitoria.'
    ],
    possibleComplications: [
      'Infección postoperatoria (que requiera antibióticos y/o drenaje).',
      'Alveolitis (dolor intenso por pérdida del coágulo).',
      'Sangrado persistente que requiera medidas hemostáticas adicionales.',
      'Lesión de dientes vecinos, restauraciones o prótesis; fractura radicular.',
      'Comunicación bucosinusal y/o sinusitis (principalmente molares superiores) que requiera manejo adicional.',
      'Lesión de tejidos blandos (labio, mejilla, lengua) por instrumental o anestesia.',
      'Alteración sensitiva (hormigueo, adormecimiento) del labio, mentón o lengua por cercanía a nervios (nervio alveolar inferior y/o lingual), temporal o raramente permanente.',
      'Trastornos temporomandibulares (dolor o limitación), generalmente transitorios.',
      'Reacciones alérgicas a medicamentos o materiales; náuseas/vómitos si hay sedación.',
      'Necesidad de reintervención o derivación a cirugía maxilofacial si la complejidad lo amerita.'
    ],
    risks: [
      'Dolor, edema, trismus (limitación de apertura bucal) y hematoma postoperatorio.',
      'Infección postoperatoria o alveolitis por pérdida del coágulo.',
      'Comunicación bucosinusal en terceros molares superiores cercanos al seno maxilar.',
      'Alteración sensitiva (hormigueo o adormecimiento) de labio, mentón o lengua por cercanía al nervio alveolar inferior o lingual.'
    ],
    defaultDiagnosis: 'Terceros molares retenidos / impactados / sintomáticos (piezas #18, #28, #38, #48 según valoración radiográfica).',
    defaultTreatment: 'Odontectomía quirúrgica de terceros molares con osteotomía, odontosección y sutura.',
    defaultAlternatives: 'Observación y controles periódicos (cuando es viable) o tratamiento farmacológico temporal (analgésicos/antibióticos).',
    defaultBenefits: 'Resolución o reducción de dolor e infecciones recurrentes, prevención de complicaciones futuras (caries, daño al 2º molar, quistes, enfermedad periodontal distal) y mejora funcional del tratamiento odontológico integral.'
  },
  implantes: {
    id: 'implantes',
    shortLabel: 'Implantes Dentales',
    specialtyBadge: 'Cirugía e Implantología Dental',
    title: 'CONSENTIMIENTO INFORMADO · IMPLANTES DENTALES',
    subtitle: 'Rehabilitación mediante implantes dentales osteointegrados (Fases I, II y III)',
    text: 'Los implantes dentales son aditamentos metálicos que rehabilitan dientes sustituyendo la raíz de una pieza ausente, sobre los cuales se adapta un muñón y una corona que brindará resultado funcional y estético. Pueden colocarse de manera unitaria o múltiple mediante planes de tratamiento individualizados. Son fabricados con combinaciones de metales biocompatibles, principalmente Titanio, aceptados por el tejido óseo; sin embargo, si no reciben cuidados e higiene adecuados al igual que los dientes naturales, pueden perderse.',
    risks: [
      'Cada caso es individualizado y los tiempos quirúrgicos o protésicos pueden variar según la respuesta ósea y clínica.',
      'Necesidad de procedimientos reconstructivos complementarios (como injertos óseos) si la altura o ancho del hueso no son suficientes.',
      'Posible inflamación, hematoma, infección local o falta de osteointegración biológica del implante.',
      'Mantenimiento obligatorio anual con protesista y cirujano; vida útil estimada de ~20 años del implante y ~10 años de la corona protésica según cuidado e higiene.'
    ],
    defaultDiagnosis: 'Edentulismo parcial / total con indicación de rehabilitación implantosoportada.',
    defaultTreatment: 'Colocación quirúrgica de implante(s) dental(es) de titanio biocompatible (Fase I), tornillo de cicatrización (Fase II) y posterior rehabilitación protésica (Fase III).',
    defaultAlternatives: 'Prótesis fija dentosoportada (puente) o prótesis parcial/total removible.',
    defaultBenefits: 'Recuperación funcional masticatoria y estética sin necesidad de tallar dientes naturales vecinos.'
  },
  endodoncia: {
    id: 'endodoncia',
    shortLabel: 'Endodoncia',
    specialtyBadge: 'Endodoncia',
    title: 'CONSENTIMIENTO INFORMADO · TRATAMIENTO DE CONDUCTO',
    subtitle: 'Terapia endodóntica conservadora',
    text: 'Por medio del presente documento autorizo al equipo clínico la realización del tratamiento endodóntico en la(s) pieza(s) indicada(s). Entiendo que este procedimiento busca conservar la pieza dental natural eliminando el tejido pulpar infectado o inflamado irreversiblemente.',
    risks: [
      'Molestia o sensibilidad postoperatoria a la percusión durante 48 a 72 horas.',
      'Posibilidad de fractura de instrumentos finos en conductos estrechos, curvos o calcificados.',
      'Fragilidad posterior de la pieza dental que ameritará restauración definitiva (incrustación, endocorona o corona).'
    ],
    defaultDiagnosis: 'Pulpitis irreversible / necrosis pulpar / periodontitis apical.',
    defaultTreatment: 'Instrumentación biomecánica, desinfección y obturación de conductos radiculares.',
    defaultAlternatives: 'Exodoncia de la pieza dental comprometida.',
    defaultBenefits: 'Eliminación del dolor e infección periapical conservando el diente natural en boca.'
  },
  operatoria: {
    id: 'operatoria',
    shortLabel: 'Operatoria & Resinas',
    specialtyBadge: 'Odontología Restauradora',
    title: 'CONSENTIMIENTO INFORMADO · OPERATORIA Y RESTAURACIONES',
    subtitle: 'Eliminación de caries y restauraciones estéticas adhesivas',
    text: 'Doy mi conformidad para la realización de preparaciones cavitarias y obturaciones con resinas compuestas de fotocurado u otros biomateriales restauradores. Se me ha explicado la selección de color, técnica de adhesión y pronóstico.',
    risks: [
      'Sensibilidad térmica transitoria al frío o calor durante los primeros días postoperatorios.',
      'Necesidad de ajuste oclusal si se percibe contacto alto al morder una vez desaparezca la anestesia.',
      'En lesiones cariosas muy profundas cercanas a la pulpa, posible necesidad futura de tratamiento de conducto.'
    ],
    defaultDiagnosis: 'Lesión cariosa / fractura coronaria / recambio de restauración defectuosa.',
    defaultTreatment: 'Eliminación selectiva de tejido cariado y restauración adhesiva con resina compuesta.',
    defaultAlternatives: 'Incrustación indirecta o corona completa según extensión coronaria.',
    defaultBenefits: 'Devolución de la anatomía, sellado marginal y estética dental.'
  },
  blanqueamiento: {
    id: 'blanqueamiento',
    shortLabel: 'Blanqueamiento',
    specialtyBadge: 'Estética Dental',
    title: 'CONSENTIMIENTO INFORMADO · BLANQUEAMIENTO DENTAL',
    subtitle: 'Aclaramiento dental profesional supervisado',
    text: 'Acepto el tratamiento de aclaramiento dental mediante geles especializados de peróxido activados o ambulatorios bajo supervisión odontológica. Comprendo que el grado de aclaramiento final depende de factores intrínsecos propios del esmalte y dentina.',
    risks: [
      'Sensibilidad dental transitoria durante 24 a 48 horas post-sesión.',
      'Irritación gingival leve transitoria.',
      'Las resinas, carillas o coronas existentes no cambian de color y podrían requerir recambio estético posterior.'
    ],
    defaultDiagnosis: 'Discromía / pigmentación dental extrínseca o intrínseca.',
    defaultTreatment: 'Aclaramiento dental en consultorio con protección gingival.',
    defaultAlternatives: 'Carillas estéticas directas en resina o cerámica.',
    defaultBenefits: 'Mejora estética del tono dental bajo protocolo clínico seguro.'
  },
  ortodoncia: {
    id: 'ortodoncia',
    shortLabel: 'Ortodoncia',
    specialtyBadge: 'Ortodoncia y Ortopedia',
    title: 'CONSENTIMIENTO INFORMADO · ORTODONCIA',
    subtitle: 'Alineación dentaria y corrección oclusal',
    text: 'Autorizo el inicio del tratamiento ortodóntico mediante aparatología fija o alineadores transparentes conforme al estudio cefalométrico y modelos de diagnóstico.',
    risks: [
      'Molestias leves tras cada activación mensual durante 2 a 4 días.',
      'Riesgo de desmineralización del esmalte o gingivitis si no se mantiene higiene estricta.',
      'Posibilidad de reabsorción radicular leve y necesidad de contención al finalizar.'
    ],
    defaultDiagnosis: 'Maloclusión / apiñamiento dentario.',
    defaultTreatment: 'Tratamiento ortodóntico integral con controles periódicos.',
    defaultAlternatives: 'No intervenir o tratamientos protésicos de camuflaje.',
    defaultBenefits: 'Estabilidad oclusal, salud periodontal y armonía de la sonrisa.'
  }
};

export const IMPLANT_PHASES_GUIDE = [
  {
    phase: 'Fase I · Quirúrgica',
    body: 'Es realizada por el especialista en Cirugía Maxilofacial o Cirugía Bucal: consiste en la colocación propia del implante en el hueso, el cual debe contar con altura y ancho adecuados; de no ser así, se puede recurrir a procedimientos reconstructivos como injertos óseos. En nuestro equipo se puede trabajar con un Médico Anestesiólogo para administrar Sedación Endovenosa más asistencia local que garantice máximo confort durante la cirugía (siempre y cuando el paciente acceda a la sedación).'
  },
  {
    phase: 'Fase II · Colocación de Tornillos de Cicatrización o Provisional',
    body: 'Puede realizarse en el mismo acto de colocación del implante o de 3 a 6 meses después de la Fase I, una vez completada la osteointegración verificada mediante control clínico-radiográfico. Se coloca un tornillo al implante que moldeará la encía alrededor de la futura corona durante aproximadamente 15 días. Cuando las condiciones clínicas permiten colocarlo en la Fase I, se omite esta pequeña cirugía. Su costo puede ser aparte del implante según el plan presupuestado.'
  },
  {
    phase: 'Fase III · Fase Protésica',
    body: 'Transcurridos aproximadamente 15 días tras la colocación del tornillo de cicatrización y verificando que la encía se encuentre en condiciones óptimas, se remite al paciente para la confección de la prótesis sobre implante con el especialista en Prótesis Dental que llevará su caso, quien informará los tiempos de laboratorio y pruebas clínicas.'
  }
];

export const IMPLANT_GENERAL_CLAUSES = [
  '4. Le recordamos que cada caso es individualizado y no necesaria o estrictamente se apega a estos tiempos de las fases; siempre se hará lo mejor para su necesidad clínica ajustando fases o tiempos cuando corresponda.',
  '5. Se recomienda seguir todas las instrucciones postoperatorias entregadas el día de la cirugía.',
  '6. Un implante dental puede durar muchos años en boca (se reportan alrededor de 20 años o más con buen cuidado). Es fundamental evaluar y controlar la prótesis una vez al año con su protesista (la corona puede requerir recambio alrededor de los 10 años por desgaste sobre el mismo implante) y asistir a control anual con su cirujano.',
  '7. Es indispensable mantener una adecuada higiene y salud bucal diaria.',
  '8. Debe guardar este documento, donde quedarán registradas las etiquetas/especificaciones de identificación de sus implantes para respaldo clínico internacional sobre el material colocado.'
];

export function createInitialConsentFormState(
  procedureType: ConsentProcedureType,
  defaultProsthodontist = 'Dr. Antonio Morera'
): ConsentFormState {
  const tpl = SURGICAL_CONSENT_TEMPLATES[procedureType] || SURGICAL_CONSENT_TEMPLATES.exodoncia;
  return {
    diagnosis: tpl.defaultDiagnosis,
    proposedTreatment: tpl.defaultTreatment,
    alternativeTreatments: tpl.defaultAlternatives,
    expectedBenefits: tpl.defaultBenefits,
    consentDecision: 'consiento',
    representativeName: '',
    witnessName: '',
    anesthesiaModality: 'local',
    imagingStudies: {
      panoramica: true,
      periapical: false,
      cbctTac: procedureType === 'implantes'
    },
    prosthodontistName: defaultProsthodontist,
    implantIdentification: ''
  };
}

export function formatConsentLongSpanishDate(date: Date = new Date()): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()] || 'Enero';
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function buildConsentPdfFilename(params: {
  folio?: string;
  procedureType: ConsentProcedureType;
  patientName: string;
}): string {
  const safeFolio = (params.folio || 'NUEVO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeType = params.procedureType.toUpperCase();
  const safePatient = (params.patientName || 'PACIENTE')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return `Consentimiento_${safeFolio}_${safeType}_${safePatient}.pdf`;
}
