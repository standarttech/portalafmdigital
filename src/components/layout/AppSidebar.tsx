import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import logoAfm from '@/assets/logo-afm.png';
import {
  LayoutDashboard,
  Users,
  Building2,
  RefreshCw,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navItems = [
  { key: 'nav.dashboard' as const, icon: LayoutDashboard, path: '/dashboard' },
  { key: 'nav.clients' as const, icon: Building2, path: '/clients' },
  { key: 'nav.users' as const, icon: Users, path: '/users' },
  { key: 'nav.sync' as const, icon: RefreshCw, path: '/sync' },
  { key: 'nav.reports' as const, icon: FileText, path: '/reports' },
  { key: 'nav.audit' as const, icon: Shield, path: '/audit' },
  { key: 'nav.profile' as const, icon: UserCircle, path: '/profile' },
];

export default function AppSidebar() {
  const { t } = useLanguage();
  const { agencyRole } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Filter nav items based on role
  const isAdmin = agencyRole === 'AgencyAdmin';
  const filteredItems = navItems.filter((item) => {
    if (isAdmin) return true;
    if (item.path === '/audit' || item.path === '/users') return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3">
        <div className="h-8 w-8 flex-shrink-0 bg-primary/20 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={logoAfm} alt="AFM" className="h-5 w-auto" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground text-sm tracking-widest">
              AFM
            </span>
            <span className="text-[10px] tracking-[0.2em] text-primary font-medium -mt-0.5">
              DIGITAL
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className={cn('h-4.5 w-4.5 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && <span>{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
