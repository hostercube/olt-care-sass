import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatus } from '@/types/olt';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  online: {
    label: 'Online',
    variant: 'online' as const,
    dotColor: 'bg-success',
  },
  offline: {
    label: 'Offline',
    variant: 'offline' as const,
    dotColor: 'bg-destructive',
  },
  warning: {
    label: 'Warning',
    variant: 'warning' as const,
    dotColor: 'bg-warning',
  },
  unknown: {
    label: 'Unknown',
    variant: 'secondary' as const,
    dotColor: 'bg-muted-foreground',
  },
};

export function StatusIndicator({
  status,
  showLabel = true,
  size = 'md',
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  if (!showLabel) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'rounded-full',
            config.dotColor,
            status === 'online' && 'animate-pulse',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
          )}
        />
      </div>
    );
  }

  return (
    <Badge variant={config.variant} className={cn(size === 'sm' && 'text-[10px] px-2 py-0')}>
      <div
        className={cn(
          'rounded-full mr-1.5',
          config.dotColor,
          status === 'online' && 'animate-pulse',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      {config.label}
    </Badge>
  );
}
