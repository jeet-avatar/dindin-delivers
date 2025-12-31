# DOLLOR.AI - AI EMPLOYEE BOT SPECIFICATIONS
## For VibingTicket.com TechCloudPro Platform

> **Document Version**: 1.0
> **Last Updated**: December 16, 2025
> **Platform**: Dollor.ai (Matchmaking Service - Phase 1)

---

## OVERVIEW

This document specifies all AI Employee bots required to operate Dollor.ai autonomously. These bots are deployed via TechCloudPro's VibingTicket.com platform.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DOLLOR.AI AI EMPLOYEE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                         ┌─────────────────────┐                                 │
│                         │   VIBINGTICKET.COM  │                                 │
│                         │    (TechCloudPro)   │                                 │
│                         └──────────┬──────────┘                                 │
│                                    │                                             │
│         ┌──────────────────────────┼──────────────────────────┐                 │
│         │                          │                          │                 │
│         ▼                          ▼                          ▼                 │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐             │
│  │  OPERATIONS │          │   FINANCE   │          │    TECH     │             │
│  │    BOTS     │          │    BOTS     │          │    BOTS     │             │
│  └─────────────┘          └─────────────┘          └─────────────┘             │
│         │                          │                          │                 │
│    ┌────┴────┐              ┌──────┴──────┐            ┌──────┴──────┐         │
│    │         │              │             │            │             │         │
│    ▼         ▼              ▼             ▼            ▼             ▼         │
│ Customer  Driver       Accounting   Compliance     DevOps      Security       │
│ Support   Support      Bot          Bot            Bot         Bot            │
│ Bot       Bot                                                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## BOT SPECIFICATIONS

### 1. CUSTOMER SUPPORT BOT

**Bot ID**: `dollor-customer-support`
**Role**: Handle customer inquiries, complaints, and support tickets
**Priority**: HIGH

#### Capabilities
| Capability | Description | API Endpoints Used |
|------------|-------------|-------------------|
| Order Status | Check order status and provide updates | `GET /api/orders/{id}` |
| Order Issues | Handle missing items, wrong orders | `POST /api/orders/{id}/issue` |
| Refund Requests | Process refund requests within policy | `POST /api/orders/{id}/refund` |
| Account Help | Password reset, profile updates | `POST /api/auth/reset-password` |
| Restaurant Info | Provide restaurant details, hours | `GET /api/restaurants/{id}` |
| Ride Issues | Handle ride complaints | `GET /api/rides/{id}` |

