import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, CheckCircle2, ChevronRight, X, Clock, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getRememberedAccounts,
  removeRememberedAccount,
  clearAllRememberedAccounts,
  isAccountStale,
  type RememberedAccount,
} from '@/lib/rememberedAccounts';

export default function PortalLoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const rateLimit = useRateLimit('portal_login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent' | 'reset-password'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount | null>(null);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);

  // Load portal remembered accounts
  useEffect(() => {
    const accounts = getRememberedAccounts(72).filter((a) => a.accountType === 'portal');
    setRememberedAccounts(accounts);
  }, []);

  // Detect recovery token in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setView('reset-password');
    }
  }, []);

  // If already logged in and not in reset flow, redirect to portal
  if (user && view !== 'reset-password') {
    return <Navigate to="/portal" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rateLimit.isBlocked()) {
      setError(t('auth.tooManyAttempts'));
      return;
    }

    const { blocked } = rateLimit.record();
    if (blocked) {
      setError(t('auth.tooManyAttempts'));
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? t('portal.invalidCredentials')
        : err.message);
      setLoading(false);
      return;
    }

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setError(t('portal.authFailed')); setLoading(false); return; }

    const { data: pu } = await supabase
      .from('client_portal_users' as any)
      .select('id, status')
      .eq('user_id', u.id)
      .maybeSingle();

    if (pu) {
      if ((pu as any).status === 'active') {
        await supabase.rpc('update_portal_last_login', { _user_id: u.id });
        navigate('/portal', { replace: true });
      } else if ((pu as any).status === 'deactivated') {
        setError(t('portal.deactivated'));
        await supabase.auth.signOut();
      } else {
        setError(t('portal.notActivated'));
        await supabase.auth.signOut();
      }
      setLoading(false);
      return;
    }

    const { data: au } = await supabase
      .from('agency_users')
      .select('agency_role')
      .eq('user_id', u.id)
      .maybeSingle();

    if (au?.agency_role === 'AgencyAdmin') {
      navigate('/portal', { replace: true });
    } else {
      setError(t('portal.noAccess'));
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  const handleSelectAccount = (account: RememberedAccount) => {
    setSelectedAccount(account);
    setEmail(account.email);
    setShowLoginForm(true);
  };

  const handleForgetAccount = (account: RememberedAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRememberedAccount(account.userId, account.accountType);
    setRememberedAccounts((prev) =>
      prev.filter((a) => !(a.userId === account.userId && a.accountType === account.accountType)),
    );
    if (selectedAccount?.userId === account.userId) {
      setSelectedAccount(null);
      setEmail('');
    }
  };

  const getInitials = (name: string | null, em: string) => {
    if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    return em[0]?.toUpperCase() || '?';
  };

  const formatLastUsed = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('auth.justNow');
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/portal/login`,
    });
    if (err) { toast.error(err.message); setResetLoading(false); return; }
    setView('forgot-sent');
    setResetLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError(t('portal.passwordTooShort')); return; }
    if (newPassword !== confirmNewPassword) { setError(t('portal.passwordMismatch')); return; }
    setResetLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) { setError(err.message); setResetLoading(false); return; }
    setResetSuccess(true);
    setResetLoading(false);
    toast.success(t('portal.passwordUpdatedSuccess'));
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await supabase.from('audit_log').insert({
        action: 'portal_password_reset_completed', entity_type: 'client_portal_users', user_id: u.id,
      });
    }
    setTimeout(() => {
      setView('login'); setResetSuccess(false); setNewPassword(''); setConfirmNewPassword('');
      window.history.replaceState(null, '', window.location.pathname);
    }, 2000);
  };

  // Reset password views (unchanged logic, cleaner)
  if (view === 'reset-password') {
    if (resetSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-sm text-center">
            <CardContent className="py-10 space-y-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">{t('portal.passwordUpdated')}</h2>
              <p className="text-sm text-muted-foreground">{t('portal.redirectingToSignIn')}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{t('portal.setNewPassword')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('portal.setNewPasswordSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div><Label htmlFor="new-password">{t('portal.newPassword')}</Label>
                <Input id="new-password" type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required placeholder={t('portal.minChars')} /></div>
              <div><Label htmlFor="confirm-password">{t('portal.confirmPassword')}</Label>
                <Input id="confirm-password" type="password" value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)} required /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('portal.updatePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{t('portal.resetPassword')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('portal.resetPasswordSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div><Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="your@email.com" /></div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('portal.sendResetLink')}
              </Button>
              <button type="button" onClick={() => setView('login')}
                className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> {t('portal.backToSignIn')}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'forgot-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-10 space-y-4">
            <Mail className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">{t('portal.checkYourEmail')}</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{resetEmail}</strong>, we've sent password reset instructions.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setView('login'); setResetEmail(''); }}>
              {t('portal.backToSignIn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main login view with account picker
  const hasRecentAccounts = rememberedAccounts.length > 0 && !showLoginForm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-foreground">
            {hasRecentAccounts ? t('auth.welcomeBack') : t('portal.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasRecentAccounts ? t('auth.chooseAccount') : t('portal.signInSubtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {hasRecentAccounts ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardContent className="pt-5 pb-4 space-y-2">
                  {rememberedAccounts.map((account) => {
                    const stale = isAccountStale(account, 72);
                    return (
                      <div
                        key={`${account.userId}:${account.accountType}`}
                        onClick={() => !stale && handleSelectAccount(account)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border border-border/50 transition-all ${
                          stale ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/30 hover:bg-accent/30 cursor-pointer'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                          {getInitials(account.displayName, account.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {account.displayName || account.email}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{account.portalClientLabel || t('portal.title')}</span>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatLastUsed(account.lastUsedAt)}</span>
                          </div>
                        </div>
                        {!stale && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                        <button
                          onClick={(e) => handleForgetAccount(account, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="pt-3">
                    <Button variant="outline" className="w-full gap-2" onClick={() => setShowLoginForm(true)}>
                      <UserPlus className="h-4 w-4" /> {t('auth.useAnotherAccount')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  {selectedAccount ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {getInitials(selectedAccount.displayName, selectedAccount.email)}
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-base">{selectedAccount.displayName || selectedAccount.email}</CardTitle>
                        <p className="text-xs text-muted-foreground">{selectedAccount.email}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-lg">{t('portal.title')}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t('portal.signInSubtitle')}</p>
                    </>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {!selectedAccount && (
                      <div><Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" /></div>
                    )}
                    <div><Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus={!!selectedAccount} /></div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedAccount ? (
                        <><LogIn className="h-4 w-4" /> {t('auth.continueAs')} {selectedAccount.displayName || selectedAccount.email.split('@')[0]}</>
                      ) : t('auth.login')}
                    </Button>
                  </form>
                  <div className="mt-3 text-center">
                    <button type="button" onClick={() => { setView('forgot'); setResetEmail(email); setError(''); }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      {t('portal.forgotPassword')}
                    </button>
                  </div>
                  {(selectedAccount || (rememberedAccounts.length > 0 && showLoginForm)) && (
                    <button
                      onClick={() => { setShowLoginForm(false); setSelectedAccount(null); setEmail(''); setPassword(''); setError(''); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground mt-3 text-center flex items-center justify-center gap-1"
                    >
                      ← {t('portal.backToAccountList')}
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
