import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetTotals,
  buildWhatsAppLink,
  sanitizePatientBalance,
  parseVoiceCommand,
  calculateProcedureCost,
  generateInstallmentSchedule,
  conciliatePaymentIntoInstallments,
  adjustCatalogPricesByPercent,
  filterContactsSegment,
  calculateDoctorLiquidation,
  formatWhatsAppTemplate,
  generateDoctorICSContent,
  getCashClosingPeriodRange,
  computeCashClosingSummary,
  buildNewCatalogItem,
  buildAutoSecuenciaNote,
  parseVeDolarApiPayloads,
  computeCurrencyConversions,
  applyFixedFindingToOdontogram,
  sortOdontogramControlsDesc,
  isPatientNotifiable,
  paginateList,
  extractToothNumberFromTranscript,
  buildRecordedSequencePayload,
  filterCashClosingMovements,
  upsertVademecumMedication,
  removeVademecumMedication,
  normalizeWhatsAppPhone,
  resolvePatientWhatsAppPhone
} from './dentalCalc';
import {
  parsePatientsFromRows,
  parsePatientsFromPdfText,
  spreadsheetDateToIso,
  sanitizePatientNumericId,
  isValidCleanPatientRecord,
  partitionValidCleanPatients,
  parsePatientsFromCoordinatePdfPages
} from './patientImportParser';
import { CORONA_SEED_PATIENTS } from '../data/coronaPatientsSeed';
import {
  resolveDoctorCredentials,
  formatPresupuestoWhatsAppText,
  formatPresupuestoEmailContent,
  convertBudgetAmountToBs,
  formatBudgetCurrencyValue,
  resolveBudgetRate
} from './budgetDocument';
import {
  buildPresupuestoPdfFilename,
  buildPresupuestoPdfFile
} from './budgetPdfExport';
import {
  SURGICAL_CONSENT_TEMPLATES,
  IMPLANT_PHASES_GUIDE,
  createInitialConsentFormState,
  buildConsentPdfFilename
} from './consentDocument';
import { buildConsentPdfDoc } from './consentPdfExport';
import {
  parseQrIntakeRoute,
  buildQrIntakeShareUrl,
  buildPatientHistoryQrUrl,
  parseCommaListInput,
  resolvePublicQrOrigin,
  encodeQrPatientTransferPayload,
  decodeQrPatientTransferPayload,
  buildClinicHandoffUrl,
  computeAgeFromBirthDate,
  normalizeCedulaKey
} from './qrIntakeMode';
import {
  buildRecipePdfFilename,
  formatRecipeWhatsAppText,
  formatRecipeEmailContent,
  buildRecipePdfFile
} from './recipePdfExport';
import {
  resolveExpenseReceiptFolio,
  buildExpenseReceiptPdfFilename,
  computeExpenseBsEquivalent,
  buildExpenseReceiptPdfFile
} from './expenseReceiptPdfExport';

test('calculateBudgetTotals computes subtotal, discounts and net total accurately', () => {
  const items = [
    { price: 55, quantity: 1, discount: 0 },
    { price: 40, quantity: 1, discount: 10 }, // 40 - 4 = 36
    { price: 100, quantity: 2, discount: 20 }  // 200 - 40 = 160
  ];

  const result = calculateBudgetTotals(items);
  assert.equal(result.subtotal, 295);
  assert.equal(result.discountTotal, 44);
  assert.equal(result.total, 251);
});

test('buildWhatsAppLink formats valid wa.me URL with clean digits and uri encoding', () => {
  const url = buildWhatsAppLink('+58 (414) 123-4567', 'Hola Dr. Morera');
  assert.equal(url, 'https://wa.me/584141234567?text=Hola%20Dr.%20Morera');
});

test('sanitizePatientBalance prevents negative balance upon overpayment', () => {
  assert.equal(sanitizePatientBalance(100, 40), 60);
  assert.equal(sanitizePatientBalance(50, 100), 0);
});

test('parseVoiceCommand accurately extracts FDI tooth number and price from spoken sentences', () => {
  const parsed1 = parseVoiceCommand('Restauración resina pieza 16 por 55 dólares');
  assert.equal(parsed1.toothNumber, 16);
  assert.equal(parsed1.price, 55);

  const parsed2 = parseVoiceCommand('Endodoncia conducto pieza 24 por 120$');
  assert.equal(parsed2.toothNumber, 24);
  assert.equal(parsed2.price, 120);

  const parsed3 = parseVoiceCommand('Profilaxis y limpieza general por 45');
  assert.equal(parsed3.toothNumber, undefined);
  assert.equal(parsed3.price, 45);
});

test('calculateProcedureCost computes direct cost and suggested price accurately', () => {
  const result = calculateProcedureCost(0.20, 45, 6.00, 50);
  assert.equal(result.directCost, 15);
  assert.equal(result.suggestedPrice, 30);
});

test('generateInstallmentSchedule divides balance evenly and flags past-due cuotas as vencida', () => {
  const schedule = generateInstallmentSchedule(150, 50, 3, '2026-10-01', '2026-11-10');
  assert.equal(schedule.length, 3);
  assert.equal(schedule[0].amountUsd, 33.33);
  assert.equal(schedule[1].amountUsd, 33.33);
  assert.equal(schedule[2].amountUsd, 33.34);
  assert.equal(schedule[0].status, 'vencida');
  assert.equal(schedule[1].status, 'vencida');
  assert.equal(schedule[2].status, 'pendiente');
  assert.equal(schedule[2].dueDate, '2026-12-01');
});

test('conciliatePaymentIntoInstallments applies payment across sequential cuotas and returns remainder', () => {
  const initial = generateInstallmentSchedule(120, 0, 3, '2026-11-01', '2026-11-10');
  const { updatedCuotas, unappliedUsd } = conciliatePaymentIntoInstallments(initial, 55);
  assert.equal(updatedCuotas[0].status, 'pagada');
  assert.equal(updatedCuotas[0].paidUsd, 40);
  assert.equal(updatedCuotas[1].paidUsd, 15);
  assert.equal(updatedCuotas[1].status, 'pendiente');
  assert.equal(updatedCuotas[2].paidUsd, 0);
  assert.equal(unappliedUsd, 0);
});

test('adjustCatalogPricesByPercent scales prices accurately with $1 minimum floor', () => {
  const catalog = [{ id: '1', basePrice: 100 }, { id: '2', basePrice: 2 }];
  const raised = adjustCatalogPricesByPercent(catalog, 15);
  assert.equal(raised[0].basePrice, 115);
  assert.equal(raised[1].basePrice, 2.3);
  const dropped = adjustCatalogPricesByPercent(catalog, -90);
  assert.equal(dropped[1].basePrice, 1);
});

test('filterContactsSegment filters by gender, age range, debt, birthday month, and days inactive', () => {
  const list = [
    { id: '1', gender: 'M', age: 45, balance: 95, birthDate: '1981-11-12', lastVisit: '2026-08-01' },
    { id: '2', gender: 'F', age: 29, balance: 0, birthDate: '1997-05-10', lastVisit: '2026-11-05' },
    { id: '3', gender: 'F', age: 62, balance: 150, birthDate: '1964-11-22', lastVisit: '2026-05-01' }
  ];
  assert.equal(filterContactsSegment(list, { gender: 'F', onlyWithDebt: true }).length, 1);
  assert.equal(filterContactsSegment(list, { birthdayMonth: 11 }).length, 2);
  assert.equal(filterContactsSegment(list, { minAge: 40, minDaysSinceVisit: 90, referenceDateStr: '2026-11-10' }).length, 2);
});

