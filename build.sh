#!/bin/bash

# OLTCare Build Script for cPanel/aaPanel Deployment
# Run this script to build the frontend for deployment

echo "========================================="
echo "  OLTCare Frontend Build Script"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✓ npm version: $(npm -v)"

# Create .env file if not exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << 'EOF'
VITE_POLLING_SERVER_URL="https://olt.isppoint.com/olt-polling-server"
VITE_SUPABASE_PROJECT_ID="srofhdgdraihxgpmpdye"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw"
VITE_SUPABASE_URL="https://srofhdgdraihxgpmpdye.supabase.co"
EOF
    echo "✓ .env file created"
else
    echo "✓ .env file exists"
fi

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
echo "Next steps:"
echo "1. Upload all files from 'dist/' folder to your public_html"
echo "2. Configure your server for SPA routing (see COMPLETE_DEPLOYMENT_GUIDE.md)"
echo "3. Ensure your polling server is running at https://olt.isppoint.com/olt-polling-server"
echo ""
echo "For Apache (.htaccess is already in dist/):"
echo "  Just upload the files"
echo ""
echo "For Nginx:"
echo "  Add: try_files \$uri \$uri/ /index.html;"
echo ""
