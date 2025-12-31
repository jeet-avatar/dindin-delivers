# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take the security of Dollor.ai seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: **security@dollor.ai**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Every 7 days until resolution
- **Resolution**: Typically within 30-90 days depending on severity

### Severity Levels

| Level    | Response Time | Examples |
|----------|---------------|----------|
| Critical | 24 hours      | RCE, SQL injection, auth bypass |
| High     | 72 hours      | XSS, CSRF, sensitive data exposure |
| Medium   | 7 days        | Information disclosure, DoS |
| Low      | 30 days       | Minor issues, best practice violations |

### Safe Harbor

We support responsible disclosure. If you:
- Act in good faith
- Avoid privacy violations, data destruction, or service disruption
- Give us reasonable time to address the issue

We will not pursue legal action against you.

## Security Measures

### Infrastructure
- All data encrypted at rest and in transit (TLS 1.3)
- AWS infrastructure with VPC isolation
- Regular security audits and penetration testing

### Application
- OWASP Top 10 compliance
- Automated security scanning (Semgrep, SonarCloud, Trivy)
- Dependency vulnerability monitoring
- Input validation and output encoding

### Authentication
- JWT tokens with short expiration
- Bcrypt password hashing
- Rate limiting on auth endpoints
- Optional 2FA support

## Security Tools

This project uses automated security scanning:
- **Semgrep**: SAST for code vulnerabilities
- **SonarCloud**: Code quality and security hotspots
- **Trivy**: Container image scanning
- **Safety/pip-audit**: Python dependency scanning
- **Bandit**: Python security linter

## Contact

- Security issues: security@dollor.ai
- General inquiries: support@dollor.ai
