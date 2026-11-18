import { SoftwareImportPatient } from '../types/dental';

function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumericAmount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw * 100) / 100);
  }
  if (typeof raw !== 'string') return 0;
  const cleaned = raw.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) return 0;
  const normalized =
    cleaned.includes(',') && !cleaned.includes('.')
      ? cleaned.replace(',', '.')
      : cleaned.replace(/,/g, '');
  const val = parseFloat(normalized);
  return Number.isFinite(val) ? Math.max(0, Math.round(val * 100) / 100) : 0;
}

/**
 * Normaliza el ID / Nro. Historia de un paciente eliminando prefijos como "PDF-", "MIG-", "RH-"
 * y dejando únicamente el número limpio.
 */
export function sanitizePatientNumericId(raw: unknown, fallbackNumber?: number): string {
  const str = String(raw ?? '').trim();
  const hadPrefix = /^(?:pdf|mig|rh|sin-ci|pac|hist)[-\s_:]*/i.test(str);
  const stripped = str.replace(/^(?:pdf|mig|rh|sin-ci|pac|hist)[-\s_:]*/i, '').trim();
  const digitsOnly = stripped.replace(/\D/g, '');

  if (digitsOnly) {
    if (hadPrefix) {
      const parsed = parseInt(digitsOnly, 10);
      return Number.isFinite(parsed) ? String(parsed) : digitsOnly;
    }
    return digitsOnly;
  }

  return fallbackNumber !== undefined ? String(fallbackNumber) : '';
}

const JUNK_NAME_TOKENS = new Set([
  'na',
  'n/a',
  'nn',
  'sd',
  's/d',
  'sin',
  'sinnombre',
  'sinapellido',
  'prueba',
  'test',
  'paciente',
  'desconocido',
  'anonimo',
  'pendiente',
  'vacio',
  'null',
  'undefined'
]);

export function hasInvalidXOrPlaceholder(text: string): boolean {
  const raw = (text || '').trim();
  if (!raw) return true;
  const tokens = raw.split(/[\s.,/\-_'"()]+/).filter(Boolean);
  if (tokens.length === 0) return true;

  for (const tok of tokens) {
    const cleanTok = stripAccents(tok);
    if (!cleanTok) continue;
    // Standalone X, XX, XXX, etc.
    if (/^x+$/i.test(cleanTok)) return true;
    // Repeated X anywhere inside a word (e.g. "JUANXX")
    if (/xx/i.test(cleanTok)) return true;
    if (JUNK_NAME_TOKENS.has(cleanTok)) return true;
  }
  return false;
}

export function isValidNameAndSurname(
  fullName: string,
  firstName?: string,
  lastName?: string
): boolean {
  const combined = (fullName || '').replace(/\s+/g, ' ').trim();
  if (!combined || hasInvalidXOrPlaceholder(combined)) return false;

  if (firstName !== undefined && firstName.trim()) {
    if (hasInvalidXOrPlaceholder(firstName)) return false;
    const firstLetters = stripAccents(firstName).replace(/[^a-z]/g, '');
    if (firstLetters.length < 2) return false;
  }

  if (lastName !== undefined && lastName.trim()) {
    if (hasInvalidXOrPlaceholder(lastName)) return false;
    const lastLetters = stripAccents(lastName).replace(/[^a-z]/g, '');
    if (lastLetters.length < 2) return false;
  }

  // Extract valid alphabetic words (at least 2 words: Nombre + Apellido)
  const words = combined
    .split(/[\s,]+/)
    .map((w) => stripAccents(w).replace(/[^a-z]/g, ''))
    .filter((w) => w.length >= 2);

  if (words.length < 2) return false;

  // Reject auto-generated fallback strings
  if (/^paciente\b/i.test(stripAccents(combined))) return false;

  return true;
}

export function isValidCedula(rawCedula: string): boolean {
  const raw = (rawCedula || '').trim();
  if (!raw) return false;
  // Reject any X in cedula or auto-generated SIN-CI / PDF markers
  if (/x/i.test(raw)) return false;
  if (/^(?:sin-?ci|pdf)/i.test(raw)) return false;

  const normalized = raw.replace(/\s+/g, '').toUpperCase();
  // Must optionally start with V/E/J/P followed by digits/dots/hyphens, no other letters
  if (!/^(?:[VEJP]-?)?[\d.-]{5,14}$/.test(normalized)) return false;

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length < 5 || digitsOnly.length > 10) return false;
  // Reject all identical digits like 0000000 or 1111111
  if (/^(\d)\1+$/.test(digitsOnly)) return false;

  return true;
}

export function isValidEmailAddress(rawEmail: string): boolean {
  const cleaned = normalizeEmailField(rawEmail);
  if (!cleaned) return false;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) return false;
  const [localPart, domain] = cleaned.split('@');
  if (!localPart || !domain) return false;
  if (/^x+$/i.test(localPart) || /xx/i.test(localPart)) return false;
  if (/^([a-z0-9])\1{2,}$/i.test(localPart)) return false;
  if (/^([a-z0-9])\1{2,}\./i.test(domain)) return false;
  if (/^(?:no|sin|notiene|na|test|prueba)\d*$/i.test(localPart)) return false;
  if (/^x+\./i.test(domain) || /xx/i.test(domain)) return false;
  return true;
}

