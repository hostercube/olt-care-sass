import { useCustomDomainContext } from './CustomDomainRouter';
import TenantLogin from '@/pages/TenantLogin';
import Auth from '@/pages/Auth';

/**
 * Smart login wrapper - renders tenant login directly without URL change
 */
export default function CustomDomainLoginWrapper() {
  const { isCustomDomain, effectiveSlug, tenant } = useCustomDomainContext();

  // If custom domain, render TenantLogin directly (no redirect!)
  if (isCustomDomain && effectiveSlug && tenant) {
    return <TenantLogin />;
  }

  // Platform domain - show main auth
  return <Auth />;
}
