import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarStateProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MainLayout from "@/components/layout/MainLayout";
import AuthPage from "@/pages/AuthPage";
import AdminSetupPage from "@/pages/AdminSetup";
import RequestAccessPage from "@/pages/RequestAccessPage";
import InvitePage from "@/pages/InvitePage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientDashboardPage from "@/pages/ClientDashboardPage";
import BudgetPlannerPage from "@/pages/BudgetPlannerPage";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/ClientsPage";
import UsersPage from "@/pages/UsersPage";
import SyncMonitorPage from "@/pages/SyncMonitorPage";
import ReportsPage from "@/pages/ReportsPage";
import AuditPage from "@/pages/AuditPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import GlossaryPage from "@/pages/GlossaryPage";
import DecompositionPage from "@/pages/DecompositionPage";
import ChatPage from "@/pages/ChatPage";
import TaskBoardPage from "@/pages/TaskBoardPage";
import BroadcastsPage from "@/pages/BroadcastsPage";
import ForcePasswordChangePage from "@/pages/ForcePasswordChangePage";
import MfaChallengePage from "@/pages/MfaChallengePage";
import BrandingPage from "@/pages/BrandingPage";
import AfmInternalLayout from "@/components/layout/AfmInternalLayout";
import AfmDashboard from "@/pages/afm/AfmDashboard";
import AfmMediaBuying from "@/pages/afm/AfmMediaBuying";
import AfmSocialMedia from "@/pages/afm/AfmSocialMedia";
import AfmSales from "@/pages/afm/AfmSales";
import AfmTools from "@/pages/afm/AfmTools";
import AfmSettings from "@/pages/afm/AfmSettings";
import AfmFinancePage from "@/pages/afm/AfmFinancePage";
import AfmIncomePlan from "@/pages/afm/AfmIncomePlan";
import AfmFinancialPlanning from "@/pages/afm/AfmFinancialPlanning";
import AfmStats from "@/pages/afm/AfmStats";
import NotFound from "./pages/NotFound";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, adminExists, signOut, agencyRole } = useAuth();
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean | null>(null);
  const [checkingFpc, setCheckingFpc] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(false);

  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean | null>(null);

  const checkForcePasswordChange = useCallback(async () => {
    if (!user) {
      setForcePasswordChange(false);
      setNeedsPasswordSetup(false);
      return;
    }
    // If user just completed password setup (flag set in SetPasswordPage), skip re-check
    if (sessionStorage.getItem('password_setup_done') === '1') {
      setNeedsPasswordSetup(false);
      setForcePasswordChange(false);
      setCheckingFpc(false);
      return;
    }
    setCheckingFpc(true);
    const { data } = await supabase
      .from('user_settings')
      .select('force_password_change, temp_password_expires_at, needs_password_setup')
      .eq('user_id', user.id)
      .maybeSingle();

    // needs_password_setup: new magic-link flow — redirect to /set-password
    if ((data as any)?.needs_password_setup === true) {
      setNeedsPasswordSetup(true);
      setForcePasswordChange(false);
      setCheckingFpc(false);
      return;
    }

    setNeedsPasswordSetup(false);

    if (data?.force_password_change) {
      if (data.temp_password_expires_at && new Date(data.temp_password_expires_at) < new Date()) {
        await supabase.auth.signOut();
        setForcePasswordChange(false);
      } else {
        setForcePasswordChange(true);
      }
    } else {
      setForcePasswordChange(false);
    }
    setCheckingFpc(false);
  }, [user]);

  // Check MFA assurance level after login
  const checkMfa = useCallback(async () => {
    if (!user) {
      setMfaPending(false);
      return;
    }
    setCheckingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
        // If user has MFA enrolled (nextLevel=aal2) but hasn't verified yet (currentLevel=aal1)
        if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
          setMfaPending(true);
        } else {
          setMfaPending(false);
        }
      } else {
        setMfaPending(false);
      }
    } catch {
      setMfaPending(false);
    }
    setCheckingMfa(false);
  }, [user]);

  useEffect(() => {
    checkForcePasswordChange();
    checkMfa();
  }, [checkForcePasswordChange, checkMfa]);

  if (loading || (user && (forcePasswordChange === null || needsPasswordSetup === null)) || checkingFpc || checkingMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Intercept authenticated user who needs to set their password (magic link flow)
  if (user && needsPasswordSetup) {
    return (
      <Routes>
        <Route path="*" element={<SetPasswordPage />} />
      </Routes>
    );
  }

  if (adminExists === false && !user) {
    return (
      <Routes>
        <Route path="/setup" element={<AdminSetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // MFA challenge gate
  if (mfaPending) {
    return (
      <MfaChallengePage
        onVerified={() => setMfaPending(false)}
        onCancel={() => { signOut(); setMfaPending(false); }}
      />
    );
  }

  if (forcePasswordChange) {
    return (
      <ForcePasswordChangePage
        onPasswordChanged={() => setForcePasswordChange(false)}
      />
    );
  }

  // If user has no role (removed from agency_users), block access
  if (!agencyRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">✕</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Доступ запрещён</h2>
          <p className="text-muted-foreground text-sm">
            У вас нет доступа к платформе. Обратитесь к администратору.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  const isClient = agencyRole === 'Client';

  if (isClient) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<ClientDashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Route>
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/sync" element={<SyncMonitorPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/decomposition" element={<DecompositionPage />} />
        <Route path="/budget" element={<BudgetPlannerPage />} />
        <Route path="/broadcasts" element={<BroadcastsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TaskBoardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/branding" element={<BrandingPage />} />
      </Route>
      {/* AFM Internal — separate workspace with its own layout */}
      <Route element={<AfmInternalLayout />}>
        <Route path="/afm-internal" element={<AfmDashboard />} />
        <Route path="/afm-internal/media" element={<AfmMediaBuying />} />
        <Route path="/afm-internal/social" element={<AfmSocialMedia />} />
        <Route path="/afm-internal/sales" element={<AfmSales />} />
        <Route path="/afm-internal/stats" element={<AfmStats />} />
        <Route path="/afm-internal/tools" element={<AfmTools />} />
        <Route path="/afm-internal/finance" element={<AfmFinancePage />} />
        <Route path="/afm-internal/income-plan" element={<AfmIncomePlan />} />
        <Route path="/afm-internal/financial-planning" element={<AfmFinancialPlanning />} />
        <Route path="/afm-internal/settings" element={<AfmSettings />} />
      </Route>
      <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
      <Route path="/setup" element={<Navigate to="/dashboard" replace />} />
      <Route path="/request-access" element={<Navigate to="/dashboard" replace />} />
      <Route path="/invite" element={<Navigate to="/dashboard" replace />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SidebarStateProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </SidebarStateProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
