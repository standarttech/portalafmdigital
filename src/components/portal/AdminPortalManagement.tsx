import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, UserPlus, Copy, Check, XCircle, RefreshCw, Palette, ExternalLink, Users } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PortalUser, PortalInvite, PortalBranding } from '@/types/portal';

export default function AdminPortalManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{id:string;name:string}[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [invites, setInvites] = useState<PortalInvite[]>([]);
  const [branding, setBranding] = useState<PortalBranding[]>([]);

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteClientId, setInviteClientId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');

  // Branding form
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [brClientId, setBrClientId] = useState('');
  const [brTitle, setBrTitle] = useState('Performance Portal');
  const [brLogo, setBrLogo] = useState('');
  const [brAccent, setBrAccent] = useState('#D4A843');
  const [brLabel, setBrLabel] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  const load = useCallback(async () => {
    const [cRes, puRes, iRes, bRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('client_portal_users' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('client_portal_invites' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('client_portal_branding' as any).select('*'),
    ]);
    setClients(cRes.data || []);
    setPortalUsers((puRes.data as any as PortalUser[]) || []);
    setInvites((iRes.data as any as PortalInvite[]) || []);
    setBranding((bRes.data as any as PortalBranding[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || id.slice(0, 8);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteClientId) return;
    setInviting(true);

    // Create portal user record
    const { error: puErr } = await supabase.from('client_portal_users' as any).insert({
      client_id: inviteClientId,
      email: inviteEmail,
      full_name: inviteFullName || inviteEmail.split('@')[0],
      status: 'invited',
    } as any);

    if (puErr && !puErr.message.includes('duplicate')) {
      toast.error(puErr.message);
      setInviting(false);
      return;
    }

    // Create invite
    const { data: inv, error: invErr } = await supabase.from('client_portal_invites' as any).insert({
      client_id: inviteClientId,
      email: inviteEmail,
      invited_by: user?.id,
    } as any).select('*').single();

    if (invErr) { toast.error(invErr.message); setInviting(false); return; }

    // Log audit
    await supabase.from('audit_log').insert({
      action: 'portal_invite_created',
      entity_type: 'client_portal_invites',
      entity_id: (inv as any)?.id,
      user_id: user?.id,
      details: { email: inviteEmail, client_id: inviteClientId },
    });

    toast.success('Portal invite created');
    setInviteEmail('');
    setInviteFullName('');
    setInviteClientId('');
    setInviting(false);
    setInviteOpen(false);
    load();
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/portal/login?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast.success('Invite link copied');
  };

  const revokeInvite = async (id: string) => {
    await supabase.from('client_portal_invites' as any).update({ status: 'revoked' } as any).eq('id', id);
    await supabase.from('audit_log').insert({
      action: 'portal_invite_revoked', entity_type: 'client_portal_invites', entity_id: id, user_id: user?.id,
    });
    toast.success('Invite revoked');
    load();
  };

  const toggleUserStatus = async (pu: PortalUser) => {
    const newStatus = pu.status === 'active' ? 'deactivated' : 'active';
    await supabase.from('client_portal_users' as any).update({ status: newStatus } as any).eq('id', pu.id);
    await supabase.from('audit_log').insert({
      action: newStatus === 'active' ? 'portal_access_activated' : 'portal_user_deactivated',
      entity_type: 'client_portal_users', entity_id: pu.id, user_id: user?.id,
      details: { email: pu.email, client_id: pu.client_id },
    });
    toast.success(`Portal user ${newStatus}`);
    load();
  };

  const saveBranding = async () => {
    if (!brClientId) return;
    setSavingBranding(true);
    const payload = {
      client_id: brClientId,
      portal_title: brTitle,
      logo_url: brLogo || null,
      accent_color: brAccent,
      agency_label: brLabel || null,
    };

    const existing = branding.find(b => b.client_id === brClientId);
    if (existing) {
      await supabase.from('client_portal_branding' as any).update(payload as any).eq('id', existing.id);
    } else {
      await supabase.from('client_portal_branding' as any).insert(payload as any);
    }

    await supabase.from('audit_log').insert({
      action: 'portal_branding_changed', entity_type: 'client_portal_branding',
      entity_id: brClientId, user_id: user?.id, details: payload,
    });

    toast.success('Branding saved');
    setSavingBranding(false);
    setBrandingOpen(false);
    load();
  };

  const openBrandingEdit = (clientId: string) => {
    const existing = branding.find(b => b.client_id === clientId);
    setBrClientId(clientId);
    setBrTitle(existing?.portal_title || 'Performance Portal');
    setBrLogo(existing?.logo_url || '');
    setBrAccent(existing?.accent_color || '#D4A843');
    setBrLabel(existing?.agency_label || '');
    setBrandingOpen(true);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const activeUsers = portalUsers.filter(u => u.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Client Portal Management
          </h2>
          <p className="text-sm text-muted-foreground">{activeUsers.length} active portal users · {pendingInvites.length} pending invites</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Invite Portal User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Client to Portal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={inviteClientId} onValueChange={setInviteClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="client@company.com" />
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input value={inviteFullName} onChange={e => setInviteFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteClientId} className="w-full">
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" asChild>
            <a href="/portal" target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Preview Portal
            </a>
          </Button>
        </div>
      </div>

      {/* Portal Users */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portal Users</CardTitle></CardHeader>
        <CardContent>
          {portalUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No portal users yet. Invite a client to get started.</p>
          ) : (
            <div className="space-y-2">
              {portalUsers.map(pu => (
                <div key={pu.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{pu.full_name || pu.email}</p>
                    <p className="text-xs text-muted-foreground">{pu.email} · {clientName(pu.client_id)}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${pu.status === 'active' ? 'text-emerald-500 border-emerald-500/30' : pu.status === 'deactivated' ? 'text-destructive border-destructive/30' : 'text-muted-foreground'}`}>
                    {pu.status}
                  </Badge>
                  {pu.last_login_at && (
                    <span className="text-[10px] text-muted-foreground">Last: {new Date(pu.last_login_at).toLocaleDateString()}</span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleUserStatus(pu)} className="text-xs">
                    {pu.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openBrandingEdit(pu.client_id)} title="Branding">
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Invites</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{clientName(inv.client_id)} · Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${inv.status === 'pending' ? 'text-amber-500 border-amber-500/30' : inv.status === 'accepted' ? 'text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}`}>
                    {inv.status}
                  </Badge>
                  {inv.status === 'pending' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => copyInviteLink(inv.token)} title="Copy invite link">
                        {copiedToken === inv.token ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)} title="Revoke">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branding Dialog */}
      <Dialog open={brandingOpen} onOpenChange={setBrandingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Portal Branding — {clientName(brClientId)}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Portal Title</Label>
              <Input value={brTitle} onChange={e => setBrTitle(e.target.value)} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={brLogo} onChange={e => setBrLogo(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex gap-2 items-center">
                <Input value={brAccent} onChange={e => setBrAccent(e.target.value)} className="flex-1" />
                <div className="h-8 w-8 rounded border" style={{ background: brAccent }} />
              </div>
            </div>
            <div>
              <Label>Agency Label (optional)</Label>
              <Input value={brLabel} onChange={e => setBrLabel(e.target.value)} placeholder="Powered by Agency" />
            </div>
            <Button onClick={saveBranding} disabled={savingBranding} className="w-full">
              {savingBranding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Branding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