test('calculateDoctorLiquidation computes payout and clinic share cleanly', () => {
  const res = calculateDoctorLiquidation(1000, 65);
  assert.equal(res.payoutUsd, 650);
  assert.equal(res.clinicShareUsd, 350);
});

test('formatWhatsAppTemplate substitutes known placeholders and preserves unknown ones', () => {
  const msg = formatWhatsAppTemplate('Hola {paciente}, te espera {doctor} el {fecha} en {clinica}. {extra}', {
    paciente: 'Carlos',
    doctor: 'Dr. Morera',
    fecha: '12/11/2026',
    clinica: 'Clínica Corona'
  });
  assert.equal(msg, 'Hola Carlos, te espera Dr. Morera el 12/11/2026 en Clínica Corona. {extra}');
});

test('generateDoctorICSContent builds valid RFC 5545 VCALENDAR with VEVENT entries', () => {
  const ics = generateDoctorICSContent('Dr. Antonio Morera', 'Clínica Corona', [
    {
      id: 'apt-1',
      date: '2026-11-12',
      time: '10:00',
      durationMinutes: 45,
      patientName: 'Carlos Pérez',
      treatmentType: 'Resina Pz 16',
      box: 'Consultorio 1'
    }
  ]);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('X-WR-CALNAME:Dr. Antonio Morera - Clínica Corona'));
  assert.ok(ics.includes('DTSTART:20261112T100000'));
  assert.ok(ics.includes('DTEND:20261112T104500'));
  assert.ok(ics.includes('SUMMARY:Carlos Pérez - Resina Pz 16'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('getCashClosingPeriodRange calculates exact diario, semanal (Mon-Sun), and mensual ranges', () => {
  const diario = getCashClosingPeriodRange('diario', '2026-11-11');
  assert.equal(diario.startDate, '2026-11-11');
  assert.equal(diario.endDate, '2026-11-11');

  // 2026-11-11 is Wednesday -> Monday 2026-11-09 to Sunday 2026-11-15
  const semanal = getCashClosingPeriodRange('semanal', '2026-11-11');
  assert.equal(semanal.startDate, '2026-11-09');
  assert.equal(semanal.endDate, '2026-11-15');

  // November has 30 days
  const mensual = getCashClosingPeriodRange('mensual', '2026-11-11');
  assert.equal(mensual.startDate, '2026-11-01');
  assert.equal(mensual.endDate, '2026-11-30');
});

test('computeCashClosingSummary aggregates income by method, expenses, net balance, and cash variance', () => {
  const payments = [
    { date: '2026-11-10', amount: 100, method: 'efectivo' },
    { date: '2026-11-10', amount: 50, method: 'pago_movil' },
    { date: '2026-11-03', amount: 80, method: 'zelle' },
    { date: '2026-10-24', amount: 200, method: 'transferencia' }
  ];
  const expenses = [
    { date: '2026-11-10', amountUsd: 30 },
    { date: '2026-11-01', amountUsd: 100 }
  ];

  const daily = computeCashClosingSummary({
    payments,
    expenses,
    period: 'diario',
    referenceDate: '2026-11-10',
    exchangeRate: 900,
    countedCashUsd: 95
  });
  assert.equal(daily.receiptsCount, 2);
  assert.equal(daily.totalCollectedUsd, 150);
  assert.equal(daily.totalExpensesUsd, 30);
  assert.equal(daily.netBalanceUsd, 120);
  assert.equal(daily.netBalanceBs, 108000);
  assert.equal(daily.expectedCashUsd, 100);
  assert.equal(daily.cashDifferenceUsd, -5);
  assert.equal(daily.methodTotalsUsd.pago_movil, 50);

  const monthly = computeCashClosingSummary({
    payments,
    expenses,
    period: 'mensual',
    referenceDate: '2026-11-10',
    exchangeRate: 900
  });
  assert.equal(monthly.receiptsCount, 3);
  assert.equal(monthly.totalCollectedUsd, 230);
  assert.equal(monthly.totalExpensesUsd, 130);
  assert.equal(monthly.netBalanceUsd, 100);
});

test('buildNewCatalogItem auto-generates sequential code and formats area & price cleanly', () => {
  const created = buildNewCatalogItem(
    [{ code: '0375' }, { code: '0015' }],
    { name: 'Implante Dental Titanio', area: '6 - CIRUGIA', basePrice: 650 },
    'test1'
  );
  assert.equal(created.code, '0376');
  assert.equal(created.name, '0376 - IMPLANTE DENTAL TITANIO');
  assert.equal(created.area, '6 - CIRUGIA');
  assert.equal(created.suggestedPhase, 'fase_quirurgica');
  assert.equal(created.basePrice, 650);
});

test('parsePatientsFromRows maps Spanish/English columns from Excel/CSV exports', () => {
  const rows = [
    {
      'Nombre Completo': 'Mariana Valentina Torrealba',
      'Cédula': 'V-22.345.678',
      'Teléfono': '0414-5559876',
      'Correo Electrónico': 'mariana@correo.com',
      'Saldo USD': '$85.50'
    }
  ];
  const parsed = parsePatientsFromRows(rows, 'Excel/CSV');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'MARIANA VALENTINA TORREALBA');
  assert.equal(parsed[0].cedula, 'V-22.345.678');
  assert.equal(parsed[0].phone, '0414-5559876');
  assert.equal(parsed[0].email, 'mariana@correo.com');
  assert.equal(parsed[0].balance, 85.5);
});

test('parsePatientsFromPdfText extracts patients from tabular PDF text lines', () => {
  const samplePdfText = [
    'LISTADO DE PACIENTES - CLINICA',
    '1 V-19.876.543 LUIS ALBERTO GOMEZ 0424-7778899 luis.gomez@mail.com $40.00',
    '2 E-84.123.456 ANA PAULA ROJAS 0412-3334455'
  ].join('\n');

  const parsed = parsePatientsFromPdfText(samplePdfText, 'PDF');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'LUIS ALBERTO GOMEZ');
  assert.equal(parsed[0].cedula, 'V-19.876.543');
  assert.equal(parsed[0].phone, '0424-7778899');
  assert.equal(parsed[0].email, 'luis.gomez@mail.com');
  assert.equal(parsed[0].balance, 40);
  assert.equal(parsed[1].name, 'ANA PAULA ROJAS');
  assert.equal(parsed[1].cedula, 'E-84.123.456');
});

test('resolveDoctorCredentials matches doctor by partial name and exposes COV and MPPS', () => {
  const sampleDoctors = [
    {
      id: 'doc-1',
      name: 'Dr. Antonio Morera',
      specialty: 'Odontología Integral & Prótesis',
      colegiado: 'COV-21870',
      mpps: 'MPPS-98412',
      rif: 'V-15165183-2',
      email: 'antonio@clinicacorona.com',
      phone: '+58 424 2140058',
      commissionPercentage: 70,
      assignedBox: 'Consultorio 1' as const,
      status: 'activo' as const,
      patientsTreatedCount: 10,
      monthlyProduction: 1000
    }
  ];

  const resolved = resolveDoctorCredentials('ANTONIO MORERA', sampleDoctors);
  assert.equal(resolved.colegiado, 'COV-21870');
  assert.equal(resolved.mpps, 'MPPS-98412');
});

test('formatPresupuestoWhatsAppText and formatPresupuestoEmailContent include MPPS, Secuencia de Tratamiento, and footer', () => {
  const sampleBudget = {
    id: 'bud-1',
    folio: '0009070',
    patientId: 'pat-1',
    patientName: 'ALEXIS PRUDENCIO MUJICA RIERA',
    date: '2026-11-12',
    validUntil: '2026-12-12',
    doctorName: 'Dr. Antonio Morera',
    doctorColegiado: 'COV-21870',
    doctorMpps: 'MPPS-98412',
    items: [
      {
        id: 'it-1',
        name: 'EXTRACCION COMPLEJA',
        category: 'Cirugía',
        phase: 'fase_quirurgica',
        quantity: 1,
        price: 50,
        discount: 0,
        total: 50
      },
      {
        id: 'it-2',
        name: 'ENDODONCIA MONORADICULAR',
        category: 'Endodoncia',
        phase: 'fase_funcional_ortodoncia',
        quantity: 1,
        price: 250,
        discount: 0,
        total: 250
      }
    ],
    subtotal: 300,
    discountTotal: 0,
    tax: 0,
    total: 300,
    status: 'pendiente' as const,
    notes: '2 OPCIONES DE PUENTE FIJO'
  };

  const samplePatient = {
    id: 'pat-1',
    name: 'ALEXIS PRUDENCIO MUJICA RIERA',
    cedula: 'V-3677170',
    historyNumber: '003595',
    phone: '0414-1234567',
    email: 'alexis@correo.com'
  };

  const doctor = {
    name: 'Dr. Antonio Morera',
    specialty: 'Odontología Integral & Prótesis',
    colegiado: 'COV-21870',
    mpps: 'MPPS-98412',
    rif: 'V-15165183-2'
  };

  const clinicConfig = {
    clinicName: 'Clínica Odontológica Corona',
    address: 'Ciudad Tiuna, Torre A11 PB Local L2, Caracas',
    phone: '0212-6830229 / 0426-4042305',
    email: 'contacto@clinicacorona.com',
    rif: 'J-31298456-0'
  };

  const wa = formatPresupuestoWhatsAppText({
    budget: sampleBudget,
    patient: samplePatient,
    doctor,
    exchangeRate: 897.54,
    clinicConfig
  });

  assert.match(wa, /0009070/);
  assert.match(wa, /12\/11\/2026/);
  assert.match(wa, /MPPS-98412/);
  assert.match(wa, /COV-21870/);
  assert.match(wa, /SECUENCIA DE TRATAMIENTO/);
  assert.match(wa, /2 OPCIONES DE PUENTE FIJO/);
  assert.match(wa, /@CLINICA_CORONA/);

  const email = formatPresupuestoEmailContent({
    budget: sampleBudget,
    patient: samplePatient,
    doctor,
    exchangeRate: 897.54,
    clinicConfig
  });

  assert.match(email.subject, /0009070/);
  assert.match(email.body, /MPPS-98412/);
  assert.match(email.body, /COV-21870/);
  assert.match(email.body, /SECUENCIA DE TRATAMIENTO/);
  assert.match(email.body, /EXTRACCION COMPLEJA/);
});

test('computeCashClosingSummary separates laboratory expenses and deducts them from net cash closing balance', () => {
  const payments = [
    { date: '2026-11-12', amount: 300, method: 'transferencia' },
    { date: '2026-11-12', amount: 100, method: 'efectivo' }
  ];
  const expenses = [
    { date: '2026-11-12', amountUsd: 85, category: 'laboratorio' },
    { date: '2026-11-12', amountUsd: 35, category: 'laboratorio' },
    { date: '2026-11-12', amountUsd: 40, category: 'materiales' }
  ];

  const summary = computeCashClosingSummary({
    payments,
    expenses,
    period: 'diario',
    referenceDate: '2026-11-12',
    exchangeRate: 900
  });

  assert.equal(summary.labExpensesCount, 2);
  assert.equal(summary.labExpensesUsd, 120);
  assert.equal(summary.labExpensesBs, 108000);
  assert.equal(summary.operatingExpensesUsd, 40);
  assert.equal(summary.totalExpensesUsd, 160);
  assert.equal(summary.netBalanceUsd, 240);
});

test('buildAutoSecuenciaNote creates tailored clinical notes for Tartrectomía y Pulido and other procedures', () => {
  const noteTart = buildAutoSecuenciaNote({
    procedureName: '0001 - TARTRECTOMIA Y PULIDO',
    phase: 'fase_inicial'
  });
  assert.match(noteTart, /Tartrectomía ultrasónica/i);
  assert.match(noteTart, /pulido coronario/i);

  const noteEndo = buildAutoSecuenciaNote({
    procedureName: 'ENDODONCIA MOLAR',
    toothNumber: 36,
    phase: 'fase_funcional_ortodoncia'
  });
  assert.match(noteEndo, /pieza #36/i);
  assert.match(noteEndo, /obturación endodóntica/i);
});

test('parseVeDolarApiPayloads and computeCurrencyConversions extract Dólar BCV, Euro BCV, and Binance USDT accurately', () => {
  const parsed = parseVeDolarApiPayloads(
    [
      { fuente: 'oficial', promedio: 911.6243 },
      { fuente: 'paralelo', promedio: 1071.2289 }
    ],
    [
      { fuente: 'oficial', promedio: 1009.3413 }
    ],
    { usdBcv: 897.54, eurBcv: 990.10, binanceUsdt: 1050.00 }
  );

  assert.equal(parsed.usdBcv, 911.62);
  assert.equal(parsed.eurBcv, 1009.34);
  assert.equal(parsed.binanceUsdt, 1071.23);

  const conv = computeCurrencyConversions(10, 'EUR', parsed);
  assert.equal(conv.bsBcv, 9116.2);
  assert.equal(conv.bsEur, 10093.4);
  assert.equal(conv.bsBinance, 10712.3);
  assert.equal(conv.selectedBs, 10093.4);
});

test('applyFixedFindingToOdontogram marks multiple teeth with a fixed status and clears multiple teeth cleanly', () => {
  const initial: Record<number, { number: number; wholeStatus?: string; surfaces: Record<string, string> }> = {
    16: { number: 16, surfaces: { O: 'caries' } }
  };

  const withExtractions = applyFixedFindingToOdontogram(initial, [18, 28, 38, 48], 'extraccion_indicada');
  assert.equal(withExtractions[18]?.wholeStatus, 'extraccion_indicada');
  assert.equal(withExtractions[28]?.wholeStatus, 'extraccion_indicada');
  assert.equal(withExtractions[38]?.wholeStatus, 'extraccion_indicada');
  assert.equal(withExtractions[48]?.wholeStatus, 'extraccion_indicada');
  assert.equal(withExtractions[16]?.surfaces.O, 'caries');

  const cleared = applyFixedFindingToOdontogram(withExtractions, [18, 38], 'clear');
  assert.equal(cleared[18], undefined);
  assert.equal(cleared[38], undefined);
  assert.equal(cleared[28]?.wholeStatus, 'extraccion_indicada');
});

test('sortOdontogramControlsDesc orders control entries newest-first by ISO date', () => {
  const sorted = sortOdontogramControlsDesc([
    { id: '1', date: '2026-03-12' },
    { id: '2', date: '2026-11-03' },
    { id: '3', date: '2026-08-18' }
  ]);
  assert.deepEqual(
    sorted.map(x => x.date),
    ['2026-11-03', '2026-08-18', '2026-03-12']
  );
});

test('convertBudgetAmountToBs and resolveBudgetRate convert budget totals accurately across USD, BS, and rate sources', () => {
  const rates = { usdBcv: 911.62, eurBcv: 1009.34, binanceUsdt: 1071.22 };
  const bcv = resolveBudgetRate(rates, 'usdBcv');
  const binance = resolveBudgetRate(rates, 'binanceUsdt');

  assert.equal(bcv.label, 'Dólar BCV');
  assert.equal(bcv.rate, 911.62);
  assert.equal(binance.label, 'Binance USDT');
  assert.equal(convertBudgetAmountToBs(70, bcv.rate), 63813.4);

  const bsFormatted = formatBudgetCurrencyValue(70, 'BS', bcv.rate);
  assert.match(bsFormatted, /Bs\.\s*63\.813,40|Bs\.\s*63,813\.40/);
  const usdFormatted = formatBudgetCurrencyValue(70, 'USD', bcv.rate);
  assert.match(usdFormatted, /\$70[.,]00/);
});

test('parsePatientsFromRows maps exact 10-column external software export cleanly', () => {
  const rows = [
    {
      ID: 1,
      CEDULA: 10337151,
      APELLIDO: 'COLTELLACCI',
      NOMBRE: 'ROMANO',
      'FECHA INGRESO': '.31/08/2021',
      'ULT. CITA': '.00/01/000',
      DOCTOR: 'Admin .',
      MOTIVO: 'CONTROL',
      TELEFONO: 4242268422,
      EMAIL: 'ROMANOCOLT@GMAIL.COM'
    },
    {
      ID: 3,
      CEDULA: 196729996,
      APELLIDO: 'PEREZ',
      NOMBRE: 'CARLA',
      'FECHA INGRESO': '.02/09/2021',
      'ULT. CITA': '.00/01/000',
      DOCTOR: 'ANTONIO MORERA',
      MOTIVO: 'CONTROL',
      TELEFONO: 4129258320,
      EMAIL: 'ALIBATTAGLIA'
    },
    {
      ID: 6,
      CEDULA: 82030237,
      APELLIDO: 'GUTIERREZ',
      NOMBRE: 'JUAN CARLOS',
      'FECHA INGRESO': '.03/09/2021',
      'ULT. CITA': '.08/09/2021',
      DOCTOR: 'ANTONIO MORERA',
      MOTIVO: 'DOLOR',
      TELEFONO: 4241805946,
      EMAIL: 'GUTYGUTIERREZ3699@GMAIL.COM'
    }
  ];

  const parsed = parsePatientsFromRows(rows, 'Excel/CSV');
  assert.equal(parsed.length, 3);

  assert.equal(parsed[0].historyNumber, '1');
  assert.equal(parsed[0].cedula, '10337151');
  assert.equal(parsed[0].name, 'ROMANO COLTELLACCI');
  assert.equal(parsed[0].admissionDate, '31/08/2021');
  assert.equal(parsed[0].lastAppointmentDate, undefined);
  assert.equal(parsed[0].doctorName, 'Clínica Corona');
  assert.equal(parsed[0].consultationReason, 'control');
  assert.equal(parsed[0].phone, '0424-2268422');
  assert.equal(parsed[0].email, 'romanocolt@gmail.com');

  assert.equal(parsed[1].name, 'CARLA PEREZ');
  assert.equal(parsed[1].phone, '0412-9258320');
  assert.equal(parsed[1].email, ''); // ALIBATTAGLIA ignored as invalid email

  assert.equal(parsed[2].consultationReason, 'dolor');
  assert.equal(parsed[2].lastAppointmentDate, '08/09/2021');
  assert.equal(spreadsheetDateToIso(parsed[2].lastAppointmentDate || ''), '2021-09-08');
});

test('isPatientNotifiable blocks deceased/inactive patients and filterContactsSegment excludes them by default', () => {
  assert.equal(isPatientNotifiable({ patientInactive: false, notificationsBlocked: false }), true);
  assert.equal(isPatientNotifiable({ patientInactive: true }), false);
  assert.equal(isPatientNotifiable({ inactiveReason: 'fallecimiento' }), false);
  assert.equal(isPatientNotifiable({ notificationsBlocked: true }), false);
  assert.equal(isPatientNotifiable(null), false);

  const contacts = [
    { id: 'p1', gender: 'M', age: 40, balance: 50, patientInactive: false, notificationsBlocked: false },
    { id: 'p2', gender: 'F', age: 72, balance: 100, patientInactive: true, inactiveReason: 'fallecimiento', notificationsBlocked: true },
    { id: 'p3', gender: 'M', age: 55, balance: 20, notificationsBlocked: true }
  ];

  const activeOnly = filterContactsSegment(contacts, {});
  assert.deepEqual(activeOnly.map((c) => c.id), ['p1']);

  const withInactive = filterContactsSegment(contacts, { includeInactive: true });
  assert.equal(withInactive.length, 3);
});

test('sanitizePatientNumericId strips PDF/MIG/RH prefixes leaving only numeric ID and PDF parser never emits PDF- IDs', () => {
  assert.equal(sanitizePatientNumericId('PDF-001'), '1');
  assert.equal(sanitizePatientNumericId('PDF-024'), '24');
  assert.equal(sanitizePatientNumericId('MIG-0005'), '5');
  assert.equal(sanitizePatientNumericId('RH-142'), '142');
  assert.equal(sanitizePatientNumericId('18'), '18');
  assert.equal(sanitizePatientNumericId('', 7), '7');

  const pdfLines = [
    '14 V-21.345.678 MARIA FERNANDA LOPEZ 0414-5556677 maria.lopez@gmail.com',
    'V-18.111.222 PEDRO JOSE RAMOS 0424-2223344 pedro@correo.com'
  ].join('\n');
  const parsed = parsePatientsFromPdfText(pdfLines, 'PDF');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].historyNumber, '14');
  assert.equal(parsed[1].historyNumber, '2');
  assert.ok(!String(parsed[0].historyNumber).includes('PDF'));
  assert.ok(!String(parsed[1].historyNumber).includes('PDF'));
});

