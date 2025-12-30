import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  const iconColors = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
  };

  return (
    <Card variant="stats" className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground font-mono">
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && (
              <span className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </span>
            )}
          </div>
          <div
            className={cn(
              'rounded-lg p-3',
              iconColors[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
