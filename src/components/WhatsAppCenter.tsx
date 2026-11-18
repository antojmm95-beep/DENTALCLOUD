import React, { useState, useEffect } from 'react';
import { useDental } from '../context/DentalContext';
import { WhatsAppReminder } from '../types/dental';
import {
  filterContactsSegment,
  formatWhatsAppTemplate,
  isPatientNotifiable,
  normalizeWhatsAppPhone,
  resolvePatientWhatsAppPhone
} from '../utils/dentalCalc';
import {
  buildRecipePdfFile,
  formatRecipeWhatsAppText,
  resolveRecipeMpps
} from '../utils/recipePdfExport';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCheck, 
  Zap, 
  Bot, 
  Phone,
  Users,
  BellOff,
  Paperclip
} from 'lucide-react';

export const WhatsAppCenter: React.FC = () => {
  const { 
    selectedPatient, 
    patients,
    prescriptions,
    doctors,
    activeDoctor,
    clinicConfig,
    waReminders, 
    sendWhatsAppMessage, 
    scheduleWhatsAppReminder, 
    autoRemindersEnabled, 
    setAutoRemindersEnabled,
    generateDirectWhatsAppUrl,
    showToast
  } = useDental();

  // Segmentador de Contactos state
  const [segGender, setSegGender] = useState<'TODOS' | 'M' | 'F'>('TODOS');
  const [segMinAge, setSegMinAge] = useState<string>('');
  const [segMaxAge, setSegMaxAge] = useState<string>('');
  const [segBirthdayMonth, setSegBirthdayMonth] = useState<number>(0);
  const [segDaysInactive, setSegDaysInactive] = useState<number>(0);
  const [segOnlyDebt, setSegOnlyDebt] = useState<boolean>(false);
  const [campaignTemplate, setCampaignTemplate] = useState<string>(
    '¡Hola {paciente}! 👋 Desde *{clinica}* te invitamos a tu control odontológico preventivo este mes. Contáctanos para agendar tu cita en Consultorio 1, 2 o 3.'
  );

  const segmentedPatients = filterContactsSegment(patients, {
    gender: segGender,
    minAge: segMinAge ? Number(segMinAge) : undefined,
    maxAge: segMaxAge ? Number(segMaxAge) : undefined,
    onlyWithDebt: segOnlyDebt,
    birthdayMonth: segBirthdayMonth,
    minDaysSinceVisit: segDaysInactive,
    referenceDateStr: '2026-11-12'
  });

  const handleQueueSegmentedCampaign = () => {
    if (segmentedPatients.length === 0) return;
    segmentedPatients.forEach(pat => {
      const msg = formatWhatsAppTemplate(campaignTemplate, {
        paciente: pat.name.split(' ')[0],
        clinica: clinicConfig.clinicName,
        saldo: `$${pat.balance.toFixed(2)}`
      });
      scheduleWhatsAppReminder({
        patientId: pat.id,
        patientName: pat.name,
        phone: pat.phone,
        type: 'recordatorio_24h',
        message: msg,
        scheduledTime: 'Campaña Segmentada'
      });
    });
    showToast(`${segmentedPatients.length} mensajes agregados a la cola de envíos`);
  };

  const excludedInactiveCount = patients.filter(p => !isPatientNotifiable(p)).length;
  const selectedPatientBlocked = selectedPatient ? !isPatientNotifiable(selectedPatient) : false;

  const latestPatientRx = selectedPatient
    ? prescriptions.find(p => p.patientId === selectedPatient.id)
    : undefined;

  // Composer state
  const [targetPhone, setTargetPhone] = useState(
    resolvePatientWhatsAppPhone(selectedPatient, undefined, clinicConfig.waCountryCode || '58').rawPhone
  );
  const [templateType, setTemplateType] = useState<WhatsAppReminder['type']>('recordatorio_24h');
  const [attachRecipePdf, setAttachRecipePdf] = useState(true);
  const [customText, setCustomText] = useState(
    selectedPatient
      ? `Hola ${selectedPatient.name.split(' ')[0]} 👋 Te recordamos tu cita odontológica con el Dr. Alejandro Morera mañana a las 10:00 AM en ${clinicConfig.clinicName}. Por favor confírmanos respondiendo este mensaje. ¡Te esperamos!`
      : `Hola 👋 Te escribimos desde ${clinicConfig.clinicName} para recordarte nuestros horarios de atención odontológica.`
  );

  useEffect(() => {
    if (!selectedPatient) return;
    const resolved = resolvePatientWhatsAppPhone(
      selectedPatient,
      undefined,
      clinicConfig.waCountryCode || '58'
    );
    setTargetPhone(resolved.rawPhone || '');
    const firstName = selectedPatient.name.split(' ')[0];
    setCustomText(
      `Hola ${firstName} 👋 Te recordamos tu cita odontológica con el Dr. Alejandro Morera mañana a las 10:00 AM en ${clinicConfig.clinicName}. Por favor confírmanos respondiendo este mensaje. ¡Te esperamos!`
    );
  }, [selectedPatient?.id, clinicConfig.clinicName]);

  const handleTemplateChange = (type: WhatsAppReminder['type']) => {
    setTemplateType(type);
    const firstName = selectedPatient ? selectedPatient.name.split(' ')[0] : 'Paciente';

    switch (type) {
      case 'recordatorio_24h':
        setCustomText(`Hola ${firstName} 👋 Te recordamos tu cita odontológica con el Dr. Alejandro Morera en ${clinicConfig.clinicName} para mañana. Por favor respóndenos 'SI' para confirmar o indícanos si requieres reagendar. ¡Nos vemos pronto!`);
        break;
      case 'confirmacion_inmediata':
        setCustomText(`¡Cita confirmada, ${firstName}! 🦷 Hemos reservado tu espacio en ${clinicConfig.clinicName} el día de tu preferencia. Te esperamos 10 minutos antes de tu hora. Si tienes dudas, escríbenos por aquí.`);
        break;
      case 'presupuesto':
        setCustomText(`Hola ${firstName} 📋 Te hemos preparado tu propuesta de tratamiento odontológico personalizado en ${clinicConfig.clinicName}. Puedes consultarlo y escribirnos para iniciar tu primera sesión.`);
        break;
      case 'recipe_digital':
        if (latestPatientRx) {
          const mpps = resolveRecipeMpps(latestPatientRx, doctors, activeDoctor);
          setCustomText(
            formatRecipeWhatsAppText({
              rx: latestPatientRx,
              doctor: {
                name: latestPatientRx.doctorName,
                colegiado: latestPatientRx.doctorColegiado,
                mpps
              },
              clinicConfig
            })
          );
        } else {
          setCustomText(`Hola ${firstName} 🩺 Adjuntamos las indicaciones y receta médica odontológica en formato PDF tras tu procedimiento de hoy. Recuerda seguir los horarios de toma para una pronta recuperación.`);
        }
        break;
      case 'postoperatorio':
        setCustomText(`Hola ${firstName} 💬 Te escribimos del equipo clínico de ${clinicConfig.clinicName} para saber cómo te sientes hoy tras tu atención dental. ¿Presentas alguna molestia o dolor? Estamos atentos a tus comentarios.`);
        break;
    }
  };

  const handleSendNow = () => {
    if (!selectedPatient) {
      showToast('Selecciona o registra un paciente antes de enviar');
      return;
    }
    if (selectedPatientBlocked) {
      showToast('Notificación bloqueada: paciente inactivo o fallecido.');
      return;
    }

    const countryCode = (clinicConfig.waCountryCode || '58').replace(/[^0-9]/g, '') || '58';
    const normalizedPhone = normalizeWhatsAppPhone(targetPhone, countryCode);
    if (!normalizedPhone) {
      showToast('Ingresa un número de WhatsApp válido del paciente para abrir su chat directamente');
      return;
    }

    if (templateType === 'recipe_digital' && attachRecipePdf && latestPatientRx) {
      const mpps = resolveRecipeMpps(latestPatientRx, doctors, activeDoctor);
      const matchedDoc = doctors.find((d) =>
        d.name.toLowerCase().includes(latestPatientRx.doctorName.replace(/^(Dr\.|Dra\.)\s*/i, '').trim().toLowerCase())
      );
      const { doc, filename } = buildRecipePdfFile({
        rx: latestPatientRx,
        patient: selectedPatient,
        doctor: {
          name: latestPatientRx.doctorName,
          specialty: latestPatientRx.doctorSpecialty || matchedDoc?.specialty || 'Odontología General',
          colegiado: latestPatientRx.doctorColegiado || matchedDoc?.colegiado || 'COV-21870',
          mpps,
          rif: matchedDoc?.rif,
          phone: matchedDoc?.phone,
          email: matchedDoc?.email
        },
        clinicConfig
      });

      doc.save(filename);
      showToast(`Récipe PDF ${filename} descargado; abriendo chat directo (+${normalizedPhone})`);
    }

    const url = generateDirectWhatsAppUrl(normalizedPhone, customText);
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Also save into reminder history
    scheduleWhatsAppReminder({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      phone: targetPhone,
      type: templateType,
      message: customText,
      scheduledTime: 'Inmediato'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span>Central de Automatización y Mensajería WhatsApp</span>
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Reducción de inasistencias (No-Shows) en hasta un 85%</span>
            <span aria-hidden="true">·</span>
            <span>Integración directa con WhatsApp Web y Móvil</span>
          </div>
        </div>

        {/* Master Automation Switch */}
        <div className="flex items-center gap-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              Bot Automatizado de Recordatorios
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {autoRemindersEnabled ? 'Disparadores automáticos activos 24h antes' : 'Envíos en modo manual'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoRemindersEnabled(!autoRemindersEnabled)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              autoRemindersEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-xs" />
          </button>
        </div>
      </div>

      {/* Main Grid: Composer & Phone Simulator (Left) + Queue / Automated Rules (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live WhatsApp Composer with Smart Tags */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>Redactar Mensaje Inteligente con Plantilla</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Template Selector */}
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Seleccionar Plantilla Clínica:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'recordatorio_24h', label: '⏰ Recordatorio 24h' },
                  { id: 'confirmacion_inmediata', label: '✅ Cita Confirmada' },
                  { id: 'presupuesto', label: '📋 Presupuesto' },
                  { id: 'recipe_digital', label: '💊 Récipe Digital' },
                  { id: 'postoperatorio', label: '🩺 Post-Operatorio' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.id as any)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition ${
                      templateType === t.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient phone */}
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Destinatario y Número WhatsApp:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="+58 414 1234567"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono text-xs"
                />
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => setTargetPhone(selectedPatient.phone)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                  >
                    Usar {selectedPatient.name.split(' ')[0]}
                  </button>
                )}
              </div>
              {selectedPatientBlocked && selectedPatient && (
                <div
                  data-testid="wa-patient-blocked-notice"
                  className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-[11px] font-semibold"
                >
                  <BellOff className="w-4 h-4 shrink-0" />
                  <span>
                    Notificaciones bloqueadas: {selectedPatient.name} figura como{' '}
                    {selectedPatient.inactiveReason === 'fallecimiento' ? 'Fallecido' : 'Inactivo'}. No se enviarán mensajes.
                  </span>
                </div>
              )}
            </div>

            {/* Text area */}
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Cuerpo del Mensaje (Formato WhatsApp soportado *negrita*, _cursiva_):
              </label>
              <textarea
                rows={5}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none leading-relaxed font-sans"
              />
            </div>

            {templateType === 'recipe_digital' && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-200">
                {latestPatientRx ? (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachRecipePdf}
                      onChange={(e) => setAttachRecipePdf(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <strong className="inline-flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Adjuntar Récipe Médico Oficial en PDF ({latestPatientRx.folio})
                      </strong>
                      <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Incluye firma, credenciales COV/MPPS y membrete de {clinicConfig.clinicName} para validez en farmacia.
                      </span>
                    </span>
                  </label>
                ) : (
                  <span>
                    Aún no hay un récipe emitido para {selectedPatient?.name || 'este paciente'}. Emítelo en el módulo <strong>Récipes</strong> para adjuntar el PDF automáticamente.
                  </span>
                )}
              </div>
            )}

            {/* Quick action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendNow}
                disabled={!selectedPatient || selectedPatientBlocked}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {selectedPatientBlocked ? <BellOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>
                  {selectedPatientBlocked
                    ? 'Envío Bloqueado (Paciente Inactivo / Fallecido)'
                    : templateType === 'recipe_digital' && attachRecipePdf && latestPatientRx
                      ? 'Enviar por WhatsApp + Récipe PDF'
                      : 'Enviar Directamente a WhatsApp'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Smartphone Preview Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start">
          <div className="w-full max-w-[340px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700/80">
            {/* Phone notch */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

            {/* WhatsApp App Mockup */}
            <div className="bg-[#EFEAE2] dark:bg-[#0B141A] rounded-[24px] overflow-hidden flex flex-col h-[460px]">
              {/* WhatsApp App Header */}
              <div className="bg-[#008069] text-white px-3 py-2.5 flex items-center gap-2 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  CC
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{clinicConfig.clinicName}</div>
                  <div className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    <span>Cuenta de Empresa Oficial</span>
                  </div>
                </div>
                <Phone className="w-4 h-4 opacity-80" />
              </div>

              {/* Chat Viewport */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
                {/* Outgoing Message Bubble */}
                <div className="self-end bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-800 dark:text-slate-100 p-3 rounded-xl rounded-tr-xs shadow-xs text-xs max-w-[88%] relative leading-relaxed">
                  <p className="whitespace-pre-line font-sans text-[11px]">
                    {customText}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 dark:text-slate-300 mt-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3 h-3 text-sky-500" />
                  </div>
                </div>
              </div>

              {/* Fake input bar */}
              <div className="p-2 bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
                <div className="flex-1 bg-white dark:bg-slate-700 rounded-full px-3 py-1.5 text-[11px] text-slate-400">
                  Respuesta del paciente...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#008069] flex items-center justify-center text-white">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Segmentador de Contactos & Campañas WhatsApp (Suiteexo) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Segmentador de Contactos & Campañas Marketing</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-[11px] font-bold tabular-nums">
                {segmentedPatients.length} coincidencias
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtra pacientes activos por edad, género, cumpleaños, inactividad o saldo pendiente.
              {excludedInactiveCount > 0 && (
                <span className="ml-1.5 text-rose-600 font-semibold">
                  ({excludedInactiveCount} inactivo{excludedInactiveCount > 1 ? 's' : ''}/fallecido{excludedInactiveCount > 1 ? 's' : ''} excluidos automáticamente)
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleQueueSegmentedCampaign}
            disabled={segmentedPatients.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" /> Programar Cola ({segmentedPatients.length})
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <label className="font-semibold text-slate-600 dark:text-slate-300">
            Género
            <select
              value={segGender}
              onChange={e => setSegGender(e.target.value as 'TODOS' | 'M' | 'F')}
              className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="TODOS">Todos</option>
              <option value="F">Femenino (F)</option>
              <option value="M">Masculino (M)</option>
            </select>
          </label>

          <label className="font-semibold text-slate-600 dark:text-slate-300">
            Edad Mínima
            <input
              type="number"
              min="0"
              placeholder="Ej. 18"
              value={segMinAge}
              onChange={e => setSegMinAge(e.target.value)}
              className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
            />
          </label>

          <label className="font-semibold text-slate-600 dark:text-slate-300">
            Edad Máxima
            <input
              type="number"
              min="0"
              placeholder="Ej. 65"
              value={segMaxAge}
              onChange={e => setSegMaxAge(e.target.value)}
              className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
            />
          </label>

          <label className="font-semibold text-slate-600 dark:text-slate-300">
            Mes Cumpleaños
            <select
              value={segBirthdayMonth}
              onChange={e => setSegBirthdayMonth(Number(e.target.value))}
              className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value={0}>Cualquier mes</option>
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>
          </label>

          <label className="font-semibold text-slate-600 dark:text-slate-300">
            Días sin visita
            <select
              value={segDaysInactive}
              onChange={e => setSegDaysInactive(Number(e.target.value))}
              className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value={0}>Cualquiera</option>
              <option value={30}>+30 días</option>
              <option value={60}>+60 días</option>
              <option value={90}>+90 días</option>
              <option value={180}>+180 días</option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-5 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={segOnlyDebt}
              onChange={e => setSegOnlyDebt(e.target.checked)}
              className="w-4 h-4 accent-sky-600 rounded"
            />
            <span>Solo con saldo deudor</span>
          </label>
        </div>

        {/* Campaign Message Input */}
        <div className="text-xs">
          <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
            Mensaje de Campaña ({`{paciente}`}, {`{clinica}`}, {`{saldo}`}):
          </label>
          <input
            type="text"
            value={campaignTemplate}
            onChange={e => setCampaignTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        {/* Segmented Recipients Preview Table */}
        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/70 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                <th className="py-2 px-3">Paciente</th>
                <th className="py-2 px-3">Teléfono</th>
                <th className="py-2 px-3">Edad / Género</th>
                <th className="py-2 px-3">Última Visita</th>
                <th className="py-2 px-3 text-right">Saldo</th>
                <th className="py-2 px-3 text-right">Enviar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {segmentedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    Ningún paciente cumple con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                segmentedPatients.map(pat => {
                  const personalized = formatWhatsAppTemplate(campaignTemplate, {
                    paciente: pat.name.split(' ')[0],
                    clinica: clinicConfig.clinicName,
                    saldo: `$${pat.balance.toFixed(2)}`
                  });
                  return (
                    <tr key={pat.id} className="hover:bg-sky-50/30 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{pat.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{pat.phone}</td>
                      <td className="py-2 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {pat.age} años · {pat.gender}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">{pat.lastVisit || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-rose-600">
                        {pat.balance > 0 ? `$${pat.balance.toFixed(2)}` : '$0.00'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetPhone(pat.phone);
                              setCustomText(personalized);
                              showToast(`Mensaje cargado en redactor para ${pat.name}`);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-slate-700 dark:text-slate-200 font-semibold"
                          >
                            Editar
                          </button>
                          <a
                            href={generateDirectWhatsAppUrl(pat.phone, personalized)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                          >
                            <Send className="w-3 h-3" /> WA
                          </a>
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

      {/* Bottom Section: Queue of Reminders & History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>Cola de Recordatorios y Envíos Automatizados ({waReminders.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            Sincronizado con Agenda
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[11px]">
                <th className="py-2.5 px-3">Paciente</th>
                <th className="py-2.5 px-3">Tipo Mensaje</th>
                <th className="py-2.5 px-3">Programación</th>
                <th className="py-2.5 px-3">Mensaje</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acción Directa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {waReminders.map((rem) => {
                const remPatient = patients.find(p => p.id === rem.patientId);
                const isBlocked = remPatient ? !isPatientNotifiable(remPatient) : false;
                return (
                <tr key={rem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {rem.patientName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{rem.phone}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {rem.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {rem.scheduledTime}
                  </td>
                  <td className="py-3 px-3 max-w-sm truncate text-slate-600 dark:text-slate-400 text-[11px]">
                    {rem.message}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      isBlocked
                        ? 'bg-slate-800 text-white'
                        : rem.status === 'enviado'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {isBlocked ? <BellOff className="w-3 h-3 text-rose-400" /> : rem.status === 'enviado' ? <CheckCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isBlocked ? 'BLOQUEADO' : rem.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isBlocked}
                      onClick={() => sendWhatsAppMessage(rem.id, rem.phone, rem.message)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition inline-flex items-center gap-1"
                    >
                      {isBlocked ? <BellOff className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                      <span>{isBlocked ? 'Bloqueado' : rem.status === 'enviado' ? 'Reenviar' : 'Enviar Ahora'}</span>
                    </button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