test('partitionValidCleanPatients filters out rows with X in nombre/apellido/cedula or invalid email/cedula while preserving valid names like Alexis/Felix', () => {
  const candidates = [
    { name: 'ALEXIS MUJICA', cedula: '10337151', email: 'alexis@gmail.com' }, // Valid despite letter x in Alexis
    { name: 'FELIX GOMEZ', cedula: 'V-14567890', email: 'felix@hotmail.com' }, // Valid despite letter x in Felix
    { name: 'JUAN X', cedula: '12345678', email: 'juan@gmail.com' }, // Reject: standalone X
    { name: 'X PEREZ', cedula: '12345679', email: 'xperez@gmail.com' }, // Reject: standalone X
    { name: 'MARIA XX LOPEZ', cedula: '19876543', email: 'maria@gmail.com' }, // Reject: XX
    { name: 'LUIS ROJAS', cedula: 'V-123X45', email: 'luis@gmail.com' }, // Reject: X in cedula
    { name: 'PEDRO SOLO', cedula: '196729996', email: 'ALIBATTAGLIA' }, // Reject: invalid email
    { name: 'CARLOS', cedula: '18765432', email: 'carlos@gmail.com' }, // Reject: missing surname (single word)
    { name: 'ANA PAULA ROJAS', cedula: 'PDF-2', email: 'ana@gmail.com' } // Reject: invalid PDF- cedula
  ];

  assert.equal(isValidCleanPatientRecord(candidates[0]), true);
  assert.equal(isValidCleanPatientRecord(candidates[2]), false);
  assert.equal(isValidCleanPatientRecord(candidates[5]), false);

  const { valid, rejected } = partitionValidCleanPatients(candidates);
  assert.deepEqual(valid.map(v => v.name), ['ALEXIS MUJICA', 'FELIX GOMEZ']);
  assert.equal(rejected.length, 7);
});

