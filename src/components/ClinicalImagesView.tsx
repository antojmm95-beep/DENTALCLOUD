import React, { useState, useRef } from 'react';
import { useDental } from '../context/DentalContext';
import { ClinicalImage } from '../types/dental';
import { EmptyPatientState } from './EmptyPatientState';
import { 
  Camera, 
  Upload, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  FileImage, 
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Contrast,
  RotateCw
} from 'lucide-react';

export const ClinicalImagesView: React.FC = () => {
  const { 
    selectedPatient, 
    selectedPatientId, 
    clinicalImages, 
    addClinicalImage, 
    deleteClinicalImage,
    showToast 
  } = useDental();

  // Upload state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClinicalImage['category']>('radiografia_periapical');
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'tomografia' | 'radiografia' | 'foto' | 'documento_consentimiento'>('todos');
  const [toothNumber, setToothNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [imageDate, setImageDate] = useState('2026-11-10');
  const [selectedImageFileUrl, setSelectedImageFileUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraSource, setCameraSource] = useState('HP TrueVision HD Camera');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Lightbox / Inspection state
  const [inspectedImage, setInspectedImage] = useState<ClinicalImage | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isInverted, setIsInverted] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Comparison mode (Antes / Después)
  const [compareMode, setCompareMode] = useState(false);
  const [compareImage1, setCompareImage1] = useState<ClinicalImage | null>(null);
  const [compareImage2, setCompareImage2] = useState<ClinicalImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const patientImages = clinicalImages.filter(img => img.patientId === selectedPatientId);
  const filteredImages = patientImages.filter(img => {
    if (categoryFilter === 'todos') return true;
    if (categoryFilter === 'tomografia') return img.category === 'tomografia';
    if (categoryFilter === 'radiografia') return img.category === 'radiografia_periapical' || img.category === 'radiografia_panoramica';
    if (categoryFilter === 'foto') return img.category === 'foto_intraoral' || img.category === 'foto_extraoral' || img.category === 'control_evolucion';
    if (categoryFilter === 'documento_consentimiento') return img.category === 'documento_consentimiento';
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageFileUrl(reader.result as string);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        simulateCameraSnapshot();
      }
    } catch {
      simulateCameraSnapshot();
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelectedImageFileUrl(dataUrl);
        setTitle(`Foto Clínica ${new Date().toLocaleDateString('es-ES')}`);
      }
    }
    stopCamera();
    showToast('Fotografía capturada con éxito');
  };

  const simulateCameraSnapshot = () => {
    // High quality clinical intraoral simulation
    setSelectedImageFileUrl('https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80');
    setTitle(`Foto Intraoral Capturada ${new Date().toLocaleDateString('es-ES')}`);
    setIsCameraActive(false);
    showToast('Captura fotográfica completada');
  };

  const handleSaveImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageFileUrl || !title) return;

    addClinicalImage({
      patientId: selectedPatientId,
      title,
      category,
      date: imageDate || new Date().toISOString().split('T')[0],
      url: selectedImageFileUrl,
      toothNumber: toothNumber ? parseInt(toothNumber) : undefined,
      notes
    });

    setTitle('');
    setSelectedImageFileUrl(null);
    setNotes('');
    setToothNumber('');
  };

  const openLightbox = (img: ClinicalImage) => {
    setInspectedImage(img);
    setZoomLevel(1);
    setIsInverted(false);
    setRotationAngle(0);
  };

  if (!selectedPatient) {
    return <EmptyPatientState moduleName="Archivos Digitales y Radiografías" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Fotografía Clínica & Radiografías Control
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                Visor de Alta Definición
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paciente: <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.name}</strong> (C.I: {selectedPatient.cedula})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 rounded-lg transition shadow-xs"
              title="Escanear con teléfono móvil para subir fotos o radiografías directamente"
            >
              <span className="text-sm">📱</span>
              <span>Subir con Celular (QR)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode && patientImages.length >= 2) {
                  setCompareImage1(patientImages[0]);
                  setCompareImage2(patientImages[1]);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition ${
                compareMode 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{compareMode ? 'Salir de Comparador' : 'Comparar Antes / Después'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Camera (Left 5 cols) + Gallery & Image Visualizer (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload & Webcam Panel (matches RHSistema's Fuente de Imagen, HP TrueVision HD Camera) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>Subir o Capturar Fotografía / Radiografía</span>
            </h3>
          </div>

          {/* Source selection & Webcam preview */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Fuente de Imagen:
              </label>
              <select
                value={cameraSource}
                onChange={(e) => setCameraSource(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="HP TrueVision HD Camera">HP TrueVision HD Camera (Cámara Web)</option>
                <option value="Sensor Radiográfico USB">Sensor Radiovisiógrafo Digital USB</option>
                <option value="Archivo Local">Cargar desde Computadora / Archivo</option>
              </select>
            </div>

            {/* Webcam Live Box or Placeholder */}
            {isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-md flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : selectedImageFileUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 aspect-video flex items-center justify-center group">
                <img src={selectedImageFileUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setSelectedImageFileUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-500 transition"
                  title="Eliminar foto previa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-200 dark:border-sky-900/60 rounded-xl p-6 text-center cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition space-y-2"
              >
                <Upload className="w-8 h-8 text-sky-500 mx-auto" />
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Arrastra tu archivo o haz clic para buscar
                </div>
                <div className="text-[11px] text-slate-400">
                  Soporta radiografías periapicales, panorámicas y fotos intraorales (JPG, PNG)
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Quick action buttons for source */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Buscar Archivo</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-2 px-3 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-lg transition border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Tomar Foto Web</span>
              </button>
            </div>

            {/* Metadata Form */}
            <form onSubmit={handleSaveImage} className="space-y-3 pt-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título o Identificación:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rx Periapical Control Pz 16"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha de Toma:
                  </label>
                  <input
                    type="date"
                    required
                    value={imageDate}
                    onChange={(e) => setImageDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-semibold text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Imagen:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none text-[11px]"
                  >
                    <option value="radiografia_periapical">Radiografía Periapical</option>
                    <option value="radiografia_panoramica">Radiografía Panorámica</option>
                    <option value="tomografia">Tomografía CBCT</option>
                    <option value="foto_intraoral">Fotografía Intraoral</option>
                    <option value="foto_extraoral">Fotografía Extraoral</option>
                    <option value="control_evolucion">Control de Evolución</option>
                    <option value="documento_consentimiento">Documento / Consentimiento</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Pieza FDI (Opcional):
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 16, 21"
                    value={toothNumber}
                    onChange={(e) => setToothNumber(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Hallazgo Radiológico / Observación:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles de la cortical ósea, ligamento periodontal, etc."
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedImageFileUrl}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar en Expediente Radiológico</span>
              </button>
            </form>
          </div>
        </div>

        {/* Gallery & Comparison View (Right 7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileImage className="w-4 h-4 text-sky-600" />
                <span>Archivos Digitales del Paciente ({filteredImages.length})</span>
              </h3>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'tomografia', label: 'Tomografía' },
                  { id: 'radiografia', label: 'Radiografía' },
                  { id: 'foto', label: 'Foto clínica' },
                  { id: 'documento_consentimiento', label: 'Documento/consentimiento' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    categoryFilter === tab.id
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Comparison Mode (Antes y Después) */}
            {compareMode && patientImages.length >= 2 ? (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-purple-200 dark:border-purple-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Comparativa Clínica: Antes vs. Después (Control)</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      Estado Inicial (Antes):
                    </span>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={compareImage1?.url} alt="Antes" className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{compareImage1?.title}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      Control Post-Tratamiento (Después):
                    </span>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={compareImage2?.url} alt="Después" className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{compareImage2?.title}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Gallery Grid */}
            {filteredImages.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-12 text-center">
                No hay archivos en esta categoría para el paciente seleccionado.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
                {filteredImages.map((img) => (
                  <div 
                    key={img.id}
                    className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 hover:border-sky-400 transition group"
                  >
                    <div 
                      onClick={() => openLightbox(img)}
                      className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer relative"
                    >
                      <img 
                        src={img.url} 
                        alt={img.title} 
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" 
                      />
                      <span className="absolute bottom-2 right-2 p-1 bg-black/60 text-white rounded text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-3 h-3" />
                        <span>Inspeccionar</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {img.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {img.date} · {img.category.replace('_', ' ').toUpperCase()} {img.toothNumber ? `· Pz #${img.toothNumber}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteClinicalImage(img.id)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                        title="Eliminar de expediente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {img.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                        {img.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Fullscreen Radiographic Lightbox Modal */}
      {inspectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h4 className="font-bold text-sm">{inspectedImage.title}</h4>
                <p className="text-[11px] text-slate-400">
                  {inspectedImage.date} · {inspectedImage.category.replace('_', ' ').toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                  title="Reducir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsInverted(!isInverted)}
                  className={`p-1.5 rounded-lg text-slate-300 transition ${isInverted ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
                  title="Invertir Contraste (Filtro Radiográfico)"
                >
                  <Contrast className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                  title="Rotar 90 grados"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedImage(null)}
                  className="p-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visualizer Body */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-black min-h-[350px]">
              <img
                src={inspectedImage.url}
                alt={inspectedImage.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                  filter: isInverted ? 'invert(1) contrast(1.4)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>

            {inspectedImage.notes && (
              <div className="p-3 bg-slate-800/80 border-t border-slate-700 text-xs text-slate-300">
                <span className="font-bold text-sky-400">Nota diagnóstica:</span> {inspectedImage.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SUBIR DESDE TELÉFONO MÓVIL MEDIANTE CÓDIGO QR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-center space-y-0">
            
            <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <h3 className="font-bold text-sm">Subir Foto o Radiografía con Celular</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 inline-block shadow-inner">
                {/* SVG QR Code Simulation */}
                <svg className="w-44 h-44 mx-auto text-slate-900 dark:text-white" viewBox="0 0 100 100" fill="currentColor">
                  {/* Outer Frame Top Left */}
                  <rect x="5" y="5" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="11" y="11" width="16" height="16" rx="1" />
                  {/* Outer Frame Top Right */}
                  <rect x="67" y="5" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="73" y="11" width="16" height="16" rx="1" />
                  {/* Outer Frame Bottom Left */}
                  <rect x="5" y="67" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="11" y="73" width="16" height="16" rx="1" />
                  {/* QR Pattern Blocks */}
                  <rect x="38" y="8" width="6" height="6" />
                  <rect x="48" y="14" width="6" height="6" />
                  <rect x="56" y="8" width="6" height="6" />
                  <rect x="38" y="24" width="6" height="6" />
                  <rect x="48" y="32" width="6" height="6" />
                  <rect x="10" y="40" width="6" height="6" />
                  <rect x="22" y="44" width="6" height="6" />
                  <rect x="38" y="48" width="6" height="6" />
                  <rect x="52" y="44" width="6" height="6" />
                  <rect x="68" y="40" width="6" height="6" />
                  <rect x="80" y="46" width="6" height="6" />
                  <rect x="38" y="64" width="6" height="6" />
                  <rect x="48" y="70" width="6" height="6" />
                  <rect x="60" y="64" width="6" height="6" />
                  <rect x="72" y="70" width="6" height="6" />
                  <rect x="84" y="64" width="6" height="6" />
                  <rect x="44" y="82" width="6" height="6" />
                  <rect x="60" y="82" width="6" height="6" />
                  <rect x="76" y="82" width="6" height="6" />
                </svg>
              </div>

              <div className="text-left space-y-2 bg-sky-50 dark:bg-sky-950/40 p-3 rounded-xl border border-sky-100 dark:border-sky-900 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Pasos para subir desde su smartphone:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Abra la cámara en su teléfono móvil (iPhone o Android).</li>
                  <li>Escanee el código QR para abrir el módulo directo de captura.</li>
                  <li>Tome la foto intraoral o radiografía y quedará guardada con fecha: <strong className="text-slate-900 dark:text-white font-mono">{imageDate}</strong>.</li>
                </ol>
              </div>

              {/* Direct Simulation Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    addClinicalImage({
                      patientId: selectedPatientId,
                      title: `Foto Intraoral Móvil - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                      category: 'foto_intraoral',
                      date: imageDate,
                      url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
                      notes: `Foto capturada directamente vía enlace QR móvil el ${imageDate}. Control de oclusión.`
                    });
                    setShowQrModal(false);
                    showToast(`Fotografía sincronizada desde dispositivo móvil con fecha ${imageDate}`);
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Simular Subida Inmediata desde Celular</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
