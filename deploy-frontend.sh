#!/bin/bash

# Frontend deployment script for EC2
# This script builds the frontend and deploys it to the EC2 instance

set -e  # Exit on any error

echo "🚀 Starting frontend deployment..."

# Configuration
EC2_HOST="13.220.92.218"
EC2_USER="ubuntu"
SSH_KEY="Download.pem"
REMOTE_DIR="/var/www/oreilly-chatbot"
BUILD_DIR="dist"

# Step 1: Build the frontend
echo "📦 Building frontend for production..."
npm run build:prod

# Step 2: Create remote directory if it doesn't exist
echo "📁 Setting up remote directory..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown -R ubuntu:ubuntu $REMOTE_DIR"

# Step 3: Copy built files to EC2
echo "📤 Uploading files to EC2..."
scp -i "$SSH_KEY" -r "$BUILD_DIR/"* "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

# Step 4: Set up nginx configuration
echo "⚙️  Configuring nginx..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Create nginx configuration
sudo tee /etc/nginx/sites-available/oreilly-chatbot > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;
    
    root /var/www/oreilly-chatbot;
    index index.html;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        add_header Content-Type text/plain;
        return 200 "ok";
    }
}
NGINX_CONFIG

# Enable the site
sudo ln -sf /etc/nginx/sites-available/oreilly-chatbot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Nginx configured and restarted"
EOF

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Your app should be accessible at: http://$EC2_HOST"
echo ""
echo "To verify:"
echo "  - Frontend: http://$EC2_HOST"
echo "  - Backend API: http://$EC2_HOST:8000"
echo ""
