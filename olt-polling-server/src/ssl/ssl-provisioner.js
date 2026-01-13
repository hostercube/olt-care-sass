/**
 * SSL Provisioner Module
 * 
 * Handles automatic SSL certificate issuance using Certbot
 * and dynamic Nginx configuration generation for tenant custom domains.
 * 
 * This is a production-grade SaaS custom domain solution.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// Configuration paths - adjust based on your server setup
const NGINX_SITES_AVAILABLE = process.env.NGINX_SITES_AVAILABLE || '/etc/nginx/sites-available';
const NGINX_SITES_ENABLED = process.env.NGINX_SITES_ENABLED || '/etc/nginx/sites-enabled';
const CERTBOT_PATH = process.env.CERTBOT_PATH || '/usr/bin/certbot';
const WEBROOT_PATH = process.env.CERTBOT_WEBROOT || '/var/www/html';
const CERTBOT_EMAIL = process.env.CERTBOT_EMAIL || 'admin@isppoint.com';

// Backend proxy configuration
const BACKEND_HOST = process.env.BACKEND_PROXY_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PROXY_PORT || '3000';

/**
 * Check if a domain's DNS A record points to the server IP
 */
export async function verifyDNS(domain, expectedIP) {
  try {
    const { stdout } = await execAsync(`dig +short ${domain} A`);
    const resolvedIPs = stdout.trim().split('\n').filter(ip => ip);
    
    logger.info(`DNS check for ${domain}: resolved to ${resolvedIPs.join(', ')}, expected ${expectedIP}`);
    
    return resolvedIPs.includes(expectedIP);
  } catch (error) {
    logger.error(`DNS verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Generate Nginx configuration for a domain
 */
export function generateNginxConfig(domain, options = {}) {
  const {
    proxyHost = BACKEND_HOST,
    proxyPort = BACKEND_PORT,
    sslEnabled = false,
    certPath = null,
    keyPath = null,
  } = options;

  // HTTP-only config (before SSL is issued)
  let config = `# Auto-generated config for ${domain}
# Generated at: ${new Date().toISOString()}

server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root ${WEBROOT_PATH};
        allow all;
    }
`;

  if (sslEnabled && certPath && keyPath) {
    // Add redirect to HTTPS
    config += `
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};

    # SSL Configuration
    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Backend proxy
    location / {
        proxy_pass http://${proxyHost}:${proxyPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Static files (if any)
    location /uploads/ {
        alias /var/www/oltapp.isppoint.com/olt-polling-server/uploads/;
        try_files $uri =404;
    }
}
`;
  } else {
    // HTTP only - proxy directly (before SSL)
    config += `
    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Backend proxy
    location / {
        proxy_pass http://${proxyHost}:${proxyPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
`;
  }

  return config;
}

/**
 * Write Nginx config file and create symlink
 */
export async function writeNginxConfig(domain, configContent) {
  const configFilename = `tenant-${domain.replace(/\./g, '-')}.conf`;
  const availablePath = path.join(NGINX_SITES_AVAILABLE, configFilename);
  const enabledPath = path.join(NGINX_SITES_ENABLED, configFilename);

  try {
    // Write config to sites-available
    fs.writeFileSync(availablePath, configContent, 'utf8');
    logger.info(`Nginx config written to ${availablePath}`);

    // Create symlink in sites-enabled
    if (!fs.existsSync(enabledPath)) {
      fs.symlinkSync(availablePath, enabledPath);
      logger.info(`Symlink created: ${enabledPath}`);
    }

    return { success: true, configPath: availablePath };
  } catch (error) {
    logger.error(`Failed to write Nginx config for ${domain}:`, error);
    throw error;
  }
}

/**
 * Test Nginx configuration
 */
export async function testNginxConfig() {
  try {
    const { stdout, stderr } = await execAsync('nginx -t');
    logger.info('Nginx config test passed');
    return { success: true, output: stdout || stderr };
  } catch (error) {
    logger.error('Nginx config test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reload Nginx
 */
export async function reloadNginx() {
  try {
    await execAsync('systemctl reload nginx');
    logger.info('Nginx reloaded successfully');
    return { success: true };
  } catch (error) {
    logger.error('Nginx reload failed:', error);
    throw error;
  }
}

/**
 * Issue SSL certificate using Certbot
 */
export async function issueCertificate(domain) {
  const domains = [domain];
  
  // Add www subdomain if it's a root domain
  const parts = domain.split('.');
  if (parts.length === 2) {
    domains.push(`www.${domain}`);
  }

  const args = [
    'certonly',
    '--webroot',
    '-w', WEBROOT_PATH,
    '--email', CERTBOT_EMAIL,
    '--agree-tos',
    '--non-interactive',
    '--expand',
    ...domains.flatMap(d => ['-d', d]),
  ];

  logger.info(`Issuing SSL certificate for ${domains.join(', ')}`);
  logger.info(`Certbot command: ${CERTBOT_PATH} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const certbot = spawn(CERTBOT_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    certbot.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    certbot.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    certbot.on('close', (code) => {
      if (code === 0) {
        logger.info(`SSL certificate issued successfully for ${domain}`);
        
        // Certificate paths
        const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
        const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;
        
        // Calculate expiry (Let's Encrypt certs are valid for 90 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);
        
        resolve({
          success: true,
          certPath,
          keyPath,
          expiresAt: expiresAt.toISOString(),
          output: stdout,
        });
      } else {
        logger.error(`Certbot failed with code ${code}: ${stderr}`);
        reject(new Error(stderr || `Certbot exited with code ${code}`));
      }
    });

    certbot.on('error', (error) => {
      logger.error('Certbot spawn error:', error);
      reject(error);
    });
  });
}

