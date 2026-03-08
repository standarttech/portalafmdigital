import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User, Shield, Bell, Key, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

const PREF_TYPES: { key: string; label: string; desc: string; mandatory?: boolean }[] = [
  { key: 'campaign_launched', label: 'Campaign launches', desc: 'When a new campaign goes live' },
  { key: 'optimization_update', label: 'Optimization updates', desc: 'When optimizations are completed' },
  { key: 'recommendation_added', label: 'New insights', desc: 'When new recommendations are available' },
  { key: 'report_available', label: 'Reports', desc: 'When new reports are shared' },
  { key: 'file_shared', label: 'Shared files', desc: 'When files or documents are shared' },
  { key: 'portal_access_updated', label: 'Account updates', desc: 'Portal access and security updates (always on)', mandatory: true },
];

type PrefKey = 'campaign_launched' | 'optimization_update' | 'recommendation_added' | 'report_available' | 'file_shared' | 'portal_access_updated';

export default function PortalSettingsPage() {
  const { portalUser, branding, isAdmin } = useOutletContext<Ctx>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    campaign_launched: true,
    optimization_update: true,
    recommendation_added: true,
    report_available: true,
    file_shared: true,
    portal_access_updated: true,
  });
  const [prefsLoading, setPrefLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    if (!portalUser?.id) { setPrefLoading(false); return; }
    const { data } = await supabase
      .from('portal_notification_preferences' as any)
      .select('*')
      .eq('portal_user_id', portalUser.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setPrefs({
        campaign_launched: d.campaign_launched ?? true,
        optimization_update: d.optimization_update ?? true,
        recommendation_added: d.recommendation_added ?? true,
        report_available: d.report_available ?? true,
        file_shared: d.file_shared ?? true,
        portal_access_updated: true, // always on
      });
    }
    setPrefLoading(false);
  }, [portalUser]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  const savePrefs = async () => {
    if (!portalUser?.id) return;
    setSaving(true);
    const payload = {
      portal_user_id: portalUser.id,
      campaign_launched: prefs.campaign_launched,
      optimization_update: prefs.optimization_update,
      recommendation_added: prefs.recommendation_added,
      report_available: prefs.report_available,
      file_shared: prefs.file_shared,
      portal_access_updated: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('portal_notification_preferences' as any)
      .upsert(payload as any, { onConflict: 'portal_user_id' });

    if (error) {
      toast.error('Could not save preferences');
    } else {
      toast.success('Notification preferences saved');
      supabase.from('audit_log').insert({
        action: 'portal_notification_preferences_updated',
        entity_type: 'portal_notification_preferences',
        entity_id: portalUser.id,
        user_id: user?.id,
        details: prefs,
      });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.from('audit_log').insert({
      action: 'portal_logout',
      entity_type: 'client_portal_users',
      entity_id: portalUser?.id || user?.id || 'unknown',
      user_id: user?.id,
    });
    await signOut();
    navigate('/portal/login', { replace: true });
    toast.success('Signed out successfully');
  };

  const handleResetPassword = async () => {
    const email = portalUser?.email || user?.email;
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/login`,
    });
    if (error) {
      toast.error('Could not send reset email. Please try again later.');
    } else {
      toast.success('Password reset email sent. Check your inbox.');
      supabase.from('audit_log').insert({
        action: 'portal_password_reset_initiated',
        entity_type: 'client_portal_users',
        entity_id: portalUser?.id || user?.id || 'unknown',
        user_id: user?.id,
      });
    }
  };

  const sessionStarted = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Your portal account information</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm text-foreground truncate ml-4">{portalUser?.email || user?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm text-foreground">{portalUser?.full_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="text-xs">{portalUser?.status || (isAdmin ? 'admin preview' : 'unknown')}</Badge>
          </div>
          {portalUser?.activated_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active since</span>
              <span className="text-sm text-foreground">{new Date(portalUser.activated_at).toLocaleDateString()}</span>
            </div>
          )}
          {portalUser?.last_login_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last login</span>
              <span className="text-sm text-foreground">{new Date(portalUser.last_login_at).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={handleResetPassword} className="gap-2">
            <Key className="h-4 w-4" /> Reset Password
          </Button>
          <p className="text-xs text-muted-foreground">A password reset link will be sent to your email address.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Current Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessionStarted && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Session started</span>
              <span className="text-sm text-foreground">{sessionStarted}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Your session is automatically refreshed. Sign out manually when you're done.</p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : portalUser ? (
            <>
              {PREF_TYPES.map(pt => (
                <div key={pt.key} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{pt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pt.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[pt.key]}
                    onCheckedChange={v => pt.mandatory ? null : setPrefs(p => ({ ...p, [pt.key]: v }))}
                    disabled={pt.mandatory}
                  />
                </div>
              ))}
              <Button size="sm" onClick={savePrefs} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Preferences
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Notification preferences are available for portal users.</p>
          )}
        </CardContent>
      </Card>

      {branding && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {branding.logo_url && <img src={branding.logo_url} alt="" className="h-8 w-8 object-contain rounded" />}
            <div>
              <p className="text-sm font-medium text-foreground">{branding.portal_title || 'Performance Portal'}</p>
              {branding.agency_label && <p className="text-xs text-muted-foreground">Powered by {branding.agency_label}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      {isAdmin && !portalUser && (
        <Card className="border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-500">You are previewing the portal as an admin. Portal users will see their own account info here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
