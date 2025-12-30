import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Router,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Activity,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'OLT Management', href: '/olts', icon: Server },
  { title: 'ONU Devices', href: '/onus', icon: Router },
  { title: 'Alerts', href: '/alerts', icon: Bell, badge: 2 },
  { title: 'Monitoring', href: '/monitoring', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Network className="h-8 w-8 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">OLT Manager</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Network Operations</span>
            </div>
          </div>
        )}
        {collapsed && (
          <Network className="h-8 w-8 text-primary mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge variant="danger" className="h-5 min-w-[20px] justify-center">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 right-3 h-8 w-8 rounded-full border border-border bg-background hover:bg-secondary"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Connection Status */}
      {!collapsed && (
        <div className="absolute bottom-16 left-3 right-3">
          <div className="rounded-lg bg-success/10 border border-success/20 p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-success">System Online</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              All services operational
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
