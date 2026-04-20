import crypto from 'crypto';
import express, { Router } from 'express';
import { PrismaClient, ContractStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  sendOtpEmail,
  sendClientSignedNotification,
  sendSigningRequest,
} from '../services/contractEmailService';

const router = Router();
const prisma = new PrismaClient();

// Allow up to 1 MB body for base64 signature data
router.use(express.json({ limit: '1mb' }));

// ─── In-memory OTP rate limiter ───────────────────────────────────────────────
// Maps contractId → array of request timestamps (prunes automatically)
const otpRateLimitMap = new Map<string, number[]>();
const OTP_RATE_LIMIT_MAX = 3;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isOtpRateLimited(contractId: string): boolean {
  const now = Date.now();
  const windowStart = now - OTP_RATE_WINDOW_MS;
  const timestamps = (otpRateLimitMap.get(contractId) ?? []).filter(t => t > windowStart);
  if (timestamps.length >= OTP_RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  otpRateLimitMap.set(contractId, timestamps);
  return false;
}

// ─── Email masking helper ─────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET!;

// ─── GET /:token — retrieve contract info for signing page ───────────────────
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    const senderName = contract.user
      ? `${contract.user.firstName} ${contract.user.lastName}`.trim()
      : 'Zietra';

    // Only include content if OTP has been verified (status past SENT_FOR_SIGNATURE)
    const pastSent =
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.SENT_FOR_SIGNATURE;

    return res.json({
      id: contract.id,
      title: contract.title,
      contractType: 'Service Agreement',
      senderName,
      signerName: contract.signerName,
      signerEmail: contract.signerEmail ? maskEmail(contract.signerEmail) : null,
      status: contract.status,
      expiresAt: contract.tokenExpiresAt,
      ...(pastSent ? { content: contract.content } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/request-otp — send OTP to signer ───────────────────────────
router.post('/:token/request-otp', async (req, res, next) => {
  try {
    const { token } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    if (!contract.signerEmail || !contract.signerName) {
      return res.status(400).json({ error: 'Contract is missing signer information' });
    }

    // Rate limit: 3 OTP requests per hour per contract
    if (isOtpRateLimited(contract.id)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    }

    // Generate 6-digit OTP
    const otpCode = String(crypto.randomInt(100000, 999999));
    const hashedCode = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.contractOTP.create({
      data: {
        contractId: contract.id,
        email: contract.signerEmail,
        code: hashedCode,
        expiresAt,
      },
    });

    sendOtpEmail({
      to: contract.signerEmail,
      clientName: contract.signerName,
      otp: otpCode,
      contractTitle: contract.title,
      expiresInMinutes: 10,
    }).catch((err: any) => console.error('Failed to send OTP email:', err.message));

    return res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/verify-otp — verify OTP, return session token ──────────────
router.post('/:token/verify-otp', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { otp } = req.body as { otp?: string };

    if (!otp) {
      return res.status(400).json({ error: 'otp is required' });
    }

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    // Find the latest non-expired, non-verified OTP
    const otpRecord = await prisma.contractOTP.findFirst({
      where: {
        contractId: contract.id,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'No valid OTP found. Please request a new one.' });
    }

    // Increment attempt count
    await prisma.contractOTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Max 5 attempts
    if (otpRecord.attempts + 1 >= 5) {
      // Invalidate the OTP by expiring it
      await prisma.contractOTP.update({
        where: { id: otpRecord.id },
        data: { expiresAt: new Date() },
      });
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.code);

    if (!isValid) {
      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    // Mark OTP as verified
    await prisma.contractOTP.update({
      where: { id: otpRecord.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedIp: req.ip || null,
      },
    });

    // Transition to VIEWED if still at SENT_FOR_SIGNATURE
    if (contract.status === ContractStatus.SENT_FOR_SIGNATURE) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.VIEWED, updatedAt: new Date() },
      });
    }

    // Issue a 30-minute JWT session token
    const sessionToken = jwt.sign(
      {
        contractId: contract.id,
        email: contract.signerEmail,
        otpId: otpRecord.id,
        type: 'contract-signing',
      },
      JWT_SECRET,
      { expiresIn: '30m' },
    );

    return res.json({
      sessionToken,
      content: contract.content,
    });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/submit — submit client signature ────────────────────────────
router.post('/:token/submit', async (req, res, next) => {
  try {
    const { token } = req.params;
    const {
      signatureData,
      signatureType,
      signerName,
      sessionToken,
      agreedToTerms,
    } = req.body as {
      signatureData?: string;
      signatureType?: string;
      signerName?: string;
      sessionToken?: string;
      agreedToTerms?: boolean;
    };

    // Validate required fields
    if (!signatureData) return res.status(400).json({ error: 'signatureData is required' });
    if (!signatureType || !['typed', 'drawn'].includes(signatureType)) {
      return res.status(400).json({ error: "signatureType must be 'typed' or 'drawn'" });
    }
    if (!signerName) return res.status(400).json({ error: 'signerName is required' });
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });
    if (!agreedToTerms) return res.status(400).json({ error: 'agreedToTerms must be true' });

    // Validate signature data size
    if (signatureData.length > 700000) {
      return res.status(400).json({ error: 'Signature data exceeds maximum allowed size' });
    }

    // Verify JWT session token
    let sessionPayload: {
      contractId: string;
      email: string;
      otpId: string;
      type: string;
    };

    try {
      sessionPayload = jwt.verify(sessionToken, JWT_SECRET) as typeof sessionPayload;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please re-verify your identity.' });
    }

    if (sessionPayload.type !== 'contract-signing') {
      return res.status(401).json({ error: 'Invalid session token type' });
    }

    // Fetch contract by signing token
    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Verify session token contractId matches this contract
    if (sessionPayload.contractId !== contract.id) {
      return res.status(401).json({ error: 'Session token does not match this contract' });
    }

    // Contract must be SENT_FOR_SIGNATURE or VIEWED
    if (
      contract.status !== ContractStatus.SENT_FOR_SIGNATURE &&
      contract.status !== ContractStatus.VIEWED
    ) {
      return res.status(409).json({
        error: `Contract cannot be signed in its current status (${contract.status})`,
      });
    }

    // Verify OTP record exists and is verified
    const otpRecord = await prisma.contractOTP.findUnique({
      where: { id: sessionPayload.otpId },
    });

    if (!otpRecord || !otpRecord.verified) {
      return res.status(401).json({ error: 'OTP verification record not found or not verified' });
    }

    const ip = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const signedAt = new Date();

    // Update contract to AWAITING_COUNTERSIGN
    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.AWAITING_COUNTERSIGN,
        signatureData,
        signatureType,
        signerName,
        signatureIp: ip,
        signatureAgent: userAgent,
        signerOtpId: otpRecord.id,
        signedAt,
        signedBy: signerName,
        updatedAt: new Date(),
      },
    });

    // Notify contract owner
    const ownerEmail = contract.user?.email;
    const ownerName = contract.user
      ? `${contract.user.firstName} ${contract.user.lastName}`.trim()
      : 'Zietra';

    if (ownerEmail) {
      sendClientSignedNotification({
        to: ownerEmail,
        ownerName,
        clientName: signerName,
        clientEmail: contract.signerEmail || '',
        contractTitle: contract.title,
        contractId: contract.id,
        signedAt,
      }).catch((err: any) => console.error('Failed to send signed notification:', err.message));
    }

    return res.json({
      message: 'Signature submitted successfully',
      status: updated.status,
    });
  } catch (error) {
    return next(error);
  }
});

