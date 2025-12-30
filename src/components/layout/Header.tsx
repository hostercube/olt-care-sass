import { Bell, Search, User, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '@/hooks/useOLTData';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  
  const unreadAlerts = alerts.filter(a => !a.is_read);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            className="w-64 pl-9 bg-secondary border-border focus:border-primary"
          />
        </div>

        {/* Refresh */}
        <Button variant="outline" size="icon" className="border-border">
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative border-border">
              <Bell className="h-4 w-4" />
              {unreadAlerts.length > 0 && (
                <Badge
                  variant="danger"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 justify-center text-[10px]"
                >
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                {unreadAlerts.length > 0 && (
                  <Badge variant="secondary">{unreadAlerts.length} new</Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {unreadAlerts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              unreadAlerts.slice(0, 5).map((alert) => (
                <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-destructive' : 
                      alert.severity === 'warning' ? 'bg-warning' : 'bg-info'
                    }`} />
                    <span className="font-medium">{alert.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{alert.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full border-border">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.email}</span>
                <span className="text-xs text-muted-foreground">Authenticated</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
