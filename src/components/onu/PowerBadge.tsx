import { cn } from '@/lib/utils';
import { Signal, SignalLow, SignalZero, SignalMedium } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PowerBadgeProps {
  power: number | null;
  type?: 'rx' | 'tx';
  showIcon?: boolean;
  className?: string;
}

interface PowerLevel {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: typeof Signal;
}

function getPowerLevel(power: number | null, type: 'rx' | 'tx'): PowerLevel {
  if (power === null || power === undefined) {
    return {
      label: 'N/A',
      description: 'No power reading available',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      icon: SignalZero,
    };
  }

  // RX Power thresholds (typical GPON values)
  // Excellent: > -20 dBm
  // Good: -20 to -24 dBm
  // Fair: -24 to -27 dBm
  // Poor: < -27 dBm

  if (type === 'rx') {
    if (power >= -20) {
      return {
        label: 'Excellent',
        description: `Signal strength is excellent (${power} dBm). No action needed.`,
        color: 'text-success',
        bgColor: 'bg-success/20',
        icon: Signal,
      };
    }
    if (power >= -24) {
      return {
        label: 'Good',
        description: `Signal strength is good (${power} dBm). Within normal range.`,
        color: 'text-success',
        bgColor: 'bg-success/20',
        icon: Signal,
      };
    }
    if (power >= -27) {
      return {
        label: 'Fair',
        description: `Signal is fair (${power} dBm). Consider checking fiber connections.`,
        color: 'text-warning',
        bgColor: 'bg-warning/20',
        icon: SignalMedium,
      };
    }
    return {
      label: 'Poor',
      description: `Signal is poor (${power} dBm). Check fiber, splitter, or OLT power.`,
      color: 'text-destructive',
      bgColor: 'bg-destructive/20',
      icon: SignalLow,
    };
  }

  // TX Power thresholds (OLT side)
  // Normal TX: 1 to 5 dBm typically
  if (power >= 0) {
    return {
      label: 'Normal',
      description: `TX power is normal (${power} dBm).`,
      color: 'text-success',
      bgColor: 'bg-success/20',
      icon: Signal,
    };
  }
  if (power >= -3) {
    return {
      label: 'Fair',
      description: `TX power is slightly low (${power} dBm).`,
      color: 'text-warning',
      bgColor: 'bg-warning/20',
      icon: SignalMedium,
    };
  }
  return {
    label: 'Low',
    description: `TX power is low (${power} dBm). Check ONU transmitter.`,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    icon: SignalLow,
  };
}

export function PowerBadge({ power, type = 'rx', showIcon = true, className }: PowerBadgeProps) {
  const level = getPowerLevel(power, type);
  const Icon = level.icon;

  const content = (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-sm",
      level.bgColor,
      level.color,
      className
    )}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span>{power !== null ? `${power} dBm` : 'N/A'}</span>
    </div>
  );

  if (power === null) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <span className={level.color}>{level.label}</span>
            <span className="text-muted-foreground">({type.toUpperCase()} Power)</span>
          </div>
          <p className="text-sm text-muted-foreground">{level.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
