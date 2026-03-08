import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Megaphone, Lightbulb, FileText, Settings, LogOut, Loader2, FolderOpen, AlertTriangle, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PortalNotificationBell from '@/components/portal/PortalNotificationBell';
import { useState } from 'react';

const portalNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
  { label: 'Campaigns', icon: Megaphone, path: '/portal/campaigns' },
  { label: 'Recommendations', icon: Lightbulb, path: '/portal/recommendations' },
  { label: 'Reports', icon: FileText, path: '/portal/reports' },
  { label: 'Files', icon: FolderOpen, path: '/portal/files' },
  { label: 'Settings', icon: Settings, path: '/portal/settings' },
];

export default function PortalLayout() {
  const { portalUser, branding, loading, isPortalUser } = usePortalAuth();
  const { user, signOut, agencyRole } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = agencyRole === 'AgencyAdmin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  if (portalUser && portalUser.status === 'deactivated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-bold text-foreground">Portal Access Suspended</h1>
          <p className="text-sm text-muted-foreground">Your portal access has been deactivated. Please contact your account manager for assistance.</p>
          <Button variant="outline" size="sm" onClick={() => signOut()}>Sign Out</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isPortalUser) {
    return <Navigate to="/portal/login" replace />;
  }

  const title = branding?.portal_title || 'Performance Portal';
  const accentColor = branding?.accent_color || 'hsl(42, 87%, 55%)';

  const navContent = (
    <>
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {portalNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        {isAdmin && !isPortalUser && (
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-sidebar-muted mb-1">
              ← Back to Admin
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={() => signOut()}
          className="w-full justify-start gap-3 px-3 text-sidebar-muted hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <Button variant="ghost" size="sm" className="p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt="" className="h-7 w-7 object-contain rounded" />
        ) : (
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: accentColor, color: '#fff' }}>P</div>
        )}
        <span className="font-semibold text-sidebar-foreground text-sm truncate flex-1">{title}</span>
        <PortalNotificationBell clientId={portalUser?.client_id || null} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-sidebar border-r border-sidebar-border flex flex-col pt-14 z-50">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-sidebar border-r border-sidebar-border flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: accentColor, color: '#fff' }}>P</div>
          )}
          <span className="font-semibold text-sidebar-foreground text-sm truncate flex-1">{title}</span>
          <PortalNotificationBell clientId={portalUser?.client_id || null} />
        </div>
        {navContent}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet context={{ portalUser, branding, isAdmin }} />
      </main>
    </div>
  );
}
