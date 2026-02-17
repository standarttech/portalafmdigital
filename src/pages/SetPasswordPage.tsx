import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, KeyRound, Eye, EyeOff, Shield, CheckCircle2, QrCode } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Step = 'password' | 'mfa-offer' | 'mfa-setup' | 'done';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('password');
  const [sessionReady, setSessionReady] = useState(false);

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        setSessionReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); setIsLoading(false); return; }

    // Clear needs_password_setup flag
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_settings')
        .update({ needs_password_setup: false })
        .eq('user_id', user.id);
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
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying your invitation link...</p>
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
            <div className="h-16 w-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-10 w-auto invert dark:invert-0" />
            </div>
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
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-500' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-1.5 ${password === confirmPassword && password.length > 0 ? 'text-green-500' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${password === confirmPassword && password.length > 0 ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                        Passwords match
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || password.length < 8 || password !== confirmPassword}>
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
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/dashboard')}>
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
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/dashboard')}>
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
