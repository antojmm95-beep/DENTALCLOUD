import React, { useEffect, useRef, useState } from 'react';
import { DentalProvider, useDental } from './context/DentalContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeDashboardView } from './components/HomeDashboardView';
import { AgendaView } from './components/AgendaView';
import { ClinicalHistoryView } from './components/ClinicalHistoryView';
import { OdontogramView } from './components/OdontogramView';
import { BudgetView } from './components/BudgetView';
import { SecuenciaTratamientosView } from './components/SecuenciaTratamientosView';
import { ClinicalImagesView } from './components/ClinicalImagesView';
import { PaymentsView } from './components/PaymentsView';
import { ReportsView } from './components/ReportsView';
import { RecipesView } from './components/RecipesView';
import { ConsentView } from './components/ConsentView';
import { WhatsAppCenter } from './components/WhatsAppCenter';
import { AdministracionView } from './components/AdministracionView';
import { RendimientoView } from './components/RendimientoView';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { NewPatientModal } from './components/NewPatientModal';
import { DoctoresView } from './components/DoctoresView';
import { MultiPagosView } from './components/MultiPagosView';
import { PatientSearchModal } from './components/PatientSearchModal';
import { PatientBanner } from './components/PatientBanner';
import { CuotasTabuladorView } from './components/CuotasTabuladorView';
import { FichasIngresoView } from './components/FichasIngresoView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { QrPatientIntakeShell } from './components/QrPatientIntakeShell';
import {
  decodeQrPatientTransferPayload,
  parseQrIntakeRoute
} from './utils/qrIntakeMode';
import { CheckCircle2 } from 'lucide-react';

const PATIENT_SCOPED_TABS = new Set([
  'pacientes',
  'odontograma',
  'presupuestos',
  'secuencia_ttos',
  'imagenes',
  'recipes',
  'consentimientos'
]);

const DentalAppMain: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    toastMessage,
    registerPatientFromQrIntake,
    isPatientKioskLocked,
    setIsPatientKioskLocked
  } = useDental();
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isPatientSearchModalOpen, setIsPatientSearchModalOpen] = useState(false);
  const processedHandoffRef = useRef(false);

  const qrRoute = parseQrIntakeRoute(
    typeof window !== 'undefined' ? window.location.search : '',
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    if (qrRoute.isQrIntakeLocked || isPatientKioskLocked || processedHandoffRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search || '');
    const handoffToken = params.get('ingreso_qr');
    if (!handoffToken) return;

    processedHandoffRef.current = true;
    const payload = decodeQrPatientTransferPayload(handoffToken);
    if (payload) {
      registerPatientFromQrIntake(payload);
      setCurrentTab('pacientes');
    }
    params.delete('ingreso_qr');
    const nextSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
    try {
      window.history.replaceState({}, '', cleanUrl);
    } catch {
      // ignore history errors
    }
  }, [qrRoute.isQrIntakeLocked, isPatientKioskLocked]);

  if (qrRoute.isQrIntakeLocked || isPatientKioskLocked) {
    return (
      <>
        <QrPatientIntakeShell
          templateId={qrRoute.templateId}
          patientId={qrRoute.patientId}
          onExitKioskMode={
            !qrRoute.isQrIntakeLocked && isPatientKioskLocked
              ? () => setIsPatientKioskLocked(false)
              : undefined
          }
        />
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-lg border border-slate-700 dark:border-slate-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header 
        onOpenNewAppointment={() => setIsAppointmentModalOpen(true)}
        onOpenNewPatient={() => setIsPatientModalOpen(true)}
        onOpenPatientSearch={() => setIsPatientSearchModalOpen(true)}
      />

      {/* Main Workspace: Sidebar + Dynamic Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {PATIENT_SCOPED_TABS.has(currentTab) && <PatientBanner />}

          {currentTab === 'inicio' && (
            <HomeDashboardView onOpenPatientSearch={() => setIsPatientSearchModalOpen(true)} />
          )}

          {currentTab === 'agenda' && (
            <AgendaView onOpenNewAppointment={() => setIsAppointmentModalOpen(true)} />
          )}

          {currentTab === 'pacientes' && (
            <ClinicalHistoryView
              onOpenNewPatient={() => setIsPatientModalOpen(true)}
              onOpenPatientSearch={() => setIsPatientSearchModalOpen(true)}
            />
          )}

          {currentTab === 'fichas_ingreso' && (
            <FichasIngresoView />
          )}

          {currentTab === 'odontograma' && (
            <OdontogramView />
          )}

          {currentTab === 'presupuestos' && (
            <BudgetView />
          )}

          {currentTab === 'secuencia_ttos' && (
            <SecuenciaTratamientosView />
          )}

          {currentTab === 'doctores' && (
            <DoctoresView />
          )}

          {currentTab === 'multi_pagos' && (
            <MultiPagosView />
          )}

          {currentTab === 'cuotas' && (
            <CuotasTabuladorView key="cuotas" initialSection="cuotas" />
          )}

          {currentTab === 'tabulador' && (
            <CuotasTabuladorView key="tabulador" initialSection="tabulador" />
          )}

          {currentTab === 'imagenes' && (
            <ClinicalImagesView />
          )}

          {currentTab === 'pagos' && (
            <PaymentsView />
          )}

          {currentTab === 'administracion' && (
            <AdministracionView />
          )}

          {currentTab === 'rendimiento' && (
            <RendimientoView />
          )}

          {currentTab === 'reportes' && (
            <ReportsView />
          )}

          {currentTab === 'recipes' && (
            <RecipesView />
          )}

          {currentTab === 'consentimientos' && (
            <ConsentView />
          )}

          {currentTab === 'whatsapp' && (
            <WhatsAppCenter />
          )}

          {currentTab === 'configuracion' && (
            <ConfiguracionView />
          )}
        </main>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-lg border border-slate-700 dark:border-slate-200 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
      />

      <NewPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
      />

      <PatientSearchModal
        isOpen={isPatientSearchModalOpen}
        onClose={() => setIsPatientSearchModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <DentalProvider>
      <DentalAppMain />
    </DentalProvider>
  );
}