test('partitionValidCleanPatients rejects repeated-character junk emails like YYYYY@HHHHH.COM and malformed TLDs', () => {
  const { valid, rejected } = partitionValidCleanPatients([
    { name: 'LEONARDO MENDOZA', cedula: '14253787', email: 'YYYYY@HHHHH.COM' },
    { name: 'HELLEN GUEVARA', cedula: '30796032', email: 'UUUUUU@UUUUU.COM' },
    { name: 'CARIDAD FERNANDEZ', cedula: '11199268', email: 'CFEL911@GMAIL.C' },
    { name: 'XIOMARA CAÑIZALES', cedula: '6233574', email: 'XANGELINACANIZALES@GMAIL.COM' }
  ]);
  assert.deepEqual(valid.map(v => v.name), ['XIOMARA CAÑIZALES']);
  assert.equal(rejected.length, 3);
});

test('parsePatientsFromCoordinatePdfPages accurately pairs horizontally split Excel-to-PDF blocks without leaking Admin into patient names', () => {
  const mk = (x: number, y: number, str: string) => ({ str, transform: [1, 0, 0, 1, x, y] });
  const leftPage1 = [
    mk(53, 750, 'LISTADO DE PACIENTES'),
    mk(53, 730, 'ID'), mk(118, 730, 'CEDULA'), mk(183, 730, 'APELLIDO'), mk(248, 730, 'NOMBRE'), mk(313, 730, 'FECHA INGRESO'), mk(379, 730, 'ULT. CITA'), mk(444, 730, 'DOCTOR'),
    mk(109, 710, '1'), mk(134, 710, '10337151'), mk(183, 710, 'COLTELLACCI CASTILLO'), mk(248, 710, 'ROMANO'), mk(313, 710, '.31/08/2021'), mk(379, 710, '.00/01/000'), mk(444, 710, 'Admin .')
  ];
  const leftPage2NoHeader = [
    mk(109, 750, '2'), mk(140, 750, '3876638'), mk(183, 750, 'SANCHEZ'), mk(248, 750, 'NELSON'), mk(313, 750, '.02/09/2021'), mk(379, 750, '.20/06/2022'), mk(444, 750, 'ANTONIO MORERA')
  ];
  const rightPage1 = [
    mk(53, 730, 'MOTIVO'), mk(118, 730, 'TELEFONO'), mk(183, 730, 'EMAIL'),
    mk(53, 710, 'CONTROL'), mk(123, 710, '4242268422'), mk(183, 710, 'ROMANOCOLT@GMAIL.COM')
  ];
  const rightPage2NoHeader = [
    mk(53, 750, 'CONTROL'), mk(123, 750, '4265162620'), mk(183, 750, 'NELSONSANFER@HOTMAIL.COM')
  ];

  const parsed = parsePatientsFromCoordinatePdfPages([leftPage1, leftPage2NoHeader, rightPage1, rightPage2NoHeader], 'PDF');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].historyNumber, '1');
  assert.equal(parsed[0].name, 'ROMANO COLTELLACCI CASTILLO');
  assert.equal(parsed[0].doctorName, 'Clínica Corona');
  assert.equal(parsed[0].email, 'romanocolt@gmail.com');
  assert.equal(parsed[1].historyNumber, '2');
  assert.equal(parsed[1].name, 'NELSON SANCHEZ');
  assert.equal(parsed[1].phone, '0426-5162620');
});

