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
import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

// Lazy load heavy pages
const AdminSetupPage = lazy(() => import("@/pages/AdminSetup"));
const RequestAccessPage = lazy(() => import("@/pages/RequestAccessPage"));
const InvitePage = lazy(() => import("@/pages/InvitePage"));
const SetPasswordPage = lazy(() => import("@/pages/SetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ClientDashboardPage = lazy(() => import("@/pages/ClientDashboardPage"));
const BudgetPlannerPage = lazy(() => import("@/pages/BudgetPlannerPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const SyncMonitorPage = lazy(() => import("@/pages/SyncMonitorPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const ClientDetailPage = lazy(() => import("@/pages/ClientDetailPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const GlossaryPage = lazy(() => import("@/pages/GlossaryPage"));
const DecompositionPage = lazy(() => import("@/pages/DecompositionPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const TaskBoardPage = lazy(() => import("@/pages/TaskBoardPage"));
const BroadcastsPage = lazy(() => import("@/pages/BroadcastsPage"));
const ForcePasswordChangePage = lazy(() => import("@/pages/ForcePasswordChangePage"));
const MfaChallengePage = lazy(() => import("@/pages/MfaChallengePage"));
const BrandingPage = lazy(() => import("@/pages/BrandingPage"));
const AfmInternalLayout = lazy(() => import("@/components/layout/AfmInternalLayout"));
const ScalingStackLanding = lazy(() => import("@/scaling-stack/ScalingStackLanding"));
const ScalingStackLanding2 = lazy(() => import("@/scaling-stack/ScalingStackLanding2"));
const ScalingStackApply = lazy(() => import("@/scaling-stack/ScalingStackApply"));
const ScalingStackThanks = lazy(() => import("@/scaling-stack/ScalingStackThanks"));
const ScalingStackPrivacy = lazy(() => import("@/scaling-stack/ScalingStackPrivacy"));
const ScalingStackTerms = lazy(() => import("@/scaling-stack/ScalingStackTerms"));
const AfmDashboard = lazy(() => import("@/pages/afm/AfmDashboard"));
const AfmMediaBuying = lazy(() => import("@/pages/afm/AfmMediaBuying"));
const AfmSocialMedia = lazy(() => import("@/pages/afm/AfmSocialMedia"));
const AfmSales = lazy(() => import("@/pages/afm/AfmSales"));
const AfmTools = lazy(() => import("@/pages/afm/AfmTools"));
const AfmSettings = lazy(() => import("@/pages/afm/AfmSettings"));
const AfmFinancePage = lazy(() => import("@/pages/afm/AfmFinancePage"));
const AfmIncomePlan = lazy(() => import("@/pages/afm/AfmIncomePlan"));
const AfmFinancialPlanning = lazy(() => import("@/pages/afm/AfmFinancialPlanning"));
const AfmStats = lazy(() => import("@/pages/afm/AfmStats"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AfmPerformance = lazy(() => import("@/pages/afm/AfmPerformance"));

// FIX: QueryClient with staleTime to prevent constant refetching/refreshes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// Suspense fallback for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppRoutes() {
  const { user, loading, adminExists, signOut, agencyRole } = useAuth();
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean | null>(null);
  const [checkingFpc, setCheckingFpc] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(false);

  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean | null>(null);
  // Master timeout: if all checks don't resolve in 6s, force through
  const [appTimedOut, setAppTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const checkForcePasswordChange = useCallback(async () => {
    if (!user) {
      setForcePasswordChange(false);
      setNeedsPasswordSetup(false);
      return;
    }
    if (sessionStorage.getItem('password_setup_done') === '1') {
      setNeedsPasswordSetup(false);
      setForcePasswordChange(false);
      setCheckingFpc(false);
      return;
    }
    setCheckingFpc(true);
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('force_password_change, temp_password_expires_at, needs_password_setup')
        .eq('user_id', user.id)
        .maybeSingle();

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
    } catch {
      setForcePasswordChange(false);
      setNeedsPasswordSetup(false);
    }
    setCheckingFpc(false);
  }, [user]);

  const checkMfa = useCallback(async () => {
    if (!user) {
      setMfaPending(false);
      return;
    }
    setCheckingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
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

  // Compute whether we should still show loading
  const checksStillPending = loading || (user && (forcePasswordChange === null || needsPasswordSetup === null)) || checkingFpc || checkingMfa;
  const roleStillPending = user && agencyRole === null && adminExists !== false;
  const showLoading = (checksStillPending || roleStillPending) && !appTimedOut;

  // Public routes
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/scaling-stack")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/scaling-stack" element={<ScalingStackLanding />} />
          <Route path="/scaling-stack2" element={<ScalingStackLanding2 />} />
          <Route path="/scaling-stack/apply" element={<ScalingStackApply />} />
          <Route path="/scaling-stack/apply/thanks" element={<ScalingStackThanks />} />
          <Route path="/scaling-stack/privacy" element={<ScalingStackPrivacy />} />
          <Route path="/scaling-stack/terms" element={<ScalingStackTerms />} />
        </Routes>
      </Suspense>
    );
  }

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && needsPasswordSetup) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="*" element={<SetPasswordPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (adminExists === false && !user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/setup" element={<AdminSetupPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/request-access" element={<RequestAccessPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (mfaPending) {
    return (
      <Suspense fallback={<PageLoader />}>
        <MfaChallengePage
          onVerified={() => setMfaPending(false)}
          onCancel={() => { signOut(); setMfaPending(false); }}
        />
      </Suspense>
    );
  }

  if (forcePasswordChange) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ForcePasswordChangePage
          onPasswordChanged={() => setForcePasswordChange(false)}
        />
      </Suspense>
    );
  }

  if (!agencyRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">✕</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-sm">
            You do not have access to the platform. Contact your administrator.
          </p>
          <button
            onClick={async () => {
              try { await supabase.auth.signOut(); } catch {}
              // Force clear and reload regardless of signOut result
              localStorage.clear();
              sessionStorage.clear();
              window.location.replace('/auth');
            }}
            className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isClient = agencyRole === 'Client';

  if (isClient) {
    return (
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
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
