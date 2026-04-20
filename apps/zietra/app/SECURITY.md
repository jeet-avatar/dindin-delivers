# Security Policy

This document outlines the security policy for the **BrandMonkz CRM Email Marketing Platform** under the `jeet-avatar` organization.  
BrandMonkz operates two environments — **Sandbox** for internal testing and **Production** for live customer data.

---

## 🧱 Environments and Supported Versions

| Environment | Version | Supported | Description |
| ------------ | -------- | ---------- | ------------ |
| Production (`crm-email-marketing-platform`) | 1.0.x | ✅ | Stable, customer-facing deployment hosted under jeet-avatar domain. |
| Sandbox (`brandmonkz-sandbox`) | 1.0.x | ✅ | Actively maintained for integration testing and QA. |
| Earlier versions (<1.0) | ❌ | Unsupported; upgrade to latest release. |

Only the latest minor release within each major version will receive security patches.  
Older builds may be deprecated as new updates are deployed.

---

## 🔐 Reporting a Vulnerability

If you discover a potential **security vulnerability**, **please do not create a public GitHub issue**.  
Instead, contact us privately through one of the following methods:

- **Email:** [security@brandmonkz.com](mailto:security@brandmonkz.com)  
- **GitHub Security Advisory:** Use the “Report a vulnerability” button under the **Security → Advisories** section of this repository.

When reporting, please include:
1. A description of the vulnerability (affected endpoint, module, or file).  
2. Steps to reproduce the issue.  
3. The impact or potential exploit scenario, if known.  
4. Your contact information for coordinated response.

---

## ⏱ Response Timeline

We take all reports seriously and will follow this triage process:

| Stage | SLA |
|-------|-----|
| Acknowledgment of report | Within **24–48 hours** |
| Initial triage and validation | Within **3 business days** |
| Patch or mitigation plan shared | Within **7–14 business days**, depending on severity |
| Public disclosure (if applicable) | After fix is deployed and confirmed |

You will be kept informed of the resolution progress at each stage.

---

## 🧰 Security Best Practices for Contributors

If you are contributing to this repository:
- Avoid committing API keys, credentials, or secrets to version control.  
- Run static scans (`SonarQube`, `Semgrep`) before submitting a pull request.  
- Use sandbox environment for testing integrations; **never test against production data.**  
- Follow OWASP Top 10 and Snyk recommendations for secure coding.

---

## 📄 Disclosure Policy

We practice **coordinated disclosure**:  
- We will credit responsible researchers once vulnerabilities are verified and resolved.  
- We do not support public full-disclosure until the patch is deployed to production.

---

## 🔄 Updates

This security policy is reviewed quarterly as part of our DevSecOps pipeline (SonarQube + GitHub Advanced Security + Trivy container scans).  
Changes will be tracked and versioned here in this repository.

---

_Last updated: October 2025_
