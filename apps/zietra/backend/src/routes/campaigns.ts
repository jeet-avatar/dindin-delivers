import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIMessageConfig } from '../config/ai';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: AI_CONFIG.apiKey });

// Enable authentication for all campaign routes
router.use(authenticate);

// GET /api/campaigns - Get all campaigns
router.get('/', async (req, res, next) => {
  try {
    // Team-aware: show own campaigns + account owner's campaigns for team members
    const userIds = [req.user?.id];
    if (req.user?.teamRole === 'MEMBER' && req.user?.accountOwnerId) {
      userIds.push(req.user.accountOwnerId);
    }
    if (req.user?.teamRole === 'OWNER') {
      // Owner sees all team members' campaigns too
      const teamMembers = await prisma.user.findMany({
        where: { accountOwnerId: req.user.id },
        select: { id: true },
      });
      teamMembers.forEach(m => userIds.push(m.id));
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: { in: userIds.filter(Boolean) as string[] },
      },
      include: {
        _count: {
          select: {
            emailLogs: true,
            companies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ campaigns });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res, next) => {
  try {
    const { name, subject, status, htmlContent, scheduledAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    // ✅ Always use authenticated user - no demo user fallback
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject: subject || `Campaign: ${name}`,
        status: status || 'DRAFT',
        htmlContent: htmlContent || '<p>Email content goes here</p>',
        userId: req.user!.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return res.status(201).json({ campaign });
  } catch (error) {
    return next(error);
  }
});

// Normalize 483 messy industry values into clean verticals
function normalizeVertical(industry: string | null | undefined): string {
  if (!industry) return 'Uncategorized';
  const l = industry.toLowerCase().trim();

  if (/saas|software|app dev|enterprise software|productivity/i.test(l)) return 'Software & SaaS';
  if (/cyber|security|identity|infosec/i.test(l)) return 'Cybersecurity';
  if (/ai|ml|machine learning|data science|big data|data analytics|data eng|database/i.test(l)) return 'AI & Data';
  if (/cloud|devops|platform|hosting|infrastructure/i.test(l)) return 'Cloud & Infrastructure';
  if (/health|medical|pharma|biotech|hospital|wellness|diagnostics/i.test(l)) return 'Healthcare & Life Sciences';
  if (/fintech|banking|finance|insurance|payment|lending|mortgage/i.test(l)) return 'Financial Services';
  if (/retail|e-?commerce|consumer goods|beauty|fashion|apparel|food.*bev|restaurant|grocery/i.test(l)) return 'Retail & Consumer';
  if (/manufactur|industrial|automotive|aerospace|construction|engineering|energy|chemical/i.test(l)) return 'Manufacturing & Industrial';
  if (/educat|edtech|e-?learn|training|school/i.test(l)) return 'Education';
  if (/consult|professional serv|staffing|recruit|hr |human resource/i.test(l)) return 'Consulting & Staffing';
  if (/media|entertain|gaming|music|publish|advertis|marketing|pr\b/i.test(l)) return 'Media & Marketing';
  if (/telecom|network|iot|semiconductor|hardware|electronics/i.test(l)) return 'Telecom & Hardware';
  if (/logistics|transport|supply chain|shipping|warehouse/i.test(l)) return 'Logistics & Supply Chain';
  if (/non-?profit|ngo|social|civic|charity|foundation/i.test(l)) return 'Non-Profit';
  if (/real estate|property|housing/i.test(l)) return 'Real Estate';
  if (/legal|law|government|public/i.test(l)) return 'Legal & Government';
  if (/it |it$|information tech|tech serv|tech$|technology$/i.test(l)) return 'IT Services';
  if (/travel|hospitality|hotel|tourism|airline/i.test(l)) return 'Travel & Hospitality';

  return 'Other';
}

// GET /api/campaigns/company-verticals — Companies grouped by normalized vertical with email stats
router.get('/company-verticals', async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // Team-aware access
    const userIds = [userId];
    if (req.user?.teamRole === 'MEMBER' && req.user?.accountOwnerId) {
      userIds.push(req.user.accountOwnerId);
    }
    if (req.user?.teamRole === 'OWNER') {
      const teamMembers = await prisma.user.findMany({
        where: { accountOwnerId: userId },
        select: { id: true },
      });
      teamMembers.forEach(m => userIds.push(m.id));
    }

    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        OR: userIds.filter(Boolean).map(id => ({ userId: id as string })),
      },
      select: {
        id: true,
        industry: true,
        _count: { select: { contacts: { where: { isActive: true } } } },
      },
    });

    // Build vertical summary
    const verticalMap = new Map<string, { count: number; totalContacts: number }>();
    for (const c of companies) {
      const v = normalizeVertical(c.industry);
      const existing = verticalMap.get(v) || { count: 0, totalContacts: 0 };
      existing.count++;
      existing.totalContacts += c._count.contacts;
      verticalMap.set(v, existing);
    }

    const verticals = Array.from(verticalMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalContacts - a.totalContacts);

    return res.json({ verticals, totalCompanies: companies.length });
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/campaigns/sent-contact-ids — Contacts that have received any campaign email
router.get('/sent-contact-ids', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { campaignType } = req.query;

    const where: any = {
      campaign: { userId },
      status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
    };
    if (campaignType) {
      where.campaign.type = campaignType as string;
    }

    const logs = await prisma.emailLog.findMany({
      where,
      select: { contactId: true },
      distinct: ['contactId'],
    });

    return res.json({ sentContactIds: logs.map(l => l.contactId) });
  } catch (error: any) {
    return next(error);
  }
});

// ============================================================
// THROTTLED SEND SYSTEM — 1 email per N minutes, background queue
// ============================================================

interface SendJob {
  timer: ReturnType<typeof setInterval>;
  queue: { contact: { id: string; email: string; firstName: string; lastName: string }; companyName: string }[];
  sent: number;
  failed: number;
  total: number;
  status: 'sending' | 'complete' | 'error';
  startedAt: Date;
  campaignId: string;
  userId: string;
  intervalMs: number;
  lastSentAt: Date | null;
  skippedInvalid: number;
}

const activeSendJobs = new Map<string, SendJob>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Wrap all <a href="..."> links with click tracking redirect
function wrapLinksWithTracking(html: string, emailLogId: string, trackingBase: string): string {
  if (!emailLogId) return html;
  return html.replace(
    /href=['"]([^'"]+)['"]/gi,
    (match, url) => {
      // Skip mailto:, tel:, #anchor, and tracking pixel URLs
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#') || url.includes('/api/tracking/')) {
        return match;
      }
      const trackUrl = `${trackingBase}/api/tracking/click/${emailLogId}?url=${encodeURIComponent(url)}`;
      return `href='${trackUrl}'`;
    }
  );
}

