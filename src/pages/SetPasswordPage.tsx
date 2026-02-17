import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Listen for the auth event from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (page refresh scenario)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Password set successfully! Welcome to AFM DIGITAL.');
    navigate('/dashboard');
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
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-auto bg-primary/10 rounded-2xl p-4 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-12 w-auto invert dark:invert-0" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Create a secure password to access AFM DIGITAL Portal
          </p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Create password</CardTitle>
            <CardDescription>
              Choose a strong password with at least 8 characters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength hints */}
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || password.length < 8 || password !== confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting password...
                  </>
                ) : (
                  'Set Password & Enter Platform →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