test('CORONA_SEED_PATIENTS contains only clean real patients with numeric IDs and zero X or PDF- artifacts', () => {
  assert.ok(CORONA_SEED_PATIENTS.length >= 700);
  for (const p of CORONA_SEED_PATIENTS) {
    assert.ok(/^\d+$/.test(p.historyNumber || ''), `Expected purely numeric historyNumber, got ${p.historyNumber}`);
    assert.ok(!String(p.historyNumber).includes('PDF'), `Unexpected PDF- prefix in ${p.historyNumber}`);
    assert.ok(!/\bADMIN\b/i.test(p.name), `Unexpected ADMIN in patient name ${p.name}`);
    assert.equal(
      isValidCleanPatientRecord({ name: p.name, cedula: p.cedula, email: p.email }),
      true,
      `Seed patient failed strict clean validation: ${p.historyNumber} ${p.name} ${p.cedula} ${p.email}`
    );
  }
});

test('paginateList slices items accurately and clamps out-of-range page numbers', () => {
  const empty = paginateList([], 3, 20);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.page, 1);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.totalItems, 0);
  assert.equal(empty.startIndex, 0);
  assert.equal(empty.endIndex, 0);

  const numbers = Array.from({ length: 45 }, (_, i) => i + 1);
  const page1 = paginateList(numbers, 1, 20);
  assert.equal(page1.totalItems, 45);
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.startIndex, 1);
  assert.equal(page1.endIndex, 20);
  assert.deepEqual(page1.items.slice(0, 3), [1, 2, 3]);

  const page2 = paginateList(numbers, 2, 20);
  assert.equal(page2.page, 2);
  assert.equal(page2.startIndex, 21);
  assert.equal(page2.endIndex, 40);

  const clampedHigh = paginateList(numbers, 99, 20);
  assert.equal(clampedHigh.page, 3);
  assert.equal(clampedHigh.startIndex, 41);
  assert.equal(clampedHigh.endIndex, 45);
  assert.deepEqual(clampedHigh.items, [41, 42, 43, 44, 45]);

  const clampedLow = paginateList(numbers, -5, 10);
  assert.equal(clampedLow.page, 1);
  assert.equal(clampedLow.totalPages, 5);
  assert.equal(clampedLow.items.length, 10);
});

test('extractToothNumberFromTranscript and buildRecordedSequencePayload build clean sequence entries from voice dictation', () => {
  assert.equal(extractToothNumberFromTranscript('Paciente presenta sensibilidad en pieza 21 tras obturación'), 21);
  assert.equal(extractToothNumberFromTranscript('Revisión de molar #46 sin dolor'), 46);
  assert.equal(extractToothNumberFromTranscript('Sin pieza numérica específica'), undefined);

  const payload = buildRecordedSequencePayload({
    transcript: '  Resina estética aplicada en pieza 16 sin complicaciones.  ',
    procedure: '',
    durationSeconds: 75
  });
  assert.equal(payload.procedure, 'Evolución Clínica por Voz');
  assert.equal(payload.toothNumber, 16);
  assert.equal(payload.audioDuration, '01:15');
  assert.match(payload.notes, /\[Grabación en Consulta \(01:15\)\]: Resina estética/);
});