// Reusable: start throttled send for a campaign
async function startThrottledSend(
  campaignId: string,
  userId: string,
  contacts: { contact: { id: string; email: string; firstName: string; lastName: string }; companyName: string }[],
  campaignSubject: string,
  campaignHtml: string,
  intervalMinutes: number
) {
  const intervalMs = intervalMinutes * 60 * 1000;

  // Get user's email server upfront (fail fast)
  const server = await getUserEmailServer(userId);
  if (!server) {
    throw new Error('No verified email server configured. Add one in Settings.');
  }

  const job: SendJob = {
    timer: null as any,
    queue: [...contacts],
    sent: 0,
    failed: 0,
    total: contacts.length,
    status: 'sending',
    startedAt: new Date(),
    campaignId,
    userId,
    intervalMs,
    lastSentAt: null,
    skippedInvalid: 0,
  };

  const TRACKING_BASE = process.env.FRONTEND_URL || 'https://zietra.com';

  const sendNext = async () => {
    if (job.queue.length === 0) {
      // Done — clean up
      clearInterval(job.timer);
      job.status = 'complete';
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENT', sentAt: new Date(), totalSent: job.sent },
      });
      // Keep in map for 1 hour for progress checks, then remove
      setTimeout(() => activeSendJobs.delete(campaignId), 60 * 60 * 1000);
      return;
    }

    const { contact, companyName } = job.queue.shift()!;
    try {
      // Replace template variables
      const vars: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        companyName: companyName,
      };
      let subjectLine = campaignSubject;
      let html = campaignHtml;
      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subjectLine = subjectLine.replace(regex, val);
        html = html.replace(regex, val);
      }

      // Create email log
      let emailLogId = '';
      try {
        const emailLog = await prisma.emailLog.create({
          data: {
            toEmail: contact.email,
            fromEmail: server.fromEmail,
            status: 'SENT',
            sentAt: new Date(),
            campaignId,
            contactId: contact.id,
          } as any,
        });
        emailLogId = emailLog.id;
      } catch { /* continue */ }

      // Inject tracking pixel + wrap links for click tracking
      if (emailLogId) {
        const pixel = `<img src="${TRACKING_BASE}/api/tracking/open/${emailLogId}" alt="" width="1" height="1" style="display:none;" />`;
        if (html.includes('</div>')) {
          html = html.replace(/<\/div>\s*$/, `${pixel}</div>`);
        } else {
          html += pixel;
        }
        html = wrapLinksWithTracking(html, emailLogId, TRACKING_BASE);
      }

      await sendEmailViaSMTP(server, contact.email, subjectLine, html);
      job.sent++;
      job.lastSentAt = new Date();
    } catch (err: any) {
      console.error(`Throttled send failed for ${contact.email}:`, err?.message);
      job.failed++;
    }

    // Update DB every 5 sends
    if ((job.sent + job.failed) % 5 === 0 || job.queue.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { totalSent: job.sent },
      }).catch(() => {});
    }
  };

  // Send first email immediately, then every N minutes
  await sendNext();
  if (job.queue.length > 0) {
    job.timer = setInterval(sendNext, intervalMs);
  } else {
    job.status = 'complete';
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentAt: new Date(), totalSent: job.sent },
    });
    setTimeout(() => activeSendJobs.delete(campaignId), 60 * 60 * 1000);
  }

  activeSendJobs.set(campaignId, job);
  return job;
}

// POST /api/campaigns/:id/send-throttled — Queue emails, send 1 per N minutes
router.post('/:id/send-throttled', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const intervalMinutes = Math.min(Math.max(parseInt(req.body?.intervalMinutes) || 5, 1), 30);

    // Check if already sending
    if (activeSendJobs.has(id)) {
      const job = activeSendJobs.get(id)!;
      return res.status(409).json({ error: 'Campaign is already sending', sent: job.sent, total: job.total });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!campaign.subject || !campaign.htmlContent) return res.status(400).json({ error: 'Campaign needs subject and content' });

    // Collect and validate contacts
    const validContacts: { contact: any; companyName: string }[] = [];
    let invalidCount = 0;
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && isValidEmail(contact.email)) {
          validContacts.push({ contact, companyName: cc.company.name || '' });
        } else {
          invalidCount++;
        }
      }
    }

    // Dedup: remove contacts already sent for THIS campaign
    const alreadySent = await prisma.emailLog.findMany({
      where: {
        campaignId: id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
      },
      select: { contactId: true },
    });
    const alreadySentIds = new Set(alreadySent.map(l => l.contactId));
    const dedupedContacts = validContacts.filter(vc => !alreadySentIds.has(vc.contact.id));
    const dupCount = validContacts.length - dedupedContacts.length;

    if (dedupedContacts.length === 0) {
      return res.status(400).json({ error: `No new contacts to send to (${dupCount} already sent, ${invalidCount} invalid emails)`, invalidCount, duplicatesSkipped: dupCount });
    }

    // Set campaign to SENDING
    await prisma.campaign.update({ where: { id }, data: { status: 'SENDING' } });

    // Start throttled send
    const job = await startThrottledSend(id, userId!, dedupedContacts, campaign.subject, campaign.htmlContent, intervalMinutes);

    const estimatedMinutes = (dedupedContacts.length - 1) * intervalMinutes;
    return res.json({
      success: true,
      campaignId: id,
      total: dedupedContacts.length,
      invalidSkipped: invalidCount,
      duplicatesSkipped: dupCount,
      intervalMinutes,
      estimatedCompletion: `~${estimatedMinutes} minutes`,
      message: `Sending ${dedupedContacts.length} emails, 1 every ${intervalMinutes} min. First email sent immediately.${dupCount > 0 ? ` (${dupCount} duplicates skipped)` : ''}`,
    });
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/campaigns/:id/send-progress — Live send status
router.get('/:id/send-progress', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check live job first
    const job = activeSendJobs.get(id);
    if (job) {
      const nextSendIn = job.lastSentAt
        ? Math.max(0, job.intervalMs - (Date.now() - job.lastSentAt.getTime()))
        : 0;
      return res.json({
        status: job.status,
        sent: job.sent,
        failed: job.failed,
        total: job.total,
        remaining: job.queue.length,
        nextSendInSeconds: Math.round(nextSendIn / 1000),
        startedAt: job.startedAt,
        intervalMinutes: job.intervalMs / 60000,
      });
    }

    // No live job — check DB
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      select: { status: true, totalSent: true, totalOpened: true, totalClicked: true, totalBounced: true, sentAt: true },
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const emailLogs = await prisma.emailLog.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });

    const counts: Record<string, number> = {};
    emailLogs.forEach((l: any) => { counts[l.status] = l._count; });

    return res.json({
      status: campaign.status === 'SENT' ? 'complete' : campaign.status.toLowerCase(),
      sent: counts['SENT'] || 0,
      failed: counts['BOUNCED'] || 0,
      total: campaign.totalSent || 0,
      remaining: 0,
      nextSendInSeconds: 0,
      sentAt: campaign.sentAt,
      opened: counts['OPENED'] || campaign.totalOpened || 0,
      clicked: counts['CLICKED'] || campaign.totalClicked || 0,
    });
  } catch (error) {
    return next(error);
  }
});

