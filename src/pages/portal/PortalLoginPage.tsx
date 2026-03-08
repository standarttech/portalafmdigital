import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function PortalLoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // If already logged in, check portal status then redirect
  if (user) {
    return <Navigate to="/portal" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please check your credentials.'
        : err.message);
      setLoading(false);
      return;
    }

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setError('Authentication failed. Please try again.'); setLoading(false); return; }

    // Check if user is an active portal user
    const { data: pu } = await supabase
      .from('client_portal_users' as any)
      .select('id, status')
      .eq('user_id', u.id)
      .maybeSingle();

    if (pu) {
      if ((pu as any).status === 'active') {
        // Update last login
        await supabase.rpc('update_portal_last_login', { _user_id: u.id });
        navigate('/portal', { replace: true });
      } else if ((pu as any).status === 'deactivated') {
        setError('Your portal access has been deactivated. Please contact your account manager.');
        await supabase.auth.signOut();
      } else {
        setError('Your portal account is not yet activated. Please check your invite email.');
        await supabase.auth.signOut();
      }
      setLoading(false);
      return;
    }

    // Not a portal user — check if admin
    const { data: au } = await supabase
      .from('agency_users')
      .select('agency_role')
      .eq('user_id', u.id)
      .maybeSingle();

    if (au?.agency_role === 'AgencyAdmin') {
      navigate('/portal', { replace: true });
    } else {
      setError('You do not have portal access. If you received an invite, please use the link in your email.');
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/portal/login`,
    });

    if (err) {
      toast.error(err.message);
      setResetLoading(false);
      return;
    }

    setView('forgot-sent');
    setResetLoading(false);
  };

  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Reset Password</CardTitle>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <button type="button" onClick={() => setView('login')}
                className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
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
            <h2 className="text-lg font-semibold text-foreground">Check Your Email</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{resetEmail}</strong>, we've sent password reset instructions.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder or contact your account manager.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setView('login'); setResetEmail(''); }}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Client Portal</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to view your performance data</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setView('forgot'); setResetEmail(email); setError(''); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Forgot your password?
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
