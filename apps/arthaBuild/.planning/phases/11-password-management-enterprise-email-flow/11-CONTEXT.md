# Phase 11: Password Management — Enterprise Email Flow - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade password management UX and email quality to enterprise grade. Backend endpoints already exist in `auth.py:82-161` (forgot-password, reset-password, change-password). This phase adds: polished HTML email templates, email verification on signup, a change-password form in settings, admin-triggered reset emails, and tight token expiry UX. Password history and 90-day expiry are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Email Template Style
- Clean minimal design — white background, single column, brand accent color, no heavy imagery (like Linear/Vercel transactional emails)
- Logo/header: Claude's discretion (best practice for enterprise SaaS)
- Footer: company name + copyright + privacy policy link only (no social links, no marketing unsubscribe — these are transactional)
- CTA: solid filled button (e.g. "Reset Password") with fallback plain-text URL below for email clients that block images
- Applies to: password reset email, email verification email, admin-triggered reset email

### Token Expiry UX
- Reset links valid for **15 minutes** (security-sensitive, industry standard)
- Reset links are **single-use** — invalidated immediately after password is changed
- Multiple reset requests: each new request **invalidates all previous links** — only the latest link works
- Expired/used link → dedicated error page with **inline "Send new link" button** (user never has to navigate away)

### Reset Flow Entry Points
- **Logged-out**: Forgot-password form on login page → email link → reset-password page → success → back to login
- **Logged-in**: Settings page has "Change Password" form (current password + new password + confirm) — no email required
- **Admin-triggered**: Admin Panel has "Send password reset" action per user in the team list → sends reset email to that user on their behalf
- Post-reset landing: login page with success banner ("Password updated. Please log in.")
- Anti-enumeration: forgot-password always shows "If an account with that email exists, you'll receive a link shortly" — never reveals whether email is registered

### Email Verification
- Non-blocking — user can use the app after signup, but sees a persistent dismissible banner "Please verify your email" until confirmed
- Verification method: click-to-verify link in email (one click, no code entry)
- Verification link valid for **24 hours**
- Resend: banner includes "Resend email" button with 60-second cooldown to prevent spam
- Once verified: banner disappears, `email_verified` flag set on user record

### Claude's Discretion
- Logo inclusion and exact placement in email header (product name as text is fine if no logo asset exists)
- Exact button color (match existing ArthaBuild brand accent)
- Skeleton/loading states during async operations
- Exact spacing, typography, and email client fallback CSS
- Whether to use a shared email template renderer (e.g., Jinja2 HTML partials) or inline styles per email

</decisions>

<specifics>
## Specific Ideas

- User explicitly said "use best practices" — all recommended options selected across the board
- Reference: Linear/Vercel email style (clean, minimal, high trust signal)
- Admin reset sends email TO the team member (admin does not set the password directly — more secure, auditable)
- The 15-minute expiry and single-use token are both deliberate security choices, not just defaults

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-password-management-enterprise-email-flow*
*Context gathered: 2026-04-10*
