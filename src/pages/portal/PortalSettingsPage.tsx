import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

export default function PortalSettingsPage() {
  const { portalUser, branding, isAdmin } = useOutletContext<Ctx>();
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Your portal account information</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Account</CardTitle></CardHeader>
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
