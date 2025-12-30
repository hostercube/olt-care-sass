import { Bell, Search, User, RefreshCw } from 'lucide-react';
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

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
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
              <Badge
                variant="danger"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 justify-center text-[10px]"
              >
                2
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                <Badge variant="secondary">2 new</Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium">OLT Connection Lost</span>
              </div>
              <span className="text-xs text-muted-foreground">OLT-Remote-West unreachable</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span className="font-medium">Low RX Power</span>
              </div>
              <span className="text-xs text-muted-foreground">Customer-Residence-A1-2</span>
            </DropdownMenuItem>
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
                <span className="font-medium">Admin User</span>
                <span className="text-xs text-muted-foreground">admin@isp.net</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>API Configuration</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
