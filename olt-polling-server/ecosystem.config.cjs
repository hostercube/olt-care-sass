/**
 * PM2 Ecosystem Configuration
 * Usage: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [{
    name: 'olt-polling-server',
    script: 'src/index.js',
    
    // Working directory - UPDATE THIS to your server path
    cwd: '/var/www/olt.yourdomain.com/olt-polling-server',
    
    // Process settings
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Load .env file
    env_file: '.env',
    
    // Logs - UPDATE paths to your server
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