test('filterCashClosingMovements partitions period receipts, lab expenses, and operating expenses cleanly', () => {
  const samplePayments: any[] = [
    { id: 'p1', date: '2026-11-10', amount: 120, method: 'efectivo' },
    { id: 'p2', date: '2026-11-12', amount: 80, method: 'pago_movil' },
    { id: 'p3', date: '2026-10-05', amount: 50, method: 'zelle' }
  ];
  const sampleExpenses: any[] = [
    { id: 'e1', date: '2026-11-10', category: 'laboratorio', amountUsd: 45 },
    { id: 'e2', date: '2026-11-11', category: 'insumos', amountUsd: 30 },
    { id: 'e3', date: '2026-11-19', category: 'laboratorio', amountUsd: 90 }
  ];

  const res = filterCashClosingMovements(samplePayments, sampleExpenses, '2026-11-09', '2026-11-15');
  assert.deepEqual(res.periodPayments.map((p) => p.id), ['p1', 'p2']);
  assert.deepEqual(res.periodLabExpenses.map((e) => e.id), ['e1']);
  assert.deepEqual(res.periodOperatingExpenses.map((e) => e.id), ['e2']);
});

test('buildPresupuestoPdfFilename and buildPresupuestoPdfFile generate valid PDF bytes and formatted filename', async () => {
  const filename = buildPresupuestoPdfFilename({
    folio: '0009048',
    currencyMode: 'USD',
    patientName: 'ANTONIO MORERA'
  });
  assert.equal(filename, 'Presupuesto_0009048_USD_ANTONIO_MORERA.pdf');

  const filenameBs = buildPresupuestoPdfFilename({
    folio: '0009048',
    currencyMode: 'BS',
    patientName: 'ANTONIO MORERA'
  });
  assert.equal(filenameBs, 'Presupuesto_0009048_BS_ANTONIO_MORERA.pdf');

  const result = buildPresupuestoPdfFile({
    budget: {
      id: 'bud-pdf-1',
      folio: '0009048',
      patientId: 'pat-10',
      patientName: 'ANTONIO MORERA',
      date: '2026-11-14',
      validUntil: '2026-12-14',
      doctorName: 'Dr. Antonio Morera',
      doctorColegiado: 'COV-21870',
      doctorMpps: 'MPPS-98412',
      items: [
        {
          id: 'it-1',
          name: '0210 - CORONA LIBRE DE METAL ZIRCONIO',
          category: 'Prótesis',
          phase: 'fase_rehabilitadora',
          toothNumber: 12,
          quantity: 1,
          price: 280,
          discount: 0,
          total: 280
        }
      ],
      subtotal: 280,
      discountTotal: 0,
      tax: 0,
      total: 280,
      status: 'pendiente',
      notes: 'Nuevo plan de tratamiento.'
    },
    patient: {
      id: 'pat-10',
      name: 'ANTONIO MORERA',
      cedula: '24041972',
      historyNumber: '10',
      phone: '0412-6035218',
      email: 'antojmm95@gmail.com'
    },
    doctor: {
      name: 'Dr. Antonio Morera',
      specialty: 'Odontología Integral & Prótesis',
      colegiado: 'COV-21870',
      mpps: 'MPPS-98412',
      rif: 'V-15165183-2'
    },
    exchangeRate: 911.62,
    clinicConfig: {
      clinicName: 'Clínica Odontológica Corona',
      address: 'AV. PRINCIPAL LAS MERCEDES, EDIF. CORONA PISO 2, CARACAS, VENEZUELA',
      phone: '+58 424-2140058',
      email: 'contacto@clinicacorona.com',
      rif: 'J-31298456-0'
    },
    currencyMode: 'USD',
    rateLabel: 'Dólar BCV'
  });

  assert.equal(result.filename, 'Presupuesto_0009048_USD_ANTONIO_MORERA.pdf');
  assert.ok(result.blob.size > 500, `Expected PDF blob > 500 bytes, got ${result.blob.size}`);
  const headerBytes = new Uint8Array(await result.blob.slice(0, 5).arrayBuffer());
  const headerText = new TextDecoder().decode(headerBytes);
  assert.equal(headerText, '%PDF-');
});

test('Surgical and implant informed consent templates and PDF generator produce valid Corona PDF documents', async () => {
  assert.equal(SURGICAL_CONSENT_TEMPLATES.terceros_molares.frequentRisks?.length, 4);
  assert.equal(SURGICAL_CONSENT_TEMPLATES.terceros_molares.possibleComplications?.length, 10);
  assert.equal(IMPLANT_PHASES_GUIDE.length, 3);

  const fn = buildConsentPdfFilename({
    folio: 'CI-2026-0025',
    procedureType: 'terceros_molares',
    patientName: 'ANA YENISETH PEREIRA'
  });
  assert.equal(fn, 'Consentimiento_CI-2026-0025_TERCEROS_MOLARES_ANA_YENISETH_PEREIRA.pdf');

  const samplePatient: any = {
    id: 'pat-ana',
    name: 'ANA YENISETH PEREIRA',
    cedula: 'V-19136758',
    age: 37,
    gender: 'F',
    bloodType: 'O+',
    allergies: [],
    systemicConditions: [],
    regularMedications: [],
    phone: '0414-1234567',
    email: 'ana@correo.com',
    emergencyContact: { name: 'Familiar', phone: '0414-0000000', relationship: 'Hermana' },
    balance: 0,
    totalBilled: 0
  };

  const doctor = {
    name: 'Dr. Antonio Morera',
    colegiado: 'COV-21870',
    mpps: 'MPPS-98412',
    phone: '+58 424 2140058',
    email: 'antojmm95@gmail.com'
  };

  const clinicConfig: any = {
    clinicName: 'Clínica Odontológica Corona',
    address: 'Ciudad Tiuna, Caracas',
    phone: '0212-6830229',
    email: 'contacto@clinicacorona.com',
    rif: 'J-31298456-0'
  };

  const cordalesForm = createInitialConsentFormState('terceros_molares', doctor.name);
  cordalesForm.imagingStudies = { panoramica: true, periapical: false, cbctTac: true };
  cordalesForm.anesthesiaModality = 'local_sedacion';

  const cordalesPdf = buildConsentPdfDoc({
    folio: 'CI-2026-0025',
    procedureType: 'terceros_molares',
    patient: samplePatient,
    doctor,
    formState: cordalesForm,
    clinicConfig,
    generatedDateText: '14 de Noviembre de 2026'
  });
  const cordalesBlob = cordalesPdf.doc.output('blob');
  assert.ok(cordalesBlob.size > 800);
  const cordalesHdr = new TextDecoder().decode(new Uint8Array(await cordalesBlob.slice(0, 5).arrayBuffer()));
  assert.equal(cordalesHdr, '%PDF-');

  const implantesForm = createInitialConsentFormState('implantes', doctor.name);
  implantesForm.implantIdentification = 'Pz 36 · Straumann 4.1x10mm';
  const implantesPdf = buildConsentPdfDoc({
    folio: 'CI-2026-0026',
    procedureType: 'implantes',
    patient: samplePatient,
    doctor,
    formState: implantesForm,
    clinicConfig,
    generatedDateText: '14 de Noviembre de 2026'
  });
  assert.equal(implantesPdf.filename, 'Consentimiento_CI-2026-0026_IMPLANTES_ANA_YENISETH_PEREIRA.pdf');
  const impBlob = implantesPdf.doc.output('blob');
  assert.ok(impBlob.size > 800);
});

