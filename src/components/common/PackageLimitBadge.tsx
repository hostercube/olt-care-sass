import { usePackageLimits } from '@/hooks/usePackageLimits';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Infinity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PackageLimitBadgeProps {
  resource: 'olts' | 'onus' | 'mikrotiks' | 'customers' | 'areas' | 'resellers' | 'users';
  showProgress?: boolean;
  compact?: boolean;
}

const resourceLabels: Record<string, string> = {
  olts: 'OLTs',
  onus: 'ONUs',
  mikrotiks: 'MikroTiks',
  customers: 'Customers',
  areas: 'Areas',
  resellers: 'Resellers',
  users: 'Users',
};

export function PackageLimitBadge({ resource, showProgress = false, compact = false }: PackageLimitBadgeProps) {
  const { limits, usage, loading } = usePackageLimits();

  if (loading || !limits || !usage) {
    return null;
  }

  const limitKey = `max_${resource}` as keyof typeof limits;
  const maxLimit = limits[limitKey];
  const currentCount = usage[resource];
  const isUnlimited = maxLimit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, (currentCount / (maxLimit as number)) * 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && currentCount >= (maxLimit as number);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isAtLimit ? 'destructive' : isNearLimit ? 'outline' : 'secondary'}
              className="gap-1 cursor-help"
            >
              {isUnlimited ? (
                <>
                  <Infinity className="h-3 w-3" />
                  {currentCount}
                </>
              ) : (
                <>
                  {isAtLimit && <AlertTriangle className="h-3 w-3" />}
                  {currentCount}/{maxLimit}
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {resourceLabels[resource]}: {currentCount} used
              {isUnlimited ? ' (Unlimited)' : ` of ${maxLimit}`}
            </p>
            {isAtLimit && <p className="text-destructive">Limit reached - upgrade required</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{resourceLabels[resource]}</span>
        <span className="flex items-center gap-1">
          {isUnlimited ? (
            <>
              <Infinity className="h-4 w-4 text-muted-foreground" />
              <span>{currentCount} used</span>
            </>
          ) : (
            <>
              {isAtLimit ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className={isAtLimit ? 'text-destructive font-medium' : ''}>
                {currentCount} / {maxLimit}
              </span>
            </>
          )}
        </span>
      </div>
      {showProgress && !isUnlimited && (
        <Progress 
          value={percentage} 
          className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
        />
      )}
    </div>
  );
}

export function PackageLimitsCard() {
  const { limits, usage, loading } = usePackageLimits();

  if (loading || !limits || !usage) {
    return null;
  }

  const resources: Array<'olts' | 'onus' | 'mikrotiks' | 'customers' | 'areas' | 'resellers'> = [
    'olts', 'onus', 'mikrotiks', 'customers', 'areas', 'resellers'
  ];

  return (
    <div className="p-4 rounded-lg border bg-card space-y-4">
      <h4 className="font-medium">Package Usage</h4>
      <div className="space-y-3">
        {resources.map((resource) => (
          <PackageLimitBadge key={resource} resource={resource} showProgress />
        ))}
      </div>
    </div>
  );
}
