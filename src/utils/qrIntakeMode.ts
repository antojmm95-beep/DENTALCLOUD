export interface QrIntakeRouteState {
  isQrIntakeLocked: boolean;
  templateId?: string;
  patientId?: string;
}

export interface ResolvedQrOrigin {
  origin: string;
  isDevPreviewHost: boolean;
  suggestedSharedOrigin?: string;
  isLocalOnly: boolean;
}

export interface QrPatientIntakePayload {
  templateId: string;
  templateName: string;
  patientId?: string;
  name: string;
  cedula: string;
  phone: string;
  email: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'Otro';
  profession?: string;
  allergies?: string;
  systemicConditions?: string;
  regularMedications?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  answers?: Record<string, string | boolean>;
}

/**
 * Normalizes a candidate origin or full URL into a clean base origin
 * for QR intake links. Uses an explicitly configured public clinic URL when
 * provided; otherwise keeps the live active origin so QR links never point
 * to an unpublished `ais-pre` URL that returns HTTP 404.
 */
export function resolvePublicQrOrigin(
  currentOrigin: string,
  configuredPublicUrl?: string
): ResolvedQrOrigin {
  const candidate = (configuredPublicUrl || '').trim() || (currentOrigin || '').trim();
  if (!candidate) {
    return {
      origin: '',
      isDevPreviewHost: false,
      isLocalOnly: false
    };
  }

  let extracted = candidate;
  try {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    extracted = new URL(withProtocol).origin;
  } catch {
    extracted = candidate.replace(/\/+$/, '');
  }

  const normalizedOrigin = extracted.replace(/\/+$/, '');
  const isDevPreviewHost = /^https:\/\/ais-dev-/i.test(normalizedOrigin);
  const suggestedSharedOrigin = isDevPreviewHost
    ? normalizedOrigin.replace(/^https:\/\/ais-dev-/i, 'https://ais-pre-')
    : undefined;

  const isLocalOnly = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
    normalizedOrigin
  );

  return {
    origin: normalizedOrigin,
    isDevPreviewHost,
    suggestedSharedOrigin,
    isLocalOnly
  };
}

/**
 * Detects whether the application was opened from a patient QR code
 * (?ficha=..., ?historia_qr=..., ?modo=historia_qr, or /historia-qr).
 * When locked, the app must strictly restrict access to the Historia Clínica
 * patient self-fill screen and hide the rest of the clinical management software.
 * Note: ?ingreso_qr=... is the reception import handoff link and must NOT lock the app.
 */
export function parseQrIntakeRoute(search: string, pathname = '/'): QrIntakeRouteState {
  const params = new URLSearchParams(search || '');
  const fichaParam = params.get('ficha')?.trim() || '';
  const historiaQrParam = params.get('historia_qr')?.trim() || '';
  const pacienteParam = params.get('paciente')?.trim() || params.get('id')?.trim() || '';
  const modoParam = params.get('modo')?.trim().toLowerCase() || '';
  const cleanPath = (pathname || '/').toLowerCase();

  const isLocked =
    Boolean(fichaParam) ||
    Boolean(historiaQrParam) ||
    modoParam === 'historia_qr' ||
    modoParam === 'ficha_qr' ||
    cleanPath.endsWith('/historia-qr') ||
    cleanPath.endsWith('/ficha-qr');

  if (!isLocked) {
    return { isQrIntakeLocked: false };
  }

  return {
    isQrIntakeLocked: true,
    templateId: fichaParam || undefined,
    patientId: historiaQrParam || pacienteParam || undefined
  };
}

export function buildQrIntakeShareUrl(
  origin: string,
  templateId: string,
  patientId?: string,
  configuredPublicUrl?: string
): string {
  const { origin: base } = resolvePublicQrOrigin(origin, configuredPublicUrl);
  const qs = new URLSearchParams();
  qs.set('ficha', templateId || 'tpl-anamnesis-general');
  if (patientId) {
    qs.set('paciente', patientId);
  }
  return `${base}/?${qs.toString()}`;
}

export function buildPatientHistoryQrUrl(
  origin: string,
  patientId: string,
  configuredPublicUrl?: string
): string {
  const { origin: base } = resolvePublicQrOrigin(origin, configuredPublicUrl);
  const qs = new URLSearchParams();
  qs.set('historia_qr', patientId);
  qs.set('ficha', 'tpl-anamnesis-general');
  return `${base}/?${qs.toString()}`;
}

export function parseCommaListInput(text: string): string[] {
  return (text || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !/^ningun[oa]$/i.test(item) && !/^niega$/i.test(item));
}

export function normalizeCedulaKey(cedula: string): string {
  const compact = (cedula || '').replace(/[\s.-]/g, '').toUpperCase().trim();
  if (!compact) return '';
  const withoutPrefix = compact.replace(/^[VEJPG]/, '');
  return withoutPrefix.length >= 5 ? withoutPrefix : compact;
}

