#!/bin/bash
set -e

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install NVIDIA Container Toolkit (for GPU passthrough to Ollama)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | apt-key add -
curl -s -L "https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list" |   tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update && apt-get install -y nvidia-container-toolkit
systemctl restart docker

# Create app directory
mkdir -p /home/ubuntu/arthaBuild
chown ubuntu:ubuntu /home/ubuntu/arthaBuild

# Write .env with license key
cat > /home/ubuntu/arthaBuild/.env << EOF
LICENSE_KEY=${license_key}
SECRET_KEY=$(openssl rand -hex 32)
EOF

# Signal: setup complete
echo "ArthaBuild instance setup complete. Deploy via: cd /home/ubuntu/arthaBuild && docker-compose up -d" >> /var/log/arthaBuild-setup.log
