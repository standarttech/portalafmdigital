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
import ModuleGuard from "@/components/guards/ModuleGuard";
import AuthPage from "@/pages/AuthPage";
import AdminSetupPage from "@/pages/AdminSetup";
import RequestAccessPage from "@/pages/RequestAccessPage";
import InvitePage from "@/pages/InvitePage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientDashboardPage from "@/pages/ClientDashboardPage";
import ClientsPage from "@/pages/ClientsPage";
import UsersPage from "@/pages/UsersPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import GlossaryPage from "@/pages/GlossaryPage";
import ChatPage from "@/pages/ChatPage";
import ForcePasswordChangePage from "@/pages/ForcePasswordChangePage";
import MfaChallengePage from "@/pages/MfaChallengePage";
import AfmInternalLayout from "@/components/layout/AfmInternalLayout";
import ScalingStackLanding from "@/scaling-stack/ScalingStackLanding";
import ScalingStackLanding2 from "@/scaling-stack/ScalingStackLanding2";
import ScalingStackApply from "@/scaling-stack/ScalingStackApply";
import ScalingStackThanks from "@/scaling-stack/ScalingStackThanks";
import ScalingStackPrivacy from "@/scaling-stack/ScalingStackPrivacy";
import ScalingStackTerms from "@/scaling-stack/ScalingStackTerms";
import NotFound from "./pages/NotFound";
import CrmLayout from "@/components/layout/CrmLayout";
import AdminScaleLayout from "@/components/layout/AdminScaleLayout";
import WebsiteLayout from "@/pages/website/WebsiteLayout";
import HomePage from "@/pages/website/HomePage";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

// Lazy-loaded heavy pages
const AfmDashboard = React.lazy(() => import("@/pages/afm/AfmDashboard"));
const AfmMediaBuying = React.lazy(() => import("@/pages/afm/AfmMediaBuying"));
const AfmSocialMedia = React.lazy(() => import("@/pages/afm/AfmSocialMedia"));
const AfmSales = React.lazy(() => import("@/pages/afm/AfmSales"));
const AfmTools = React.lazy(() => import("@/pages/afm/AfmTools"));
const AfmSettings = React.lazy(() => import("@/pages/afm/AfmSettings"));
const AfmFinancePage = React.lazy(() => import("@/pages/afm/AfmFinancePage"));
const AfmIncomePlan = React.lazy(() => import("@/pages/afm/AfmIncomePlan"));
const AfmFinancialPlanning = React.lazy(() => import("@/pages/afm/AfmFinancialPlanning"));
const AfmStats = React.lazy(() => import("@/pages/afm/AfmStats"));
const CrmPage = React.lazy(() => import("@/pages/CrmPage"));
const CrmLeadsPage = React.lazy(() => import("@/pages/crm/CrmLeadsPage"));
const CrmWebhooksPage = React.lazy(() => import("@/pages/crm/CrmWebhooksPage"));
const CrmSettingsPage = React.lazy(() => import("@/pages/crm/CrmSettingsPage"));
const CrmAnalyticsPage = React.lazy(() => import("@/pages/crm/CrmAnalyticsPage"));
const CrmIntegrationsPage = React.lazy(() => import("@/pages/crm/CrmIntegrationsPage"));
const AdminScaleHome = React.lazy(() => import("@/pages/adminscale/AdminScaleHome"));
const AdminScaleEditor = React.lazy(() => import("@/pages/adminscale/AdminScaleEditor"));
const AdminScaleOverview = React.lazy(() => import("@/pages/adminscale/AdminScaleOverview"));
const AdminScaleReference = React.lazy(() => import("@/pages/adminscale/AdminScaleReference"));
const UserPresencePage = React.lazy(() => import("@/pages/admin/UserPresencePage"));
const AboutPage = React.lazy(() => import("@/pages/website/AboutPage"));
const ServicesPage = React.lazy(() => import("@/pages/website/ServicesPage"));
const CaseStudiesPage = React.lazy(() => import("@/pages/website/CaseStudiesPage"));
const ContactPage = React.lazy(() => import("@/pages/website/ContactPage"));
const PrivacyPolicyPage = React.lazy(() => import("@/pages/website/PrivacyPolicyPage"));
const TermsPage = React.lazy(() => import("@/pages/website/TermsPage"));
const CookiePolicyPage = React.lazy(() => import("@/pages/website/CookiePolicyPage"));
const AuditPage = React.lazy(() => import("@/pages/AuditPage"));
const BroadcastsPage = React.lazy(() => import("@/pages/BroadcastsPage"));
const BrandingPage = React.lazy(() => import("@/pages/BrandingPage"));
const SyncMonitorPage = React.lazy(() => import("@/pages/SyncMonitorPage"));
const DecompositionPage = React.lazy(() => import("@/pages/DecompositionPage"));
const BudgetPlannerPage = React.lazy(() => import("@/pages/BudgetPlannerPage"));
const CalendarPage = React.lazy(() => import("@/pages/CalendarPage"));
const TaskBoardPage = React.lazy(() => import("@/pages/TaskBoardPage"));
const ReportsPage = React.lazy(() => import("@/pages/ReportsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const GlossaryPageWrapper = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}><GlossaryPage /></div>
));
GlossaryPageWrapper.displayName = 'GlossaryPageWrapper';