export function computeAgeFromBirthDate(
  birthDate?: string,
  referenceYear = new Date().getFullYear()
): number {
  const clean = (birthDate || '').trim();
  if (!clean) return 30;

  let year: number | null = null;
  const isoMatch = clean.match(/^(\d{4})-\d{1,2}-\d{1,2}$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
  } else {
    const dmyMatch = clean.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
    if (dmyMatch) {
      year = parseInt(dmyMatch[1], 10);
    }
  }

  if (year === null || !Number.isFinite(year) || year < 1900 || year > referenceYear) {
    return 30;
  }

  return Math.max(1, referenceYear - year);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(token: string): Uint8Array {
  const standard = token.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (standard.length % 4)) % 4;
  const padded = standard + '='.repeat(padLen);

  if (typeof atob === 'function') {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }

  return new Uint8Array(Buffer.from(padded, 'base64'));
}

export function encodeQrPatientTransferPayload(payload: QrPatientIntakePayload): string {
  const compact: Record<string, unknown> = {
    t: payload.templateId || 'tpl-anamnesis-general',
    tn: payload.templateName || 'Historia Clínica Digital',
    n: payload.name.trim(),
    c: payload.cedula.trim(),
    p: payload.phone.trim(),
    e: payload.email.trim()
  };
  if (payload.patientId) compact.pid = payload.patientId;
  if (payload.birthDate) compact.b = payload.birthDate;
  if (payload.gender) compact.g = payload.gender;
  if (payload.profession) compact.pr = payload.profession;
  if (payload.allergies) compact.al = payload.allergies;
  if (payload.systemicConditions) compact.sc = payload.systemicConditions;
  if (payload.regularMedications) compact.rm = payload.regularMedications;
  if (payload.emergencyContact && (payload.emergencyContact.name || payload.emergencyContact.phone)) {
    compact.ec = payload.emergencyContact;
  }
  if (payload.answers && Object.keys(payload.answers).length > 0) {
    compact.an = payload.answers;
  }

  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeQrPatientTransferPayload(rawInput: string): QrPatientIntakePayload | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;

  let token = trimmed;
  if (trimmed.includes('ingreso_qr=')) {
    try {
      const qsPart = trimmed.includes('?') ? trimmed.slice(trimmed.indexOf('?')) : `?${trimmed}`;
      const params = new URLSearchParams(qsPart);
      token = params.get('ingreso_qr')?.trim() || '';
    } catch {
      return null;
    }
  }

  if (!token) return null;

  try {
    const bytes = base64UrlToBytes(token);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const name = typeof parsed.n === 'string' ? parsed.n.trim() : '';
    const cedula = typeof parsed.c === 'string' ? parsed.c.trim() : '';
    if (!name || !cedula) return null;

    return {
      templateId: typeof parsed.t === 'string' ? parsed.t : 'tpl-anamnesis-general',
      templateName: typeof parsed.tn === 'string' ? parsed.tn : 'Historia Clínica Digital',
      patientId: typeof parsed.pid === 'string' ? parsed.pid : undefined,
      name,
      cedula,
      phone: typeof parsed.p === 'string' ? parsed.p : '',
      email: typeof parsed.e === 'string' ? parsed.e : '',
      birthDate: typeof parsed.b === 'string' ? parsed.b : undefined,
      gender:
        parsed.g === 'M' || parsed.g === 'F' || parsed.g === 'Otro'
          ? parsed.g
          : undefined,
      profession: typeof parsed.pr === 'string' ? parsed.pr : undefined,
      allergies: typeof parsed.al === 'string' ? parsed.al : undefined,
      systemicConditions: typeof parsed.sc === 'string' ? parsed.sc : undefined,
      regularMedications: typeof parsed.rm === 'string' ? parsed.rm : undefined,
      emergencyContact:
        parsed.ec && typeof parsed.ec === 'object'
          ? {
              name: String((parsed.ec as Record<string, unknown>).name || ''),
              phone: String((parsed.ec as Record<string, unknown>).phone || ''),
              relationship: String((parsed.ec as Record<string, unknown>).relationship || '')
            }
          : undefined,
      answers:
        parsed.an && typeof parsed.an === 'object'
          ? (parsed.an as Record<string, string | boolean>)
          : undefined
    };
  } catch {
    return null;
  }
}

export function buildClinicHandoffUrl(
  origin: string,
  payload: QrPatientIntakePayload,
  configuredPublicUrl?: string
): string {
  const { origin: base } = resolvePublicQrOrigin(origin, configuredPublicUrl);
  const token = encodeQrPatientTransferPayload(payload);
  return `${base}/?ingreso_qr=${encodeURIComponent(token)}`;
}