#### Decision Matrix
```
┌─────────────────────────────────────────────────────────────────┐
│              CUSTOMER SUPPORT DECISION TREE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Issue Type?                                                     │
│  ├── Order Not Delivered                                         │
│  │   ├── < 30 min late → Apologize, provide tracking            │
│  │   ├── > 30 min late → Offer $5 credit                        │
│  │   └── > 60 min late → Full refund + $5 credit                │
│  │                                                               │
│  ├── Wrong Items                                                 │
│  │   ├── Missing item → Refund item cost                        │
│  │   ├── Wrong item → Refund + $3 credit                        │
│  │   └── Entire order wrong → Full refund + $10 credit          │
│  │                                                               │
│  ├── Food Quality                                                │
│  │   ├── Cold food → $5 credit (restaurant issue)               │
│  │   ├── Damaged food → Partial refund                          │
│  │   └── Safety concern → Full refund + escalate                │
│  │                                                               │
│  ├── Ride Issues                                                 │
│  │   ├── Driver no-show → Full refund                           │
│  │   ├── Route issue → Fare adjustment                          │
│  │   └── Safety concern → Full refund + escalate + ban review   │
│  │                                                               │
│  └── Account Issues                                              │
│      ├── Login problems → Reset flow                            │
│      ├── Payment issues → Verify with Stripe                    │
│      └── Privacy concerns → Escalate to compliance              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Escalation Triggers
- Safety concerns → Immediately escalate to human
- Legal threats → Escalate to compliance bot
- Fraud suspected → Escalate to security bot
- Refund > $50 → Requires approval

#### SLA Requirements
| Metric | Target |
|--------|--------|
| First Response | < 2 minutes |
| Resolution Time | < 15 minutes (simple), < 2 hours (complex) |
| Customer Satisfaction | > 4.5/5.0 |

---

### 2. DRIVER SUPPORT BOT

**Bot ID**: `dollor-driver-support`
**Role**: Handle driver inquiries, document verification, earnings issues
**Priority**: HIGH

#### Capabilities
| Capability | Description | API Endpoints Used |
|------------|-------------|-------------------|
| Document Verification | Review uploaded documents | `POST /api/drivers/{id}/documents/verify` |
| Earnings Inquiries | Explain earnings, payouts | `GET /api/drivers/{id}/earnings` |
| Account Issues | Help with account problems | `GET /api/drivers/{id}/profile` |
| Order Disputes | Handle delivery disputes | `GET /api/orders/{id}/dispute` |
| Onboarding Help | Guide new driver setup | `POST /api/drivers/onboard` |
| Deactivation Appeals | Review deactivation cases | `POST /api/drivers/{id}/appeal` |

#### Document Verification Rules
```
┌─────────────────────────────────────────────────────────────────┐
│              DOCUMENT VERIFICATION CHECKLIST                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Driver's License:                                               │
│  ☐ Photo clearly visible                                        │
│  ☐ Name matches registration                                    │
│  ☐ Not expired (valid for > 30 days)                           │
│  ☐ State/country supported                                      │
│  ☐ Age 18+ (21+ for alcohol delivery)                          │
│                                                                  │
│  Vehicle Registration:                                           │
│  ☐ Vehicle matches driver's registered vehicle                  │
│  ☐ Registration current                                         │
│  ☐ Vehicle year within 15 years                                 │
│                                                                  │
│  Insurance (Rideshare only):                                     │
│  ☐ Liability coverage minimum $50,000                           │
│  ☐ Policy active                                                │
│  ☐ Driver named on policy                                       │
│                                                                  │
│  Background Check:                                               │
│  ☐ No violent felonies                                          │
│  ☐ No DUI in last 7 years                                       │
│  ☐ No sexual offenses                                           │
│  ☐ Valid to drive commercially                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Payout Schedule
| Day | Action |
|-----|--------|
| Monday | Process previous week earnings |
| Tuesday | Initiate Stripe transfers |
| Wednesday | Funds available in driver account |

---

### 3. RESTAURANT SUPPORT BOT

**Bot ID**: `dollor-restaurant-support`
**Role**: Handle restaurant partner inquiries, menu management, payout issues
**Priority**: MEDIUM

#### Capabilities
| Capability | Description | API Endpoints Used |
|------------|-------------|-------------------|
| Menu Updates | Help with menu changes | `PUT /api/restaurants/{id}/menu` |
| Order Issues | Handle order disputes | `GET /api/orders/{id}` |
| Payout Inquiries | Explain payouts, fees | `GET /api/restaurants/{id}/payouts` |
| Account Setup | Onboard new restaurants | `POST /api/restaurants/register` |
| Hours Management | Update operating hours | `PUT /api/restaurants/{id}/hours` |
| Rating Issues | Address rating concerns | `GET /api/restaurants/{id}/ratings` |

