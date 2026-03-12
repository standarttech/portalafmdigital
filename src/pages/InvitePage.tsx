import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
}

/* ── Password requirements ── */
const PASSWORD_MIN = 8;
const PASSWORD_RULES = [
  { key: 'length', test: (p: string) => p.length >= PASSWORD_MIN, en: `At least ${PASSWORD_MIN} characters`, ru: `Минимум ${PASSWORD_MIN} символов` },
  { key: 'upper', test: (p: string) => /[A-Z]/.test(p), en: 'One uppercase letter', ru: 'Одна заглавная буква' },
  { key: 'lower', test: (p: string) => /[a-z]/.test(p), en: 'One lowercase letter', ru: 'Одна строчная буква' },
  { key: 'digit', test: (p: string) => /\d/.test(p), en: 'One digit', ru: 'Одна цифра' },
];

export default function InvitePage() {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError(t('invite.invalidLink'));
      setLoadingInvite(false);
      return;
    }

    const fetchInvitation = async () => {
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { _token: token });

      const invite = Array.isArray(data) ? data[0] : data;

      if (error || !invite) {
        setInviteError(t('invite.invalidOrExpired'));
        setLoadingInvite(false);
        return;
      }

      setInvitation({ ...invite, token: token! });
      setLoadingInvite(false);
    };

    fetchInvitation();
  }, [token, t]);

  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error(isRu ? 'Имя должно быть от 2 до 100 символов' : 'Name must be 2-100 characters');
      return;
    }

    if (!allRulesPassed) {
      toast.error(isRu ? 'Пароль не соответствует требованиям' : 'Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error(isRu ? 'Пароли не совпадают' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Try to sign up (new user)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: trimmedName },
        },
      });

      let userId: string | null = null;

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          // User exists in auth — try to sign in with the provided password
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });

          if (signInError) {
            setIsLoading(false);
            toast.error(
              isRu
                ? 'Аккаунт с этой почтой уже существует. Попробуйте использовать предыдущий пароль или обратитесь к администратору для полного удаления аккаунта.'
                : 'An account with this email already exists. Try using your previous password or contact an administrator for a full account reset.',
              { duration: 8000 }
            );
            return;
          }

          userId = signInData.user?.id || null;
        } else {
          setIsLoading(false);
          toast.error(signUpError.message);
          return;
        }
      } else {
        // New user created — sign in immediately (auto-confirm is enabled)
        if (!signUpData.user) {
          setIsLoading(false);
          toast.error(isRu ? 'Не удалось создать аккаунт' : 'Failed to create account');
          return;
        }

        userId = signUpData.user.id;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          setIsLoading(false);
          toast.error(signInError.message);
          return;
        }
      }

      if (!userId) {
        setIsLoading(false);
        toast.error(isRu ? 'Не удалось авторизоваться' : 'Failed to authenticate');
        return;
      }

      // Step 2: Use edge function to provision all records (bypasses RLS)
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-invite', {
        body: {
          invitation_id: invitation.id,
          display_name: trimmedName,
          language: language || 'en',
        },
      });

      if (acceptError) {
        console.error('Accept invite error:', acceptError);
        toast.error(isRu ? 'Не удалось активировать аккаунт. Обратитесь к администратору.' : 'Failed to provision account. Please contact administrator.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      toast.success(t('invite.accepted'));
      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err?.message || 'An error occurred');
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('invite.error')}</h1>
          <p className="text-muted-foreground mb-6">{inviteError}</p>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            {t('auth.backToLogin')}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-10 w-auto invert dark:invert-0" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('invite.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('invite.subtitle')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">{t('invite.completeSignup')}</CardTitle>
            <CardDescription>
              {t('invite.invitedAs')} <span className="font-medium text-foreground">{invitation?.email}</span>
              {' · '}
              <span className="font-medium text-primary">
                {invitation?.role === 'Client' ? t('role.client') : t('role.mediaBuyer')}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('auth.fullName')}</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isRu ? 'Введите пароль' : 'Enter password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowRules(true)}
                  required
                  minLength={PASSWORD_MIN}
                  maxLength={128}
                />
                {/* Password requirements */}
                {showRules && (
                  <div className="space-y-1 pt-1">
                    {PASSWORD_RULES.map(rule => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.key} className="flex items-center gap-1.5 text-xs">
                          {passed
                            ? <Check className="h-3.5 w-3.5 text-green-500" />
                            : <X className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                          <span className={passed ? 'text-green-500' : 'text-muted-foreground'}>
                            {isRu ? rule.ru : rule.en}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isRu ? 'Подтвердите пароль' : 'Confirm Password'}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={isRu ? 'Повторите пароль' : 'Confirm password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN}
                  maxLength={128}
                />
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {passwordsMatch
                      ? <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">{isRu ? 'Пароли совпадают' : 'Passwords match'}</span></>
                      : <><X className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{isRu ? 'Пароли не совпадают' : 'Passwords do not match'}</span></>
                    }
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !allRulesPassed || !passwordsMatch}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('invite.acceptAndCreate')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
