import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const FROM = (process.env.FROM_NAME || 'Zietra') + ' <' + (process.env.FROM_EMAIL || 'peter@zietra.com') + '>';
const CC = 'rajesh@zietra.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://crm.zietra.com';

function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: Number.parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'peter@zietra.com',
      pass: process.env.SMTP_PASS,
    },
  });
}

function darkWrapper(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f23;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Zietra</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Talent Placement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;border-radius:0 0 12px 12px;">
              ${bodyHtml}
              <!-- Footer -->
              <hr style="border:none;border-top:1px solid #2d2d4e;margin:32px 0 24px;" />
              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">
                &copy; ${new Date().getFullYear()} Zietra. All rights reserved.<br />
                This email was sent by the Zietra Talent Placement System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function primaryButton(href: string, label: string): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`.trim();
}

// ─── 1. sendResumeDeliveryEmail ───────────────────────────────────────────────

export async function sendResumeDeliveryEmail(options: {
  to: string;
  clientName: string;
  contractTitle: string;
  candidates: { code: string; title: string; experience: string }[];
  portalToken: string;
}): Promise<{ messageId: string }> {
  const { to, clientName, contractTitle, candidates, portalToken } = options;
  const portalUrl = `${FRONTEND_URL}/placements/${portalToken}`;

  const candidateRows = candidates
    .map(
      (c) => `
<tr>
  <td style="padding:12px 16px;border-bottom:1px solid #2d2d4e;">
    <p style="margin:0;font-size:14px;font-weight:600;color:#a5b4fc;">${c.code}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1;">${c.title}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${c.experience} experience</p>
  </td>
</tr>`
    )
    .join('');

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Your Pre-Vetted Candidates Are Ready</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  We have hand-selected the following pre-vetted candidates for
  <strong style="color:#f1f5f9;">${contractTitle}</strong>. Each candidate has been
  screened and is ready for your review.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;margin:0 0 28px;overflow:hidden;">
  <tr>
    <td style="padding:12px 16px;background:#12122a;font-size:12px;font-weight:600;letter-spacing:1px;color:#818cf8;text-transform:uppercase;border-bottom:1px solid #2d2d4e;">
      Candidates (${candidates.length})
    </td>
  </tr>
  ${candidateRows}
</table>
<p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">Review each profile and select your preferred candidates:</p>
${primaryButton(portalUrl, 'Review Candidates & Select')}
<p style="margin:0;font-size:12px;color:#64748b;">
  Or copy this link into your browser:<br />
  <a href="${portalUrl}" style="color:#818cf8;word-break:break-all;">${portalUrl}</a>
</p>`;

  const html = darkWrapper('Your Pre-Vetted Candidates Are Ready — Zietra', body);

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: CC,
    subject: `Your Pre-Vetted Candidates Are Ready — ${contractTitle}`,
    html,
    text: `Hi ${clientName},\n\nYour pre-vetted candidates for "${contractTitle}" are ready for review.\n\nReview and select candidates here: ${portalUrl}\n\nZietra Talent Placement`,
  });
  logger.info('Resume delivery email sent', { to, contractTitle, portalToken, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 2. sendInterviewRequestEmail ─────────────────────────────────────────────

export async function sendInterviewRequestEmail(options: {
  to: string;
  cc?: string;
  candidateName: string;
  clientCompany: string;
  role: string;
  interviewTimes: string[];
  duration: string;
  notes?: string;
}): Promise<{ messageId: string }> {
  const { to, cc, candidateName, clientCompany, role, interviewTimes, duration, notes } = options;

  const timesList = interviewTimes
    .map((t) => `<li style="padding:4px 0;font-size:14px;color:#cbd5e1;">${t}</li>`)
    .join('');

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Interview Opportunity</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${candidateName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Great news! <strong style="color:#f1f5f9;">${clientCompany}</strong> (via Zietra) would
  like to schedule an interview with you for the <strong style="color:#f1f5f9;">${role}</strong> position.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Company</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${clientCompany}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Role</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${role}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Duration</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${duration}</td></tr>
  </table>
</div>
<p style="margin:0 0 12px;font-size:14px;color:#94a3b8;font-weight:600;">Available Interview Slots:</p>
<ul style="margin:0 0 24px;padding-left:20px;">
  ${timesList}
</ul>
${notes ? `<div style="background:#0f0f23;border-left:3px solid #6366f1;padding:12px 16px;margin:0 0 24px;border-radius:0 8px 8px 0;"><p style="margin:0;font-size:13px;color:#94a3b8;font-style:italic;">${notes}</p></div>` : ''}
<p style="margin:0;font-size:14px;color:#94a3b8;">
  Please reply to this email or contact your Zietra coordinator to confirm your preferred time slot.
</p>`;

  const html = darkWrapper(`Interview Opportunity — ${clientCompany} via Zietra`, body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `Interview Opportunity — ${clientCompany} via Zietra`,
    html,
    text: `Hi ${candidateName},\n\n${clientCompany} would like to interview you for the ${role} position.\n\nAvailable times:\n${interviewTimes.join('\n')}\n\nDuration: ${duration}\n\nPlease reply to confirm your preferred slot.\n\nZietra Talent Placement`,
  });
  logger.info('Interview request email sent', { to, candidateName, clientCompany, role, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 3. sendInterviewConfirmedClientEmail ─────────────────────────────────────

export async function sendInterviewConfirmedClientEmail(options: {
  to: string;
  cc?: string;
  candidateCode: string;
  clientName: string;
  confirmedTime: string;
  portalToken: string;
}): Promise<{ messageId: string }> {
  const { to, cc, candidateCode, clientName, confirmedTime, portalToken } = options;
  const portalUrl = `${FRONTEND_URL}/placements/${portalToken}`;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Interview Confirmed</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Your interview with candidate <strong style="color:#f1f5f9;">${candidateCode}</strong> has been confirmed.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Candidate</td><td style="padding:6px 0;font-size:14px;color:#a5b4fc;font-weight:600;">${candidateCode}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Confirmed Time</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${confirmedTime}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Status</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600;">Confirmed</td></tr>
  </table>
</div>
<p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">View the full candidate profile in your portal:</p>
${primaryButton(portalUrl, 'View Candidate Portal')}`;

  const html = darkWrapper(`Interview Confirmed — ${candidateCode} on ${confirmedTime}`, body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `Interview Confirmed — ${candidateCode} on ${confirmedTime}`,
    html,
    text: `Hi ${clientName},\n\nYour interview with candidate ${candidateCode} is confirmed for ${confirmedTime}.\n\nView candidate portal: ${portalUrl}\n\nZietra Talent Placement`,
  });
  logger.info('Interview confirmed email sent to client', { to, candidateCode, confirmedTime, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 4. sendInterviewConfirmedCandidateEmail ──────────────────────────────────

export async function sendInterviewConfirmedCandidateEmail(options: {
  to: string;
  cc?: string;
  candidateName: string;
  clientCompany: string;
  confirmedTime: string;
  role: string;
}): Promise<{ messageId: string }> {
  const { to, cc, candidateName, clientCompany, confirmedTime, role } = options;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Your Interview is Confirmed — You've Got This!</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${candidateName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Your interview with <strong style="color:#f1f5f9;">${clientCompany}</strong> for the
  <strong style="color:#f1f5f9;">${role}</strong> role is confirmed. Here's everything you need to know.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Company</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${clientCompany}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Role</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${role}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Date &amp; Time</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600;">${confirmedTime}</td></tr>
  </table>
</div>
<p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f1f5f9;">How to Prepare</p>
<ul style="margin:0 0 24px;padding-left:20px;">
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Research <strong style="color:#f1f5f9;">${clientCompany}</strong> — their products, mission, and recent news</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Review the <strong style="color:#f1f5f9;">${role}</strong> job description and match it to your experience</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Prepare 2–3 examples of past achievements relevant to this role</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Have thoughtful questions ready to ask the interviewer</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Test your audio/video setup if the interview is virtual</li>
</ul>
<p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f1f5f9;">What to Expect</p>
<ul style="margin:0 0 24px;padding-left:20px;">
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">An introduction round — be ready to walk through your background concisely</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Technical or role-specific questions aligned to the position</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Behavioural questions (use the STAR method: Situation, Task, Action, Result)</li>
  <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">A chance to ask questions — show genuine interest</li>
</ul>
<p style="margin:0;font-size:14px;color:#94a3b8;">
  Good luck! Your Zietra coordinator is here if you have any questions before the interview.
</p>`;

  const html = darkWrapper(`Interview Confirmed — ${clientCompany}`, body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `Your Interview is Confirmed — ${clientCompany} on ${confirmedTime}`,
    html,
    text: `Hi ${candidateName},\n\nYour interview with ${clientCompany} for the ${role} role is confirmed for ${confirmedTime}.\n\nPrepare well and good luck!\n\nZietra Talent Placement`,
  });
  logger.info('Interview confirmed email sent to candidate', { to, candidateName, clientCompany, confirmedTime, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 5. sendClientAcceptedEmail ───────────────────────────────────────────────

export async function sendClientAcceptedEmail(options: {
  to: string;
  cc?: string;
  candidateName: string;
  clientCompany: string;
  role: string;
}): Promise<{ messageId: string }> {
  const { to, cc, candidateName, clientCompany, role } = options;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">You've Been Selected!</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${candidateName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Congratulations! <strong style="color:#f1f5f9;">${clientCompany}</strong> has selected you
  for the <strong style="color:#f1f5f9;">${role}</strong> position. This is a fantastic
  achievement — you earned it.
</p>
<div style="background:#0f0f23;border:1px solid #22c55e;border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
  <p style="margin:0 0 8px;font-size:28px;">🎉</p>
  <p style="margin:0;font-size:16px;font-weight:600;color:#22c55e;">Offer Extended</p>
  <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">${role} at ${clientCompany}</p>
</div>
<p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">
  Your Zietra coordinator will be in touch shortly with the next steps, including
  contract details and start date information.
</p>
<p style="margin:0;font-size:14px;color:#94a3b8;">
  If you have any questions in the meantime, please don't hesitate to reach out to us.
  Welcome to your next chapter!
</p>`;

  const html = darkWrapper(`You've Been Selected — ${clientCompany}`, body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `Congratulations — You've Been Selected by ${clientCompany}!`,
    html,
    text: `Hi ${candidateName},\n\nCongratulations! ${clientCompany} has selected you for the ${role} position.\n\nYour Zietra coordinator will be in touch with next steps shortly.\n\nZietra Talent Placement`,
  });
  logger.info('Client accepted email sent to candidate', { to, candidateName, clientCompany, role, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 6. sendPlacementCompleteEmail ────────────────────────────────────────────

export async function sendPlacementCompleteEmail(options: {
  to: string;
  cc?: string;
  clientName: string;
  candidateCode: string;
  startDate: string;
  role: string;
}): Promise<{ messageId: string }> {
  const { to, cc, clientName, candidateCode, startDate, role } = options;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Placement Confirmed</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  We're pleased to confirm that the placement has been finalised. Here's a summary:
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Candidate</td><td style="padding:6px 0;font-size:14px;color:#a5b4fc;font-weight:600;">${candidateCode}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Role</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${role}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Start Date</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600;">${startDate}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Status</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600;">Placement Confirmed</td></tr>
  </table>
</div>
<p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">
  Thank you for trusting Zietra with your talent needs. We hope this placement
  exceeds your expectations. Our team will continue to support both you and the candidate
  through the onboarding period.
</p>
<p style="margin:0;font-size:14px;color:#94a3b8;">
  Please don't hesitate to reach out if you need anything at all.
</p>`;

  const html = darkWrapper(`Placement Confirmed — ${candidateCode}`, body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `Placement Confirmed — ${candidateCode} starting ${startDate}`,
    html,
    text: `Hi ${clientName},\n\nPlacement confirmed!\n\nCandidate: ${candidateCode}\nRole: ${role}\nStart Date: ${startDate}\n\nThank you for trusting Zietra.\n\nZietra Talent Placement`,
  });
  logger.info('Placement complete email sent', { to, clientName, candidateCode, startDate, messageId: info.messageId });
  return { messageId: info.messageId };
}

// ─── 7. sendRejectionMoreResumesEmail ─────────────────────────────────────────

export async function sendRejectionMoreResumesEmail(options: {
  to: string;
  cc?: string;
  clientName: string;
  candidateCode: string;
  portalToken: string;
}): Promise<{ messageId: string }> {
  const { to, cc, clientName, candidateCode, portalToken } = options;
  const portalUrl = `${FRONTEND_URL}/placements/${portalToken}`;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">We'll Find the Right Fit</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Thank you for your feedback on candidate <strong style="color:#f1f5f9;">${candidateCode}</strong>.
  Finding the perfect match is our priority, and we appreciate your candid input — it helps
  us refine our search.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">What Happens Next</p>
  <ul style="margin:0;padding-left:20px;">
    <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">Our team will review your feedback and refine the candidate criteria</li>
    <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">We'll source and screen a fresh set of candidates tailored to your needs</li>
    <li style="padding:6px 0;font-size:14px;color:#cbd5e1;">You'll receive a new set of profiles for review shortly</li>
  </ul>
</div>
<p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">In the meantime, you can view and manage your current shortlist in your portal:</p>
${primaryButton(portalUrl, 'View Candidate Portal')}
<p style="margin:0;font-size:14px;color:#94a3b8;">
  We're committed to finding the right person for your team. Thank you for your patience
  and continued trust in Zietra.
</p>`;

  const html = darkWrapper("We'll Find the Right Fit — Zietra", body);

  const ccList = [CC, cc].filter(Boolean).join(', ');
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    cc: ccList,
    subject: `We'll Find the Right Fit — More Candidates Coming`,
    html,
    text: `Hi ${clientName},\n\nThank you for your feedback on candidate ${candidateCode}. We'll refine our search and send you new profiles shortly.\n\nView your portal: ${portalUrl}\n\nZietra Talent Placement`,
  });
  logger.info('Rejection + more resumes email sent', { to, clientName, candidateCode, portalToken, messageId: info.messageId });
  return { messageId: info.messageId };
}