#### Restaurant Fee Structure (Matchmaking Model)
```
┌─────────────────────────────────────────────────────────────────┐
│              RESTAURANT FEE EXPLANATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Per Order:                                                      │
│  • Platform Listing Fee: $1.00 (flat, regardless of order size) │
│  • Payment Processing: 2.9% + $0.30 (Stripe fee, passed through)│
│  • No percentage commission                                      │
│  • No hidden fees                                                │
│                                                                  │
│  Example Order ($50):                                            │
│  ├── Customer pays: $50 + $1 matchmaking fee + $5 delivery      │
│  ├── Restaurant receives: $50 - $1 platform fee - Stripe fees   │
│  ├── Driver receives: $5 delivery + 100% tip                    │
│  └── Platform revenue: $2 ($1 customer + $1 restaurant)         │
│                                                                  │
│  Comparison to competitors:                                      │
│  • DoorDash: 15-30% commission                                  │
│  • Uber Eats: 15-30% commission                                 │
│  • Dollor.ai: $1 flat fee (saves restaurants 90%+)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. ACCOUNTING BOT

**Bot ID**: `dollor-accounting`
**Role**: Manage financial operations, reconciliation, reporting
**Priority**: CRITICAL

#### Capabilities
| Capability | Description | API Endpoints Used |
|------------|-------------|-------------------|
| Daily Reconciliation | Match transactions with Stripe | `GET /api/accounting/reconcile` |
| Revenue Recognition | Record platform fees | `POST /api/accounting/revenue` |
| Payout Processing | Calculate driver/restaurant payouts | `POST /api/accounting/payouts` |
| Refund Processing | Handle refund accounting | `POST /api/accounting/refunds` |
| Tax Reporting | Generate 1099 data | `GET /api/accounting/tax-reports` |
| Financial Reports | Generate P&L, balance sheet | `GET /api/accounting/reports` |

#### Daily Tasks
```
┌─────────────────────────────────────────────────────────────────┐
│              ACCOUNTING BOT DAILY SCHEDULE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  00:00 UTC - End of Day Processing                              │
│  ├── Close daily transactions                                   │
│  ├── Calculate daily revenue                                    │
│  └── Generate daily summary                                     │
│                                                                  │
│  01:00 UTC - Reconciliation                                     │
│  ├── Pull Stripe transactions                                   │
│  ├── Match with internal records                                │
│  ├── Flag discrepancies > $1                                    │
│  └── Generate reconciliation report                             │
│                                                                  │
│  02:00 UTC - Payout Calculations                                │
│  ├── Calculate driver earnings                                  │
│  ├── Calculate restaurant payouts                               │
│  ├── Deduct platform fees                                       │
│  └── Queue payouts for processing                               │
│                                                                  │
│  06:00 UTC - Reports                                            │
│  ├── Generate daily P&L                                         │
│  ├── Update cash flow projections                               │
│  └── Send summary to stakeholders                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### See: ACCOUNTING_FLOWS.md for detailed journal entries

---

### 5. COMPLIANCE BOT

**Bot ID**: `dollor-compliance`
**Role**: Ensure regulatory compliance, handle legal matters
**Priority**: CRITICAL

#### Capabilities
| Capability | Description | API Endpoints Used |
|------------|-------------|-------------------|
| Driver Compliance | Verify driver documents current | `GET /api/drivers/{id}/compliance` |
| Tax Compliance | 1099 generation, reporting | `GET /api/compliance/tax` |
| Data Privacy | GDPR/CCPA request handling | `POST /api/compliance/privacy` |
| Legal Holds | Preserve data for legal matters | `POST /api/compliance/legal-hold` |
| Audit Support | Generate audit trails | `GET /api/compliance/audit` |
| Policy Enforcement | Enforce platform policies | `POST /api/compliance/enforce` |

