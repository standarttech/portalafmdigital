import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import ForcePasswordChangePage from "@/pages/ForcePasswordChangePage";
import MfaChallengePage from "@/pages/MfaChallengePage";
import AfmInternalLayout from "@/components/layout/AfmInternalLayout";
import ScalingStackLanding from "@/scaling-stack/ScalingStackLanding";
import ScalingStackLanding2 from "@/scaling-stack/ScalingStackLanding2";
import ScalingStackApply from "@/scaling-stack/ScalingStackApply";
import ScalingStackThanks from "@/scaling-stack/ScalingStackThanks";
import ScalingStackPrivacy from "@/scaling-stack/ScalingStackPrivacy";
import ScalingStackTerms from "@/scaling-stack/ScalingStackTerms";
import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import NotFound from "./pages/NotFound";
import CrmLayout from "@/components/layout/CrmLayout";

import GrowthOsLayout from "@/components/layout/GrowthOsLayout";
import WebsiteLayout from "@/pages/website/WebsiteLayout";
import HomePage from "@/pages/website/HomePage";
const EmbedFormPage = React.lazy(() => import("@/pages/embed/EmbedFormPage"));
const EmbedLandingPage = React.lazy(() => import("@/pages/embed/EmbedLandingPage"));

// Core pages — lazy loaded to reduce initial bundle
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"));
const ClientDashboardPage = React.lazy(() => import("@/pages/ClientDashboardPage"));
const ClientsPage = React.lazy(() => import("@/pages/ClientsPage"));
const UsersPage = React.lazy(() => import("@/pages/UsersPage"));
const ClientDetailPage = React.lazy(() => import("@/pages/ClientDetailPage"));
const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const GlossaryPage = React.lazy(() => import("@/pages/GlossaryPage"));
const ChatPage = React.lazy(() => import("@/pages/ChatPage"));
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
const CrmGuidePage = React.lazy(() => import("@/pages/crm/CrmGuidePage"));
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
const GosOverviewPage = React.lazy(() => import("@/pages/growth-os/GosOverviewPage"));
const GosLandingTemplatesPage = React.lazy(() => import("@/pages/growth-os/GosLandingTemplatesPage"));
const GosFormsPage = React.lazy(() => import("@/pages/growth-os/GosFormsPage"));
const GosOnboardingPage = React.lazy(() => import("@/pages/growth-os/GosOnboardingPage"));
const GosIntegrationsPage = React.lazy(() => import("@/pages/growth-os/GosIntegrationsPage"));
const GosLeadRoutingPage = React.lazy(() => import("@/pages/growth-os/GosLeadRoutingPage"));
const GosOnboardingWizard = React.lazy(() => import("@/pages/growth-os/GosOnboardingWizard"));
const GosAnalyticsPage = React.lazy(() => import("@/pages/growth-os/GosAnalyticsPage"));
const GosExperimentsPage = React.lazy(() => import("@/pages/growth-os/GosExperimentsPage"));
const GosSystemHealthPage = React.lazy(() => import("@/pages/growth-os/GosSystemHealthPage"));
const GosIntegrityChecksPage = React.lazy(() => import("@/pages/growth-os/GosIntegrityChecksPage"));
const GosGuidePage = React.lazy(() => import("@/pages/growth-os/GosGuidePage"));
const EmbedOnboardingPage = React.lazy(() => import("@/pages/embed/EmbedOnboardingPage"));
const PublicReportPage = React.lazy(() => import("@/pages/PublicReportPage"));
const AiAdsOverviewPage = React.lazy(() => import("@/pages/ai-ads/AiAdsOverviewPage"));
const AiAdsAccountsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsAccountsPage"));
const AiAdsAnalysisPage = React.lazy(() => import("@/pages/ai-ads/AiAdsAnalysisPage"));
const AiAdsHypothesesPage = React.lazy(() => import("@/pages/ai-ads/AiAdsHypothesesPage"));
const AiAdsDraftsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsDraftsPage"));
const AiAdsExecutionsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsExecutionsPage"));
const AiAdsRecommendationsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsRecommendationsPage"));
const AiAdsIntelligencePage = React.lazy(() => import("@/pages/ai-ads/AiAdsIntelligencePage"));
const AiAdsOptimizationPage = React.lazy(() => import("@/pages/ai-ads/AiAdsOptimizationPage"));
const AiAdsCreativesPage = React.lazy(() => import("@/pages/ai-ads/AiAdsCreativesPage"));
const AiAdsPresetsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsPresetsPage"));
const AiAdsClientReportPage = React.lazy(() => import("@/pages/ai-ads/AiAdsClientReportPage"));
const AiAdsIntegrationsPage = React.lazy(() => import("@/pages/ai-ads/AiAdsIntegrationsPage"));
const PortalLayout = React.lazy(() => import("@/components/layout/PortalLayout"));
const PortalDashboardPage = React.lazy(() => import("@/pages/portal/PortalDashboardPage"));
const PortalCampaignsPage = React.lazy(() => import("@/pages/portal/PortalCampaignsPage"));
const PortalRecommendationsPage = React.lazy(() => import("@/pages/portal/PortalRecommendationsPage"));
const PortalReportsPage = React.lazy(() => import("@/pages/portal/PortalReportsPage"));
const PortalSettingsPage = React.lazy(() => import("@/pages/portal/PortalSettingsPage"));
const PortalFilesPage = React.lazy(() => import("@/pages/portal/PortalFilesPage"));
const PortalLoginPage = React.lazy(() => import("@/pages/portal/PortalLoginPage"));
const PortalAcceptInvitePage = React.lazy(() => import("@/pages/portal/PortalAcceptInvitePage"));
import AiAdsLayout from "@/components/layout/AiAdsLayout";
import AiInfraLayout from "@/components/layout/AiInfraLayout";
const AiInfraProvidersPage = React.lazy(() => import("@/pages/ai-infra/AiInfraProvidersPage"));
const AiInfraRoutesPage = React.lazy(() => import("@/pages/ai-infra/AiInfraRoutesPage"));
const AiInfraTasksPage = React.lazy(() => import("@/pages/ai-infra/AiInfraTasksPage"));
const AiInfraLogsPage = React.lazy(() => import("@/pages/ai-infra/AiInfraLogsPage"));
const AiInfraHealthPage = React.lazy(() => import("@/pages/ai-infra/AiInfraHealthPage"));
const AiInfraGuidePage = React.lazy(() => import("@/pages/ai-infra/AiInfraGuidePage"));
const AiAdsGuidePage = React.lazy(() => import("@/pages/ai-ads/AiAdsGuidePage"));

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


