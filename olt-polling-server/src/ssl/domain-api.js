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
  
  // Get server IP from system settings
  const getServerIP = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'customDomainServerIP')
        .maybeSingle();
      
      if (error || !data?.value) {
        logger.warn('Server IP not configured in system_settings');
        return null;
      }
      
      // Handle both formats
      if (typeof data.value === 'string') return data.value;
      if (typeof data.value === 'object' && data.value.value) return data.value.value;
      if (typeof data.value === 'object' && data.value.ip) return data.value.ip;
      
      return null;
    } catch (err) {
      logger.error('Error fetching server IP:', err);
      return null;
    }
  };

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