#### Compliance Checklist
```
┌─────────────────────────────────────────────────────────────────┐
│              COMPLIANCE REQUIREMENTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MATCHMAKING SERVICE COMPLIANCE:                                 │
│  ☐ Terms clearly state "matchmaking service"                    │
│  ☐ No employment relationship with drivers                      │
│  ☐ Drivers set own hours/routes                                 │
│  ☐ Platform fee is flat (not commission)                        │
│  ☐ Pass-through payment model documented                        │
│                                                                  │
│  DRIVER COMPLIANCE:                                              │
│  ☐ Valid driver's license                                       │
│  ☐ Background check passed                                      │
│  ☐ Insurance current (rideshare)                                │
│  ☐ Vehicle registration current                                 │
│  ☐ 1099 information collected                                   │
│                                                                  │
│  DATA PRIVACY:                                                   │
│  ☐ Privacy policy published                                     │
│  ☐ Data deletion requests processed < 30 days                   │
│  ☐ Data export requests processed < 30 days                     │
│  ☐ Consent collected for marketing                              │
│  ☐ Data encrypted at rest and in transit                        │
│                                                                  │
│  FINANCIAL COMPLIANCE:                                           │
│  ☐ 1099-K issued for drivers > $600/year                        │
│  ☐ Sales tax collected where required                           │
│  ☐ PCI compliance maintained (via Stripe)                       │
│  ☐ Anti-money laundering checks                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. DEVOPS BOT

**Bot ID**: `dollor-devops`
**Role**: Manage deployments, infrastructure, CI/CD
**Priority**: HIGH

#### Capabilities
| Capability | Description | Tools Used |
|------------|-------------|------------|
| Deployment | Deploy to dev/staging/production | GitHub Actions, ArgoCD |
| Monitoring | Monitor service health | CloudWatch, Grafana |
| Scaling | Auto-scale based on load | EKS HPA |
| Incident Response | Respond to alerts | PagerDuty |
| Security Patches | Apply security updates | Dependabot |
| Database Ops | Backups, migrations | RDS, Flyway |

#### CI/CD Pipeline Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│              CI/CD PIPELINE (SonarQube Required)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STAGE 1: CODE QUALITY (BLOCKING)                               │
│  ├── Unit Tests: Must pass 100%                                 │
│  ├── SonarQube Analysis: Must pass quality gate                 │
│  │   ├── Coverage: ≥70% for new code                           │
│  │   ├── Bugs: 0 critical, 0 major                             │
│  │   ├── Vulnerabilities: 0 critical, 0 high                   │
│  │   ├── Code Smells: < 100                                    │
│  │   └── Duplications: < 5%                                    │
│  └── Linting: No errors                                         │
│                                                                  │
│  STAGE 2: SECURITY (BLOCKING)                                   │
│  ├── Semgrep: No high/critical findings                         │
│  ├── Bandit (Python): No high severity                          │
│  ├── Trivy (Containers): No critical CVEs                       │
│  └── Dependency Check: No known vulnerabilities                 │
│                                                                  │
│  STAGE 3: BUILD                                                  │
│  ├── Docker build for all 16 services                           │
│  ├── Push to ECR                                                │
│  └── Tag with commit SHA                                        │
│                                                                  │
│  STAGE 4: DEPLOY                                                 │
│  ├── Dev: Auto-deploy on merge                                  │
│  ├── Staging: Manual approval required                          │
│  └── Production: Exec approval + canary rollout                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### SonarQube Quality Gate
| Metric | Condition | Status |
|--------|-----------|--------|
| Coverage on New Code | ≥ 70% | Required |
| Duplicated Lines on New Code | ≤ 3% | Required |
| Maintainability Rating | A | Required |
| Reliability Rating | A | Required |
| Security Rating | A | Required |
| Security Hotspots Reviewed | 100% | Required |

---

### 7. SECURITY BOT

**Bot ID**: `dollor-security`
**Role**: Monitor security, respond to threats, manage access
**Priority**: CRITICAL

#### Capabilities
| Capability | Description | Tools Used |
|------------|-------------|------------|
| Threat Detection | Monitor for suspicious activity | CloudWatch, WAF |
| Fraud Detection | Identify fraudulent transactions | Custom ML models |
| Access Management | Manage API keys, permissions | AWS IAM |
| Incident Response | Respond to security incidents | PagerDuty |
| Vulnerability Mgmt | Track and patch vulnerabilities | Dependabot, Trivy |
| Audit Logging | Maintain security audit trail | CloudTrail |

#### Fraud Detection Rules
```
┌─────────────────────────────────────────────────────────────────┐
│              FRAUD DETECTION RULES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CUSTOMER FRAUD:                                                 │
│  ├── Multiple refund requests (> 3/week) → Review account       │
│  ├── Chargebacks (> 2/month) → Suspend account                  │
│  ├── New account + high value order → Additional verification   │
│  ├── Delivery address ≠ billing address → Flag for review       │
│  └── Multiple payment methods failed → Temporary hold           │
│                                                                  │
│  DRIVER FRAUD:                                                   │
│  ├── GPS spoofing detected → Immediate deactivation             │
│  ├── Unusual delivery times → Investigation                     │
│  ├── Customer complaints pattern → Review                       │
│  ├── Self-delivery (driver = customer) → Deactivation           │
│  └── Multiple accounts same device → Deactivation               │
│                                                                  │
│  RESTAURANT FRAUD:                                               │
│  ├── Inflated prices vs menu → Warning                          │
│  ├── Fake orders for payouts → Investigation                    │
│  ├── Quality complaints pattern → Review partnership            │
│  └── Tax document mismatch → Hold payouts                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. ANALYTICS BOT

**Bot ID**: `dollor-analytics`
**Role**: Generate business intelligence, track KPIs
**Priority**: MEDIUM

#### Capabilities
| Capability | Description | Tools Used |
|------------|-------------|------------|
| KPI Tracking | Monitor business metrics | ClickHouse, Grafana |
| Demand Forecasting | Predict order/ride volume | ML models |
| Driver Supply | Monitor driver availability | Real-time analytics |
| Revenue Analytics | Track revenue, growth | ClickHouse |
| Customer Analytics | Retention, LTV analysis | Segment |
| Operational Reports | Generate daily/weekly reports | Automated |

