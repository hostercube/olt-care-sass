import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';

interface SlugVerificationResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
}

export function useSlugVerification(slug: string, debounceMs: number = 500): SlugVerificationResult {
  const { tenantId } = useTenantContext();
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const checkSlugAvailability = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3) {
      setIsAvailable(null);
      setMessage(slugToCheck ? 'স্লাগ কমপক্ষে ৩ অক্ষর হতে হবে' : '');
      return;
    }

    setIsChecking(true);
    try {
      // Use the database function for verification
      const { data, error } = await supabase
        .rpc('is_tenant_landing_slug_available', {
          p_slug: slugToCheck,
          p_current_tenant_id: tenantId
        });

      if (error) throw error;

      setIsAvailable(data === true);
      setMessage(data === true ? 'এই স্লাগ উপলব্ধ আছে ✓' : 'এই স্লাগ ইতিমধ্যে ব্যবহৃত হয়েছে');
    } catch (err) {
      console.error('Error checking slug:', err);
      setIsAvailable(null);
      setMessage('যাচাই করতে সমস্যা হয়েছে');
    } finally {
      setIsChecking(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkSlugAvailability(slug);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [slug, debounceMs, checkSlugAvailability]);

  return { isChecking, isAvailable, message };
}
