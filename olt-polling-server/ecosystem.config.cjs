/**
 * PM2 Ecosystem Configuration
 * 
 * IMPORTANT: Update 'cwd' path before running!
 * 
 * Usage:
 *   cd /var/www/oltapp.isppoint.com/olt-polling-server
 *   pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [{
    name: 'olt-polling-server',
    script: 'src/index.js',
    
    // Working directory - MUST match your actual server path
    // For oltapp.isppoint.com use:
    cwd: '/var/www/oltapp.isppoint.com/olt-polling-server',
    
    // Process settings
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Logs directory (will be created in cwd)
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Restart settings
    exp_backoff_restart_delay: 100,
    restart_delay: 1000,
    kill_timeout: 5000
  }]
};
