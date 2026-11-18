import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useDental } from '../context/DentalContext';
import { Role, SoftwareImportPatient } from '../types/dental';
import { formatWhatsAppTemplate, paginateList } from '../utils/dentalCalc';
import {
  parsePatientsFromRows,
  parsePatientsFromCoordinatePdfPages,
  partitionValidCleanPatients,
  sanitizePatientNumericId,
  PdfTextItemLike
} from '../utils/patientImportParser';
import {
  Settings,
  ShieldCheck,
  MessageSquare,
  Download,
  Upload,
  Save,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Trash2,
  Users,
  Filter,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PERM_LABELS: Array<{ key: string; label: string }> = [
  { key: 'ver_tablero', label: 'Ver Tablero de Inicio' },
  { key: 'gestionar_agendas', label: 'Gestionar Citas & Bloqueos' },
  { key: 'editar_historia', label: 'Editar Historia Clínica' },
  { key: 'odontograma_3d', label: 'Odontodiagrama / Plan' },
  { key: 'crear_presupuestos', label: 'Crear / Editar Presupuestos' },
  { key: 'cobrar_caja_seniat', label: 'Caja, Multi-Pagos & SENIAT' },
  { key: 'gestionar_cuotas', label: 'Gestión de Cuotas' },
  { key: 'editar_tabulador', label: 'Tabulador & Ajuste Masivo' },
  { key: 'ver_liquidaciones', label: 'Liquidaciones de Doctores' },
  { key: 'configurar_clinica', label: 'Configuración & Roles' }
];

const ROLES_LIST: Array<{ id: Role; label: string }> = [
  { id: 'admin', label: 'Administrador' },
  { id: 'doctor', label: 'Odontólogo' },
  { id: 'recepcion', label: 'Recepción' },
  { id: 'paciente', label: 'Paciente' }
];

export const ConfiguracionView: React.FC = () => {
  const {
    clinicConfig,
    updateClinicConfig,
    rolePermissions,
    updateRolePermission,
    patients,
    appointments,
    budgets,
    payments,
    importPatientsFromSoftware,
    clearAllPatients,
    cleanInvalidPatients,
    showToast
  } = useDental();

  const [activeConfigTab, setActiveConfigTab] = useState<'clinica' | 'roles' | 'importar' | 'respaldos'>('clinica');
  const [importPage, setImportPage] = useState<number>(1);
  const [formCfg, setFormCfg] = useState(clinicConfig);
  const [importSource, setImportSource] = useState<SoftwareImportPatient['sourceSoftware']>('Excel/CSV');
  const [importedPreview, setImportedPreview] = useState<SoftwareImportPatient[]>([]);
  const [rejectedImportCount, setRejectedImportCount] = useState<number>(0);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [confirmClearPatients, setConfirmClearPatients] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'clinica' || detail === 'roles' || detail === 'importar' || detail === 'respaldos') {
        setActiveConfigTab(detail);
      }
    };
    window.addEventListener('corona:open-config-subtab', handler);
    return () => window.removeEventListener('corona:open-config-subtab', handler);
  }, []);

  const paginatedImport = paginateList(importedPreview, importPage, 20);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateClinicConfig(formCfg);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setFormCfg(prev => ({ ...prev, logoUrl: ev.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const liveWaPreview = formatWhatsAppTemplate(formCfg.waTemplateReminder, {
    paciente: 'Carlos Pérez',
    clinica: formCfg.clinicName,
    fecha: '15/11/2026',
    hora: '10:00 AM',
    doctor: 'Dr. Antonio Morera',
    box: 'Consultorio 1'
  });

  const downloadBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      clinicConfig: formCfg,
      patients,
      appointments,
      budgets,
      payments
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-clinica-corona-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo completo JSON descargado');
  };

  const downloadPatientsCsv = () => {
    const header = 'Nombre,Cedula,Telefono,Email,SaldoUSD,UltimaVisita\n';
    const rows = patients
      .map(p => `"${p.name}","${p.cedula}","${p.phone}","${p.email}",${p.balance},"${p.lastVisit || ''}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes-clinica-corona-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Listado de pacientes CSV exportado');
  };

  const downloadExcelTemplate = () => {
    const sampleRows = [
      {
        ID: 1,
        CEDULA: '10337151',
        APELLIDO: 'COLTELLACCI',
        NOMBRE: 'ROMANO',
        'FECHA INGRESO': '.31/08/2021',
        'ULT. CITA': '.00/01/000',
        DOCTOR: 'Admin .',
        MOTIVO: 'CONTROL',
        TELEFONO: '4242268422',
        EMAIL: 'ROMANOCOLT@GMAIL.COM'
      },
      {
        ID: 2,
        CEDULA: '3876638',
        APELLIDO: 'SANCHEZ',
        NOMBRE: 'NELSON',
        'FECHA INGRESO': '.02/09/2021',
        'ULT. CITA': '.20/06/2022',
        DOCTOR: 'ANTONIO MORERA',
        MOTIVO: 'CONTROL',
        TELEFONO: '4265162620',
        EMAIL: 'NELSONSANFER@HOTMAIL.COM'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
    XLSX.writeFile(wb, 'plantilla-importar-pacientes-10col-corona.xlsx');
    showToast('Plantilla Excel de 10 columnas (.xlsx) descargada');
  };

  const handlePatientFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingFile(true);
    setImportedFileName(file.name);

    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pagesItems: PdfTextItemLike[][] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          pagesItems.push(content.items as PdfTextItemLike[]);
        }
        const sourceTag = importSource === 'Excel/CSV' ? 'PDF' : importSource;
        const parsed = parsePatientsFromCoordinatePdfPages(pagesItems, sourceTag);
        const { valid, rejected } = partitionValidCleanPatients(parsed);
        const normalizedValid = valid.map((row, idx) => ({
          ...row,
          historyNumber: sanitizePatientNumericId(row.historyNumber, idx + 1)
        }));
        setImportedPreview(normalizedValid);
        setImportPage(1);
        setRejectedImportCount(rejected.length);
        if (normalizedValid.length === 0) {
          showToast('No se detectaron pacientes válidos (con Nombre, Apellido, Cédula, Correo y sin "X") en el PDF.');
        } else {
          showToast(`${normalizedValid.length} pacientes válidos detectados (${rejected.length} descartados)`);
        }
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          setImportedPreview([]);
          setRejectedImportCount(0);
          showToast('El archivo Excel está vacío.');
          return;
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet], { defval: '' });
        const sourceTag = importSource === 'PDF' ? 'Excel/CSV' : importSource;
        const parsed = parsePatientsFromRows(rows, sourceTag);
        const { valid, rejected } = partitionValidCleanPatients(parsed);
        const normalizedValid = valid.map((row, idx) => ({
          ...row,
          historyNumber: sanitizePatientNumericId(row.historyNumber, idx + 1)
        }));
        setImportedPreview(normalizedValid);
        setImportPage(1);
        setRejectedImportCount(rejected.length);
        if (normalizedValid.length === 0) {
          showToast('No se encontraron pacientes válidos (Nombre, Apellido, Cédula y Correo correctos, sin "X").');
        } else {
          showToast(`${normalizedValid.length} pacientes válidos listos (${rejected.length} descartados)`);
        }
      }
    } catch {
      setImportedPreview([]);
      setRejectedImportCount(0);
      showToast('Error al leer el archivo. Asegúrate de usar un .xlsx, .xls, .csv o .pdf válido.');
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  const handleConfirmPatientImport = () => {
    if (importedPreview.length === 0) return;
    importPatientsFromSoftware(importedPreview);
    setImportedPreview([]);
    setRejectedImportCount(0);
    setImportedFileName('');
  };

  return (
    <div className="space-y-5">
      {/* Header + 4 Clean Sub-Pages Switcher */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Configuración de Clínica, WhatsApp & Roles
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Datos fiscales SENIAT, plantilla dinámica de recordatorios, matriz de permisos, importación y respaldos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {(
            [
              { id: 'clinica', label: 'Clínica & WhatsApp', icon: Settings },
              { id: 'roles', label: 'Roles y Permisos', icon: ShieldCheck },
              { id: 'importar', label: 'Importar Pacientes (Excel / PDF)', icon: Users },
              { id: 'respaldos', label: `Depuración & Respaldos (${patients.length})`, icon: Database }
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const active = activeConfigTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveConfigTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  active
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-PÁGINA 1: IDENTIDAD DE LA CLÍNICA & WHATSAPP */}
      {activeConfigTab === 'clinica' && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 max-w-4xl"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identidad de la Clínica</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nombre Comercial
              <input
                type="text"
                value={formCfg.clinicName}
                onChange={e => setFormCfg(prev => ({ ...prev, clinicName: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              RIF Fiscal
              <input
                type="text"
                value={formCfg.rif}
                onChange={e => setFormCfg(prev => ({ ...prev, rif: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Teléfono Principal
              <input
                type="text"
                value={formCfg.phone}
                onChange={e => setFormCfg(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Código País WA / IGTF (%)
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={formCfg.waCountryCode}
                  onChange={e => setFormCfg(prev => ({ ...prev, waCountryCode: e.target.value }))}
                  className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                />
                <input
                  type="number"
                  value={formCfg.igftRate}
                  onChange={e => setFormCfg(prev => ({ ...prev, igftRate: Number(e.target.value) }))}
                  className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                />
              </div>
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Dirección Fiscal / Sede
            <input
              type="text"
              value={formCfg.address}
              onChange={e => setFormCfg(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            URL Pública Compartida para Códigos QR (opcional)
            <input
              type="url"
              value={formCfg.publicQrBaseUrl || ''}
              onChange={e => setFormCfg(prev => ({ ...prev, publicQrBaseUrl: e.target.value }))}
              placeholder="Ej. https://ais-pre-...run.app o https://clinica.tudominio.com"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Si queda vacío, usa automáticamente el dominio activo actual (sin errores 404). Para escanear desde celulares externos, publica primero la app con Compartir (Share App) o pega aquí tu dominio público ya publicado.
            </span>
          </label>

          <div className="flex items-center gap-3">
            {formCfg.logoUrl && (
              <img src={formCfg.logoUrl} alt="Logo Clínica" className="h-10 w-10 object-contain rounded border" />
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800">
              <Upload className="w-3.5 h-3.5 text-sky-600" /> Subir Logo de Clínica
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <MessageSquare className="w-3.5 h-3.5" /> Plantilla WhatsApp ({`{paciente}`}, {`{fecha}`}, {`{hora}`}, {`{doctor}`}, {`{box}`}, {`{clinica}`})
              </span>
              <textarea
                rows={3}
                value={formCfg.waTemplateReminder}
                onChange={e => setFormCfg(prev => ({ ...prev, waTemplateReminder: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </label>
            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="block text-[10px] uppercase tracking-wider mb-1">Vista previa en vivo:</strong>
              {liveWaPreview}
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold"
          >
            <Save className="w-3.5 h-3.5" /> Guardar Configuración
          </button>
        </form>
      )}

      {/* SUB-PÁGINA 2: MATRIZ DE PERMISOS POR ROL */}
      {activeConfigTab === 'roles' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Matriz de Permisos por Rol</h3>
          </div>
          <p className="text-xs text-slate-500">
            Control granular de acceso a módulos clínicos, caja SENIAT y configuración.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-sky-50/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5">Capacidad del Sistema</th>
                  {ROLES_LIST.map(r => (
                    <th key={r.id} className="px-2 py-2.5 text-center">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {PERM_LABELS.map(perm => (
                  <tr key={perm.key} className="hover:bg-sky-50/30 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{perm.label}</td>
                    {ROLES_LIST.map(role => {
                      const checked = Boolean(rolePermissions[role.id]?.[perm.key]);
                      return (
                        <td key={role.id} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            aria-label={`${perm.label} para ${role.label}`}
                            onChange={e => updateRolePermission(role.id, perm.key, e.target.checked)}
                            className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PÁGINA 3: IMPORTAR PACIENTES DESDE EXCEL O PDF */}
      {activeConfigTab === 'importar' && (
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Importar Pacientes de Otros Softwares (Excel o PDF)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Carga archivos exportados de RhOdont, Dentalink, DentalApp, Dentidesk u otro sistema en formato Excel (.xlsx, .xls, .csv) o PDF (.pdf).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={importSource}
              onChange={e => setImportSource(e.target.value as SoftwareImportPatient['sourceSoftware'])}
              aria-label="Software de origen de importación"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="Excel/CSV">Archivo Excel / CSV</option>
              <option value="PDF">Listado PDF (.pdf)</option>
              <option value="RhOdont">Software: RhOdont</option>
              <option value="Dentalink">Software: Dentalink</option>
              <option value="DentalApp">Software: DentalApp</option>
              <option value="Dentidesk">Software: Dentidesk</option>
            </select>

            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Plantilla Excel (.xlsx)
            </button>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer shadow-xs transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{isParsingFile ? 'Procesando archivo...' : 'Subir Excel o PDF'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handlePatientFileUpload}
                className="hidden"
                aria-label="Seleccionar archivo Excel o PDF de pacientes"
              />
            </label>
          </div>
        </div>

        {importedPreview.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 text-center space-y-2">
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <FileText className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {importedFileName
                ? `No se detectaron registros válidos en "${importedFileName}".`
                : 'Selecciona un archivo .xlsx, .xls, .csv o .pdf para previsualizar e importar pacientes.'}
            </p>
            <p className="text-[11px] text-slate-500">
              Formato 10 columnas compatible: ID, CEDULA, APELLIDO, NOMBRE, FECHA INGRESO, ULT. CITA, DOCTOR, MOTIVO, TELEFONO y EMAIL.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Archivo: <strong className="text-sky-700 dark:text-sky-300">{importedFileName}</strong> · {importedPreview.length} paciente(s) válidos (solo Nro. de ID, sin "X")
                </span>
                {rejectedImportCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                    {rejectedImportCount} descartado(s) por "X" o datos incompletos
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportedPreview([]);
                    setRejectedImportCount(0);
                    setImportedFileName('');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPatientImport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Importar {importedPreview.length} Pacientes</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-sky-50/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Cédula</th>
                    <th className="px-3 py-2.5">Paciente</th>
                    <th className="px-3 py-2.5">Fecha Ingreso</th>
                    <th className="px-3 py-2.5">Ult. Cita</th>
                    <th className="px-3 py-2.5">Doctor</th>
                    <th className="px-3 py-2.5">Motivo</th>
                    <th className="px-3 py-2.5">Teléfono</th>
                    <th className="px-3 py-2.5">Correo</th>
                    <th className="px-3 py-2.5 text-right">Quitar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedImport.items.map((row, idx) => {
                    const globalIdx = (paginatedImport.page - 1) * paginatedImport.pageSize + idx;
                    return (
                    <tr key={`${row.cedula}-${globalIdx}`} className="hover:bg-sky-50/30 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-slate-500">{row.historyNumber || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.cedula}</td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-3 py-2 font-mono">{row.admissionDate || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.lastAppointmentDate || '—'}</td>
                      <td className="px-3 py-2">{row.doctorName || '—'}</td>
                      <td className="px-3 py-2 uppercase font-semibold text-sky-700 dark:text-sky-300">{row.consultationReason || 'control'}</td>
                      <td className="px-3 py-2 font-mono">{row.phone || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.email || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setImportedPreview(prev => prev.filter((_, i) => i !== globalIdx))}
                          aria-label={`Quitar a ${row.name} de la importación`}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            {paginatedImport.totalItems > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <span className="text-slate-500">
                  Mostrando <strong className="text-slate-800 dark:text-slate-200">{paginatedImport.startIndex}–{paginatedImport.endIndex}</strong> de{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{paginatedImport.totalItems}</strong> · Página {paginatedImport.page} de {paginatedImport.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={paginatedImport.page <= 1}
                    onClick={() => setImportPage(p => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                  <button
                    type="button"
                    disabled={paginatedImport.page >= paginatedImport.totalPages}
                    onClick={() => setImportPage(p => Math.min(paginatedImport.totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold disabled:opacity-40"
                  >
                    Siguiente <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* SUB-PÁGINA 4: DEPURACIÓN DE HISTORIAS & RESPALDOS */}
      {activeConfigTab === 'respaldos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Depuración y Mantenimiento de Historias</h3>
            </div>
            <p className="text-xs text-slate-500">
              Herramientas administrativas protegidas para limpiar registros con datos inválidos o vaciar la base de historias para re-importación.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {patients.length > 0 && (
                <button
                  type="button"
                  data-testid="config-clean-invalid-btn"
                  onClick={() => cleanInvalidPatients()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100"
                >
                  <Filter className="w-3.5 h-3.5" /> Depurar X / ID ({patients.length})
                </button>
              )}
              {patients.length > 0 && (
                !confirmClearPatients ? (
                  <button
                    type="button"
                    data-testid="config-clear-all-patients-btn"
                    onClick={() => setConfirmClearPatients(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Borrar Todas las Historias ({patients.length})
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">
                    <span>¿Borrar {patients.length} historias?</span>
                    <button
                      type="button"
                      data-testid="config-confirm-clear-all-btn"
                      onClick={() => {
                        clearAllPatients();
                        setConfirmClearPatients(false);
                      }}
                      className="px-2 py-0.5 rounded bg-white text-rose-700 hover:bg-rose-50 font-black"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearPatients(false)}
                      className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-800"
                    >
                      No
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportación y Respaldos Totales</h3>
            </div>
            <p className="text-xs text-slate-500">
              Descarga el directorio de pacientes en formato Excel/CSV o realiza un respaldo completo JSON de toda la clínica.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={downloadPatientsCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" /> Exportar Pacientes CSV
              </button>
              <button
                type="button"
                onClick={downloadBackupJson}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Respaldo JSON Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
