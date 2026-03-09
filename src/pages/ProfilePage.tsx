import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Lock, Mail, Shield, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle, UserPlus, Repeat2, Trash2 } from 'lucide-react';
import NotificationSettings from '@/components/profile/NotificationSettings';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, linkedAccounts, addAccount, switchAccount, removeLinkedAccount } = useAuth();

  // Display name
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Multi-account
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaDisabling, setMfaDisabling] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('agency_users')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.display_name) {
      setDisplayName(data.display_name);
    }
  }, [user]);

  const fetchMfaFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setMfaFactors(data.totp || []);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchMfaFactors();
  }, [fetchProfile, fetchMfaFactors]);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('agency_users')
      .update({ display_name: displayName.trim() })
      .eq('user_id', user.id);
    setSavingName(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('profile.nameSaved'));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }

    setSavingPassword(true);

    // Verify current password by re-authenticating
    if (currentPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) {
        setSavingPassword(false);
        toast.error(t('profile.currentPasswordWrong'));
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSavingPassword(false);
      toast.error(error.message);
      return;
    }

    // Clear force_password_change flag
    if (user) {
      await supabase
        .from('user_settings')
        .update({ force_password_change: false, temp_password_expires_at: null })
        .eq('user_id', user.id);
    }

    setSavingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success(t('profile.passwordChanged'));
  };

  const handleChangeEmail = async () => {
    if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error(t('auth.invalidEmail'));
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('profile.emailVerificationSent'));
      setNewEmail('');
    }
  };

  const handleEnrollMfa = async () => {
    setMfaEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'AFM DIGITAL Authenticator' });
    setMfaEnrolling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setMfaQr(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || !mfaVerifyCode) return;
    setMfaVerifying(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeError) {
      setMfaVerifying(false);
      toast.error(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaVerifyCode,
    });
    setMfaVerifying(false);
    if (verifyError) {
      toast.error(verifyError.message);
    } else {
      toast.success(t('profile.mfaEnabled'));
      setMfaQr(null);
      setMfaSecret(null);
      setMfaFactorId(null);
      setMfaVerifyCode('');
      fetchMfaFactors();
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    setMfaDisabling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaDisabling(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('profile.mfaDisabled'));
      fetchMfaFactors();
    }
  };

  const handleSignOutOtherSessions = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('profile.otherSessionsLoggedOut'));
    }
  };

  const handleAddLinkedAccount = async () => {
    if (!accountEmail || !accountPassword) return;
    setAddingAccount(true);
    const { error } = await addAccount(accountEmail.trim(), accountPassword);
    setAddingAccount(false);

    if (error) {
      toast.error(error);
      return;
    }

    setAccountEmail('');
    setAccountPassword('');
    toast.success(t('profile.accountAdded'));
  };

  const handleSwitchLinkedAccount = async (targetUserId: string) => {
    setSwitchingAccountId(targetUserId);
    const { error } = await switchAccount(targetUserId);
    setSwitchingAccountId(null);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('profile.accountSwitched'));
  };

  const handleRemoveLinkedAccount = async (targetUserId: string) => {
    setRemovingAccountId(targetUserId);
    const { error } = await removeLinkedAccount(targetUserId);
    setRemovingAccountId(null);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('profile.accountRemoved'));
  };

  const verifiedFactors = mfaFactors.filter((f) => f.status === 'verified');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('profile.subtitle')}</p>
      </motion.div>

      {/* Display Name */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('profile.displayName')}</CardTitle>
            </div>
            <CardDescription>{t('profile.displayNameDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('auth.fullNamePlaceholder')} className="flex-1" />
              <Button onClick={handleSaveName} disabled={savingName}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{t('common.email')}:</span> {user?.email}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('profile.changePassword')}</CardTitle>
            </div>
            <CardDescription>{t('profile.changePasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.currentPassword')}</Label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.newPassword')}</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('profile.updatePassword')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Email */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('profile.changeEmail')}</CardTitle>
            </div>
            <CardDescription>{t('profile.changeEmailDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">{t('profile.currentEmail')}:</span>{' '}
              <span className="text-foreground font-medium">{user?.email}</span>
            </div>
            <div className="flex gap-3">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="flex-1"
              />
              <Button onClick={handleChangeEmail} disabled={savingEmail || !newEmail}>
                {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : t('profile.sendVerification')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* MFA / TOTP */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('profile.mfa')}</CardTitle>
            </div>
            <CardDescription>{t('profile.mfaDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifiedFactors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('profile.mfaActive')}
                </div>
                {verifiedFactors.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{factor.friendly_name || 'Authenticator'}</p>
                      <p className="text-xs text-muted-foreground">{t('profile.mfaAdded')}: {new Date(factor.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDisableMfa(factor.id)} disabled={mfaDisabling}>
                      {t('profile.mfaDisable')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : mfaQr ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {t('profile.mfaScanQr')}
                </div>
                <div className="flex justify-center bg-white rounded-lg p-4">
                  <img src={mfaQr} alt="QR Code" className="w-48 h-48" />
                </div>
                {mfaSecret && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('profile.mfaManualCode')}:</p>
                    <code className="text-sm bg-muted/50 px-3 py-1 rounded font-mono">{mfaSecret}</code>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label>{t('profile.mfaEnterCode')}</Label>
                  <div className="flex gap-3">
                    <Input
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="flex-1 font-mono text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    <Button onClick={handleVerifyMfa} disabled={mfaVerifying || mfaVerifyCode.length !== 6}>
                      {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.confirm')}
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMfaQr(null); setMfaSecret(null); setMfaFactorId(null); }}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Button onClick={handleEnrollMfa} disabled={mfaEnrolling} className="gap-2">
                {mfaEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {t('profile.mfaEnable')}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Multi-account */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('profile.multiAccount')}</CardTitle>
            </div>
            <CardDescription>{t('profile.multiAccountDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
              <Input
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
              />
              <Input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder={t('profile.accountPassword')}
              />
              <Button onClick={handleAddLinkedAccount} disabled={addingAccount || !accountEmail || !accountPassword}>
                {addingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : t('profile.addAccount')}
              </Button>
            </div>

            {linkedAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('profile.noLinkedAccounts')}</p>
            ) : (
              <div className="space-y-2">
                {linkedAccounts.map((account) => (
                  <div key={account.userId} className="rounded-lg border border-border/50 p-3 bg-secondary/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{account.displayName || account.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {account.agencyRole && <Badge variant="outline" className="text-[10px]">{account.agencyRole}</Badge>}
                          {account.isCurrent && <Badge className="text-[10px]">{t('profile.currentAccount')}</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!account.isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleSwitchLinkedAccount(account.userId)}
                            disabled={switchingAccountId === account.userId}
                          >
                            {switchingAccountId === account.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat2 className="h-3.5 w-3.5" />}
                            {t('profile.switchTo')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive"
                          onClick={() => handleRemoveLinkedAccount(account.userId)}
                          disabled={removingAccountId === account.userId}
                        >
                          {removingAccountId === account.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div variants={item}>
        <NotificationSettings />
      </motion.div>

      {/* Sessions */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">{t('profile.sessions')}</CardTitle>
            <CardDescription>{t('profile.sessionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSignOutOtherSessions} className="gap-2">
              <Lock className="h-4 w-4" />
              {t('profile.logoutOtherSessions')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
