import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm-new.png';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, LogIn, User, ChevronRight, X, Clock, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLanguageSwitcher from '@/components/auth/AuthLanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import {
  getRememberedAccounts,
  removeRememberedAccount,
  clearAllRememberedAccounts,
  isAccountStale,
  type RememberedAccount,
} from '@/lib/rememberedAccounts';

export default function AuthPage() {
  const { t } = useLanguage();
  const { user, signIn, agencyRole } = useAuth();
  const navigate = useNavigate();
  const rateLimit = useRateLimit('auth_login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount | null>(null);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);

  // Load remembered accounts (internal only)
  useEffect(() => {
    const accounts = getRememberedAccounts(72).filter((a) => a.accountType === 'internal');
    setRememberedAccounts(accounts);
  }, []);

  // Load display name for logged-in user
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agency_users')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || user.email || 'User');
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rateLimit.isBlocked()) {
      toast.error('Too many attempts. Please wait 5 minutes before trying again.');
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error(t('auth.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    const { blocked } = rateLimit.record();
    if (blocked) {
      toast.error('Too many attempts. Please wait 5 minutes before trying again.');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(t('auth.loginError'));
    }
    setIsLoading(false);
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

  const handleForgetAll = () => {
    clearAllRememberedAccounts();
    setRememberedAccounts([]);
    setSelectedAccount(null);
    setEmail('');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0]?.toUpperCase() || '?';
  };

  const formatLastUsed = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('auth.justNow') || 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Scenario 1: Active session → show continue card
  if (user && agencyRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <AuthLanguageSwitcher />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-28 w-auto" />
            </div>
          </div>

          <Card className="glass-card-elevated">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {displayName || user.email}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.alreadyLoggedIn')}
                  </p>
                </div>
                <Button
                  className="w-full mt-2 gap-2"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                >
                  <LogIn className="h-4 w-4" />
                  {t('auth.goToDashboard')}
                </Button>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Scenario 2/3: No active session
  const hasRecentAccounts = rememberedAccounts.length > 0 && !showLoginForm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <AuthLanguageSwitcher />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logoAfm} alt="AFM DIGITAL" className="h-28 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {hasRecentAccounts ? (t('auth.welcomeBack') || 'Welcome back') : t('auth.loginTitle')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {hasRecentAccounts
              ? (t('auth.chooseAccount') || 'Choose an account to continue')
              : t('auth.loginSubtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {hasRecentAccounts ? (
            <motion.div
              key="account-picker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card-elevated">
                <CardContent className="pt-5 pb-4 space-y-2">
                  {rememberedAccounts.map((account) => {
                    const stale = isAccountStale(account, 72);
                    return (
                      <div
                        key={`${account.userId}:${account.accountType}`}
                        onClick={() => !stale && handleSelectAccount(account)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border border-border/50 transition-all ${
                          stale
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-primary/30 hover:bg-accent/30 cursor-pointer'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                          {account.avatarUrl ? (
                            <img
                              src={account.avatarUrl}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            getInitials(account.displayName, account.email)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {account.displayName || account.email}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{account.roleLabel || 'Internal'}</span>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatLastUsed(account.lastUsedAt)}</span>
                          </div>
                        </div>
                        {!stale && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleForgetAccount(account, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                          title={t('auth.forgetAccount') || 'Forget this account'}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="pt-3 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowLoginForm(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      {t('auth.useAnotherAccount') || 'Use another account'}
                    </Button>

                    {rememberedAccounts.length > 1 && (
                      <button
                        onClick={handleForgetAll}
                        className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center py-1"
                      >
                        {t('auth.forgetAllAccounts') || 'Forget all accounts on this device'}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card-elevated">
                <CardHeader>
                  {selectedAccount ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {getInitials(selectedAccount.displayName, selectedAccount.email)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {selectedAccount.displayName || selectedAccount.email}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {selectedAccount.email}
                          </CardDescription>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CardTitle className="text-lg">{t('auth.login')}</CardTitle>
                      <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!selectedAccount && (
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('common.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('common.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('auth.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus={!!selectedAccount}
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : selectedAccount ? (
                        <>
                          <LogIn className="h-4 w-4" />
                          {t('auth.continueAs') || 'Continue as'}{' '}
                          {selectedAccount.displayName || selectedAccount.email.split('@')[0]}
                        </>
                      ) : (
                        t('auth.login')
                      )}
                    </Button>
                  </form>

                  {(selectedAccount || (rememberedAccounts.length > 0 && showLoginForm)) && (
                    <button
                      onClick={() => {
                        setShowLoginForm(false);
                        setSelectedAccount(null);
                        setEmail('');
                        setPassword('');
                      }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 text-center flex items-center justify-center gap-1"
                    >
                      ← {t('auth.backToAccounts') || 'Back to account list'}
                    </button>
                  )}

                  {!selectedAccount && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-center text-sm text-muted-foreground mb-3">
                        {t('auth.noAccountYet')}
                      </p>
                      <Link to="/request-access">
                        <Button variant="outline" className="w-full gap-2">
                          <Mail className="h-4 w-4" />
                          {t('auth.requestAccess')}
                        </Button>
                      </Link>
                    </div>
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