// 5 ERP campaign subject line variants
const ERP_SUBJECTS = [
  "{{companyName}}'s ERP team ready for 2026.1?",
  "modern stack just launched — where's your talent?",
  "82% of firms can't find ERP talent — here's how we solve it",
  "Quick question about {{companyName}}'s ERP roadmap",
  "ERP modernization — does {{companyName}} have the right engineers?",
];

// GET /api/campaigns/erp-subjects — List all subject line variants
router.get('/erp-subjects', async (req, res) => {
  return res.json({
    subjects: ERP_SUBJECTS.map((s, i) => ({ id: i, subject: s })),
  });
});

// POST /api/campaigns/create-all-erp — Create 5 draft campaigns (one per subject line)
router.post('/create-all-erp', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const campaigns = [];
    for (let i = 0; i < ERP_SUBJECTS.length; i++) {
      const campaign = await prisma.campaign.create({
        data: {
          name: `ERP Campaign #${i + 1}`,
          subject: ERP_SUBJECTS[i],
          status: 'DRAFT',
          htmlContent: ERP_CAMPAIGN_HTML,
          userId,
        },
      });
      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        subject: ERP_SUBJECTS[i],
        status: 'DRAFT',
      });
    }
    return res.json({
      success: true,
      created: campaigns.length,
      campaigns,
      message: `${campaigns.length} ERP campaigns created as DRAFT. Link companies and send-throttled each one.`,
    });
  } catch (error) {
    return next(error);
  }
});

// AI Consulting campaign email template
const AI_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #8B5CF6; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #06B6D4 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>Your Competitors Are Deploying AI Agents. Are You?</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — AI Consulting & Implementation</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Here is a number that should concern every CTO: <strong>only 8.6% of companies have AI agents in production</strong>. The other 91%? Still in pilots, POCs, or haven't started. Meanwhile, 67% of Fortune 500 companies deployed at least one AI agent this year.</p>
<p style='font-size: 15px; line-height: 1.6;'>The gap between AI leaders and everyone else is widening fast. The challenge isn't the technology — it's finding engineers who can take AI from a demo to a production system that handles real traffic, real data, and real edge cases.</p>
<p style='font-size: 15px; line-height: 1.6;'><strong>What Zietra delivers for {{companyName}}:</strong></p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>AI Agents & Agentic Workflows</strong> — MCP integrations, LangChain, multi-step autonomous systems that actually work in production</li>
<li><strong>GenAI & LLM Implementation</strong> — RAG systems, fine-tuning, Claude/GPT integration, prompt engineering at scale</li>
<li><strong>ML Pipelines & MLOps</strong> — PyTorch, MLflow, Kubeflow, model serving, A/B testing, drift detection</li>
<li><strong>AI Strategy & Roadmap</strong> — Cut through the noise. We help {{companyName}} identify the 2-3 AI use cases that will actually move the needle</li>
<li><strong>Transparent pricing</strong> — $2/hr staffing fee for contract engineers. Full rate breakdown visible to both sides.</li>
</ul>
<div style='background: #f8f9ff; border-left: 4px solid #8B5CF6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;'>
<p style='font-size: 14px; line-height: 1.6; color: #333; margin: 0;'><strong>The Reality Check:</strong> 46% of companies say integrating AI with existing systems is their #1 challenge. 60% cite legacy infrastructure as the blocker. These aren't model problems — they're engineering problems. That's exactly what we solve.</p>
</div>
<p style='font-size: 15px; line-height: 1.6;'>Would 15 minutes this week work to discuss where AI can create the most impact for {{companyName}}?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/ai' style='background-color: #8B5CF6; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Talk to an AI Expert</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of AI Consulting — Zietra</p>
</div>
</div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'>
<p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p>
</div>
</div>`;

// 5 AI Consulting campaign subject line variants
const AI_SUBJECTS = [
  "67% of Fortune 500 deployed AI agents this year. Has {{companyName}}?",
  "Quick question about {{companyName}}'s AI roadmap",
  "The AI skills gap is real — 91% of companies are stuck in pilot mode",
  "{{companyName}} + AI agents: 15-min strategy call?",
  "Your competitors just deployed AI agents. Here's how to catch up.",
];

// GET /api/campaigns/ai-subjects — List AI campaign subject variants
router.get('/ai-subjects', async (req, res) => {
  return res.json({
    subjects: AI_SUBJECTS.map((s, i) => ({ id: i, subject: s })),
  });
});

// ============================================================
// 5 TECH HIRING CAMPAIGN TEMPLATES
// ============================================================

// 1. Cloud & Platform Engineering
const CLOUD_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #0EA5E9; background: linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>Kubernetes Is Now the Default. Is Your Team Ready?</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Cloud & Platform Engineering Talent</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>In 2026, <strong>Platform Engineering is the fastest-growing category</strong> in DevOps. Companies are building Internal Developer Platforms that make developers self-service — and they need engineers who can build and maintain them. Over <strong>90% of organizations face IT skills gaps</strong> in cloud and security roles.</p>
<p style='font-size: 15px; line-height: 1.6;'>Cloud/DevOps engineers take <strong>89+ days to fill</strong> on average. We deliver in 48 hours.</p>
<p style='font-size: 15px; line-height: 1.6;'><strong>Engineers we deliver for {{companyName}}:</strong></p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>Platform Engineers</strong> — Internal Developer Platforms, Backstage, self-service infra</li>
<li><strong>Kubernetes Experts</strong> — EKS/AKS/GKE, Helm, service mesh, scaling, rollbacks</li>
<li><strong>Cloud Architects</strong> — AWS/Azure/GCP certified, multi-cloud, cost optimization</li>
<li><strong>SRE / Observability</strong> — Datadog, Grafana, incident response, SLOs, chaos engineering</li>
<li><strong>IaC Specialists</strong> — Terraform, Pulumi, CDK, GitOps with ArgoCD/Flux</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Transparent pricing: <strong>$2/hr</strong> is our fee. The engineer keeps the rest. Both sides see the full breakdown.</p>
<p style='font-size: 15px; line-height: 1.6;'>Quick 15-minute call to discuss {{companyName}}'s cloud roadmap?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/staffing' style='background-color: #0EA5E9; background: linear-gradient(135deg, #0EA5E9, #2563EB); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Get Cloud Engineer Profiles</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div></div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'><p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p></div></div>`;

