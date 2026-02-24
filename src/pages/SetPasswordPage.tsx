import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm-new.png';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, KeyRound, Eye, EyeOff, Shield, CheckCircle2, QrCode } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Step = 'password' | 'mfa-offer' | 'mfa-setup' | 'done';

function getInitialStep(): Step {
  const saved = sessionStorage.getItem('set_password_step');
  if (saved === 'mfa-offer' || saved === 'mfa-setup' || saved === 'done') return saved;
  return 'password';
}

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStepRaw] = useState<Step>(getInitialStep);
  const [sessionReady, setSessionReady] = useState(false);

  // Persist step so remounts don't reset it
  const setStep = (s: Step) => {
    sessionStorage.setItem('set_password_step', s);
    setStepRaw(s);
  };

  // Password step
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA setup step
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);

  const [passwordSaved, setPasswordSaved] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let resolved = false;

    const markReady = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        setSessionReady(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session) {
        markReady();
      }
    });

    // Try getting existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        markReady();
      }
    });

    // If hash contains access_token, try to manually set session
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            if (!error && data.session) {
              // Clean hash from URL
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              markReady();
            }
          })
          .catch(() => {});
      }
    }

    // Safety timeout — don't hang forever
    timeoutId = setTimeout(() => {
      if (!resolved) {
        setSessionError(true);
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Password strength checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!?<>@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/`~]/.test(password),
  };
  const allChecksPassed = Object.values(checks).every(Boolean);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecksPassed) { toast.error('Password does not meet all requirements'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsLoading(true);

    // CRITICAL: Set session flag FIRST so App.tsx won't re-intercept on USER_UPDATED event
    sessionStorage.setItem('password_setup_done', '1');

    // Clear DB flag before updateUser triggers USER_UPDATED
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_settings')
        .update({ needs_password_setup: false })
        .eq('user_id', user.id);
    }

    // NOW update password
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      // If same_password error, password was already set — skip ahead
      if (error.message?.toLowerCase().includes('same password') || (error as any).code === 'same_password') {
        toast.success('Password already set!');
        setIsLoading(false);
        setStep('mfa-offer');
        return;
      }
      // Rollback both flags on error
      sessionStorage.removeItem('password_setup_done');
      if (user) {
        await supabase.from('user_settings')
          .update({ needs_password_setup: true })
          .eq('user_id', user.id);
      }
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Password set successfully!');
    setIsLoading(false);
    setStep('mfa-offer');
  };

  const handleEnrollMfa = async () => {
    setMfaEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'AFM DIGITAL' });
    if (error || !data) { toast.error(error?.message || 'Failed to start MFA setup'); setMfaEnrolling(false); return; }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setTotpSecret(data.totp.secret);
    setMfaEnrolling(false);
    setStep('mfa-setup');
  };

  const handleVerifyMfa = async () => {
    if (otpCode.length !== 6) return;
    setMfaLoading(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { toast.error(challengeError.message); setMfaLoading(false); return; }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: otpCode,
    });
    if (verifyError) { toast.error(verifyError.message); setOtpCode(''); setMfaLoading(false); return; }

    toast.success('Authenticator configured!');
    setMfaLoading(false);
    setStep('done');
    sessionStorage.removeItem('set_password_step');
    sessionStorage.removeItem('password_setup_done');
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
          {sessionError ? (
            <>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive text-xl">!</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Link verification failed</h2>
              <p className="text-muted-foreground text-sm">
                The invitation link could not be verified. This can happen due to browser settings, expired links, or network issues.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={() => window.location.reload()} className="w-full">
                  Try again
                </Button>
                <Button variant="outline" onClick={() => { window.location.href = '/auth'; }} className="w-full">
                  Go to login
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Verifying your invitation link...</p>
            </>
          )}
        </div>
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logoAfm} alt="AFM DIGITAL" className="h-28 w-auto" />
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 1: Set Password */}
          {step === 'password' && (
            <motion.div key="password" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
                </div>
                <p className="text-muted-foreground text-sm">Create a secure password to access AFM DIGITAL Portal</p>
              </div>
              <Card className="glass-card-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Create password</CardTitle>
                  <CardDescription>Choose a strong password with at least 8 characters</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters"
                          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} maxLength={128} className="pr-10" />
                        <button type="button" onClick={() => setShowConfirm(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Password requirements */}
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password requirements</p>
                      {[
                        { key: 'uppercase', label: 'Uppercase letter' },
                        { key: 'lowercase', label: 'Lowercase letter' },
                        { key: 'number', label: 'Number' },
                        { key: 'special', label: 'Special character (e.g. !?<>@#$%)' },
                        { key: 'length', label: '8 characters or more' },
                      ].map(({ key, label }) => {
                        const ok = checks[key as keyof typeof checks];
                        return (
                          <div key={key} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${ok ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
                              {ok && <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            {label}
                          </div>
                        );
                      })}
                      {password.length > 0 && (
                        <div className={`flex items-center gap-2 text-xs transition-colors ${password === confirmPassword ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${password === confirmPassword ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
                            {password === confirmPassword && <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          Passwords match
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !allChecksPassed || password !== confirmPassword}>
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting password...</> : 'Continue →'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: MFA Offer */}
          {step === 'mfa-offer' && (
            <motion.div key="mfa-offer" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-foreground">Protect your account</h1>
                </div>
                <p className="text-muted-foreground text-sm">Add two-factor authentication for extra security</p>
              </div>
              <Card className="glass-card-elevated">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Two-Factor Authentication (2FA)</p>
                      <p className="text-xs text-muted-foreground mt-1">Use an authenticator app like Google Authenticator or Authy to generate one-time codes when signing in.</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleEnrollMfa} disabled={mfaEnrolling}>
                    {mfaEnrolling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</> : <><QrCode className="mr-2 h-4 w-4" />Set up authenticator</>}
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { sessionStorage.removeItem('set_password_step'); sessionStorage.removeItem('password_setup_done'); navigate('/dashboard'); }}>
                    Skip for now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: MFA Setup (QR + verify) */}
          {step === 'mfa-setup' && (
            <motion.div key="mfa-setup" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-foreground">Scan QR code</h1>
                </div>
                <p className="text-muted-foreground text-sm">Scan this code with your authenticator app</p>
              </div>
              <Card className="glass-card-elevated">
                <CardContent className="pt-6 space-y-5">
                  {qrCode && (
                    <div className="flex justify-center">
                      <div className="p-3 bg-white rounded-xl">
                        <img src={qrCode} alt="QR Code" className="h-44 w-44" />
                      </div>
                    </div>
                  )}
                  {totpSecret && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Or enter manually:</p>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded select-all">{totpSecret}</code>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-center block">Enter the 6-digit code to confirm</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}
                        onKeyDown={(e) => { if (e.key === 'Enter' && otpCode.length === 6) handleVerifyMfa(); }}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleVerifyMfa} disabled={mfaLoading || otpCode.length !== 6}>
                    {mfaLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Confirm & Enter Platform →'}
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { sessionStorage.removeItem('set_password_step'); sessionStorage.removeItem('password_setup_done'); navigate('/dashboard'); }}>
                    Skip for now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">All set!</h1>
              <p className="text-muted-foreground">Redirecting to the platform...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
