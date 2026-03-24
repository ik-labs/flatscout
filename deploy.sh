#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FlatScout Deploy Script
# =============================================================================
#
# FIRST-TIME DROPLET SETUP (run manually once):
#
#   1. Provision DigitalOcean Droplet — Ubuntu 22.04, 2GB+ RAM
#
#   2. Install Docker:
#      curl -fsSL https://get.docker.com | sh
#      sudo usermod -aG docker $USER
#      newgrp docker
#
#   3. Clone repo:
#      git clone https://github.com/YOUR_USER/FlatScout.git
#      cd FlatScout
#
#   4. Create .env.production from template:
#      cp .env.production.example .env.production
#      nano .env.production  # fill in real API keys
#
#   5. Point DNS: flatscout.inkryptislabs.com → Droplet IP (A record)
#
#   6. First deploy:
#      ./deploy.sh
#
# SUBSEQUENT DEPLOYS: just run ./deploy.sh from the repo root.
# =============================================================================

echo "🚀 Deploying FlatScout..."

# Pull latest code
echo "📦 Pulling latest code..."
git pull origin main

# Check .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ .env.production not found. Copy from .env.production.example and fill in values."
  exit 1
fi

# Build and restart containers
echo "🔨 Building and starting containers..."
docker compose -f docker-compose.prod.yml up --build -d

# Wait for health check
echo "⏳ Waiting for services..."
sleep 5

# Check app is running
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ FlatScout is live!"
  echo "   → https://flatscout.inkryptislabs.com"
else
  echo "⚠️  App may still be starting. Check logs:"
  echo "   docker compose -f docker-compose.prod.yml logs -f app"
fi

echo ""
echo "📋 Useful commands:"
echo "   Logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:    docker compose -f docker-compose.prod.yml down"
echo "   Restart: docker compose -f docker-compose.prod.yml restart app"