// Standard staffing agreement template
const STAFFING_AGREEMENT_TEMPLATE = `<h1 style="text-align:center;color:#059669;">Zietra Staffing Agreement</h1>
<p style="text-align:center;color:#666;">No Commitment · Cancel Anytime · Transparent Pricing</p><hr>
<h2>1. Services</h2>
<p>Zietra ("Provider") will source, vet, and present pre-qualified technology professionals to <strong>{{companyName}}</strong> ("Client") for contract, contract-to-hire, or direct placement engagements.</p>
<h2>2. Transparent Pricing</h2>
<p><strong>Contract Staffing:</strong> Provider fee is a flat <strong>$2.00 per hour</strong> per placed contractor. This is the entire margin — the contractor receives the remainder of the agreed bill rate. Both parties see the full rate breakdown.</p>
<p><strong>Direct Placement:</strong> Fee is <strong>15% of the candidate's first-year annual salary</strong>, payable within 30 days of the candidate's start date.</p>
<h2>3. No Minimum Commitment</h2>
<p>There is no minimum term, no minimum hours, and no exclusivity requirement. Client may engage or disengage services at any time with 5 business days written notice.</p>
<h2>4. Replacement Guarantee</h2>
<p>If a placed contractor does not meet expectations within the first <strong>30 calendar days</strong>, Provider will source a replacement at no additional fee.</p>
<h2>5. Confidentiality</h2>
<p>Both parties agree to treat all shared information — including candidate details, rates, and business operations — as confidential. Neither party will disclose such information to third parties without prior written consent.</p>
<h2>6. Non-Solicitation</h2>
<p>Client agrees not to directly engage any candidate presented by Provider for a period of 12 months from the date of introduction, unless a placement fee has been paid.</p>
<h2>7. Limitation of Liability</h2>
<p>Provider's total liability under this agreement shall not exceed the fees paid by Client in the preceding 3 months.</p>
<h2>8. Governing Law</h2>
<p>This agreement is governed by the laws of the State of Delaware, USA.</p>
<h2>9. Term</h2>
<p>This agreement is effective upon signature and remains in effect until terminated by either party with 5 business days written notice.</p>
<hr><p style="text-align:center;color:#666;font-size:13px;">No hidden clauses. No lock-in. We earn your business every day.</p>`;

