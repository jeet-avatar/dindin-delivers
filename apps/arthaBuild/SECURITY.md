# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v1.0.x  | Yes       |
| < v1.0  | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in ArthaBuild, please report it responsibly:

**Email:** security@techcloudpro.com
**Response time:** We will acknowledge within 48 hours and provide a timeline within 5 business days.

Please do NOT open a public GitHub issue for security vulnerabilities. Public disclosure before a patch is available puts customers at risk.

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigation (optional)

We will keep you informed of our progress and credit responsible reporters in our release notes (with your permission).

## Security Documentation

- Security controls: [docs/security/SECURITY_CONTROLS.md](docs/security/SECURITY_CONTROLS.md)
- Incident response: [docs/security/INCIDENT_RESPONSE.md](docs/security/INCIDENT_RESPONSE.md)
- Data classification: [docs/security/DATA_CLASSIFICATION.md](docs/security/DATA_CLASSIFICATION.md)
- Deployment security: [docs/security/DEPLOYMENT_SECURITY.md](docs/security/DEPLOYMENT_SECURITY.md)
- Vulnerability scan report: [docs/security/ZAP_SCAN_REPORT.md](docs/security/ZAP_SCAN_REPORT.md)

## Scope

This policy applies to the ArthaBuild application code and infrastructure configuration in this repository.

**In scope:**
- FastAPI backend (`src/backend/`)
- React frontend (`src/frontend/`)
- Nginx configuration (`nginx/`)
- Docker Compose and Terraform IaC (`docker-compose.yml`, `infra/`)

**Out of scope:**
- Third-party libraries and their upstream vulnerabilities (tracked via pip-audit)
- Customer-managed infrastructure (AWS VPC, EC2, TLS certificates, NetSuite accounts)
- The ArthaBuild license server (separate TechCloudPro service)

## Key Security Properties

ArthaBuild is designed as a BYOC (Bring Your Own Cloud) product with strong data isolation:

- **Zero external data transfer:** NetSuite credentials, SuiteScript code, and AI prompts never leave the customer's AWS VPC
- **Local AI inference:** All LLM inference runs on Ollama locally — no data sent to OpenAI or other cloud AI providers
- **In-memory credentials:** NetSuite TBA credentials are held only in Python process RAM — never written to disk or database
- **Audit trail:** All authentication and admin actions are logged in an append-only audit log (SOC2 CC7.2)
- **Encrypted at rest:** EBS volume encrypted with AES-256 (AWS-managed KMS key)
