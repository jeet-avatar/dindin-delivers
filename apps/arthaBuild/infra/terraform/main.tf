terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Security Group -- allow HTTP, HTTPS, SSH
resource "aws_security_group" "arthaBuild" {
  name        = "arthaBuild-sg"
  description = "ArthaBuild application security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict to customer IP range in production
    description = "SSH access"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound (Ollama model pull + NetSuite API)"
  }

  tags = { Name = "arthaBuild-sg" }
}

# EC2 instance -- g4dn.xlarge (NVIDIA T4 GPU)
data "aws_ami" "deep_learning" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["Deep Learning Base OSS Nvidia Driver GPU AMI*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "arthaBuild" {
  ami                    = data.aws_ami.deep_learning.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.arthaBuild.id]
  subnet_id              = var.subnet_id

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_size_gb
    delete_on_termination = false  # Preserve data on instance stop
    encrypted             = true   # AES-256, AWS-managed KMS key (aws/ebs default alias) -- CASE-193
    tags = { Name = "arthaBuild-data" }
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    license_key        = var.license_key
    arthaBuild_version = var.arthaBuild_version
  })

  tags = { Name = "arthaBuild", Product = "ArthaBuild", ManagedBy = "TechCloudPro" }
}

# Elastic IP -- stable public IP for DNS
resource "aws_eip" "arthaBuild" {
  instance = aws_instance.arthaBuild.id
  domain   = "vpc"
  tags     = { Name = "arthaBuild-eip" }
}