// Rajesh's user ID (Zietra account owner) — contracts are created under his account
const ZIETRA_OWNER_ID = 'cmmziuiuy0000vp5wstob71f7';

// POST /api/contracts/sign/onboard — Public endpoint: create contract + send signing email
router.post('/onboard', async (req, res, next) => {
  try {
    const { firstName, lastName, email, company, phone, role, message } = req.body;

    if (!email || !firstName || !company) {
      return res.status(400).json({ error: 'firstName, email, and company are required' });
    }

    const clientName = `${firstName} ${lastName || ''}`.trim();

    // Find any existing deal under Zietra account for contract linking
    const deal = await prisma.deal.findFirst({
      where: { userId: ZIETRA_OWNER_ID },
      select: { id: true },
    });
    if (!deal) {
      return res.status(500).json({ error: 'System not configured. Contact support.' });
    }

    // Create contract from template with company name filled in
    const content = STAFFING_AGREEMENT_TEMPLATE.replace(/\{\{companyName\}\}/g, company);
    const contract = await prisma.contract.create({
      data: {
        dealId: deal.id,
        userId: ZIETRA_OWNER_ID,
        title: `Zietra Staffing Agreement — ${company}`,
        content,
        status: ContractStatus.DRAFT,
      },
    });

    // Generate signing token and send
    const signingToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        signingToken,
        tokenExpiresAt,
        signerEmail: email,
        signerName: clientName,
        signerTitle: role || undefined,
        status: ContractStatus.SENT_FOR_SIGNATURE,
        sentAt: new Date(),
      },
    });

    // Send signing email
    sendSigningRequest({
      to: email,
      clientName,
      contractTitle: `Zietra Staffing Agreement — ${company}`,
      senderName: 'Peter Samuel',
      signingToken,
      message: message || `Hi ${firstName}, here is our staffing agreement — no commitment, cancel anytime. Sign to start receiving engineer profiles within 48 hours.`,
    }).catch((err) => console.error('Onboard signing email failed:', err.message));

    // Also create a contact in the CRM if they don't exist
    try {
      const existing = await prisma.contact.findFirst({ where: { email } });
      if (!existing) {
        await prisma.contact.create({
          data: {
            firstName: firstName,
            lastName: lastName || '',
            email,
            phone: phone || undefined,
            role: role || 'Lead',
            status: 'HOT',
            userId: ZIETRA_OWNER_ID,
          },
        });
      }
    } catch { /* non-blocking */ }

    return res.json({
      success: true,
      contractId: contract.id,
      signingUrl: `https://zietra.com/contracts/sign/${signingToken}`,
      message: `Agreement sent to ${email}. They will receive an email with a signing link.`,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