function AppRoutes() {
  const { user, loading, adminExists, signOut, agencyRole, effectiveRole } = useAuth();
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean | null>(() => {
    return sessionStorage.getItem('afm_fpc_checked') === '1' ? false : null;
  });
  const [checkingFpc, setCheckingFpc] = useState(false);
  const [fpcCheckError, setFpcCheckError] = useState(false);
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
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('force_password_change, temp_password_expires_at, needs_password_setup')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if ((data as any)?.needs_password_setup === true) {
        setNeedsPasswordSetup(true);
        setForcePasswordChange(false);
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
      }
    } catch {
      setFpcCheckError(true);
    } finally {
      setCheckingFpc(false);
    }
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
      const [{ data: aalData, error: aalError }, { data: factorsData, error: factorsError }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      if (factorsError) throw factorsError;

      const allTotpFactors = (factorsData?.totp || []) as Array<{ id: string; status: string }>;
      const verifiedFactors = allTotpFactors.filter((f) => f.status === 'verified');
      const unverifiedFactors = allTotpFactors.filter((f) => f.status !== 'verified');

      // If user has no verified MFA factor, don't force challenge and clean stale factors.
      if (verifiedFactors.length === 0) {
        if (unverifiedFactors.length > 0) {
          await Promise.all(
            unverifiedFactors.map((f) =>
              supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => null),
            ),
          );
        }
        setMfaPending(false);
        sessionStorage.setItem('afm_mfa_checked', '1');
        return;
      }

      if (!aalError && aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        setMfaPending(true);
      } else {
        setMfaPending(false);
        sessionStorage.setItem('afm_mfa_checked', '1');
      }
    } catch {
      await supabase.auth.signOut();
      setMfaPending(false);
    } finally {
      setCheckingMfa(false);
    }
  }, [user]);

  useEffect(() => {
    checkForcePasswordChange();
    checkMfa();
  }, [checkForcePasswordChange, checkMfa]);

  // Use React Router location for proper re-render on navigation
  const routerLocation = useLocation();
  const currentPath = routerLocation.pathname;

  // Public report page — no auth required
  if (currentPath.startsWith("/r/")) {
    return (
      <Routes>
        <Route path="/r/:id" element={<PublicReportPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Public embed routes — no auth, no layout
  if (currentPath.startsWith("/embed/")) {
    return (
      <Routes>
        <Route path="/embed/form/:id" element={<EmbedFormPage />} />
        <Route path="/embed/landing/:id" element={<EmbedLandingPage />} />
        <Route path="/embed/onboarding/:token" element={<EmbedOnboardingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Portal login and accept-invite are always accessible (separate client auth)
  if (currentPath === "/portal/login" || currentPath === "/portal/accept-invite") {
    return (
      <Routes>
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route path="/portal/accept-invite" element={<PortalAcceptInvitePage />} />
        <Route path="*" element={<Navigate to="/portal/login" replace />} />
      </Routes>
    );
  }

  if (currentPath.startsWith("/scaling-stack")) {
    return (
      <Routes>
        <Route path="/scaling-stack" element={<ScalingStackLanding />} />
        <Route path="/scaling-stack2" element={<ScalingStackLanding2 />} />
        <Route path="/scaling-stack/apply" element={<ScalingStackApply />} />
        <Route path="/scaling-stack/apply/thanks" element={<ScalingStackThanks />} />
        <Route path="/scaling-stack/privacy" element={<ScalingStackPrivacy />} />
        <Route path="/scaling-stack/terms" element={<ScalingStackTerms />} />
        <Route path="*" element={<NotFound />} />
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

  if (fpcCheckError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <p className="text-muted-foreground text-sm">Failed to verify account status.</p>
          <button
            onClick={() => { setFpcCheckError(false); checkForcePasswordChange(); }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
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
        {/* Client Portal — isolated layout */}
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalDashboardPage />} />
          <Route path="/portal/campaigns" element={<PortalCampaignsPage />} />
          <Route path="/portal/recommendations" element={<PortalRecommendationsPage />} />
          <Route path="/portal/reports" element={<PortalReportsPage />} />
          <Route path="/portal/files" element={<PortalFilesPage />} />
          <Route path="/portal/settings" element={<PortalSettingsPage />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<ClientDashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Route>
        <Route path="/portal/login" element={<Navigate to="/portal" replace />} />
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
      {/* Client Portal — admin can preview with isolated layout */}
      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<PortalDashboardPage />} />
        <Route path="/portal/campaigns" element={<PortalCampaignsPage />} />
        <Route path="/portal/recommendations" element={<PortalRecommendationsPage />} />
        <Route path="/portal/reports" element={<PortalReportsPage />} />
        <Route path="/portal/files" element={<PortalFilesPage />} />
        <Route path="/portal/settings" element={<PortalSettingsPage />} />
      </Route>
      {/* CRM — guarded by module permission */}
      <Route element={<ModuleGuard module="crm"><CrmLayout /></ModuleGuard>}>
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/crm/leads" element={<CrmLeadsPage />} />
        <Route path="/crm/analytics" element={<CrmAnalyticsPage />} />
        <Route path="/crm/integrations" element={<CrmIntegrationsPage />} />
        <Route path="/crm/webhooks" element={<CrmWebhooksPage />} />
        <Route path="/crm/settings" element={<CrmSettingsPage />} />
        <Route path="/crm/guide" element={<CrmGuidePage />} />
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
      {/* Growth OS — guarded */}
      <Route element={<ModuleGuard module="growth_os"><GrowthOsLayout /></ModuleGuard>}>
        <Route path="/growth-os" element={<GosOverviewPage />} />
        <Route path="/growth-os/landing-templates" element={<GosLandingTemplatesPage />} />
        <Route path="/growth-os/forms" element={<GosFormsPage />} />
        <Route path="/growth-os/onboarding" element={<GosOnboardingPage />} />
        <Route path="/growth-os/onboarding/:sessionId" element={<GosOnboardingWizard />} />
        <Route path="/growth-os/integrations" element={<GosIntegrationsPage />} />
        <Route path="/growth-os/lead-routing" element={<GosLeadRoutingPage />} />
        <Route path="/growth-os/analytics" element={<GosAnalyticsPage />} />
        <Route path="/growth-os/experiments" element={<GosExperimentsPage />} />
        <Route path="/growth-os/health" element={<GosSystemHealthPage />} />
        <Route path="/growth-os/integrity" element={<GosIntegrityChecksPage />} />
        <Route path="/growth-os/guide" element={<GosGuidePage />} />
      </Route>
      {/* AI Ads Copilot — guarded */}
      <Route element={<ModuleGuard module="ai_ads"><AiAdsLayout /></ModuleGuard>}>
        <Route path="/ai-ads" element={<AiAdsOverviewPage />} />
        <Route path="/ai-ads/accounts" element={<AiAdsAccountsPage />} />
        <Route path="/ai-ads/analysis" element={<AiAdsAnalysisPage />} />
        <Route path="/ai-ads/recommendations" element={<AiAdsRecommendationsPage />} />
        <Route path="/ai-ads/hypotheses" element={<AiAdsHypothesesPage />} />
        <Route path="/ai-ads/drafts" element={<AiAdsDraftsPage />} />
        <Route path="/ai-ads/executions" element={<AiAdsExecutionsPage />} />
        <Route path="/ai-ads/intelligence" element={<AiAdsIntelligencePage />} />
        <Route path="/ai-ads/optimization" element={<AiAdsOptimizationPage />} />
        <Route path="/ai-ads/creatives" element={<AiAdsCreativesPage />} />
        <Route path="/ai-ads/presets" element={<AiAdsPresetsPage />} />
        <Route path="/ai-ads/client-report" element={<AiAdsClientReportPage />} />
        <Route path="/ai-ads/integrations" element={<AiAdsIntegrationsPage />} />
        <Route path="/ai-ads/guide" element={<AiAdsGuidePage />} />
      </Route>
      {/* AI Infrastructure — admin only */}
      <Route element={<ModuleGuard module="ai_infra"><AiInfraLayout /></ModuleGuard>}>
        <Route path="/ai-infra" element={<Navigate to="/ai-infra/providers" replace />} />
        <Route path="/ai-infra/providers" element={<AiInfraProvidersPage />} />
        <Route path="/ai-infra/routes" element={<AiInfraRoutesPage />} />
        <Route path="/ai-infra/tasks" element={<AiInfraTasksPage />} />
        <Route path="/ai-infra/logs" element={<AiInfraLogsPage />} />
        <Route path="/ai-infra/health" element={<AiInfraHealthPage />} />
        <Route path="/ai-infra/guide" element={<AiInfraGuidePage />} />
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