export interface CleanPatientCandidate {
  name: string;
  firstName?: string;
  lastName?: string;
  cedula: string;
  email: string;
}

export function getPatientValidationErrors(candidate: CleanPatientCandidate): string[] {
  const reasons: string[] = [];
  if (!isValidNameAndSurname(candidate.name, candidate.firstName, candidate.lastName)) {
    reasons.push('Nombre o Apellido inválido o con "X"');
  }
  if (!isValidCedula(candidate.cedula)) {
    reasons.push('Cédula inválida o con "X"');
  }
  if (!isValidEmailAddress(candidate.email)) {
    reasons.push('Correo inválido o faltante');
  }
  return reasons;
}

export function isValidCleanPatientRecord(candidate: CleanPatientCandidate): boolean {
  return getPatientValidationErrors(candidate).length === 0;
}

export function partitionValidCleanPatients<T extends CleanPatientCandidate>(
  list: T[]
): {
  valid: T[];
  rejected: Array<{ item: T; reasons: string[] }>;
} {
  const valid: T[] = [];
  const rejected: Array<{ item: T; reasons: string[] }> = [];

  for (const item of list) {
    const reasons = getPatientValidationErrors(item);
    if (reasons.length === 0) {
      valid.push(item);
    } else {
      rejected.push({ item, reasons });
    }
  }
  return { valid, rejected };
}

export function normalizeSpreadsheetDate(raw: unknown): string {
  if (raw === undefined || raw === null) return '';

  // Handle Excel serial date numbers (e.g. 44439)
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 10000 && raw < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + Math.round(raw) * 86400000);
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  let str = String(raw).trim();
  // Strip leading dots like ".31/08/2021" or ".00/01/000"
  str = str.replace(/^\.+/, '').trim();
  if (!str) return '';

  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const yearRaw = ddmmyyyy[3];
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10);
    if (day <= 0 || day > 31 || month <= 0 || month > 12 || year < 1900 || year > 2100) {
      return '';
    }
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (day <= 0 || day > 31 || month <= 0 || month > 12 || year < 1900 || year > 2100) {
      return '';
    }
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  return '';
}

