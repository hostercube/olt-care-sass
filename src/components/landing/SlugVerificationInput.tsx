import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSlugVerification } from '@/hooks/useSlugVerification';
import { cn } from '@/lib/utils';

interface SlugVerificationInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SlugVerificationInput({
  value,
  onChange,
  disabled = false,
  className
}: SlugVerificationInputProps) {
  const { isChecking, isAvailable, message } = useSlugVerification(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    onChange(sanitized);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>URL Slug</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          placeholder="your-company-name"
          disabled={disabled}
          className={cn(
            "pr-10",
            isAvailable === true && "border-green-500 focus-visible:ring-green-500",
            isAvailable === false && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isChecking && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isChecking && isAvailable === true && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {!isChecking && isAvailable === false && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
      
      {message && (
        <div className="flex items-center gap-2">
          {isAvailable === true && (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              {message}
            </Badge>
          )}
          {isAvailable === false && (
            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
              <XCircle className="h-3 w-3 mr-1" />
              {message}
            </Badge>
          )}
          {isAvailable === null && message && (
            <Badge variant="secondary">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {message}
            </Badge>
          )}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        শুধুমাত্র ছোট হাতের অক্ষর (a-z), সংখ্যা (0-9) এবং হাইফেন (-) ব্যবহার করুন
      </p>
    </div>
  );
}