test('QR intake route parser locks access strictly to Historia Clínica only for QR links and unlocks normal root access', () => {
  const normal = parseQrIntakeRoute('', '/');
  assert.equal(normal.isQrIntakeLocked, false);

  const shareUrl = buildQrIntakeShareUrl('https://corona.app', 'tpl-anamnesis-general');
  assert.equal(shareUrl, 'https://corona.app/?ficha=tpl-anamnesis-general');
  const parsedShare = parseQrIntakeRoute('?ficha=tpl-anamnesis-general', '/');
  assert.equal(parsedShare.isQrIntakeLocked, true);
  assert.equal(parsedShare.templateId, 'tpl-anamnesis-general');
  assert.equal(parsedShare.patientId, undefined);

  const patientQrUrl = buildPatientHistoryQrUrl('https://corona.app', 'pat-10');
  assert.equal(patientQrUrl, 'https://corona.app/?historia_qr=pat-10&ficha=tpl-anamnesis-general');
  const parsedPatQr = parseQrIntakeRoute('?historia_qr=pat-10&ficha=tpl-anamnesis-general', '/');
  assert.equal(parsedPatQr.isQrIntakeLocked, true);
  assert.equal(parsedPatQr.patientId, 'pat-10');
  assert.equal(parsedPatQr.templateId, 'tpl-anamnesis-general');

  const pathQr = parseQrIntakeRoute('', '/historia-qr');
  assert.equal(pathQr.isQrIntakeLocked, true);

  assert.deepEqual(parseCommaListInput('Penicilina, Látex, Ninguna, '), ['Penicilina', 'Látex']);
  assert.deepEqual(parseCommaListInput('Niega'), []);
});

test('Medical prescription PDF generator and WhatsApp/Email formatters produce valid Corona PDF files', async () => {
  const filename = buildRecipePdfFilename({
    folio: 'REC-2026-0040',
    patientName: 'Carla Perez'
  });
  assert.equal(filename, 'Recipe_REC-2026-0040_CARLA_PEREZ.pdf');

  const sampleRx: any = {
    id: 'rx-test-1',
    folio: 'REC-2026-0040',
    patientId: 'pat-3',
    patientName: 'CARLA PEREZ',
    patientCedula: '196729996',
    patientAge: 34,
    date: '2026-11-16',
    doctorName: 'Dr. Antonio Morera',
    doctorSpecialty: 'Odontología Integral & Prótesis',
    doctorColegiado: 'COV-21870',
    doctorMpps: 'MPPS-98412',
    medications: [
      {
        name: 'Amoxicilina + Ác. Clavulánico',
        presentation: 'Tabletas 875/125 mg',
        dose: '1 tableta',
        frequency: 'Cada 12 horas',
        duration: 'Por 7 días',
        instructions: 'Cumplir tratamiento completo sin suspender.'
      }
    ],
    generalIndications: 'Dieta blanda e higiene oral cuidadosa.',
    signed: true
  };

  const samplePatient: any = {
    id: 'pat-3',
    name: 'CARLA PEREZ',
    cedula: '196729996',
    age: 34,
    historyNumber: '3',
    phone: '0412-9258320',
    email: 'carla@correo.com',
    allergies: ['Penicilina']
  };

  const doctor: any = {
    name: 'Dr. Antonio Morera',
    specialty: 'Odontología Integral & Prótesis',
    colegiado: 'COV-21870',
    mpps: 'MPPS-98412',
    rif: 'V-15165183-2'
  };

  const clinicConfig: any = {
    clinicName: 'Clínica Odontológica Corona',
    address: 'Ciudad Tiuna, Torre A11 PB Local L2, Caracas',
    phone: '0212-6830229',
    email: 'contacto@clinicacorona.com',
    rif: 'J-31298456-0'
  };

  const waText = formatRecipeWhatsAppText({ rx: sampleRx, doctor, clinicConfig });
  assert.match(waText, /REC-2026-0040/);
  assert.match(waText, /COV-21870/);
  assert.match(waText, /MPPS-98412/);
  assert.match(waText, /Recipe_REC-2026-0040_CARLA_PEREZ\.pdf/);

  const mail = formatRecipeEmailContent({ rx: sampleRx, patient: samplePatient, doctor, clinicConfig });
  assert.match(mail.subject, /REC-2026-0040/);
  assert.match(mail.body, /Amoxicilina/);
  assert.match(mail.body, /COV-21870/);

  const pdfRes = buildRecipePdfFile({ rx: sampleRx, patient: samplePatient, doctor, clinicConfig });
  assert.equal(pdfRes.filename, 'Recipe_REC-2026-0040_CARLA_PEREZ.pdf');
  assert.ok(pdfRes.blob.size > 800, `Expected recipe PDF > 800 bytes, got ${pdfRes.blob.size}`);
  const hdr = new TextDecoder().decode(new Uint8Array(await pdfRes.blob.slice(0, 5).arrayBuffer()));
  assert.equal(hdr, '%PDF-');
});

test('upsertVademecumMedication adds new custom medications, updates by normalized name, and removes cleanly', () => {
  const initial = [
    {
      id: 'vad-1',
      name: 'Ibuprofeno',
      presentation: 'Tabletas 600 mg',
      defaultDose: '1 tableta',
      defaultFreq: 'Cada 8 horas',
      defaultDur: 'Por 3 días',
      instructions: 'Tomar con comida.',
      isCustom: false
    }
  ];

  const added = upsertVademecumMedication(initial, {
    name: 'Azitromicina',
    presentation: 'Tabletas 500 mg',
    defaultDose: '1 tableta',
    defaultFreq: 'Cada 24 horas',
    defaultDur: 'Por 3 días',
    instructions: 'Tomar a la misma hora.'
  });
  assert.equal(added.isUpdate, false);
  assert.equal(added.list.length, 2);
  assert.equal(added.saved.isCustom, true);

  const updated = upsertVademecumMedication(added.list, {
    name: 'azitromicina',
    presentation: 'Suspensión 200 mg/5 ml',
    defaultDose: '5 ml',
    defaultFreq: 'Cada 24 horas',
    defaultDur: 'Por 5 días'
  });
  assert.equal(updated.isUpdate, true);
  assert.equal(updated.list.length, 2);
  assert.equal(updated.saved.presentation, 'Suspensión 200 mg/5 ml');

  const removed = removeVademecumMedication(updated.list, added.saved.id);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].name, 'Ibuprofeno');
});

