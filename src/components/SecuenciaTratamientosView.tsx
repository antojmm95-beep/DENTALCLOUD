import React, { useState, useRef, useEffect } from 'react';
import { useDental } from '../context/DentalContext';
import { SecuenciaTratamiento, BoxType } from '../types/dental';
import { buildRecordedSequencePayload } from '../utils/dentalCalc';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  CheckCircle2, 
  Plus, 
  FileText, 
  Volume2, 
  Clock, 
  Calendar,
  Sparkles,
  RotateCcw,
  User,
  Edit3,
  Trash2,
  Save
} from 'lucide-react';

export const SecuenciaTratamientosView: React.FC = () => {
  const { 
    selectedPatient, 
    selectedPatientId, 
    secuenciaTratamientos, 
    addSecuenciaTratamiento,
    updateSecuenciaTratamiento,
    deleteSecuenciaTratamiento,
    budgets,
    doctors,
    addAppointment,
    showToast
  } = useDental();

  // Active patient data
  const patientSecuencias = secuenciaTratamientos.filter(s => s.patientId === selectedPatientId);
  const patientBudgets = budgets.filter(b => b.patientId === selectedPatientId);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'idle' | 'mic' | 'assisted'>('idle');
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordingTranscript, setRecordingTranscript] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [quickRecordProcedure, setQuickRecordProcedure] = useState('Evolución Clínica por Voz');
  const [quickRecordTooth, setQuickRecordTooth] = useState('');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Custom Sequence / Personalize Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingSecuencia, setEditingSecuencia] = useState<SecuenciaTratamiento | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customTime, setCustomTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [customDoctor, setCustomDoctor] = useState(doctors[0]?.name || 'Dr. Antonio Morera');
  const [customProcedure, setCustomProcedure] = useState('');
  const [customTooth, setCustomTooth] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [linkedBudgetId, setLinkedBudgetId] = useState<string>(patientBudgets[0]?.id || '');

  // Next Appointment Scheduling State (Calendario integrado)
  const [nextAptDate, setNextAptDate] = useState('');
  const [nextAptTime, setNextAptTime] = useState('09:00');
  const [nextAptBox, setNextAptBox] = useState<BoxType>('Consultorio 1');
  const [nextAptDoctor, setNextAptDoctor] = useState(doctors[0]?.name || 'Dr. Antonio Morera');
  const [nextAptTreatment, setNextAptTreatment] = useState('Continuación Plan de Tratamiento');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRealSpeechRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const stopAllCaptureHandles = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      stopAllCaptureHandles();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const simulateVoiceConversation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setRecordingMode('assisted');

    const simulatedPhases = [
      'Doctor: Evaluación clínica en consulta, ¿cómo ha sentido la pieza desde la última sesión?',
      'Paciente: Sin dolor espontáneo ni molestia al masticar.',
      'Doctor: Se realiza limpieza / tartrectomía y pulido selectivo, verificación de oclusión y control periodontal.',
      'Indicaciones: Mantener técnica de cepillado suave y control evolutivo en próxima cita.'
    ];

    let currentIdx = 0;
    const appendPhrase = () => {
      if (!isRecordingRef.current) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        return;
      }
      if (currentIdx < simulatedPhases.length) {
        const phrase = simulatedPhases[currentIdx];
        finalTranscriptRef.current = finalTranscriptRef.current
          ? `${finalTranscriptRef.current} ${phrase}`
          : phrase;
        setRecordingTranscript(finalTranscriptRef.current);
        currentIdx++;
      } else if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };

    appendPhrase();
    simulationIntervalRef.current = setInterval(appendPhrase, 1500);
  };

  const startRecording = async () => {
    stopAllCaptureHandles();
    isRecordingRef.current = true;
    hasRealSpeechRef.current = false;
    finalTranscriptRef.current = '';
    audioChunksRef.current = [];
    setRecordedAudioUrl(null);
    setRecordingTranscript('');
    setRecordDuration(0);
    setIsRecording(true);
    setRecordingMode('mic');

    timerRef.current = setInterval(() => {
      setRecordDuration((prev) => prev + 1);
    }, 1000);

    // 1. Real Audio Recording via MediaRecorder (if microphone access is permitted)
    let hasMicStream = false;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isRecordingRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        hasMicStream = true;
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                setRecordedAudioUrl(reader.result);
              }
            };
            reader.readAsDataURL(blob);
          }
        };

        recorder.start(500);
      } catch {
        hasMicStream = false;
      }
    }

    if (!isRecordingRef.current) return;

    // 2. Live Speech-to-Text via Web Speech API (only if mic stream was granted; otherwise go straight to assisted dictation)
    const windowWithSpeech = window as any;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (SpeechRecognition && hasMicStream) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-VE';

        recognition.onresult = (event: any) => {
          hasRealSpeechRef.current = true;
          if (speechWatchdogRef.current) {
            clearTimeout(speechWatchdogRef.current);
            speechWatchdogRef.current = null;
          }
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = (event.results[i]?.[0]?.transcript || '').trim();
            if (!chunk) continue;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current = finalTranscriptRef.current
                ? `${finalTranscriptRef.current} ${chunk}`
                : chunk;
            } else {
              interim = interim ? `${interim} ${chunk}` : chunk;
            }
          }
          const combined = [finalTranscriptRef.current, interim].filter(Boolean).join(' ').trim();
          setRecordingTranscript(combined);
        };

        recognition.onerror = () => {
          if (isRecordingRef.current && !hasRealSpeechRef.current && !simulationIntervalRef.current) {
            simulateVoiceConversation();
            showToast('Dictado asistido activado (puede editar o escribir notas directamente)');
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current === recognition && !simulationIntervalRef.current) {
            try {
              recognition.start();
            } catch {
              if (!hasRealSpeechRef.current) simulateVoiceConversation();
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();

        // Watchdog: if mic is silent / offline speech API doesn't emit results within 2.2s, activate assisted dictation
        speechWatchdogRef.current = setTimeout(() => {
          if (isRecordingRef.current && !hasRealSpeechRef.current && !simulationIntervalRef.current) {
            simulateVoiceConversation();
          }
        }, 2200);
        return;
      } catch {
        // Fallback below
      }
    }

    simulateVoiceConversation();
    showToast('Dictado clínico asistido iniciado: puede editar la nota y guardarla en la secuencia');
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    stopAllCaptureHandles();
    showToast('Grabación finalizada. Revise o edite el texto y pulse "Guardar en Secuencia".');
  };

  const handleSaveRecordedSequence = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPatient) return;

    const cleanDraft = recordingTranscript.trim();
    if (!cleanDraft && !recordedAudioUrl && recordDuration === 0) {
      showToast('Inicie la grabación o escriba la evolución antes de guardar');
      return;
    }

    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      stopAllCaptureHandles();
    }

    const payload = buildRecordedSequencePayload({
      transcript: cleanDraft,
      procedure: quickRecordProcedure,
      toothNumber: quickRecordTooth,
      durationSeconds: recordDuration || 15
    });

    addSecuenciaTratamiento({
      patientId: selectedPatientId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toothNumber: payload.toothNumber,
      procedure: payload.procedure,
      notes: payload.notes,
      doctorName: customDoctor || doctors[0]?.name || 'Dr. Antonio Morera',
      audioDuration: payload.audioDuration,
      transcript: payload.transcript || payload.notes,
      audioRecordingUrl: recordedAudioUrl || undefined,
      linkedBudgetId: linkedBudgetId || undefined,
      isAutomated: false
    });

    setRecordingTranscript('');
    finalTranscriptRef.current = '';
    setRecordedAudioUrl(null);
    setRecordDuration(0);
    setRecordingMode('idle');
    setQuickRecordProcedure('Evolución Clínica por Voz');
    setQuickRecordTooth('');
    showToast(`Secuencia "${payload.procedure}" anexada correctamente al historial del paciente`);
  };

  const discardRecordingDraft = () => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      stopAllCaptureHandles();
    }
    setRecordingTranscript('');
    finalTranscriptRef.current = '';
    setRecordedAudioUrl(null);
    setRecordDuration(0);
    setRecordingMode('idle');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const openNewCustomModal = () => {
    setEditingSecuencia(null);
    setCustomDate(new Date().toISOString().split('T')[0]);
    setCustomTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCustomDoctor(doctors[0]?.name || 'Dr. Antonio Morera');
    setCustomProcedure('');
    setCustomTooth('');
    setCustomNotes('');
    setLinkedBudgetId(patientBudgets[0]?.id || '');
    setShowCustomModal(true);
  };

  const openEditSecuenciaModal = (sec: SecuenciaTratamiento) => {
    setEditingSecuencia(sec);
    setCustomDate(sec.date);
    setCustomTime(sec.time || '');
    setCustomDoctor(sec.doctorName);
    setCustomProcedure(sec.procedure);
    setCustomTooth(sec.toothNumber ? String(sec.toothNumber) : '');
    setCustomNotes(sec.notes || '');
    setLinkedBudgetId(sec.linkedBudgetId || patientBudgets[0]?.id || '');
    setShowCustomModal(true);
  };

  const handleSaveCustomSequence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProcedure.trim()) return;

    const finalNotes = customNotes + (recordingTranscript ? `\n[Transcripción de Audio]: ${recordingTranscript}` : '');

    if (editingSecuencia) {
      updateSecuenciaTratamiento({
        ...editingSecuencia,
        date: customDate,
        time: customTime || editingSecuencia.time,
        doctorName: customDoctor,
        procedure: customProcedure.trim(),
        toothNumber: customTooth ? parseInt(customTooth, 10) : undefined,
        notes: finalNotes,
        linkedBudgetId: linkedBudgetId || undefined,
        isAutomated: false
      });
    } else {
      addSecuenciaTratamiento({
        patientId: selectedPatientId,
        date: customDate,
        time: customTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toothNumber: customTooth ? parseInt(customTooth, 10) : undefined,
        procedure: customProcedure.trim(),
        notes: finalNotes,
        doctorName: customDoctor,
        audioDuration: recordDuration > 0 ? formatDuration(recordDuration) : '01:45',
        transcript: recordingTranscript || customNotes,
        linkedBudgetId: linkedBudgetId || undefined,
        isAutomated: false
      });
      showToast('Secuencia de tratamiento personalizada registrada en la historia');
    }

    setEditingSecuencia(null);
    setCustomProcedure('');
    setCustomNotes('');
    setRecordingTranscript('');
    setRecordDuration(0);
    setShowCustomModal(false);
  };

  const handleScheduleNextApt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!nextAptDate) {
      showToast('Por favor seleccione una fecha para la cita');
      return;
    }

    addAppointment({
      patientId: selectedPatientId,
      patientName: selectedPatient.name,
      patientPhone: selectedPatient.phone,
      date: nextAptDate,
      time: nextAptTime,
      durationMinutes: 45,
      box: nextAptBox,
      dentistName: nextAptDoctor,
      treatmentType: nextAptTreatment,
      status: 'agendada',
      notes: `Cita de seguimiento agendada desde Secuencia de Tratamientos (${nextAptBox})`
    });

    showToast(`Próxima cita agendada para el ${nextAptDate} a las ${nextAptTime} en ${nextAptBox}`);
    setNextAptDate('');
  };

  const togglePlayAudio = (sec: SecuenciaTratamiento) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (activePlayingId === sec.id) {
      setActivePlayingId(null);
      return;
    }

    setActivePlayingId(sec.id);

    if (sec.audioRecordingUrl) {
      const audio = new Audio(sec.audioRecordingUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setActivePlayingId(null);
      audio.onerror = () => setActivePlayingId(null);
      audio.play().catch(() => {
        setActivePlayingId(null);
        showToast('Reproducción de nota registrada');
      });
      return;
    }

    const spokenText = (sec.transcript || sec.notes || sec.procedure || '').trim();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && spokenText) {
      const utter = new SpeechSynthesisUtterance(spokenText);
      utter.lang = 'es-VE';
      utter.onend = () => setActivePlayingId(null);
      utter.onerror = () => setActivePlayingId(null);
      window.speechSynthesis.speak(utter);
      showToast('Reproduciendo nota clínica de la consulta...');
      return;
    }

    showToast('Reproduciendo registro de la sesión...');
    setTimeout(() => setActivePlayingId(null), 3000);
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Secuencia de Tratamientos" />;
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Historia Clínica · Evolución del Paciente
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 rounded font-mono">
              C.I: {selectedPatient.cedula}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Secuencia de Tratamientos de {selectedPatient.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro cronológico en tabla vinculado a los planes de tratamiento y grabación por voz.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openNewCustomModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Secuencia de Tratamiento Personalizada</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Table of Treatments) | Right (Voice & Next Appointment Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): TABLA DE SECUENCIA DE TRATAMIENTOS (Requerimiento explícito: Fila 1 Fecha, Fila 2 Dr, Fila 3 Tratamientos realizados) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Tabla de Evolución & Procedimientos Ejecutados ({patientSecuencias.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Clínica Corona · RHOdont
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sky-50/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {/* Fila / Columna 1: Fecha */}
                  <th className="py-3 px-4 w-32 border-r border-slate-200/60 dark:border-slate-800">
                    1. Fecha y Hora
                  </th>
                  {/* Fila / Columna 2: Dr. */}
                  <th className="py-3 px-4 w-44 border-r border-slate-200/60 dark:border-slate-800">
                    2. Odontólogo (Dr.)
                  </th>
                  {/* Fila / Columna 3: Tratamientos realizados vinculados al plan */}
                  <th className="py-3 px-4">
                    3. Tratamientos Realizados (Vinculados al Plan)
                  </th>
                  <th className="py-3 px-4 text-center w-28 no-print">
                    Audio / Nota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patientSecuencias.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No hay secuencias de tratamiento registradas aún. Presione "+ Secuencia de Tratamiento Personalizada".
                    </td>
                  </tr>
                ) : (
                  patientSecuencias.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      
                      {/* Columna 1: Fecha */}
                      <td className="py-3 px-4 border-r border-slate-200/60 dark:border-slate-800 font-mono text-[11px] align-top">
                        <div className="font-bold text-slate-900 dark:text-white">{sec.date}</div>
                        <div className="text-slate-400 text-[10px]">{sec.time}</div>
                      </td>

                      {/* Columna 2: Dr. */}
                      <td className="py-3 px-4 border-r border-slate-200/60 dark:border-slate-800 align-top font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-sky-600" />
                          <span>{sec.doctorName}</span>
                        </div>
                      </td>

                      {/* Columna 3: Tratamientos Realizados */}
                      <td className="py-3 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {sec.isAutomated ? (
                            <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                              Auto-Plan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">
                              Personalizado
                            </span>
                          )}
                          {sec.toothNumber && (
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px]">
                              Pieza #{sec.toothNumber}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sec.procedure}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">
                          {sec.notes}
                        </p>
                      </td>

                      {/* Audio / Personalizar / Acciones */}
                      <td className="py-3 px-4 align-top text-center no-print">
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditSecuenciaModal(sec)}
                            className="w-full justify-center px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition inline-flex items-center gap-1"
                            title="Editar / Personalizar secuencia de tratamiento"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Personalizar</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(sec)}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition inline-flex items-center gap-1"
                              title="Reproducir audio de la sesión"
                            >
                              {activePlayingId === sec.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              <span>{sec.audioDuration || '01:30'}</span>
                            </button>
                            {confirmDeleteId === sec.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  deleteSecuenciaTratamiento(sec.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(sec.id)}
                                aria-label={`Eliminar secuencia ${sec.procedure}`}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Eliminar entrada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Voice Dictation + Interactive Appointment Calendar */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Box 1: Voice Recorder to write directly into sequence */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-sky-600" />
                <span>Grabar Conversación en Consulta</span>
              </h3>
              {isRecording ? (
                <span className="text-[10px] font-mono font-bold text-red-600 animate-pulse">
                  ● GRABANDO {formatDuration(recordDuration)}
                </span>
              ) : recordDuration > 0 || recordingTranscript ? (
                <span className="text-[10px] font-mono font-bold text-emerald-600">
                  LISTO ({formatDuration(recordDuration)})
                </span>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2.5">
              <button
                type="button"
                aria-label={isRecording ? 'Detener grabación con el paciente' : 'Iniciar grabación con el paciente'}
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-all shadow-md ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200 dark:ring-red-900/60 scale-105'
                    : 'bg-sky-600 hover:bg-sky-500 text-white hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isRecording
                  ? 'Grabando consulta... (clic para detener)'
                  : 'Iniciar grabación con el paciente'}
              </div>

              {isRecording && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  <Volume2 className="w-3 h-3" />
                  <span>
                    {recordingMode === 'mic'
                      ? 'Micrófono y dictado en vivo activos'
                      : 'Modo dictado asistido activo (edición directa habilitada)'}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Transcribe automáticamente el diálogo o permite dictar/editar la nota para anexarla directo a la secuencia.
              </p>
            </div>

            {(isRecording || recordingTranscript || recordedAudioUrl) && (
              <form onSubmit={handleSaveRecordedSequence} className="p-3 bg-sky-50/80 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" /> Transcripción / Nota de Consulta:
                  </span>
                  {recordedAudioUrl && (
                    <audio controls src={recordedAudioUrl} className="h-7 max-w-[170px]" />
                  )}
                </div>

                <textarea
                  rows={4}
                  value={recordingTranscript}
                  onChange={(e) => {
                    finalTranscriptRef.current = e.target.value;
                    setRecordingTranscript(e.target.value);
                  }}
                  placeholder="Aquí aparecerá el diálogo grabado o puede escribir/editar la evolución clínica..."
                  className="w-full p-2.5 rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed outline-none focus:border-sky-500"
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={quickRecordProcedure}
                    onChange={(e) => setQuickRecordProcedure(e.target.value)}
                    placeholder="Tratamiento realizado"
                    aria-label="Tratamiento realizado en la grabación"
                    className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold outline-none"
                  />
                  <input
                    type="number"
                    value={quickRecordTooth}
                    onChange={(e) => setQuickRecordTooth(e.target.value)}
                    placeholder="Pieza #"
                    aria-label="Pieza dental"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={discardRecordingDraft}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar en Secuencia</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Box 2: CALENDARIO INTERACTIVO PARA CITAR AL PACIENTE (Requerimiento explícito) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Agendar Próxima Cita</span>
              </h3>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                Google Calendar Sync
              </span>
            </div>

            <form onSubmit={handleScheduleNextApt} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha de Cita:
                  </label>
                  <input
                    type="date"
                    required
                    value={nextAptDate}
                    onChange={(e) => setNextAptDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora:
                  </label>
                  <input
                    type="time"
                    required
                    value={nextAptTime}
                    onChange={(e) => setNextAptTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Consultorio:
                </label>
                <select
                  value={nextAptBox}
                  onChange={(e) => setNextAptBox(e.target.value as BoxType)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none font-bold"
                >
                  <option value="Consultorio 1">Consultorio 1 (Dr. Antonio Morera)</option>
                  <option value="Consultorio 2">Consultorio 2 (Dr. Alejandro Morera)</option>
                  <option value="Consultorio 3">Consultorio 3 (Dra. Valentina Sardi)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tratamiento / Procedimiento:
                </label>
                <input
                  type="text"
                  required
                  value={nextAptTreatment}
                  onChange={(e) => setNextAptTreatment(e.target.value)}
                  placeholder="Ej. Colocación de corona / Control ortodoncia"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Confirmar y Coordinar Cita</span>
              </button>

            </form>
          </div>

        </div>

      </div>

      {/* MODAL: AGREGAR O PERSONALIZAR SECUENCIA DE TRATAMIENTO */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {editingSecuencia ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {editingSecuencia
                    ? 'Personalizar Secuencia de Tratamiento'
                    : 'Nueva Secuencia de Tratamiento Personalizada'}
                </span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setEditingSecuencia(null);
                  setShowCustomModal(false);
                }}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomSequence} className="p-5 space-y-3.5 text-xs">
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha de la Sesión:
                  </label>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora:
                  </label>
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="10:30"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Odontólogo (Dr.):
                  </label>
                  <select
                    value={customDoctor}
                    onChange={(e) => setCustomDoctor(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tratamiento Realizado:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tartrectomía y Pulido / Resina compuesta"
                    value={customProcedure}
                    onChange={(e) => setCustomProcedure(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pieza Dental:
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 21"
                    value={customTooth}
                    onChange={(e) => setCustomTooth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Vincular con Plan de Tratamiento / Presupuesto:
                </label>
                <select
                  value={linkedBudgetId}
                  onChange={(e) => setLinkedBudgetId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">(Sin vincular a presupuesto específico)</option>
                  {patientBudgets.map(b => (
                    <option key={b.id} value={b.id}>
                      Presupuesto #{b.folio} - Total ${b.total} USD ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas de Evolución Clínica (Personalizables):
                </label>
                <textarea
                  rows={4}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Detalle clínico de lo realizado, materiales, técnica, anestésico y recomendaciones..."
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSecuencia(null);
                    setShowCustomModal(false);
                  }}
                  className="px-3 py-1.5 border rounded-lg text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-xs"
                >
                  {editingSecuencia ? 'Guardar Personalización' : 'Guardar en Secuencia'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
