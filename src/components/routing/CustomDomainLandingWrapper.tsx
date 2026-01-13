import { useCustomDomainContext } from './CustomDomainRouter';
import TenantLanding from '@/pages/TenantLanding';
import TenantLogin from '@/pages/TenantLogin';
import Landing from '@/pages/Landing';

/**
 * Smart landing wrapper - renders tenant content directly without URL change
 */
export default function CustomDomainLandingWrapper() {
  const { isCustomDomain, effectiveSlug, tenant } = useCustomDomainContext();

  // If custom domain with valid tenant, render tenant content directly (no redirect!)
  if (isCustomDomain && effectiveSlug && tenant) {
    if (tenant.landing_page_enabled) {
      // Render TenantLanding directly - URL stays as /
      return <TenantLanding slugOverride={effectiveSlug} />;
    } else {
      // Landing not enabled, show login
      return <TenantLogin />;
    }
  }

  // Platform domain - show main landing
  return <Landing />;
}