test('resolvePublicQrOrigin preserves live active host by default (avoiding 404 on unshared ais-pre) and respects configured clinic URLs', () => {
  const devResolved = resolvePublicQrOrigin('https://ais-dev-abc123.us-east1.run.app');
  assert.equal(devResolved.origin, 'https://ais-dev-abc123.us-east1.run.app');
  assert.equal(devResolved.isDevPreviewHost, true);
  assert.equal(devResolved.suggestedSharedOrigin, 'https://ais-pre-abc123.us-east1.run.app');
  assert.equal(devResolved.isLocalOnly, false);

  const shareFromDev = buildQrIntakeShareUrl(
    'https://ais-dev-abc123.us-east1.run.app',
    'tpl-anamnesis-general'
  );
  assert.equal(
    shareFromDev,
    'https://ais-dev-abc123.us-east1.run.app/?ficha=tpl-anamnesis-general'
  );

  const customOverride = resolvePublicQrOrigin(
    'http://localhost:3000',
    'https://historia.clinicacorona.com/agenda'
  );
  assert.equal(customOverride.origin, 'https://historia.clinicacorona.com');
  assert.equal(customOverride.isLocalOnly, false);
  assert.equal(customOverride.isDevPreviewHost, false);

  const localCheck = resolvePublicQrOrigin('http://localhost:3000');
  assert.equal(localCheck.isLocalOnly, true);
});

test('QR patient handoff URL encodes UTF-8 patient data, decodes full URLs or raw tokens, and keeps ?ingreso_qr unlocked for reception', () => {
  const payload = {
    templateId: 'tpl-anamnesis-general',
    templateName: 'Historia Clínica Integral',
    name: 'MARÍA FERNANDA PEÑA',
    cedula: 'V-22.456.789',
    phone: '0414-1234567',
    email: '',
    birthDate: '1994-05-18',
    gender: 'F' as const,
    allergies: 'Penicilina, Látex',
    systemicConditions: 'Ninguna',
    emergencyContact: {
      name: 'José Peña',
      phone: '0412-9998877',
      relationship: 'Padre'
    }
  };

  const handoffUrl = buildClinicHandoffUrl(
    'https://ais-pre-xyz.us-east1.run.app',
    payload
  );
  assert.ok(handoffUrl.startsWith('https://ais-pre-xyz.us-east1.run.app/?ingreso_qr='));

  const queryOnly = handoffUrl.slice(handoffUrl.indexOf('?'));
  const routeCheck = parseQrIntakeRoute(queryOnly, '/');
  assert.equal(routeCheck.isQrIntakeLocked, false);

  const decodedFromUrl = decodeQrPatientTransferPayload(handoffUrl);
  assert.ok(decodedFromUrl);
  assert.equal(decodedFromUrl?.name, 'MARÍA FERNANDA PEÑA');
  assert.equal(decodedFromUrl?.cedula, 'V-22.456.789');
  assert.equal(decodedFromUrl?.allergies, 'Penicilina, Látex');
  assert.equal(decodedFromUrl?.emergencyContact?.name, 'José Peña');

  const rawToken = encodeQrPatientTransferPayload(payload);
  const decodedFromRaw = decodeQrPatientTransferPayload(rawToken);
  assert.equal(decodedFromRaw?.name, 'MARÍA FERNANDA PEÑA');
  assert.equal(decodeQrPatientTransferPayload('not-valid-token'), null);

  assert.equal(normalizeCedulaKey('V-22.456.789'), '22456789');
  assert.equal(normalizeCedulaKey('22456789'), '22456789');
  assert.equal(computeAgeFromBirthDate('1994-05-18', 2026), 32);
  assert.equal(computeAgeFromBirthDate('', 2026), 30);
});

test('normalizeWhatsAppPhone and resolvePatientWhatsAppPhone route directly to patient chat across local, +580, 0058, and multi-number formats', () => {
  assert.equal(normalizeWhatsAppPhone('0414-1234567', '58'), '584141234567');
  assert.equal(normalizeWhatsAppPhone('+58 0414 123-4567', '58'), '584141234567');
  assert.equal(normalizeWhatsAppPhone('00584241234567', '58'), '584241234567');
  assert.equal(normalizeWhatsAppPhone('4128761234', '58'), '584128761234');
  assert.equal(normalizeWhatsAppPhone('0414-1112233 / 0412-9998877', '58'), '584141112233');
  assert.equal(normalizeWhatsAppPhone('', '58'), '');
  assert.equal(normalizeWhatsAppPhone('123', '58'), '');

  const fromFallback = resolvePatientWhatsAppPhone({
    phone: '',
    phones: { mobile: '0424-2268422' }
  });
  assert.equal(fromFallback.normalizedPhone, '584242268422');
  assert.equal(fromFallback.displayPhone, '+584242268422');

  const fromWhatsappPreferred = resolvePatientWhatsAppPhone({
    phone: '0212-5550000',
    phones: { whatsapp: '0414-9876543', mobile: '0412-1112222' }
  });
  assert.equal(fromWhatsappPreferred.normalizedPhone, '584149876543');

  const fromCustomOverride = resolvePatientWhatsAppPhone(
    { phone: '0414-9876543' },
    '0416-7778899'
  );
  assert.equal(fromCustomOverride.normalizedPhone, '584167778899');
  assert.equal(
    buildWhatsAppLink('0424-2268422', 'Su récipe'),
    'https://wa.me/584242268422?text=Su%20r%C3%A9cipe'
  );
});

test('Supplier payment receipt PDF generator formats folio, filename, Bs equivalent, and valid Corona PDF bytes', () => {
  const sampleExpense = {
    id: 'exp-1763480001234',
    date: '2026-11-18',
    category: 'otros' as const,
    description: 'JARDINERIA',
    providerName: 'GUSTAVO MACERO',
    providerDocument: 'V-14230981',
    invoiceNumber: 'FAC-4956',
    controlNumberSeniat: '00-64814',
    paymentReference: 'Efectivo USD',
    notes: 'Mantenimiento de áreas verdes consultorio',
    amountUsd: 7,
    amountBs: 6381.34,
    paymentMethod: 'Efectivo USD',
    status: 'pagado' as const,
    monthCorrelation: '2026-11'
  };

  const folio = resolveExpenseReceiptFolio(sampleExpense);
  assert.equal(folio, 'CE-2026-1234');

  const filename = buildExpenseReceiptPdfFilename({
    folio,
    providerName: sampleExpense.providerName
  });
  assert.equal(filename, 'Recibo_Pago_CE-2026-1234_GUSTAVO_MACERO.pdf');
  assert.equal(computeExpenseBsEquivalent(7, 911.62), 6381.34);

  const clinicConfig = {
    clinicName: 'Clínica Odontológica Corona',
    rif: 'J-31298456-0',
    phone: '0212-6830229',
    email: 'info@clinicacorona.com',
    address: 'Ciudad Tiuna, Fuerte Tiuna, Caracas',
    logoUrl: '',
    waCountryCode: '58',
    waTemplateReminder: '',
    igftRate: 3
  };

  const pdfRes = buildExpenseReceiptPdfFile({
    expense: sampleExpense,
    clinicConfig,
    exchangeRate: 911.62,
    issuerName: 'Dr. Antonio Morera'
  });
  assert.equal(pdfRes.folio, 'CE-2026-1234');
  assert.equal(pdfRes.filename, 'Recibo_Pago_CE-2026-1234_GUSTAVO_MACERO.pdf');
  assert.ok(pdfRes.blob.size > 1000, `Expected expense receipt PDF > 1000 bytes, got ${pdfRes.blob.size}`);
});