export function spreadsheetDateToIso(ddmmyyyy: string): string {
  const m = (ddmmyyyy || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function normalizeVenezuelanPhone(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  // +58 4xx... -> 12 digits
  if (digits.startsWith('58') && digits.length >= 11) {
    const local = digits.slice(2);
    const prefix = local.slice(0, 3);
    const rest = local.slice(3);
    return `0${prefix}-${rest}`;
  }

  // Missing leading zero (e.g. 4242268422 -> 0424-2268422 or 414433777 -> 0414-433777)
  if ((digits.startsWith('4') || digits.startsWith('2')) && (digits.length === 9 || digits.length === 10)) {
    return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  // Already has leading zero (e.g. 04141234567)
  if (digits.startsWith('0') && (digits.length === 10 || digits.length === 11)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return digits;
}

export function mapConsultationReason(raw: unknown): string {
  const norm = stripAccents(String(raw || ''));
  if (!norm) return 'control';
  if (norm.includes('control') || norm.includes('revision')) return 'control';
  if (norm.includes('dolor') || norm.includes('urgencia')) return 'dolor';
  if (norm.includes('sangra') || norm.includes('encia')) return 'sangramiento_encia';
  if (norm.includes('estetica') || norm.includes('blanque')) return 'estetica';
  if (norm.includes('posicion') || norm.includes('ortod')) return 'mal_posicion';
  if (norm.includes('protes') || norm.includes('corona')) return 'protesis';
  return 'otros';
}

export function normalizeDoctorName(raw: unknown): string {
  const cleaned = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (/^admin\s*\.?$/i.test(cleaned)) return 'Clínica Corona';
  return cleaned;
}

export function normalizeEmailField(raw: unknown): string {
  const cleaned = String(raw || '').trim().toLowerCase();
  if (!cleaned) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : '';
}

function findExactOrAliasField(normalizedRow: Record<string, string>, exactAliases: string[], partialAliases: string[] = []): string {
  for (const alias of exactAliases) {
    if (normalizedRow[alias]) return normalizedRow[alias];
  }
  for (const [k, v] of Object.entries(normalizedRow)) {
    if (!v) continue;
    if (partialAliases.some((alias) => k.includes(alias))) return v;
  }
  return '';
}

export function parsePatientsFromRows(
  rows: Array<Record<string, unknown>>,
  sourceSoftware: SoftwareImportPatient['sourceSoftware'] = 'Excel/CSV'
): SoftwareImportPatient[] {
  const results: SoftwareImportPatient[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const normalizedRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      const cleanKey = stripAccents(key).replace(/\./g, '').replace(/\s+/g, ' ').trim();
      if (cleanKey && val !== undefined && val !== null) {
        normalizedRow[cleanKey] = String(val).trim();
      }
    }

    const firstName = findExactOrAliasField(
      normalizedRow,
      ['nombre', 'nombres', 'nombre completo', 'nombre y apellido', 'paciente', 'name', 'patient'],
      ['nombre']
    );
    const lastName = findExactOrAliasField(
      normalizedRow,
      ['apellido', 'apellidos', 'lastname'],
      ['apellido']
    );

    const combinedName =
      lastName && firstName && !stripAccents(firstName).includes(stripAccents(lastName))
        ? `${firstName} ${lastName}`.trim()
        : firstName || lastName;

    const cedula = findExactOrAliasField(
      normalizedRow,
      ['cedula', 'ci', 'documento', 'dni', 'rut', 'identificacion', 'nro documento'],
      ['cedula', 'documento']
    );
    const phoneRaw = findExactOrAliasField(
      normalizedRow,
      ['telefono', 'celular', 'movil', 'whatsapp', 'phone', 'tlf', 'tel'],
      ['telefono', 'celular']
    );
    const emailRaw = findExactOrAliasField(
      normalizedRow,
      ['email', 'correo', 'correo electronico', 'e-mail', 'mail'],
      ['email', 'correo']
    );
    const historyNumberRaw = findExactOrAliasField(
      normalizedRow,
      ['id', 'historia', 'nro historia', 'n historia', 'expediente', 'ficha', 'codigo'],
      ['historia']
    );
    const admissionRaw = findExactOrAliasField(
      normalizedRow,
      ['fecha ingreso', 'ingreso', 'fecha de ingreso', 'fec ingreso'],
      ['ingreso']
    );
    const lastAptRaw = findExactOrAliasField(
      normalizedRow,
      ['ult cita', 'ultima cita', 'ult. cita', 'ultimo control', 'ultima visita'],
      ['ult cita', 'ultima cita']
    );
    const doctorRaw = findExactOrAliasField(
      normalizedRow,
      ['doctor', 'odontologo', 'doctor tratante', 'medico'],
      ['doctor', 'odontologo']
    );
    const reasonRaw = findExactOrAliasField(
      normalizedRow,
      ['motivo', 'motivo consulta', 'motivo de consulta'],
      ['motivo']
    );
    const balanceRaw = findExactOrAliasField(
      normalizedRow,
      ['saldo', 'deuda', 'balance', 'por cobrar', 'saldo usd', 'saldousd'],
      ['saldo', 'deuda']
    );

    const cleanName = combinedName.replace(/\s+/g, ' ').trim();
    if (!cleanName && !cedula) continue;

    // Skip repeated header rows inside spreadsheets
    if (stripAccents(cleanName) === 'nombre apellido' || stripAccents(cedula) === 'cedula') {
      continue;
    }

    const admissionDate = normalizeSpreadsheetDate(admissionRaw);
    const lastAppointmentDate = normalizeSpreadsheetDate(lastAptRaw);
    const normalizedPhone = normalizeVenezuelanPhone(phoneRaw);
    const normalizedEmail = normalizeEmailField(emailRaw);
    const normalizedDoctor = normalizeDoctorName(doctorRaw);
    const normalizedReason = mapConsultationReason(reasonRaw);
    const cleanHistoryNumber = sanitizePatientNumericId(historyNumberRaw, results.length + 1);

    results.push({
      name: cleanName ? cleanName.toUpperCase() : '',
      firstName: firstName ? firstName.toUpperCase() : undefined,
      lastName: lastName ? lastName.toUpperCase() : undefined,
      cedula: cedula.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      balance: parseNumericAmount(balanceRaw),
      historyNumber: cleanHistoryNumber,
      admissionDate: admissionDate || undefined,
      lastAppointmentDate: lastAppointmentDate || undefined,
      doctorName: normalizedDoctor || undefined,
      consultationReason: normalizedReason,
      sourceSoftware,
    });
  }

  return results;
}

const PDF_IGNORED_LINE_PREFIXES = [
  'listado de pacientes',
  'reporte de pacientes',
  'clinica odontologica',
  'clinica corona',
  'historia clinica',
  'id cedula apellido',
  'nombre',
  'paciente',
  'cedula',
  'telefono',
  'pagina',
  'fecha',
  'total pacientes',
];

export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
}

export function parsePatientsFromPdfText(
  text: string,
  sourceSoftware: SoftwareImportPatient['sourceSoftware'] = 'PDF'
): SoftwareImportPatient[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 5);

  const results: SoftwareImportPatient[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = stripAccents(line);
    if (PDF_IGNORED_LINE_PREFIXES.some((prefix) => lower.startsWith(prefix) && !/\d{6,}/.test(line))) {
      continue;
    }

    // Check if line matches spreadsheet tabular format:
    // ID  CEDULA  APELLIDO  NOMBRE  [.FECHA_INGRESO]  [.ULT_CITA]  DOCTOR  MOTIVO  TELEFONO  EMAIL
    const spreadsheetLineMatch = line.match(
      /^(\d{1,6})\s+([VEJP]?-?[\d.-]{5,14})\s+(.+?)\s+(\.?\d{2}\/\d{2}\/\d{3,4})\s+(\.?\d{2}\/\d{2}\/\d{3,4})\s+(.+?)\s+(CONTROL|DOLOR|ESTETICA|ESTÉTICA|PROTESIS|PRÓTESIS|SANGRAMIENTO|ORTODONCIA|OTROS)\s+(\+?[\d-]{7,14})(?:\s+(\S+))?$/i
    );

    if (spreadsheetLineMatch) {
      const [, idStr, cedulaStr, apellidoNombre, fechaIngRaw, ultCitaRaw, doctorRaw, motivoRaw, telRaw, emailRaw] =
        spreadsheetLineMatch;
      results.push({
        name: apellidoNombre.replace(/\s+/g, ' ').trim().toUpperCase(),
        cedula: cedulaStr.trim(),
        phone: normalizeVenezuelanPhone(telRaw),
        email: normalizeEmailField(emailRaw || ''),
        balance: 0,
        historyNumber: sanitizePatientNumericId(idStr, results.length + 1),
        admissionDate: normalizeSpreadsheetDate(fechaIngRaw) || undefined,
        lastAppointmentDate: normalizeSpreadsheetDate(ultCitaRaw) || undefined,
        doctorName: normalizeDoctorName(doctorRaw) || undefined,
        consultationReason: mapConsultationReason(motivoRaw),
        sourceSoftware,
      });
      continue;
    }

    // Extract leading numeric ID if line starts with one (e.g. "12 V-19.876.543 ...")
    const leadingIdMatch = line.match(/^(\d{1,6})\s+/);
    const extractedLeadingId = leadingIdMatch ? leadingIdMatch[1] : '';

    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = line.match(/(?:\+?58[\s.-]?)?(?:0?4(?:12|14|16|24|26|15)|0?2\d{2})[\s.-]?\d{3}[\s.-]?\d{3,4}/);
    const cedulaMatch = line.match(/\b(?:[VEJP]-?\s?)?\d{1,2}\.?\d{3}\.?\d{3,4}(?:-\d{1,2})?\b/i);
    const balanceMatch = line.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/);
    const dateMatches = line.match(/\.?\d{2}\/\d{2}\/\d{3,4}/g) || [];

    const hasContactOrId = Boolean(cedulaMatch || phoneMatch || emailMatch);
    if (!hasContactOrId) continue;

    let remainder = line;
    if (leadingIdMatch) remainder = remainder.slice(leadingIdMatch[0].length);
    if (emailMatch) remainder = remainder.replace(emailMatch[0], ' ');
    if (phoneMatch) remainder = remainder.replace(phoneMatch[0], ' ');
    if (cedulaMatch) remainder = remainder.replace(cedulaMatch[0], ' ');
    if (balanceMatch) remainder = remainder.replace(balanceMatch[0], ' ');
    for (const d of dateMatches) {
      remainder = remainder.replace(d, ' ');
    }

    remainder = remainder
      .replace(/\badmin\s*\.?/gi, ' ')
      .replace(/\b(?:CONTROL|DOLOR|ESTETICA|ESTÉTICA|PROTESIS|PRÓTESIS|SANGRAMIENTO|ORTODONCIA|OTROS)\b/gi, ' ')
      .replace(/\b(?:paciente|nombre|ci|c\.i\.|cedula|tel|tlf|email|correo|saldo|historia)\s*:?/gi, ' ')
      .replace(/[|;,\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!remainder || remainder.length < 3 || !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(remainder)) {
      continue;
    }

    results.push({
      name: remainder.toUpperCase(),
      cedula: cedulaMatch ? cedulaMatch[0].replace(/\s+/g, '').toUpperCase() : '',
      phone: phoneMatch ? normalizeVenezuelanPhone(phoneMatch[0]) : '',
      email: emailMatch ? emailMatch[0].toLowerCase() : '',
      balance: balanceMatch ? parseNumericAmount(balanceMatch[1]) : 0,
      historyNumber: sanitizePatientNumericId(extractedLeadingId, results.length + 1),
      admissionDate: dateMatches[0] ? normalizeSpreadsheetDate(dateMatches[0]) || undefined : undefined,
      lastAppointmentDate: dateMatches[1] ? normalizeSpreadsheetDate(dateMatches[1]) || undefined : undefined,
      sourceSoftware,
    });
  }

  return results;
}

interface PdfCellToken {
  x: number;
  str: string;
}

function groupPageItemsIntoRows(items: PdfTextItemLike[]): PdfCellToken[][] {
  const rowsMap = new Map<number, PdfCellToken[]>();
  for (const item of items) {
    const str = (item.str || '').trim();
    if (!str) continue;
    const x = Math.round(item.transform?.[4] ?? 0);
    const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3;
    const arr = rowsMap.get(y) || [];
    arr.push({ x, str });
    rowsMap.set(y, arr);
  }
  const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
  return sortedY.map((y) => (rowsMap.get(y) || []).sort((a, b) => a.x - b.x));
}

function pickCellsInRange(cells: PdfCellToken[], minX: number, maxX: number): string {
  return cells
    .filter((c) => c.x >= minX && c.x < maxX)
    .map((c) => c.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae pacientes de documentos PDF respetando coordenadas X/Y de columnas y soporta
 * listados exportados desde Excel divididos horizontalmente en 2 bloques de páginas
 * (Bloque izquierdo: ID..DOCTOR, Bloque derecho: MOTIVO..EMAIL).
 */
export function parsePatientsFromCoordinatePdfPages(
  pagesItems: PdfTextItemLike[][],
  sourceSoftware: SoftwareImportPatient['sourceSoftware'] = 'PDF'
): SoftwareImportPatient[] {
  const pageRows = pagesItems.map(groupPageItemsIntoRows);
  const leftPages: PdfCellToken[][][] = [];
  const rightPages: PdfCellToken[][][] = [];

  for (const rows of pageRows) {
    const headerText = stripAccents(rows.slice(0, 3).flat().map((c) => c.str).join(' '));
    const hasLeftHeader = headerText.includes('id cedula apellido') || headerText.includes('listado de pacientes');
    const hasRightHeader = headerText.includes('motivo') && headerText.includes('telefono') && headerText.includes('email');

    const looksLikeLeftPage =
      hasLeftHeader ||
      rows.some(
        (cells) =>
          cells.some((c) => c.x < 125 && /^\d+$/.test(c.str)) &&
          cells.some((c) => c.x >= 300 && /\.?\d{2}\/\d{2}\/\d{3,4}/.test(c.str))
      );

    const looksLikeRightPage =
      !looksLikeLeftPage &&
      (hasRightHeader ||
        rows.some(
          (cells) =>
            cells.some((c) => c.x >= 115 && c.x < 185 && /^\d{7,12}$/.test(c.str.replace(/\D/g, ''))) &&
            !cells.some((c) => c.x >= 300 && /\.?\d{2}\/\d{2}\/\d{3,4}/.test(c.str))
        ));

    if (looksLikeLeftPage) {
      const dataRows = rows.filter((cells) => {
        const first = stripAccents(cells[0]?.str || '');
        if (first === 'listado de pacientes' || first === 'id') return false;
        return cells.some((c) => c.x < 125 && /^\d+$/.test(c.str));
      });
      leftPages.push(dataRows);
    } else if (looksLikeRightPage) {
      const dataRows = rows.filter((cells) => {
        const first = stripAccents(cells[0]?.str || '');
        if (first === 'motivo' || first === 'telefono' || first === 'email') return false;
        return cells.length > 0;
      });
      rightPages.push(dataRows);
    }
  }

  // If this matches a split Excel-to-PDF export (equal number of left and right continuation pages)
  if (leftPages.length > 0 && leftPages.length === rightPages.length) {
    const leftDataAll = leftPages.flat();
    const rightDataAll = rightPages.flat();
    if (leftDataAll.length === rightDataAll.length && leftDataAll.length > 0) {
      return leftDataAll.map((lCells, idx) => {
        const rCells = rightDataAll[idx];
        const idRaw = lCells[0]?.str || String(idx + 1);
        const restL = lCells.slice(1);
        const cedula = pickCellsInRange(restL, 100, 182);
        const apellido = pickCellsInRange(restL, 182, 246);
        const nombre = pickCellsInRange(restL, 246, 311);
        const fechaIngresoRaw = pickCellsInRange(restL, 311, 377);
        const ultCitaRaw = pickCellsInRange(restL, 377, 442);
        const doctorRaw = pickCellsInRange(restL, 442, 1000);
        const motivoRaw = pickCellsInRange(rCells, 0, 115);
        const telRaw = pickCellsInRange(rCells, 115, 180);
        const emailRaw = pickCellsInRange(rCells, 180, 1000);

        const combinedName = `${nombre} ${apellido}`.replace(/\s+/g, ' ').trim().toUpperCase();
        return {
          name: combinedName,
          firstName: nombre ? nombre.toUpperCase() : undefined,
          lastName: apellido ? apellido.toUpperCase() : undefined,
          cedula,
          phone: normalizeVenezuelanPhone(telRaw),
          email: normalizeEmailField(emailRaw),
          balance: 0,
          historyNumber: sanitizePatientNumericId(idRaw, idx + 1),
          admissionDate: normalizeSpreadsheetDate(fechaIngresoRaw) || undefined,
          lastAppointmentDate: normalizeSpreadsheetDate(ultCitaRaw) || undefined,
          doctorName: normalizeDoctorName(doctorRaw) || undefined,
          consultationReason: mapConsultationReason(motivoRaw),
          sourceSoftware,
        };
      });
    }
  }

  // Fallback to standard single-table line extraction sorted by Y desc, X asc
  const reconstructedText = pageRows
    .map((rows) => rows.map((cells) => cells.map((c) => c.str).join(' ')).join('\n'))
    .join('\n');

  return parsePatientsFromPdfText(reconstructedText, sourceSoftware);
}