/**
 * Remove Nginx config and SSL certificate for a domain
 */
export async function removeDomainConfig(domain) {
  const configFilename = `tenant-${domain.replace(/\./g, '-')}.conf`;
  const availablePath = path.join(NGINX_SITES_AVAILABLE, configFilename);
  const enabledPath = path.join(NGINX_SITES_ENABLED, configFilename);

  try {
    // Remove symlink
    if (fs.existsSync(enabledPath)) {
      fs.unlinkSync(enabledPath);
      logger.info(`Removed symlink: ${enabledPath}`);
    }

    // Remove config file
    if (fs.existsSync(availablePath)) {
      fs.unlinkSync(availablePath);
      logger.info(`Removed config: ${availablePath}`);
    }

    // Optionally revoke certificate (not always needed)
    // await execAsync(`certbot revoke --cert-path /etc/letsencrypt/live/${domain}/cert.pem --non-interactive`);

    await reloadNginx();
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to remove domain config for ${domain}:`, error);
    throw error;
  }
}

/**
 * Full SSL provisioning workflow
 * 1. Verify DNS
 * 2. Create HTTP-only Nginx config
 * 3. Reload Nginx
 * 4. Issue SSL certificate
 * 5. Update Nginx config with SSL
 * 6. Reload Nginx again
 */
export async function provisionSSL(domain, serverIP) {
  const steps = [];
  
  try {
    // Step 1: Verify DNS
    steps.push({ step: 'dns_verify', status: 'running' });
    const dnsValid = await verifyDNS(domain, serverIP);
    if (!dnsValid) {
      throw new Error(`DNS not configured. ${domain} does not resolve to ${serverIP}`);
    }
    steps[steps.length - 1].status = 'completed';

    // Step 2: Create HTTP-only Nginx config
    steps.push({ step: 'nginx_http', status: 'running' });
    const httpConfig = generateNginxConfig(domain, { sslEnabled: false });
    const { configPath } = await writeNginxConfig(domain, httpConfig);
    steps[steps.length - 1].status = 'completed';

    // Step 3: Test and reload Nginx
    steps.push({ step: 'nginx_reload_http', status: 'running' });
    const testResult = await testNginxConfig();
    if (!testResult.success) {
      throw new Error(`Nginx config test failed: ${testResult.error}`);
    }
    await reloadNginx();
    steps[steps.length - 1].status = 'completed';

    // Step 4: Issue SSL certificate
    steps.push({ step: 'ssl_issue', status: 'running' });
    const certResult = await issueCertificate(domain);
    steps[steps.length - 1].status = 'completed';

    // Step 5: Update Nginx config with SSL
    steps.push({ step: 'nginx_ssl', status: 'running' });
    const sslConfig = generateNginxConfig(domain, {
      sslEnabled: true,
      certPath: certResult.certPath,
      keyPath: certResult.keyPath,
    });
    await writeNginxConfig(domain, sslConfig);
    steps[steps.length - 1].status = 'completed';

    // Step 6: Final Nginx reload
    steps.push({ step: 'nginx_reload_ssl', status: 'running' });
    const finalTest = await testNginxConfig();
    if (!finalTest.success) {
      throw new Error(`Final Nginx config test failed: ${finalTest.error}`);
    }
    await reloadNginx();
    steps[steps.length - 1].status = 'completed';

    return {
      success: true,
      domain,
      certPath: certResult.certPath,
      keyPath: certResult.keyPath,
      expiresAt: certResult.expiresAt,
      configPath,
      steps,
    };
  } catch (error) {
    logger.error(`SSL provisioning failed for ${domain}:`, error);
    
    // Mark current step as failed
    if (steps.length > 0 && steps[steps.length - 1].status === 'running') {
      steps[steps.length - 1].status = 'failed';
      steps[steps.length - 1].error = error.message;
    }
    
    return {
      success: false,
      domain,
      error: error.message,
      steps,
    };
  }
}

/**
 * Check SSL certificate status
 */
export async function checkCertificateStatus(domain) {
  const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  
  try {
    if (!fs.existsSync(certPath)) {
      return { exists: false, valid: false };
    }

    const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
    const match = stdout.match(/notAfter=(.+)/);
    
    if (match) {
      const expiryDate = new Date(match[1]);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        exists: true,
        valid: daysUntilExpiry > 0,
        expiresAt: expiryDate.toISOString(),
        daysUntilExpiry,
        needsRenewal: daysUntilExpiry < 30,
      };
    }
    
    return { exists: true, valid: false };
  } catch (error) {
    logger.error(`Failed to check certificate status for ${domain}:`, error);
    return { exists: false, valid: false, error: error.message };
  }
}

/**
 * Renew SSL certificate
 */
export async function renewCertificate(domain) {
  try {
    const { stdout, stderr } = await execAsync(
      `${CERTBOT_PATH} renew --cert-name ${domain} --non-interactive`
    );
    
    await reloadNginx();
    
    return {
      success: true,
      output: stdout || stderr,
    };
  } catch (error) {
    logger.error(`Certificate renewal failed for ${domain}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
