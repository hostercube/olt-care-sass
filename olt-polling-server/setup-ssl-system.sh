#!/bin/bash

# =============================================
# Custom Domain SSL System - Complete Setup Script
# Run as root: sudo bash setup-ssl-system.sh
# =============================================

set -e

echo "============================================="
echo "🔒 Custom Domain SSL System Setup"
echo "============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root: sudo bash setup-ssl-system.sh${NC}"
    exit 1
fi

# =============================================
# Step 1: Install Certbot
# =============================================
echo -e "\n${YELLOW}Step 1: Installing Certbot...${NC}"

if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✓ Certbot already installed: $(certbot --version)${NC}"
else
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed successfully${NC}"
fi

# =============================================
# Step 2: Create ACME Challenge Directory
# =============================================
echo -e "\n${YELLOW}Step 2: Creating ACME challenge directory...${NC}"

mkdir -p /var/www/html/.well-known/acme-challenge
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Test write access
echo "test" > /var/www/html/.well-known/acme-challenge/test.txt
rm /var/www/html/.well-known/acme-challenge/test.txt

echo -e "${GREEN}✓ ACME challenge directory ready${NC}"

# =============================================
# Step 3: Update Main Nginx Config
# =============================================
echo -e "\n${YELLOW}Step 3: Checking Nginx configuration...${NC}"

NGINX_MAIN_CONF="/etc/nginx/sites-available/oltapp.isppoint.com"

if [ -f "$NGINX_MAIN_CONF" ]; then
    # Check if ACME challenge location exists
    if grep -q "acme-challenge" "$NGINX_MAIN_CONF"; then
        echo -e "${GREEN}✓ ACME challenge location already configured${NC}"
    else
        echo -e "${YELLOW}Adding ACME challenge location to Nginx config...${NC}"
        
        # Backup original
        cp "$NGINX_MAIN_CONF" "${NGINX_MAIN_CONF}.backup.$(date +%Y%m%d%H%M%S)"
        
        # Add ACME challenge location after server_name line
        sed -i '/server_name.*oltapp.isppoint.com/a\
    \
    # ACME Challenge for SSL\
    location /.well-known/acme-challenge/ {\
        root /var/www/html;\
        allow all;\
    }' "$NGINX_MAIN_CONF"
        
        echo -e "${GREEN}✓ ACME challenge location added${NC}"
    fi
else
    echo -e "${RED}✗ Main Nginx config not found at $NGINX_MAIN_CONF${NC}"
    echo "Please manually add this location block to your Nginx config:"
    echo ""
    echo "    location /.well-known/acme-challenge/ {"
    echo "        root /var/www/html;"
    echo "        allow all;"
    echo "    }"
fi

# =============================================
# Step 4: Remove catch-all server block (if exists)
# =============================================
echo -e "\n${YELLOW}Step 4: Checking for catch-all server block...${NC}"

if grep -q "server_name _;" "$NGINX_MAIN_CONF" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Found catch-all server block (server_name _;)${NC}"
    echo "This should be removed as each tenant domain will have its own config."
    echo "Please manually remove the catch-all block from your Nginx config."
else
    echo -e "${GREEN}✓ No catch-all server block found${NC}"
fi

# =============================================
# Step 5: Test and Reload Nginx
# =============================================
echo -e "\n${YELLOW}Step 5: Testing Nginx configuration...${NC}"

if nginx -t 2>&1; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration error${NC}"
    echo "Please fix the configuration and run: sudo systemctl reload nginx"
fi

# =============================================
# Step 6: Setup Backend Environment
# =============================================
echo -e "\n${YELLOW}Step 6: Checking backend environment...${NC}"

BACKEND_DIR="/var/www/oltapp.isppoint.com/olt-polling-server"
ENV_FILE="$BACKEND_DIR/.env"

if [ -d "$BACKEND_DIR" ]; then
    if [ -f "$ENV_FILE" ]; then
        # Check for SSL-related variables
        if grep -q "CERTBOT_EMAIL" "$ENV_FILE"; then
            echo -e "${GREEN}✓ SSL environment variables already configured${NC}"
        else
            echo -e "${YELLOW}Adding SSL configuration to .env...${NC}"
            
            cat >> "$ENV_FILE" << 'EOF'

# =============================================
# Custom Domain SSL Configuration
# =============================================
CERTBOT_EMAIL=hostercube@gmail.com
CERTBOT_PATH=/usr/bin/certbot
CERTBOT_WEBROOT=/var/www/html
NGINX_SITES_AVAILABLE=/etc/nginx/sites-available
NGINX_SITES_ENABLED=/etc/nginx/sites-enabled
FRONTEND_ROOT=/var/www/oltapp.isppoint.com/dist
OLT_SERVER_ROOT=/var/www/oltapp.isppoint.com/olt-polling-server
BACKEND_PROXY_HOST=127.0.0.1
BACKEND_PROXY_PORT=3001
EOF
            echo -e "${GREEN}✓ SSL configuration added to .env${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ .env file not found. Please copy from .env.production${NC}"
        echo "Run: cp $BACKEND_DIR/.env.production $ENV_FILE"
    fi
    
    # Install dependencies
    echo -e "\n${YELLOW}Installing Node.js dependencies...${NC}"
    cd "$BACKEND_DIR"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    
    # Restart PM2
    if command -v pm2 &> /dev/null; then
        echo -e "\n${YELLOW}Restarting PM2 process...${NC}"
        pm2 restart olt-polling-server 2>/dev/null || pm2 start src/index.js --name olt-polling-server
        echo -e "${GREEN}✓ PM2 process restarted${NC}"
    fi
else
    echo -e "${RED}✗ Backend directory not found at $BACKEND_DIR${NC}"
fi

# =============================================
# Step 7: Verify Setup
# =============================================
echo -e "\n${YELLOW}Step 7: Verifying setup...${NC}"

# Check Certbot
if certbot --version &> /dev/null; then
    echo -e "${GREEN}✓ Certbot: $(certbot --version 2>&1 | head -1)${NC}"
else
    echo -e "${RED}✗ Certbot not working${NC}"
fi

# Check ACME directory
if [ -d "/var/www/html/.well-known/acme-challenge" ]; then
    echo -e "${GREEN}✓ ACME challenge directory exists${NC}"
else
    echo -e "${RED}✗ ACME challenge directory missing${NC}"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi

# Check PM2
if pm2 list | grep -q "olt-polling-server"; then
    echo -e "${GREEN}✓ olt-polling-server is running in PM2${NC}"
else
    echo -e "${YELLOW}⚠ olt-polling-server not found in PM2${NC}"
fi

# =============================================
# Done
# =============================================
echo -e "\n============================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "============================================="
echo ""
echo "Next steps:"
echo "1. Configure Server IP in Super Admin → Settings → Infrastructure"
echo "2. Tenants can now add custom domains from ISP Dashboard"
echo ""
echo "To test SSL provisioning manually:"
echo "  sudo certbot certonly --webroot -w /var/www/html -d test.example.com --dry-run"
echo ""
echo "To view logs:"
echo "  pm2 logs olt-polling-server --lines 50"
echo ""
