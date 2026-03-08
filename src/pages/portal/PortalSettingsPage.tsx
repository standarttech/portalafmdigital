import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User, Shield, Bell, Key } from 'lucide-react';
import { toast } from 'sonner';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

export default function PortalSettingsPage() {
  const { portalUser, branding, isAdmin } = useOutletContext<Ctx>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
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
            <span className="text-sm text-foreground">{portalUser?.email || user?.email || '—'}</span>
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
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You'll receive notifications for new reports, campaign updates, and shared files. Notification preferences will be available in a future update.
          </p>
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