function AppRoutes() {
  const { user, loading, adminExists, signOut, agencyRole, effectiveRole } = useAuth();
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean | null>(() => {
    return sessionStorage.getItem('afm_fpc_checked') === '1' ? false : null;
  });
  const [checkingFpc, setCheckingFpc] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(() => {
    return sessionStorage.getItem('afm_mfa_checked') !== '1';
  });
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean | null>(() => {
    return sessionStorage.getItem('afm_fpc_checked') === '1' ? false : null;
  });

  const checkForcePasswordChange = useCallback(async () => {
    if (!user) {
      setForcePasswordChange(false);
      setNeedsPasswordSetup(false);
      return;
    }
    if (sessionStorage.getItem('afm_fpc_checked') === '1') {
      setForcePasswordChange(false);
      setNeedsPasswordSetup(false);
      setCheckingFpc(false);
      return;
    }
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

    if ((data as any)?.needs_password_setup === true) {
      setNeedsPasswordSetup(true);
      setForcePasswordChange(false);
      setCheckingFpc(false);
      return;
    }

    setNeedsPasswordSetup(false);
    sessionStorage.setItem('afm_fpc_checked', '1');

    if (data?.force_password_change) {
      if (data.temp_password_expires_at && new Date(data.temp_password_expires_at) < new Date()) {
        await supabase.auth.signOut();
        setForcePasswordChange(false);
      } else {
        setForcePasswordChange(true);
      }
    } else {
      setForcePasswordChange(false);
      sessionStorage.setItem('afm_fpc_checked', '1');
    }
    setCheckingFpc(false);
  }, [user]);

  const checkMfa = useCallback(async () => {
    if (!user) {
      setMfaPending(false);
      setCheckingMfa(false);
      return;
    }
    if (sessionStorage.getItem('afm_mfa_checked') === '1') {
      setMfaPending(false);
      setCheckingMfa(false);
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
        sessionStorage.setItem('afm_mfa_checked', '1');
        }
      } else {
        setMfaPending(false);
        sessionStorage.setItem('afm_mfa_checked', '1');
      }
    } catch {
      setMfaPending(false);
      sessionStorage.setItem('afm_mfa_checked', '1');
    }
    setCheckingMfa(false);
  }, [user]);

  useEffect(() => {
    checkForcePasswordChange();
    checkMfa();
  }, [checkForcePasswordChange, checkMfa]);

  // Public routes — always accessible
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  if (currentPath.startsWith("/scaling-stack")) {
    return (
      <Routes>
        <Route path="/scaling-stack" element={<ScalingStackLanding />} />
        <Route path="/scaling-stack2" element={<ScalingStackLanding2 />} />
        <Route path="/scaling-stack/apply" element={<ScalingStackApply />} />
        <Route path="/scaling-stack/apply/thanks" element={<ScalingStackThanks />} />
        <Route path="/scaling-stack/privacy" element={<ScalingStackPrivacy />} />
        <Route path="/scaling-stack/terms" element={<ScalingStackTerms />} />
      </Routes>
    );
  }

  // Public website pages (available regardless of auth state)
  const publicWebsitePaths = ['/', '/home', '/about', '/services', '/case-studies', '/contact', '/privacy', '/terms', '/cookies'];
  if (!user && publicWebsitePaths.includes(currentPath)) {
    return (
      <Routes>
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
        </Route>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

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
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
        </Route>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

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
            onClick={() => signOut()}
            className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isClient = effectiveRole === 'Client';

  if (isClient) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Public website pages accessible when logged in */}
        <Route element={<WebsiteLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<ClientDashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Route>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Public website pages accessible when logged in */}
      <Route element={<WebsiteLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/case-studies" element={<CaseStudiesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/presence" element={<UserPresencePage />} />
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
      {/* CRM — guarded by module permission */}
      <Route element={<ModuleGuard module="crm"><CrmLayout /></ModuleGuard>}>
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/crm/leads" element={<CrmLeadsPage />} />
        <Route path="/crm/analytics" element={<CrmAnalyticsPage />} />
        <Route path="/crm/integrations" element={<CrmIntegrationsPage />} />
        <Route path="/crm/webhooks" element={<CrmWebhooksPage />} />
        <Route path="/crm/settings" element={<CrmSettingsPage />} />
      </Route>
      {/* AFM Internal — guarded */}
      <Route element={<ModuleGuard module="afm_internal"><AfmInternalLayout /></ModuleGuard>}>
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
      {/* AdminScale — guarded */}
      <Route element={<ModuleGuard module="adminscale"><AdminScaleLayout /></ModuleGuard>}>
        <Route path="/adminscale" element={<AdminScaleHome />} />
        <Route path="/adminscale/editor" element={<AdminScaleEditor />} />
        <Route path="/adminscale/overview" element={<AdminScaleOverview />} />
        <Route path="/adminscale/reference" element={<AdminScaleReference />} />
      </Route>
      <Route path="/auth" element={<AuthPage />} />
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
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                  <AppRoutes />
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </SidebarStateProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
