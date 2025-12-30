#!/bin/bash

# ============================================
# OLTCare Build Script for Ubuntu Deployment
# ============================================

echo "========================================="
echo "  OLTCare Frontend Build Script"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✓ npm version: $(npm -v)"

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found!"
    echo "Creating template .env file..."
    cat > .env << 'EOF'
# Update these values with your Supabase credentials
VITE_POLLING_SERVER_URL="https://olt.yourdomain.com/api"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
EOF
    echo "✓ Template .env file created"
    echo ""
    echo "⚠️  Please edit .env with your actual Supabase credentials before building!"
    echo "   nano .env"
    exit 1
fi

echo "✓ .env file found"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Build the project
echo ""
echo "Building for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "========================================="
echo "  ✓ Build Complete!"
echo "========================================="
echo ""
echo "The 'dist' folder is ready for deployment."
echo ""
echo "Your dist folder is at: $(pwd)/dist"
echo ""
echo "Next steps:"
echo "1. Configure Nginx to serve from dist folder"
echo "2. Set up SSL with Certbot"
echo "3. Start the polling server with PM2"
echo ""
echo "See UBUNTU_DEPLOYMENT.md for full instructions."
echo ""
