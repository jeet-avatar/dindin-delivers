#!/bin/bash
# ArthaBuild one-command deployment script
# Usage: ./deploy.sh [--terraform] [--skip-build]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== ArthaBuild Deployment ==="

# Parse flags
RUN_TERRAFORM=false
SKIP_BUILD=false
for arg in "$@"; do
  case $arg in
    --terraform) RUN_TERRAFORM=true ;;
    --skip-build) SKIP_BUILD=true ;;
  esac
done

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Optional: Terraform provisioning
if [ "$RUN_TERRAFORM" = true ]; then
  echo ">>> Provisioning AWS infrastructure..."
  cd infra/terraform
  terraform init
  terraform apply -auto-approve
  cd "$SCRIPT_DIR"
fi

# Build frontend
if [ "$SKIP_BUILD" = false ]; then
  echo ">>> Building frontend..."
  cd src/frontend
  npm install
  npm run build
  cd "$SCRIPT_DIR"
fi

# Start services
echo ">>> Starting Docker Compose services..."
docker-compose pull ollama nginx 2>/dev/null || true
docker-compose up -d --build

echo ">>> Waiting for services to be healthy..."
timeout 300 bash -c 'until docker-compose ps | grep -q healthy; do sleep 5; done'

# Health check
echo ">>> Running health check..."
sleep 5
curl -f http://localhost/health && echo "" && echo "=== ArthaBuild is running! ==="
echo "Access at: http://localhost (or your configured domain)"