#### Key Metrics Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│              DAILY KPI DASHBOARD                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ORDERS (Food Delivery):                                        │
│  ├── Total Orders: [count]                                      │
│  ├── GMV (Gross Merchandise Value): $[amount]                   │
│  ├── Platform Revenue: $[orders × $2]                           │
│  ├── Average Order Value: $[amount]                             │
│  └── Completion Rate: [%]                                       │
│                                                                  │
│  RIDES (Rideshare):                                             │
│  ├── Total Rides: [count]                                       │
│  ├── GMV: $[amount]                                             │
│  ├── Platform Revenue: $[rides × $2]                            │
│  ├── Average Fare: $[amount]                                    │
│  └── Completion Rate: [%]                                       │
│                                                                  │
│  DRIVERS:                                                        │
│  ├── Active Drivers: [count]                                    │
│  ├── Online Hours: [total]                                      │
│  ├── Average Earnings: $[amount]                                │
│  └── Utilization Rate: [%]                                      │
│                                                                  │
│  CUSTOMERS:                                                      │
│  ├── Active Users: [count]                                      │
│  ├── New Signups: [count]                                       │
│  ├── Retention Rate: [%]                                        │
│  └── NPS Score: [score]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## BOT COMMUNICATION MATRIX

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    BOT COMMUNICATION FLOWS                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                     Customer        Driver         Restaurant                   │
│                     Support         Support        Support                      │
│                        │               │               │                        │
│                        └───────────────┼───────────────┘                        │
│                                        │                                        │
│                                        ▼                                        │
│                              ┌─────────────────┐                                │
│                              │   Accounting    │                                │
│                              │      Bot        │                                │
│                              └────────┬────────┘                                │
│                                       │                                         │
│                        ┌──────────────┼──────────────┐                         │
│                        │              │              │                         │
│                        ▼              ▼              ▼                         │
│                   Compliance      DevOps        Security                       │
│                      Bot           Bot            Bot                          │
│                        │              │              │                         │
│                        └──────────────┼──────────────┘                         │
│                                       │                                         │
│                                       ▼                                         │
│                              ┌─────────────────┐                                │
│                              │   Analytics     │                                │
│                              │      Bot        │                                │
│                              └─────────────────┘                                │
│                                                                                  │
│  ESCALATION PATH:                                                               │
│  Support Bots → Compliance Bot → Human Review (if needed)                       │
│                                                                                  │
│  FINANCIAL PATH:                                                                │
│  All Bots → Accounting Bot → Financial Reports                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## DEPLOYMENT TO VIBINGTICKET.COM

### Bot Registration Checklist

| Bot ID | Name | Priority | Status |
|--------|------|----------|--------|
| `dollor-customer-support` | Customer Support | HIGH | Pending |
| `dollor-driver-support` | Driver Support | HIGH | Pending |
| `dollor-restaurant-support` | Restaurant Support | MEDIUM | Pending |
| `dollor-accounting` | Accounting | CRITICAL | Pending |
| `dollor-compliance` | Compliance | CRITICAL | Pending |
| `dollor-devops` | DevOps | HIGH | Pending |
| `dollor-security` | Security | CRITICAL | Pending |
| `dollor-analytics` | Analytics | MEDIUM | Pending |

### Required API Credentials per Bot

```yaml
# Customer Support Bot
customer_support:
  api_key: ${DOLLOR_API_KEY}
  endpoints:
    - /api/orders/*
    - /api/customers/*
    - /api/support/*
  permissions:
    - read:orders
    - write:refunds (limit: $50)
    - read:customers

# Driver Support Bot
driver_support:
  api_key: ${DOLLOR_API_KEY}
  endpoints:
    - /api/drivers/*
    - /api/documents/*
  permissions:
    - read:drivers
    - write:documents
    - write:verification

# Accounting Bot
accounting:
  api_key: ${DOLLOR_API_KEY}
  stripe_key: ${STRIPE_SECRET_KEY}
  endpoints:
    - /api/accounting/*
    - /api/payouts/*
  permissions:
    - read:all_transactions
    - write:payouts
    - write:reports

# DevOps Bot
devops:
  github_token: ${GITHUB_TOKEN}
  aws_credentials: ${AWS_CREDENTIALS}
  sonarqube_token: ${SONAR_TOKEN}
  permissions:
    - deploy:all_environments
    - read:logs
    - write:infrastructure
```

---

*Document End*
*Next: See ACCOUNTING_FLOWS.md for detailed financial operations*
