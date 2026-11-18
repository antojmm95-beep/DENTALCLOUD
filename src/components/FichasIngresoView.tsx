import React, { useRef, useState } from 'react';
import { useDental } from '../context/DentalContext';
import { IntakeFormField } from '../types/dental';
import {
  ClipboardCheck,
  Tablet,
  Wrench,
  QrCode,
  UserPlus,
  CheckCircle2,
  Eraser,
  Plus,
  Trash2,
  Printer,
  Copy,
  ExternalLink,
  Globe,
  Link2
} from 'lucide-react';
import {
  buildQrIntakeShareUrl,
  decodeQrPatientTransferPayload,
  resolvePublicQrOrigin
} from '../utils/qrIntakeMode';

export const FichasIngresoView: React.FC = () => {
  const {
    intakeTemplates,
    intakeSubmissions,
    createIntakeTemplate,
    submitIntakeForm,
    createPatientFromIntake,
    registerPatientFromQrIntake,
    clinicConfig,
    updateClinicConfig,
    setIsPatientKioskLocked,
    showToast,
    setCurrentTab
  } = useDental();

  const [subTab, setSubTab] = useState<'envios' | 'tablet' | 'plantillas'>('envios');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(intakeTemplates[0]?.id || '');

  // Tablet / Kiosk Form state
  const [pName, setPName] = useState('');
  const [pCedula, setPCedula] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pBirthDate, setPBirthDate] = useState('');
  const [pAllergies, setPAllergies] = useState('');
  const [pConditions, setPConditions] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [hasSigned, setHasSigned] = useState(false);

  // Canvas Signature Pad
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Template Builder state
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplFields, setTplFields] = useState<IntakeFormField[]>([
    { id: 'nf-1', section: 'General', label: '¿Toma anticoagulantes o aspirina?', type: 'checkbox' }
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldSection, setNewFieldSection] = useState('Antecedentes Médicos');
  const [newFieldType, setNewFieldType] = useState<IntakeFormField['type']>('checkbox');

  const activeTemplate = intakeTemplates.find(t => t.id === activeTemplateId) || intakeTemplates[0];
  const [publicUrlDraft, setPublicUrlDraft] = useState(clinicConfig.publicQrBaseUrl || '');
  const [handoffLinkInput, setHandoffLinkInput] = useState('');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const resolvedOriginInfo = resolvePublicQrOrigin(currentOrigin, clinicConfig.publicQrBaseUrl);
  const shareUrl = buildQrIntakeShareUrl(
    currentOrigin,
    activeTemplate?.id || 'tpl-anamnesis-general',
    undefined,
    clinicConfig.publicQrBaseUrl
  );
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`;

  const handleSavePublicQrBase = () => {
    const trimmed = publicUrlDraft.trim();
    updateClinicConfig({ ...clinicConfig, publicQrBaseUrl: trimmed });
    if (trimmed) {
      setPublicUrlDraft(resolvePublicQrOrigin(currentOrigin, trimmed).origin);
    }
  };

  const handleImportHandoffLink = (e: React.FormEvent) => {
    e.preventDefault();
    const decoded = decodeQrPatientTransferPayload(handoffLinkInput);
    if (!decoded) {
      showToast('Enlace o código de ficha QR inválido. Verifica que contenga ingreso_qr.');
      return;
    }
    registerPatientFromQrIntake(decoded);
    setHandoffLinkInput('');
    setCurrentTab('pacientes');
  };

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7';
    setHasSigned(true);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleTabletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;
    const signatureDataUrl = hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
    submitIntakeForm({
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      patientName: pName.trim(),
      cedula: pCedula.trim(),
      phone: pPhone.trim(),
      email: pEmail.trim(),
      birthDate: pBirthDate,
      allergies: pAllergies.trim() || 'Ninguna',
      systemicConditions: pConditions.trim() || 'Ninguna',
      answers,
      signatureDataUrl
    });
    setPName('');
    setPCedula('');
    setPPhone('');
    setPEmail('');
    setPBirthDate('');
    setPAllergies('');
    setPConditions('');
    setAnswers({});
    clearSignature();
    setSubTab('envios');
  };

  const handleAddFieldToBuilder = () => {
    if (!newFieldLabel.trim()) return;
    setTplFields(prev => [
      ...prev,
      {
        id: `fld-${Date.now()}`,
        section: newFieldSection || 'General',
        label: newFieldLabel.trim(),
        type: newFieldType
      }
    ]);
    setNewFieldLabel('');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || tplFields.length === 0) return;
    const created = createIntakeTemplate({
      name: tplName.trim(),
      description: tplDesc.trim() || 'Plantilla personalizada de ingreso clínico.',
      fields: tplFields
    });
    setActiveTemplateId(created.id);
    setTplName('');
    setTplDesc('');
    setSubTab('tablet');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fichas de Ingreso Digitales</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enlace QR para pacientes, Modo Tablet en sala con firma digital y Constructor de Plantillas.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSubTab('envios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'envios' ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> Envíos & QR ({intakeSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'tablet' ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" /> Modo Tablet / Firma
          </button>
          <button
            type="button"
            onClick={() => setSubTab('plantillas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'plantillas' ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Plantillas ({intakeTemplates.length})
          </button>
        </div>
      </div>

      {subTab === 'envios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* QR & Link Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-sky-600" /> Enlace de Autoregistro QR
            </h3>
            <select
              value={activeTemplateId}
              onChange={e => setActiveTemplateId(e.target.value)}
              aria-label="Seleccionar plantilla para compartir"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              {intakeTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="flex flex-col items-center p-4 bg-sky-50/70 dark:bg-slate-800/70 rounded-xl border border-sky-100 dark:border-slate-700">
              <img
                src={qrImgUrl}
                alt="Código QR Ficha de Ingreso"
                className="w-36 h-36 rounded-lg bg-white p-1.5 border border-slate-200"
              />
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 text-center leading-snug">
                Escanea con el celular del paciente o envíalo por WhatsApp.
                <strong className="block text-sky-700 dark:text-sky-300 mt-0.5">
                  Acceso restringido: solo abre el llenado de Historia Clínica, sin acceso al resto del sistema.
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  showToast('Enlace de Historia Clínica copiado');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Link
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Vista QR
              </a>
              <button
                type="button"
                data-testid="open-kiosk-patient-mode-btn"
                onClick={() => setIsPatientKioskLocked(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
              >
                <Tablet className="w-3.5 h-3.5" /> Modo Paciente en Sala (Bloqueado / Sin Error 404)
              </button>
            </div>

            {/* Public URL Configuration & 404 / Session-Error Prevention */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  URL del Código QR
                </span>
                {resolvedOriginInfo.isDevPreviewHost ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                    Vista Previa (ais-dev)
                  </span>
                ) : resolvedOriginInfo.isLocalOnly ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                    Localhost
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    URL Pública Activa
                  </span>
                )}
              </div>
              <p className="text-slate-500 leading-snug">
                {resolvedOriginInfo.isDevPreviewHost
                  ? 'El QR usa esta URL activa para no dar error 404. Para que un celular externo escanee sin pedir sesión, primero publica la app con "Share App" en AI Studio y abre desde el enlace compartido (o pégalo aquí abajo).'
                  : resolvedOriginInfo.isLocalOnly
                    ? 'Si escaneas desde otro celular, publica la app o pega aquí tu enlace compartido público.'
                    : 'Los pacientes abren directamente la Historia Clínica sin requerir usuario ni sesión.'}
              </p>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={publicUrlDraft}
                  onChange={e => setPublicUrlDraft(e.target.value)}
                  placeholder={resolvedOriginInfo.origin || 'https://tu-clinica.run.app'}
                  aria-label="URL pública para códigos QR"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                />
                <button
                  type="button"
                  onClick={handleSavePublicQrBase}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-sky-600 text-white font-bold text-[11px] hover:opacity-90 shrink-0"
                >
                  Guardar
                </button>
              </div>
              {clinicConfig.publicQrBaseUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPublicUrlDraft('');
                    updateClinicConfig({ ...clinicConfig, publicQrBaseUrl: '' });
                  }}
                  className="text-[10px] font-bold text-sky-600 hover:underline"
                >
                  Restaurar a URL actual del servidor ({currentOrigin})
                </button>
              )}
            </div>
          </div>

          {/* Submissions Inbox */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Formularios Completados ({intakeSubmissions.length})
              </h3>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Bandeja
              </button>
            </div>

            {/* Receive Patient Handoff sent from External Cell Phone via WhatsApp */}
            <form
              onSubmit={handleImportHandoffLink}
              className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 shrink-0">
                <Link2 className="w-3.5 h-3.5" />
                <span>Recibir Ficha desde Celular:</span>
              </div>
              <input
                type="text"
                value={handoffLinkInput}
                onChange={e => setHandoffLinkInput(e.target.value)}
                placeholder="Pega aquí el enlace (?ingreso_qr=...) enviado por WhatsApp..."
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0"
              >
                Agregar Paciente
              </button>
            </form>

            <div className="space-y-3">
              {intakeSubmissions.map(sub => (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{sub.patientName}</span>
                      <span className="text-[11px] font-mono text-slate-500">{sub.cedula}</span>
                      {sub.status === 'paciente_creado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Paciente Creado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
                          Pendiente de Alta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {sub.phone}
                      {sub.email ? ` · ${sub.email}` : ''} · Alergias:{' '}
                      <strong className="text-rose-600">{sub.allergies || 'Ninguna'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {sub.templateName} · Recibido: {sub.submittedAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sub.signatureDataUrl && (
                      <img
                        src={sub.signatureDataUrl}
                        alt="Firma del paciente"
                        className="h-10 w-24 object-contain bg-white rounded border border-slate-200 p-0.5"
                      />
                    )}
                    {sub.status !== 'paciente_creado' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const pat = createPatientFromIntake(sub.id);
                          if (pat) setCurrentTab('pacientes');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Crear paciente con estos datos
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentTab('pacientes')}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        Ver Ficha
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'tablet' && activeTemplate && (
        <form
          onSubmit={handleTabletSubmit}
          className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-200 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">{clinicConfig.clinicName}</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeTemplate.name}</h3>
            </div>
            <select
              value={activeTemplateId}
              onChange={e => setActiveTemplateId(e.target.value)}
              aria-label="Cambiar plantilla activa"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              {intakeTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nombre y Apellidos *
              <input
                type="text"
                required
                value={pName}
                onChange={e => setPName(e.target.value)}
                placeholder="Ej. Laura Valentina Pérez"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cédula / Documento *
              <input
                type="text"
                required
                value={pCedula}
                onChange={e => setPCedula(e.target.value)}
                placeholder="Ej. V-22.456.789"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Teléfono / WhatsApp *
              <input
                type="tel"
                required
                value={pPhone}
                onChange={e => setPPhone(e.target.value)}
                placeholder="+58 414 0000000"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Correo Electrónico *
              <input
                type="email"
                required
                value={pEmail}
                onChange={e => setPEmail(e.target.value)}
                placeholder="paciente@email.com"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Fecha de Nacimiento
              <input
                type="date"
                value={pBirthDate}
                onChange={e => setPBirthDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-rose-600">
              Alergias Conocidas (Anestesia, Penicilina, Látex...)
              <input
                type="text"
                value={pAllergies}
                onChange={e => setPAllergies(e.target.value)}
                placeholder="Ninguna o especificar..."
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rose-200 dark:border-slate-700 bg-rose-50/40 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Condiciones Médicas / Sistémicas
            <input
              type="text"
              value={pConditions}
              onChange={e => setPConditions(e.target.value)}
              placeholder="Ej. Hipertensión controlada, Diabetes, Asma, o Ninguna"
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </label>

          {/* Dynamic Template Questions */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600">Cuestionario Clínico</h4>
            {activeTemplate.fields.map(f => (
              <div key={f.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={Boolean(answers[f.id])}
                      onChange={e => setAnswers(prev => ({ ...prev, [f.id]: e.target.checked }))}
                      className="w-4 h-4 accent-sky-600 rounded"
                    />
                    <span>{f.label}</span>
                  </label>
                ) : f.type === 'select' ? (
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {f.label}
                    <select
                      value={String(answers[f.id] || '')}
                      onChange={e => setAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                      className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      <option value="">Seleccione una opción...</option>
                      {f.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                ) : f.type === 'textarea' ? (
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {f.label}
                    <textarea
                      rows={2}
                      value={String(answers[f.id] || '')}
                      onChange={e => setAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                      className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </label>
                ) : (
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {f.label}
                    <input
                      type={f.type}
                      value={String(answers[f.id] || '')}
                      onChange={e => setAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                      className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Signature Pad Canvas */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Firma Digital del Paciente (con dedo o lápiz táctil)
              </span>
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                <Eraser className="w-3.5 h-3.5" /> Limpiar Firma
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={640}
              height={160}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              data-testid="intake-signature-canvas"
              className="w-full h-36 bg-sky-50/40 dark:bg-slate-950 border-2 border-dashed border-sky-300 dark:border-slate-700 rounded-xl touch-none cursor-crosshair"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm"
            >
              Enviar Ficha Firmada
            </button>
          </div>
        </form>
      )}

      {subTab === 'plantillas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Constructor de Nueva Plantilla</h3>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nombre de la Plantilla *
              <input
                type="text"
                required
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                placeholder="Ej. Ficha Especializada Implantología"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Descripción
              <input
                type="text"
                value={tplDesc}
                onChange={e => setTplDesc(e.target.value)}
                placeholder="Preguntas específicas pre-quirúrgicas"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>

            <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700 space-y-2.5">
              <p className="text-xs font-bold text-sky-700 dark:text-sky-400">Agregar Campo / Pregunta</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newFieldSection}
                  onChange={e => setNewFieldSection(e.target.value)}
                  placeholder="Sección"
                  className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <select
                  value={newFieldType}
                  onChange={e => setNewFieldType(e.target.value as IntakeFormField['type'])}
                  className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="checkbox">Casilla Sí/No</option>
                  <option value="text">Texto corto</option>
                  <option value="textarea">Texto largo</option>
                  <option value="date">Fecha</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Pregunta al paciente..."
                  className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddFieldToBuilder}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {tplFields.map(f => (
                <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                  <span>
                    <strong className="text-sky-600">[{f.section}]</strong> {f.label} ({f.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => setTplFields(prev => prev.filter(x => x.id !== f.id))}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Guardar Plantilla en Sistema
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Plantillas Activas ({intakeTemplates.length})
            </h3>
            {intakeTemplates.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</h4>
                  <span className="text-[11px] font-semibold text-sky-600 tabular-nums">
                    {t.fields.length} campos
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTemplateId(t.id);
                    setSubTab('tablet');
                  }}
                  className="text-xs font-semibold text-sky-600 hover:underline"
                >
                  Probar en Modo Tablet →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