const CLOUD_SUBJECTS = [
  "Platform Engineering is the #1 growing role in 2026 — does {{companyName}} have one?",
  "90% of orgs face cloud skills gaps. Here's the fastest fix.",
  "Quick question about {{companyName}}'s Kubernetes strategy",
  "Cloud engineers take 89 days to hire. We deliver in 48 hours.",
  "{{companyName}}'s DevOps team ready for platform engineering?",
];

// 2. Cybersecurity
const CYBER_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #DC2626; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>3.5 Million Cybersecurity Jobs Are Unfilled. We Fill Yours.</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Cybersecurity Talent on Demand</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>The average cost of a data breach hit <strong>$4.88M in 2025</strong>. Meanwhile, <strong>3.5 million cybersecurity positions remain unfilled globally</strong>. Threat surfaces are expanding faster than security teams can grow.</p>
<p style='font-size: 15px; line-height: 1.6;'>If {{companyName}} is scaling security, we have pre-vetted specialists ready in 48 hours:</p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>Cloud Security Architects</strong> — AWS/Azure/GCP security, IAM, Zero Trust implementation</li>
<li><strong>Penetration Testers</strong> — OSCP/OSCE certified, web app, API, and infrastructure pentesting</li>
<li><strong>SOC Analysts & Threat Hunters</strong> — SIEM, EDR, incident response, threat intelligence</li>
<li><strong>Security Engineers</strong> — DevSecOps, SAST/DAST, container security, supply chain security</li>
<li><strong>Compliance Specialists</strong> — SOC2, HIPAA, PCI-DSS, ISO 27001, EU AI Act</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Transparent pricing: <strong>$2/hr</strong> is our fee. The specialist keeps the rest. No hidden markups.</p>
<p style='font-size: 15px; line-height: 1.6;'>15 minutes to discuss {{companyName}}'s security gaps?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/staffing' style='background-color: #DC2626; background: linear-gradient(135deg, #DC2626, #991B1B); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Get Security Talent Now</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div></div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'><p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p></div></div>`;

const CYBER_SUBJECTS = [
  "$4.88M per breach. Is {{companyName}}'s security team big enough?",
  "3.5 million cybersecurity jobs unfilled — we fill yours in 48hrs",
  "Quick question about {{companyName}}'s security posture",
  "OSCP-certified pen testers, SOC analysts, Zero Trust architects — ready now",
  "{{companyName}}'s security gaps won't wait. Neither should you.",
];

// 3. Data Engineering
const DATA_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #059669; background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>Your Data Pipeline Is Only as Good as the Engineer Behind It</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Data Engineering & Analytics Talent</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Every AI initiative starts with data. But <strong>data engineering roles take 85+ days to fill</strong> — and the demand is only growing as companies race to build real-time pipelines, lakehouse architectures, and AI-ready data platforms.</p>
<p style='font-size: 15px; line-height: 1.6;'>We deliver pre-vetted data engineers to {{companyName}} in 48 hours:</p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>Spark & Databricks Engineers</strong> — Large-scale ETL, streaming, Delta Lake, Unity Catalog</li>
<li><strong>Snowflake & BigQuery Architects</strong> — Data modeling, cost optimization, performance tuning</li>
<li><strong>Real-Time Pipeline Builders</strong> — Kafka, Flink, Kinesis, event-driven architectures</li>
<li><strong>dbt + Airflow Specialists</strong> — Modern data stack, data quality, lineage, testing</li>
<li><strong>Analytics Engineers</strong> — Power BI, Tableau, Looker, semantic layers, metric stores</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Transparent pricing: <strong>$2/hr</strong> is our fee. The engineer keeps the rest. Full visibility for both sides.</p>
<p style='font-size: 15px; line-height: 1.6;'>15 minutes to discuss {{companyName}}'s data roadmap?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/staffing' style='background-color: #059669; background: linear-gradient(135deg, #059669, #047857); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Get Data Engineer Profiles</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div></div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'><p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p></div></div>`;

const DATA_SUBJECTS = [
  "Every AI project starts with data. Does {{companyName}} have the engineers?",
  "Data engineers take 85 days to hire. We deliver in 48 hours.",
  "Quick question about {{companyName}}'s data platform",
  "Spark, Snowflake, real-time pipelines — pre-vetted talent ready now",
  "{{companyName}}'s data pipeline is the bottleneck. Let's fix it.",
];

// 4. Full-Stack Engineering
const FULLSTACK_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #F59E0B; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>Full-Stack Engineers Who Ship — Not Just Code</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Product Engineering Talent</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>The bar for full-stack engineers keeps rising. In 2026, companies need engineers who understand <strong>AI-assisted development, edge computing, server components, and real-time collaboration</strong> — not just React and Node. Finding them takes months.</p>
<p style='font-size: 15px; line-height: 1.6;'>We deliver full-stack engineers who ship product, not just code:</p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>React + Next.js</strong> — Server components, App Router, streaming SSR, edge functions</li>
<li><strong>Node.js + Python Backend</strong> — REST/GraphQL APIs, microservices, event-driven</li>
<li><strong>TypeScript Everywhere</strong> — Type-safe full-stack with tRPC, Prisma, Zod</li>
<li><strong>AI-Augmented Development</strong> — Engineers who use Copilot, Claude, Cursor productively — 2-3x velocity</li>
<li><strong>Modern Deployment</strong> — Vercel, AWS, Docker, CI/CD, feature flags, A/B testing</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Transparent pricing: <strong>$2/hr</strong> is our fee. The engineer keeps the rest. No surprises.</p>
<p style='font-size: 15px; line-height: 1.6;'>15 minutes to talk about {{companyName}}'s engineering needs?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/staffing' style='background-color: #F59E0B; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Get Full-Stack Profiles</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div></div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'><p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p></div></div>`;

const FULLSTACK_SUBJECTS = [
  "Full-stack engineers who use AI to ship 2-3x faster — ready for {{companyName}}",
  "React + Next.js + AI-augmented dev: the 2026 full-stack stack",
  "Quick question about {{companyName}}'s product engineering team",
  "Your next full-stack hire should ship product, not just code",
  "{{companyName}} needs engineers who build — we have them ready in 48hrs",
];

// 5. Mobile Engineering
const MOBILE_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #EC4899; background: linear-gradient(135deg, #EC4899 0%, #BE185D 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 21px; line-height: 1.3;'>iOS & Android Engineers Who Build Apps People Love</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Mobile Engineering Talent</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Mobile is no longer just an app — it's the primary interface for most businesses. In 2026, users expect <strong>on-device AI, haptic feedback, spatial computing readiness, and sub-second performance</strong>. The engineers who can deliver this are rare and expensive.</p>
<p style='font-size: 15px; line-height: 1.6;'>We deliver mobile engineers who build apps people love:</p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>iOS / Swift</strong> — SwiftUI, Core ML on-device AI, WidgetKit, VisionOS-ready</li>
<li><strong>Android / Kotlin</strong> — Jetpack Compose, ML Kit, Material 3, Wear OS</li>
<li><strong>Cross-Platform</strong> — React Native (Expo), Flutter, KMP (Kotlin Multiplatform)</li>
<li><strong>Mobile Architecture</strong> — Modular architecture, offline-first, CI/CD with Fastlane/Bitrise</li>
<li><strong>App Performance</strong> — Launch time optimization, memory profiling, battery efficiency</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Transparent pricing: <strong>$2/hr</strong> is our fee. The engineer keeps the rest. Complete rate visibility.</p>
<p style='font-size: 15px; line-height: 1.6;'>15 minutes to discuss {{companyName}}'s mobile roadmap?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/staffing' style='background-color: #EC4899; background: linear-gradient(135deg, #EC4899, #BE185D); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Get Mobile Engineer Profiles</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div></div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'><p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p></div></div>`;

