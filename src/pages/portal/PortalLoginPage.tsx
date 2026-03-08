import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PortalLoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Invite validation state
  const [inviteData, setInviteData] = useState<{ id: string; client_id: string; email: string; expires_at: string } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [validatingInvite, setValidatingInvite] = useState(!!inviteToken);

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      setValidatingInvite(true);
      const { data, error: err } = await supabase.rpc('validate_portal_invite', { _token: inviteToken });
      if (err || !data || (data as any).error) {
        const msg = (data as any)?.error || err?.message || 'Invalid invite';
        setInviteError(msg === 'expired' ? 'This invite has expired. Please request a new one.' :
                       msg === 'invalid_token' ? 'Invalid invite link. Please check with your account manager.' : msg);
      } else {
        setInviteData(data as any);
        setEmail((data as any).email || '');
      }
      setValidatingInvite(false);
    })();
  }, [inviteToken]);

  // If already logged in, redirect to portal dashboard
  if (user && !inviteToken) {
    return <Navigate to="/portal" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setError('Authentication failed'); setLoading(false); return; }

    // If this is an invite flow, accept the invite
    if (inviteData) {
      const { data: acceptResult } = await supabase.rpc('accept_portal_invite', {
        _invite_id: inviteData.id,
        _user_id: u.id,
      });
      if ((acceptResult as any)?.error) {
        setError(`Invite issue: ${(acceptResult as any).error}`);
        setLoading(false);
        return;
      }
      navigate('/portal', { replace: true });
      setLoading(false);
      return;
    }

    // Check if user is a portal user
    const { data: pu } = await supabase
      .from('client_portal_users' as any)
      .select('id, status')
      .eq('user_id', u.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!pu) {
      // Not a portal user — check if admin
      const { data: au } = await supabase
        .from('agency_users')
        .select('agency_role')
        .eq('user_id', u.id)
        .maybeSingle();

      if (au?.agency_role === 'AgencyAdmin') {
        navigate('/portal', { replace: true });
      } else {
        setError('You do not have portal access. Contact your account manager.');
        await supabase.auth.signOut();
      }
      setLoading(false);
      return;
    }

    navigate('/portal', { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Client Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            {inviteToken ? 'Accept your invite and sign in' : 'Sign in to view your performance data'}
          </p>
        </CardHeader>
        <CardContent>
          {validatingInvite ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : inviteError ? (
            <div className="text-center space-y-3 py-4">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{inviteError}</p>
            </div>
          ) : (
            <>
              {inviteData && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Valid invite for <strong>{inviteData.email}</strong></span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Sign in or create an account to activate portal access.</p>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (inviteData ? 'Sign In & Activate' : 'Sign In')}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
