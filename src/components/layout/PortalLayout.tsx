import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Megaphone, Lightbulb, FileText, Settings, LogOut, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const portalNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
  { label: 'Campaigns', icon: Megaphone, path: '/portal/campaigns' },
  { label: 'Recommendations', icon: Lightbulb, path: '/portal/recommendations' },
  { label: 'Reports', icon: FileText, path: '/portal/reports' },
  { label: 'Settings', icon: Settings, path: '/portal/settings' },
];

export default function PortalLayout() {
  const { portalUser, branding, loading, isPortalUser } = usePortalAuth();
  const { user, signOut, agencyRole } = useAuth();
  const location = useLocation();

  // Allow admins to preview portal
  const isAdmin = agencyRole === 'AgencyAdmin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not admin and not portal user, redirect
  if (!isAdmin && !isPortalUser) {
    return <Navigate to="/auth" replace />;
  }

  const title = branding?.portal_title || 'Performance Portal';
  const accentColor = branding?.accent_color || 'hsl(42, 87%, 55%)';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Header */}
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: accentColor, color: '#fff' }}>
              P
            </div>
          )}
          <span className="font-semibold text-sidebar-foreground text-sm truncate">{title}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {portalNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
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

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border">
          {isAdmin && !isPortalUser && (
            <Link to="/dashboard">
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
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ portalUser, branding, isAdmin }} />
      </main>
    </div>
  );
}