const MOBILE_SUBJECTS = [
  "SwiftUI + Jetpack Compose engineers — ready for {{companyName}} in 48hrs",
  "Quick question about {{companyName}}'s mobile app team",
  "On-device AI is the new baseline. Does your mobile team know it?",
  "iOS & Android engineers who build apps people actually love",
  "{{companyName}}'s next mobile hire should know on-device ML. We have them.",
];

// 6. Ready to Onboard — No commitment, contract to sign, start immediately
const ONBOARD_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #10B981; background: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 22px; line-height: 1.3;'>Ready to Hire? Skip the Sales Call. Start Now.</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>Zietra — Zero Commitment. Cancel Anytime. Profiles in 48hrs.</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Most staffing firms make you sit through 3 calls, an NDA review, and a contract negotiation before you see a single resume. <strong>We skip all that.</strong></p>
<p style='font-size: 15px; line-height: 1.6;'>Here is how onboarding works at Zietra:</p>
<table style='width: 100%; border-collapse: collapse; margin: 16px 0;'>
<tr>
<td style='padding: 14px; background: #f0fdf4; border-radius: 8px 8px 0 0; border: 1px solid #bbf7d0;'>
<strong style='color: #059669; font-size: 18px;'>Step 1</strong><br>
<span style='font-size: 14px; color: #333;'>Sign our simple agreement — no commitment, no minimum term, cancel anytime</span>
</td>
</tr>
<tr>
<td style='padding: 14px; background: #ecfdf5; border: 1px solid #bbf7d0; border-top: none;'>
<strong style='color: #059669; font-size: 18px;'>Step 2</strong><br>
<span style='font-size: 14px; color: #333;'>Tell us what you need — role, skills, seniority, start date</span>
</td>
</tr>
<tr>
<td style='padding: 14px; background: #f0fdf4; border-radius: 0 0 8px 8px; border: 1px solid #bbf7d0; border-top: none;'>
<strong style='color: #059669; font-size: 18px;'>Step 3</strong><br>
<span style='font-size: 14px; color: #333;'>Receive 2-3 pre-vetted profiles in your inbox within 48 hours</span>
</td>
</tr>
</table>
<p style='font-size: 15px; line-height: 1.6;'><strong>Our terms:</strong></p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>$2/hr transparent fee</strong> — you see our fee, engineer sees their rate</li>
<li><strong>No minimum contract</strong> — hire for 1 week or 1 year</li>
<li><strong>30-day replacement guarantee</strong> — wrong fit? Free replacement</li>
<li><strong>Cancel anytime</strong> — no lock-in, no penalties, no exit fees</li>
<li><strong>15% for full-time conversions</strong> — love them? Hire them permanently</li>
</ul>
<p style='font-size: 16px; font-weight: 700; color: #333; text-align: center; margin: 24px 0 8px;'>Choose how you want to start:</p>
<div style='display: flex; gap: 10px; margin: 0 0 20px;'>
<div style='flex: 1; text-align: center;'>
<a href='https://zietra.com/onboard' style='display: block; background-color: #10B981; background: linear-gradient(135deg, #10B981, #059669); color: #fff; padding: 14px 8px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;'>Start Now<br><span style='font-size: 11px; font-weight: 400; opacity: 0.9;'>Sign & get profiles</span></a>
</div>
<div style='flex: 1; text-align: center;'>
<a href='mailto:peter@zietra.com?subject=Ready to onboard — {{companyName}}&body=Hi Peter, we are ready to start. Please send over the agreement.' style='display: block; background: #1a1a2e; color: #fff; padding: 14px 8px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; border: 1px solid #333;'>Email Peter<br><span style='font-size: 11px; font-weight: 400; opacity: 0.9;'>Direct reply</span></a>
</div>
<div style='flex: 1; text-align: center;'>
<a href='tel:+1-555-0123' style='display: block; background: #fff; color: #059669; padding: 14px 8px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; border: 2px solid #10B981;'>Call Now<br><span style='font-size: 11px; font-weight: 400; color: #666;'>Talk to Peter</span></a>
</div>
</div>
<div style='background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 16px 0;'>
<p style='font-size: 13px; color: #333; margin: 0; line-height: 1.5;'><strong>No commitment means no commitment.</strong> Our agreement is 2 pages. No exclusivity, no minimum hours, no hidden clauses. If you don't like what you see, walk away. We earn your business every day.</p>
</div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 20px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
<p style='font-size: 12px; color: #999; margin: 4px 0 0;'>peter@zietra.com | Direct line available on request</p>
</div>
</div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'>
<p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | No commitment staffing | peter@zietra.com</p>
</div>
</div>`;

const ONBOARD_SUBJECTS = [
  "Skip the sales call. Sign and get profiles in 48 hours.",
  "No commitment. No minimum. Cancel anytime. Ready to start?",
  "{{companyName}}: ready to onboard? Profiles in 48 hours, zero lock-in.",
  "2-page agreement, 48-hour profiles, $2/hr. That's it.",
  "Most firms need 3 calls to start. We need 1 signature.",
];

// GET /api/campaigns/all-templates — List all campaign templates with HTML content
router.get('/all-templates', async (req, res) => {
  const includeHtml = req.query.html === 'true';
  const templates = [
    { id: 'erp', name: 'ERP', color: '#FF6B35', subjects: ERP_SUBJECTS, ...(includeHtml && { htmlContent: ERP_CAMPAIGN_HTML }) },
    { id: 'ai', name: 'AI Consulting', color: '#8B5CF6', subjects: AI_SUBJECTS, ...(includeHtml && { htmlContent: AI_CAMPAIGN_HTML }) },
    { id: 'cloud', name: 'Cloud & Platform Engineering', color: '#0EA5E9', subjects: CLOUD_SUBJECTS, ...(includeHtml && { htmlContent: CLOUD_CAMPAIGN_HTML }) },
    { id: 'cyber', name: 'Cybersecurity', color: '#DC2626', subjects: CYBER_SUBJECTS, ...(includeHtml && { htmlContent: CYBER_CAMPAIGN_HTML }) },
    { id: 'data', name: 'Data Engineering', color: '#059669', subjects: DATA_SUBJECTS, ...(includeHtml && { htmlContent: DATA_CAMPAIGN_HTML }) },
    { id: 'fullstack', name: 'Full-Stack Engineering', color: '#F59E0B', subjects: FULLSTACK_SUBJECTS, ...(includeHtml && { htmlContent: FULLSTACK_CAMPAIGN_HTML }) },
    { id: 'mobile', name: 'Mobile Engineering', color: '#EC4899', subjects: MOBILE_SUBJECTS, ...(includeHtml && { htmlContent: MOBILE_CAMPAIGN_HTML }) },
    { id: 'onboard', name: 'Ready to Onboard — No Commitment', color: '#10B981', subjects: ONBOARD_SUBJECTS, wip: true, ...(includeHtml && { htmlContent: ONBOARD_CAMPAIGN_HTML }) },
  ];
  return res.json({ templates });
});

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id, // ✅ Data isolation
      },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                  },
                },
                _count: {
                  select: { contacts: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            emailLogs: true,
            companies: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json({ campaign });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/:id/companies/:companyId - Add company to campaign
router.post('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    // ✅ Verify campaign exists and user owns it
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // ✅ Verify company exists and user owns it
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: req.user?.id,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if already added
    const existing = await prisma.campaignCompany.findUnique({
      where: {
        campaignId_companyId: {
          campaignId: id,
          companyId: companyId,
        },
      },
    });

    if (existing) {
      return res.json({
        message: 'Company already in campaign',
        campaignCompany: existing
      });
    }

    // Add company to campaign
    const campaignCompany = await prisma.campaignCompany.create({
      data: {
        campaignId: id,
        companyId: companyId,
      },
      include: {
        company: true,
      },
    });

    return res.json({
      message: 'Company added to campaign successfully',
      campaignCompany
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/campaigns/:id/companies/:companyId - Remove company from campaign
router.delete('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    // ✅ Verify campaign exists and user owns it
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Remove company from campaign
    await prisma.campaignCompany.delete({
      where: {
        campaignId_companyId: {
          campaignId: id,
          companyId: companyId,
        },
      },
    });

    return res.json({ message: 'Company removed from campaign' });
  } catch (error) {
    return next(error);
  }
});

// GET /api/campaigns/:id/companies - Get companies in campaign
router.get('/:id/companies', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id, // ✅ Data isolation
      },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  take: 5,
                },
                _count: {
                  select: { contacts: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const companies = campaign.companies.map((cc) => ({
      ...cc.company,
      addedAt: cc.addedAt,
    }));

    return res.json({ companies });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-basics - Generate campaign name and goal
router.post('/ai/generate-basics', async (req, res, next) => {
  try {
    const { tone, description } = req.body;

    const prompt = `You are the head of business development at Zietra, a premium technology staffing company. Generate a campaign name and goal for an outreach email campaign.

