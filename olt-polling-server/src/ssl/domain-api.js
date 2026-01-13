/**
 * Domain API Routes
 * 
 * API endpoints for managing tenant custom domains and SSL provisioning.
 */

import { 
  provisionSSL, 
  removeDomainConfig, 
  checkCertificateStatus,
  renewCertificate,
  verifyDNS 
} from './ssl-provisioner.js';
import { logger } from '../utils/logger.js';

/**
 * Setup domain management routes
 */
export function setupDomainRoutes(app, supabase) {
  
  // Get server IP from platform_settings (within system_settings)
  const getServerIP = async () => {
    try {
      // Try platform_settings format first
      const { data, error } = await supabase
        .from('system_settings')
        .select('platform_settings')
        .eq('id', 'global')
        .maybeSingle();
      
      if (!error && data?.platform_settings?.customDomainServerIP) {
        return data.platform_settings.customDomainServerIP;
      }

      // Fallback to key-value format
      const { data: data2, error: error2 } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'customDomainServerIP')
        .maybeSingle();
      
      if (!error2 && data2?.value) {
        if (typeof data2.value === 'string') return data2.value;
        if (typeof data2.value === 'object' && data2.value.value) return data2.value.value;
        if (typeof data2.value === 'object' && data2.value.ip) return data2.value.ip;
      }
      
      logger.warn('Server IP not configured in system_settings.platform_settings.customDomainServerIP');
      return null;
    } catch (err) {
      logger.error('Error fetching server IP:', err);
      return null;
    }
  };

  /**
   * Resolve tenant for a given hostname
   * GET /api/domains/resolve?host=example.com
   * 
   * Notes:
   * - Uses server-side credentials, so it works even when frontend RLS blocks public reads.
   * - Returns only minimal tenant + domain info needed for routing.
   */
  app.get('/api/domains/resolve', async (req, res) => {
    const rawHost = String(req.query.host || req.query.hostname || '').toLowerCase().trim();

    // Some proxies may include port in Host header. Strip it.
    const hostname = rawHost.replace(/:\d+$/, '');

    if (!hostname) {
      return res.status(400).json({ success: false, error: 'host is required' });
    }

    try {
      const hostnameWithoutWww = hostname.replace(/^www\./, '');
      const candidates = Array.from(
        new Set([hostname, hostnameWithoutWww, `www.${hostnameWithoutWww}`])
      );

      // 1) Direct match: stored as full hostname in `domain`
      let { data: domainData, error: domainErr } = await supabase
        .from('tenant_custom_domains')
        .select('tenant_id, domain, subdomain, is_verified, ssl_status, ssl_provisioning_status')
        .in('domain', candidates)
        .limit(1)
        .maybeSingle();

      if (domainErr) {
        logger.warn('Domain resolve lookup error (direct match):', domainErr);
      }

      // 2) Optional match: stored as root domain + subdomain
      if (!domainData) {
        const parts = hostnameWithoutWww.split('.').filter(Boolean);
        if (parts.length >= 3) {
          const sub = parts[0];
          const root = parts.slice(1).join('.');
          const { data: subdomainData, error: subdomainErr } = await supabase
            .from('tenant_custom_domains')
            .select('tenant_id, domain, subdomain, is_verified, ssl_status, ssl_provisioning_status')
            .eq('domain', root)
            .eq('subdomain', sub)
            .limit(1)
            .maybeSingle();

          if (subdomainErr) {
            logger.warn('Domain resolve lookup error (subdomain match):', subdomainErr);
          }

          if (subdomainData) domainData = subdomainData;
        }
      }

      if (!domainData?.tenant_id) {
        return res.json({ success: true, found: false });
      }

      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, slug, company_name, logo_url, landing_page_enabled, status')
        .eq('id', domainData.tenant_id)
        .maybeSingle();

      if (tenantErr || !tenantData) {
        return res.json({ success: true, found: false });
      }

      return res.json({
        success: true,
        found: true,
        domain: domainData,
        tenant: tenantData,
      });
    } catch (error) {
      logger.error('Domain resolve error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Verify DNS for a domain
   * POST /api/domains/verify-dns
   */
  app.post('/api/domains/verify-dns', async (req, res) => {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    try {
      const serverIP = await getServerIP();
      if (!serverIP) {
        return res.status(500).json({ 
          success: false, 
          error: 'Server IP not configured. Contact administrator.' 
        });
      }

      const isValid = await verifyDNS(domain, serverIP);
      
      res.json({
        success: true,
        domain,
        serverIP,
        dnsValid: isValid,
        message: isValid 
          ? 'DNS is correctly configured' 
          : `DNS not configured. Add A record pointing to ${serverIP}`,
      });
    } catch (error) {
      logger.error('DNS verification error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Provision SSL for a domain
   * POST /api/domains/provision-ssl
   */
  app.post('/api/domains/provision-ssl', async (req, res) => {
    const { domain, domainId, tenantId } = req.body;
    
    if (!domain || !domainId) {
      return res.status(400).json({ success: false, error: 'Domain and domainId are required' });
    }

    try {
      const serverIP = await getServerIP();
      if (!serverIP) {
        return res.status(500).json({ 
          success: false, 
          error: 'Server IP not configured. Contact administrator.' 
        });
      }

      // Update status to 'issuing'
      await supabase
        .from('tenant_custom_domains')
        .update({ 
          ssl_provisioning_status: 'issuing',
          ssl_error: null,
        })
        .eq('id', domainId);

      // Run SSL provisioning
      const result = await provisionSSL(domain, serverIP);

      if (result.success) {
        // Update domain record with SSL info
        await supabase
          .from('tenant_custom_domains')
          .update({
            is_verified: true,
            ssl_status: 'active',
            ssl_provisioning_status: 'active',
            ssl_issued_at: new Date().toISOString(),
            ssl_expires_at: result.expiresAt,
            nginx_config_path: result.configPath,
            verified_at: new Date().toISOString(),
            ssl_error: null,
          })
          .eq('id', domainId);

        res.json({
          success: true,
          message: `SSL certificate issued successfully for ${domain}`,
          ...result,
        });
      } else {
        // Update with error
        await supabase
          .from('tenant_custom_domains')
          .update({
            ssl_provisioning_status: 'failed',
            ssl_error: result.error,
          })
          .eq('id', domainId);

        res.status(500).json({
          success: false,
          error: result.error,
          steps: result.steps,
        });
      }
    } catch (error) {
      logger.error('SSL provisioning error:', error);
      
      // Update with error
      await supabase
        .from('tenant_custom_domains')
        .update({
          ssl_provisioning_status: 'failed',
          ssl_error: error.message,
        })
        .eq('id', domainId);

      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Check SSL certificate status
   * GET /api/domains/ssl-status/:domain
   */
  app.get('/api/domains/ssl-status/:domain', async (req, res) => {
    const { domain } = req.params;

    try {
      const status = await checkCertificateStatus(domain);
      res.json({ success: true, domain, ...status });
    } catch (error) {
      logger.error('SSL status check error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Renew SSL certificate
   * POST /api/domains/renew-ssl
   */
  app.post('/api/domains/renew-ssl', async (req, res) => {
    const { domain, domainId } = req.body;
    
    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    try {
      const result = await renewCertificate(domain);

      if (result.success && domainId) {
        // Update expiry date
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 90);

        await supabase
          .from('tenant_custom_domains')
          .update({
            ssl_expires_at: newExpiry.toISOString(),
            ssl_status: 'active',
            ssl_provisioning_status: 'active',
          })
          .eq('id', domainId);
      }

      res.json(result);
    } catch (error) {
      logger.error('SSL renewal error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Remove domain configuration
   * DELETE /api/domains/:domainId
   */
  app.delete('/api/domains/:domainId', async (req, res) => {
    const { domainId } = req.params;

    try {
      // Get domain details first
      const { data: domainData, error: fetchError } = await supabase
        .from('tenant_custom_domains')
        .select('domain')
        .eq('id', domainId)
        .single();

      if (fetchError || !domainData) {
        return res.status(404).json({ success: false, error: 'Domain not found' });
      }

      // Remove Nginx config and optionally SSL
      await removeDomainConfig(domainData.domain);

      // Delete from database
      await supabase
        .from('tenant_custom_domains')
        .delete()
        .eq('id', domainId);

      res.json({ success: true, message: 'Domain removed successfully' });
    } catch (error) {
      logger.error('Domain removal error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get all domains for a tenant with SSL status
   * GET /api/domains/tenant/:tenantId
   */
  app.get('/api/domains/tenant/:tenantId', async (req, res) => {
    const { tenantId } = req.params;

    try {
      const { data, error } = await supabase
        .from('tenant_custom_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check live SSL status for each domain
      const domainsWithStatus = await Promise.all(
        (data || []).map(async (domain) => {
          if (domain.ssl_status === 'active') {
            const sslStatus = await checkCertificateStatus(domain.domain);
            return {
              ...domain,
              ssl_live_status: sslStatus,
            };
          }
          return domain;
        })
      );

      res.json({ success: true, domains: domainsWithStatus });
    } catch (error) {
      logger.error('Fetch domains error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Routes without /api prefix for compatibility
  app.get('/domains/resolve', (req, res) => {
    req.url = '/api/domains/resolve';
    app.handle(req, res);
  });

  app.post('/domains/verify-dns', (req, res) => {
    req.url = '/api/domains/verify-dns';
    app.handle(req, res);
  });

  app.post('/domains/provision-ssl', (req, res) => {
    req.url = '/api/domains/provision-ssl';
    app.handle(req, res);
  });

  app.get('/domains/ssl-status/:domain', (req, res) => {
    req.url = `/api/domains/ssl-status/${req.params.domain}`;
    app.handle(req, res);
  });

  app.post('/domains/renew-ssl', (req, res) => {
    req.url = '/api/domains/renew-ssl';
    app.handle(req, res);
  });

  logger.info('✅ Domain management routes initialized');
}
