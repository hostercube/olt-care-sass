module.exports = {
  apps: [{
    name: 'olt-polling-server',
    script: 'src/index.js',
    cwd: '/www/wwwroot/olt.isppoint.com/olt-polling-server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env',
    error_file: '/www/wwwroot/olt.isppoint.com/olt-polling-server/logs/error.log',
    out_file: '/www/wwwroot/olt.isppoint.com/olt-polling-server/logs/out.log',
    log_file: '/www/wwwroot/olt.isppoint.com/olt-polling-server/logs/combined.log',
    time: true
  }]
};
