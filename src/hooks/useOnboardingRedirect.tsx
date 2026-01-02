import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';

const ONBOARDING_SKIPPED_KEY = 'onboarding_skipped';

export function useOnboardingRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const checkOnboardingStatus = useCallback(async () => {
    // Don't check if still loading auth state
    if (authLoading || superAdminLoading || tenantLoading) {
      return;
    }

    // Don't redirect if not logged in
    if (!user) {
      setChecking(false);
      return;
    }

    // Super admins don't need onboarding
    if (isSuperAdmin) {
      setChecking(false);
      return;
    }

    // Don't redirect if already on onboarding page
    if (location.pathname === '/onboarding') {
      setChecking(false);
      return;
    }

    // Don't redirect if user has skipped onboarding in this session
    const skipped = sessionStorage.getItem(ONBOARDING_SKIPPED_KEY);
    if (skipped === 'true') {
      setChecking(false);
      return;
    }

    // Check if tenant has any OLTs
    if (tenantId) {
      try {
        const { count, error } = await supabase
          .from('olts')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        if (error) throw error;

        // If no OLTs, redirect to onboarding
        if (count === 0) {
          setShouldRedirect(true);
        }
      } catch (error) {
        console.error('Error checking OLT count:', error);
      }
    }

    setChecking(false);
  }, [user, isSuperAdmin, tenantId, location.pathname, authLoading, superAdminLoading, tenantLoading]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  useEffect(() => {
    if (shouldRedirect && !checking) {
      navigate('/onboarding');
    }
  }, [shouldRedirect, checking, navigate]);

  const skipOnboarding = useCallback(() => {
    sessionStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setShouldRedirect(false);
  }, []);

  return {
    checking,
    shouldRedirect,
    skipOnboarding,
  };
}
