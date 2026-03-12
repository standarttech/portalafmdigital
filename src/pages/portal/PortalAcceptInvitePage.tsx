import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';

type InviteState =
  | { kind: 'loading' }
  | { kind: 'valid'; id: string; client_id: string; email: string; expires_at: string }
  | { kind: 'expired' }
  | { kind: 'revoked' }
  | { kind: 'already_accepted' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

export default function PortalAcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [inviteState, setInviteState] = useState<InviteState>({ kind: 'loading' });
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setInviteState({ kind: 'invalid' });
      return;
    }
    (async () => {
      const { data, error: err } = await supabase.rpc('validate_portal_invite', { _token: token });
      if (err) {
        setInviteState({ kind: 'error', message: err.message });
        return;
      }
      const result = data as any;
      if (!result || result.error) {
        const e = result?.error || 'unknown';
        if (e === 'expired') setInviteState({ kind: 'expired' });
        else if (e === 'revoked') setInviteState({ kind: 'revoked' });
        else if (e === 'already_accepted') setInviteState({ kind: 'already_accepted' });
        else setInviteState({ kind: 'invalid' });
        return;
      }
      setInviteState({ kind: 'valid', id: result.id, client_id: result.client_id, email: result.email, expires_at: result.expires_at });
      setEmail(result.email || '');
    })();
  }, [token]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteState.kind !== 'valid') return;
    setError('');
    setSubmitting(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError(signInErr.message);
      setSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Authentication failed'); setSubmitting(false); return; }

    // Verify email match before accepting
    if (user.email?.toLowerCase() !== inviteState.email.toLowerCase()) {
      setError(`This invite is for ${inviteState.email}. You signed in as ${user.email}. Please use the correct account.`);
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }

    // Accept invite
    const { data: acceptResult } = await supabase.rpc('accept_portal_invite', {
      _invite_id: inviteState.id,
      _user_id: user.id,
    });
    const result = acceptResult as any;
    if (result?.error) {
      if (result.error === 'email_mismatch') {
        setError(`This invite is for ${inviteState.email}. Please sign in with that email address.`);
        await supabase.auth.signOut();
      } else {
        setError(`Activation failed: ${result.error}`);
      }
      setSubmitting(false);
      return;
    }

    // Audit
    await supabase.from('audit_log').insert({
      action: 'portal_invite_accepted',
      entity_type: 'client_portal_invites',
      entity_id: inviteState.id,
      user_id: user.id,
      details: { email, client_id: inviteState.client_id },
    });

    setSuccess(true);
    setSubmitting(false);
    toast.success('Portal access activated!');
    setTimeout(() => navigate('/portal', { replace: true }), 1500);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteState.kind !== 'valid') return;
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);

    // Create new auth account
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
        data: { full_name: fullName || email.split('@')[0] },
      },
    });

    if (signUpErr) {
      // If user already exists, suggest sign-in instead
      if (signUpErr.message.toLowerCase().includes('already registered') || signUpErr.message.toLowerCase().includes('already been registered')) {
        setError('An account with this email already exists. Please sign in instead.');
        setMode('signin');
      } else {
        setError(signUpErr.message);
      }
      setSubmitting(false);
      return;
    }

    const user = signUpData?.user;
    if (!user) { setError('Account creation failed. Please try again.'); setSubmitting(false); return; }

    // Check if email confirmation is required
    if (user.identities && user.identities.length === 0) {
      setError('An account with this email already exists. Please sign in instead.');
      setMode('signin');
      setSubmitting(false);
      return;
    }

    // If auto-confirmed, proceed to accept invite
    if (user.confirmed_at || user.email_confirmed_at) {
      const { data: acceptResult } = await supabase.rpc('accept_portal_invite', {
        _invite_id: inviteState.id,
        _user_id: user.id,
      });
      const aResult = acceptResult as any;
      if (aResult?.error) {
        if (aResult.error === 'email_mismatch') {
          setError('Email mismatch. Please use the invited email address.');
        } else {
          setError(`Activation failed: ${aResult.error}`);
        }
        setSubmitting(false);
        return;
      }

      await supabase.from('audit_log').insert({
        action: 'portal_signup_completed',
        entity_type: 'client_portal_users',
        entity_id: inviteState.id,
        user_id: user.id,
        details: { email, client_id: inviteState.client_id },
      });

      setSuccess(true);
      setSubmitting(false);
      toast.success('Account created and portal activated!');
      setTimeout(() => navigate('/portal', { replace: true }), 1500);
    } else {
      // Email confirmation required — store invite_id in sessionStorage
      // so PortalLoginPage can call accept_portal_invite after user confirms email and signs in
      sessionStorage.setItem('pending_portal_invite_id', inviteState.id);
      sessionStorage.setItem('pending_portal_invite_client', inviteState.client_id);
      setSubmitting(false);
      setError('');
      setSuccess(true);
      toast.info('Please check your email to verify your account, then return here to sign in.');
    }
  };

  // Render states
  if (inviteState.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteState.kind === 'expired') {
    return <InviteErrorScreen icon={<AlertTriangle className="h-10 w-10 text-amber-500" />} title="Invite Expired" message="This invitation has expired. Please contact your account manager to request a new one." />;
  }
  if (inviteState.kind === 'revoked') {
    return <InviteErrorScreen icon={<XCircle className="h-10 w-10 text-destructive" />} title="Invite Revoked" message="This invitation has been revoked. If you believe this is a mistake, please contact your account manager." />;
  }
  if (inviteState.kind === 'already_accepted') {
    return <InviteErrorScreen icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />} title="Already Activated" message="This invitation has already been used. You can sign in to the portal." showLogin />;
  }
  if (inviteState.kind === 'invalid' || inviteState.kind === 'error') {
    return <InviteErrorScreen icon={<XCircle className="h-10 w-10 text-destructive" />} title="Invalid Invite" message={inviteState.kind === 'error' ? inviteState.message : 'This invite link is invalid. Please check the link or contact your account manager.'} />;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-10 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Portal Access Activated</h2>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-lg">Activate Portal Access</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in with your existing account to activate'
              : 'Create an account to access your performance portal'}
          </p>
        </CardHeader>
        <CardContent>
          {/* Valid invite badge */}
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Mail className="h-4 w-4 shrink-0" />
              <span>Invite for <strong>{inviteState.email}</strong></span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Expires {new Date(inviteState.expires_at).toLocaleDateString()}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex mb-4 bg-muted/50 rounded-lg p-0.5">
            <button onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Existing Account
            </button>
            <button onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Create Account
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly
                  className="bg-muted/50 cursor-not-allowed" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Sign in with this email to activate your portal access</p>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In & Activate'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <Label htmlFor="signup-name">Full Name</Label>
                <Input id="signup-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  disabled={!!inviteState.email}
                  className={inviteState.email ? 'bg-muted/50' : ''} />
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" />
              </div>
              <div>
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input id="signup-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account & Activate'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteErrorScreen({ icon, title, message, showLogin }: { icon: React.ReactNode; title: string; message: string; showLogin?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="py-10 space-y-4">
          <div className="mx-auto w-fit">{icon}</div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          {showLogin && (
            <Link to="/portal/login">
              <Button variant="outline" size="sm" className="gap-2 mt-2">
                <KeyRound className="h-3.5 w-3.5" /> Go to Sign In
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