Your company (Zietra) provides pre-vetted technology talent to enterprise clients — AI/ML engineers, cloud architects, cybersecurity analysts, full-stack developers, data engineers, DevOps specialists, and more.

Tone: ${tone || 'professional'}
Campaign Brief: ${description || 'Reach out to enterprise companies about our technology staffing services'}

Generate a short, punchy campaign name and a clear business goal. The goal should focus on getting meetings/calls with hiring managers.

Return ONLY valid JSON:
{"name": "Short Campaign Name", "goal": "One sentence goal focused on business outcome"}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('basic'),
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      // Strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-subject - Generate AI-powered subject lines
router.post('/ai/generate-subject', async (req, res, next) => {
  try {
    const { goal, tone, campaignName } = req.body;

    if (!goal || !tone || !campaignName) {
      return res.status(400).json({
        error: 'goal, tone, and campaignName are required'
      });
    }

    const prompt = `You are a staffing sales executive at Zietra writing subject lines for outreach emails to hiring managers at enterprise companies.

Campaign Goal: ${goal}
Tone: ${tone}
Campaign Name: ${campaignName}

Write 5 short, human subject lines (under 60 chars) that a real person would send. NOT marketing-speak. Think: what would you write to a VP of Engineering you want to grab coffee with?

Use {{companyName}} where the company name should go.

Examples of GOOD subject lines:
- "Quick question about {{companyName}}'s AI team"
- "{{companyName}} + Zietra — 3 engineers ready this week"
- "Saw {{companyName}} is hiring cloud architects"

Examples of BAD subject lines (too salesy/generic):
- "Unlock Your Hiring Potential Today!"
- "Revolutionary Staffing Solutions Await"

Return ONLY valid JSON:
{"variants": ["line 1", "line 2", "line 3", "line 4", "line 5"]}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('subject'),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      // Strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-content - Generate AI-powered email content
router.post('/ai/generate-content', async (req, res, next) => {
  try {
    const { goal, subject, tone, personalization } = req.body;

    if (!goal || !subject || !tone) {
      return res.status(400).json({
        error: 'goal, subject, and tone are required'
      });
    }

    const prompt = `You are a senior business development executive at Zietra, a premium technology staffing firm. Write a professional outreach email to a hiring manager.

Campaign Goal: ${goal}
Subject Line: ${subject}
Tone: ${tone}
Personalization: Use {{firstName}} for the recipient's first name and {{companyName}} for their company name.

Write an email that:
1. Opens with "Hi {{firstName}}," — warm and personal
2. References {{companyName}} specifically — show you know their company
3. Gets to the point in 2-3 short paragraphs — what you offer and why they should care
4. Includes 3-5 bullet points of specific value (e.g. "48-hour candidate delivery", "Pre-vetted engineers", specific tech roles available)
5. Ends with a simple CTA: "Would you be open to a 15-minute call this week?"
6. Signs off as "Best, Zietra Staffing Team"

DO NOT:
- Use marketing buzzwords like "synergy", "leverage", "revolutionize"
- Write more than 250 words
- Use ALL CAPS or excessive exclamation marks
- Sound like a mass email — this should feel like a personal note

Format as clean HTML with:
- A gradient header bar (background-color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)) with the campaign headline in white
- Body on white background (#ffffff) with dark text (#333333)
- Bullet points styled clearly
- A centered CTA button with the gradient background
- Professional font: 'Segoe UI', Arial, sans-serif
- Max width 600px, centered
- All CSS must be INLINE (no <style> tags)
- Use SINGLE QUOTES for all HTML attributes

IMPORTANT: Return ONLY valid JSON. Escape all quotes properly.
{"content": "<div style='...'>full HTML email here</div>", "previewText": "First line preview"}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('content'),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      try {
        // Strip markdown code blocks if present
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
        }

        // Try to parse the JSON
        const result = JSON.parse(jsonText);
        return res.json(result);
      } catch (parseError: any) {
        console.error('JSON Parse Error:', parseError);
        console.error('AI Response:', content.text.substring(0, 500));
        return res.status(500).json({
          error: 'Failed to parse AI response. Please try again.',
          details: parseError?.message || 'Unknown error'
        });
      }
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/optimize-send-time - Get optimal send time
router.post('/ai/optimize-send-time', async (req, res, next) => {
  try {
    // Calculate optimal time as Tuesday at 10 AM (next Tuesday)
    const now = new Date();
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
    const optimalDate = new Date(now);
    optimalDate.setDate(now.getDate() + daysUntilTuesday);
    optimalDate.setHours(10, 0, 0, 0);

    return res.json({
      optimalTime: optimalDate.toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

// Send via user's configured SMTP email server
async function sendEmailViaSMTP(
  server: { host: string; port: number; secure: boolean; username: string; password: string; fromEmail: string; fromName: string | null },
  to: string,
  subject: string,
  html: string
) {
  const decryptedPassword = Buffer.from(server.password, 'base64').toString();
  const transporter = nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure: server.secure,
    auth: { user: server.username, pass: decryptedPassword },
  });
  return transporter.sendMail({
    from: `"${server.fromName || 'Zietra'}" <${server.fromEmail}>`,
    to,
    subject,
    html,
  });
}

// Get user's verified email server, or null if none configured
async function getUserEmailServer(userId: string) {
  const server = await prisma.emailServerConfig.findFirst({
    where: { userId, isActive: true, isVerified: true },
    orderBy: { createdAt: 'desc' },
  });
  return server;
}

// Fallback: send via env var SMTP (peter@zietra.com or whatever is configured)
async function sendEmailViaEnvSMTP(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || 'Zietra';

  if (!host || !user || !pass) {
    throw new Error('No SMTP configuration found. Configure an email server in Settings.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

// Send email via user's verified DB email server
async function sendEmail(to: string, subject: string, html: string, userId?: string) {
  if (!userId) {
    throw new Error('userId is required for campaign sends');
  }
  const server = await getUserEmailServer(userId);
  if (!server) {
    throw new Error('No verified email server configured. Please add and verify an email server in Settings.');
  }
  return sendEmailViaSMTP(server, to, subject, html);
}

// POST /api/campaigns/:id/send - Send campaign emails to all linked contacts
router.post('/:id/send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get campaign with linked companies and their contacts
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.subject || !campaign.htmlContent) {
      return res.status(400).json({ error: 'Campaign must have a subject and content' });
    }

    // Collect all unique contacts from linked companies
    const contactMap = new Map<string, { id: string; email: string; firstName: string; lastName: string; companyName: string }>();
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && !contactMap.has(contact.email)) {
          contactMap.set(contact.email, {
            ...contact,
            companyName: cc.company.name || '',
          });
        }
      }
    }

    const contacts = Array.from(contactMap.values());
    let sent = 0;
    let failed = 0;

    // Require user's verified email server
    const userServer = await getUserEmailServer(userId!);
    if (!userServer) {
      return res.status(400).json({ error: 'No verified email server configured. Please add and verify an email server in Settings before sending campaigns.' });
    }
    const fromEmail = userServer.fromEmail;

    const TRACKING_BASE = process.env.FRONTEND_URL || 'https://zietra.com';

    for (const contact of contacts) {
      try {
        // Replace template variables
        let subjectLine = campaign.subject;
        let html = campaign.htmlContent;
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.companyName || '',
        };
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subjectLine = subjectLine.replace(regex, val);
          html = html.replace(regex, val);
        }

        // Create email log FIRST to get the ID for tracking pixel
        let emailLogId = '';
        try {
          const emailLog = await prisma.emailLog.create({
            data: {
              toEmail: contact.email,
              fromEmail,
              status: 'SENT',
              sentAt: new Date(),
              campaignId: campaign.id,
              contactId: contact.id,
            } as any,
          });
          emailLogId = emailLog.id;
        } catch {
          // Continue without tracking
        }

        // Inject tracking pixel + wrap links for click tracking
        if (emailLogId) {
          const trackingPixel = `<img src="${TRACKING_BASE}/api/tracking/open/${emailLogId}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" />`;
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${trackingPixel}</body>`);
          } else if (html.includes('</div>')) {
            html = html.replace(/<\/div>\s*$/, `${trackingPixel}</div>`);
          } else {
            html += trackingPixel;
          }
          html = wrapLinksWithTracking(html, emailLogId, TRACKING_BASE);
        }

        await sendEmail(contact.email, subjectLine, html, userId);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${contact.email}:`, err);
        failed++;
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: sent,
      },
    });

    return res.json({ sent, total: contacts.length, failed });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/:id/mock-send - Queue campaign without sending (preview mode)
router.post('/:id/mock-send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.subject || !campaign.htmlContent) {
      return res.status(400).json({ error: 'Campaign must have a subject and content' });
    }

    // Collect unique contacts
    const contactMap = new Map<string, any>();
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && !contactMap.has(contact.email)) {
          contactMap.set(contact.email, { ...contact, companyName: cc.company.name });
        }
      }
    }

    const contacts = Array.from(contactMap.values());

    // Log as QUEUED (not sent)
    for (const contact of contacts) {
      try {
        await prisma.emailLog.create({
          data: {
            toEmail: contact.email,
            fromEmail: process.env.SMTP_FROM_EMAIL || 'campaigns@zietra.com',
            status: 'QUEUED',
            campaignId: campaign.id,
            contactId: contact.id,
          } as any,
        });
      } catch {
        // Non-blocking
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: contacts.length,
      },
    });

    return res.json({
      success: true,
      sent: contacts.length,
      total: contacts.length,
      failed: 0,
      mode: 'queued',
      message: `Campaign queued for ${contacts.length} contacts. Emails will be sent when you click Send on the campaign.`,
      recipients: contacts.map((c: any) => ({
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        company: c.companyName,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ERP-specific $2/hr staff augmentation email template (updated for 2026.1)
const ERP_CAMPAIGN_HTML = `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background-color: #FF6B35; background: linear-gradient(135deg, #FF6B35 0%, #e85d26 100%); padding: 30px 24px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 22px; line-height: 1.3;'>ERP Engineers at $2/hr</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>2026.1 Ready — AI Canvas, Agentic Workflows, SuiteScript 2.1, Solution Architects</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Oracle just launched <strong>modern stack</strong> — AI Canvas, Agentic Workflows, Ask Oracle — plus 2026.1 with MCP integrations and REST API replacing SOAP. Finding engineers who know this is near impossible. <strong>82% of firms cite ERP talent shortage as their #1 challenge.</strong></p>
<p style='font-size: 15px; line-height: 1.6;'>Traditional staffing firms charge 15-20% markup — and neither the company nor the engineer knows who gets what. We believe in <strong>full transparency</strong>: our fee is a flat <strong>$2/hr</strong>. The candidate keeps the rest. Both sides see the complete picture — no guessing, no hidden margins.</p>
<p style='font-size: 15px; line-height: 1.6;'><strong>What we deliver for {{companyName}}:</strong></p>
<ul style='font-size: 14px; line-height: 1.9; color: #333; padding-left: 20px;'>
<li><strong>modern stack + 2026.1 Ready</strong> — AI Canvas, Agentic Workflows, SuiteScript 2.1, MCP/AI Connector specialists</li>
<li><strong>Solution Architects + Full Stack</strong> — ERP Solution Architects, SuiteFlow, SuiteAnalytics, admins, implementation consultants</li>
<li><strong>48-hour delivery</strong> — 2-3 pre-vetted profiles in your inbox within 2 business days</li>
<li><strong>Transparent $2/hr</strong> — you see our fee, the engineer sees their rate. No hidden costs on either side.</li>
<li><strong>30-day guarantee</strong> — wrong fit? Free replacement, zero risk</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Full-time placements at a transparent 15% — industry averages 20-25% with hidden fees on top.</p>
<p style='font-size: 15px; line-height: 1.6;'>Would a 15-minute call this week work to discuss {{companyName}}'s ERP talent needs?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/erp' style='background-color: #FF6B35; background: linear-gradient(135deg, #FF6B35 0%, #e85d26 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Book a 15-Min Call</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — Zietra</p>
</div>
</div>
<div style='background: #1a1a2e; padding: 14px; text-align: center; border-radius: 0 0 8px 8px;'>
<p style='font-size: 11px; color: #b0b0c3; margin: 0;'>Zietra | peter@zietra.com</p>
</div>
</div>`;

// ERP campaign template and quick-send below

// POST /api/campaigns/quick-send - One-click ERP campaign send
router.post('/quick-send', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.body?.limit) || 50, 500); // Default 50, max 500
    const subjectVariant = Math.min(Math.max(parseInt(req.body?.subjectVariant) || 0, 0), ERP_SUBJECTS.length - 1);

    // Build team-aware user IDs (same pattern as GET /api/campaigns)
    const teamUserIds: string[] = [userId];
    if (req.user?.teamRole === 'MEMBER' && req.user?.accountOwnerId) {
      teamUserIds.push(req.user.accountOwnerId);
    }
    if (req.user?.teamRole === 'OWNER') {
      const members = await prisma.user.findMany({
        where: { accountOwnerId: userId },
        select: { id: true },
      });
      members.forEach((m: any) => teamUserIds.push(m.id));
    }

    // 1. Find ERP companies (csv_import) across the whole team
    const companies = await prisma.company.findMany({
      where: {
        userId: { in: teamUserIds },
        dataSource: 'csv_import',
      },
      include: {
        contacts: {
          where: { isActive: true, email: { not: null, contains: '@' } },
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Filter to only companies with emailable contacts
    const emailableCompanies = companies.filter(c => c.contacts.length > 0);

    if (emailableCompanies.length === 0) {
      return res.status(400).json({ error: 'No ERP companies with valid contacts found. Import companies first.' });
    }

    // Collect all contacts, cap at limit
    const allContacts: { contact: { id: string; email: string; firstName: string; lastName: string }; companyName: string; companyId: string }[] = [];
    for (const company of emailableCompanies) {
      for (const contact of company.contacts) {
        if (allContacts.length >= limit) break;
        allContacts.push({ contact, companyName: company.name || '', companyId: company.id });
      }
      if (allContacts.length >= limit) break;
    }

    const companiesUsed = [...new Set(allContacts.map(c => c.companyId))];

    // 2. Create campaign with selected subject variant
    const selectedSubject = ERP_SUBJECTS[subjectVariant];
    const campaign = await prisma.campaign.create({
      data: {
        name: `ERP Campaign — Subject #${subjectVariant + 1}`,
        subject: selectedSubject,
        status: 'SENDING',
        htmlContent: ERP_CAMPAIGN_HTML,
        userId,
      },
    });

    // 3. Link companies used to the campaign
    await prisma.campaignCompany.createMany({
      data: companiesUsed.map((companyId) => ({
        campaignId: campaign.id,
        companyId,
      })),
      skipDuplicates: true,
    });

    // 4. Validate emails and start throttled send
    const intervalMinutes = Math.min(Math.max(parseInt(req.body?.intervalMinutes) || 5, 1), 30);
    const validContacts = allContacts.filter(c => isValidEmail(c.contact.email));
    const invalidCount = allContacts.length - validContacts.length;

    if (validContacts.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses found', invalidCount });
    }

    // Set campaign to SENDING
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } });

    // Start throttled background send (returns immediately)
    await startThrottledSend(campaign.id, userId, validContacts, campaign.subject!, ERP_CAMPAIGN_HTML, intervalMinutes);

    const estimatedMinutes = (validContacts.length - 1) * intervalMinutes;
    return res.json({
      success: true,
      campaignId: campaign.id,
      total: validContacts.length,
      invalidSkipped: invalidCount,
      companyCount: companiesUsed.length,
      intervalMinutes,
      estimatedCompletion: `~${estimatedMinutes} minutes`,
      message: `Sending ${validContacts.length} emails, 1 every ${intervalMinutes} min. First sent immediately.`,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
