import crypto from 'crypto';
import { Router } from 'express';
import { PrismaClient, ContractStatus } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authenticate } from '../middleware/auth';
import { generateContractPdf } from '../services/contractPdfService';
import {
  sendSigningRequest,
  sendClientSignedNotification,
  sendCompletedEmail,
  sendReminderEmail,
} from '../services/contractEmailService';

const router = Router();
const prisma = new PrismaClient();

// ─── S3 client ────────────────────────────────────────────────────────────────
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';

// ─── Status guard constants ───────────────────────────────────────────────────
// Statuses where content may no longer be edited
const IMMUTABLE_STATUSES: ContractStatus[] = [
  ContractStatus.SENT_FOR_SIGNATURE,
  ContractStatus.VIEWED,
  ContractStatus.CLIENT_SIGNED,
  ContractStatus.AWAITING_COUNTERSIGN,
  ContractStatus.SIGNED,
  ContractStatus.VOIDED,
  ContractStatus.EXPIRED,
];

// Statuses that are set by the signing flow — manual PATCH is not allowed
const PROTECTED_STATUSES: ContractStatus[] = [
  ContractStatus.CLIENT_SIGNED,
  ContractStatus.AWAITING_COUNTERSIGN,
  ContractStatus.SIGNED,
  ContractStatus.VIEWED,
];

// Enable authentication for all contract routes
router.use(authenticate);

// GET /api/contracts - List contracts, optionally filtered by ?dealId=
router.get('/', async (req, res, next) => {
  try {
    const { dealId } = req.query as { dealId?: string };

    const where: any = { userId: req.user!.id };
    if (dealId) where.dealId = dealId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts - Create a new contract
router.post('/', async (req, res, next) => {
  try {
    const {
      dealId,
      title,
      content,
      quoteId,
      variables,
    } = req.body;

    if (!dealId || !title || !content) {
      return res.status(400).json({ error: 'dealId, title, and content are required' });
    }

    // Validate deal exists and belongs to authenticated user
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, userId: req.user!.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const contract = await prisma.contract.create({
      data: {
        dealId,
        userId: req.user!.id,
        title,
        content,
        quoteId: quoteId || null,
        variables: variables || null,
      },
    });

    return res.status(201).json(contract);
  } catch (error) {
    return next(error);
  }
});

// PUT /api/contracts/:id - Update a contract
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Content immutability guard — once sent/signed/voided, content cannot be edited
    if (IMMUTABLE_STATUSES.includes(existing.status)) {
      return res.status(403).json({
        error: `Contract content cannot be modified in status "${existing.status}"`,
      });
    }

    const { title, content, variables } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (variables !== undefined) updateData.variables = variables;

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return res.json(contract);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/contracts/:id/status - Update only the status field
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, signedBy } = req.body as { status: ContractStatus; signedBy?: string };

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Status transition guard — these statuses are set by the signing flow, not manually
    if (PROTECTED_STATUSES.includes(status)) {
      return res.status(403).json({
        error: `Status "${status}" cannot be set manually — it is managed by the signing flow`,
      });
    }

    const updateData: any = { status, updatedAt: new Date() };

    if (status === ContractStatus.SIGNED) {
      updateData.signedAt = new Date();
      if (signedBy) updateData.signedBy = signedBy;
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return res.json(contract);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/contracts/:id - Hard delete a contract
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await prisma.contract.delete({ where: { id } });

    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/contracts/:id/generate-pdf ────────────────────────────────────
router.post('/:id/generate-pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const { buffer, hash } = await generateContractPdf({
      contractId: contract.id,
      title: contract.title,
      contractType: 'Service Agreement',
      content: contract.content,
      createdAt: contract.createdAt,
    });

    const s3Key = `contracts/${contract.id}/contract.pdf`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );

    const pdfUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;

    const updated = await prisma.contract.update({
      where: { id },
      data: { pdfUrl, documentHash: hash, updatedAt: new Date() },
    });

    return res.json({ pdfUrl, documentHash: hash, contract: updated });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/contracts/:id/send ────────────────────────────────────────────
router.post('/:id/send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clientEmail, clientName, message } = req.body as {
      clientEmail: string;
      clientName: string;
      message?: string;
    };

    if (!clientEmail || !clientName) {
      return res.status(400).json({ error: 'clientEmail and clientName are required' });
    }

    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Fetch sending user's details for the email
    const owner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const senderName = owner ? `${owner.firstName} ${owner.lastName}` : 'Zietra';

    // Generate a unique signing token
    const signingToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        signingToken,
        tokenExpiresAt,
        signerEmail: clientEmail,
        signerName: clientName,
        status: ContractStatus.SENT_FOR_SIGNATURE,
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Send email in background (don't block on email failure)
    sendSigningRequest({
      to: clientEmail,
      clientName,
      contractTitle: contract.title,
      senderName,
      signingToken,
      message,
    }).catch((err: any) => console.error('Failed to send signing email:', err.message));

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/contracts/:id/countersign ─────────────────────────────────────
router.post('/:id/countersign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      title: signerTitle,
      signatureImage,
    } = req.body as {
      name: string;
      title?: string;
      signatureImage?: string;
    };

    if (!name) {
      return res.status(400).json({ error: 'name is required for counter-signature' });
    }

    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== ContractStatus.AWAITING_COUNTERSIGN) {
      return res.status(403).json({
        error: `Contract must be in AWAITING_COUNTERSIGN status to counter-sign (current: ${contract.status})`,
      });
    }

    const owner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { firstName: true, lastName: true, email: true },
    });

    const counterSignerName = name;
    const counterSignerEmail = owner?.email || '';
    const counterSignedAt = new Date();
    const ip = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';

    // Save client signedAt BEFORE the update overwrites it
    const clientSignedAt = contract.signedAt ?? new Date();

    // Update DB first (mark as SIGNED) — PDF generation happens after
    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.SIGNED,
        counterSignedBy: counterSignerName,
        counterSignedAt,
        counterSigData: signatureImage || null,
        counterSigIp: ip,
        counterSigAgent: userAgent,
        signedAt: counterSignedAt,
        signedBy: counterSignerName,
        updatedAt: new Date(),
      },
    });

    // Auto-create placement pipeline when contract is fully signed
    try {
      const placementToken = crypto.randomBytes(32).toString('hex');
      await prisma.placement.create({
        data: {
          contractId: contract.id,
          dealId: contract.dealId,
          userId: contract.userId,
          clientName: contract.signerName || '',
          clientEmail: contract.signerEmail || '',
          clientCompany: (contract.variables as any)?.clientCompany || contract.title?.split(' — ')[1] || '',
          stage: 'CONTRACT_SIGNED',
          accessToken: placementToken,
        },
      });
    } catch (err: any) {
      console.error('Failed to auto-create placement:', err.message);
    }

    // Generate PDF + upload to S3 in background (don't block response)
    (async () => {
      try {
        const { buffer, hash } = await generateContractPdf({
          contractId: contract.id,
          title: contract.title,
          contractType: 'Service Agreement',
          content: contract.content,
          createdAt: contract.createdAt,
          clientSignature: {
            name: contract.signerName || '',
            email: contract.signerEmail || '',
            signedAt: clientSignedAt,
            ip: contract.signatureIp || '0.0.0.0',
            userAgent: contract.signatureAgent || '',
            signatureImage: contract.signatureData || undefined,
            otpVerified: true,
          },
          counterSignature: {
            name: counterSignerName,
            email: counterSignerEmail,
            title: signerTitle,
            signedAt: counterSignedAt,
            ip,
            userAgent,
            signatureImage: signatureImage,
            otpVerified: false,
          },
        });

        const s3Key = `contracts/${contract.id}/contract-signed.pdf`;
        await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'application/pdf' }));
        const pdfUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
        await prisma.contract.update({ where: { id }, data: { pdfUrl, documentHash: hash } });

        sendCompletedEmail({
          toOwner: counterSignerEmail,
          toClient: contract.signerEmail || '',
          ownerName: counterSignerName,
          clientName: contract.signerName || 'Client',
          contractTitle: contract.title,
          contractId: contract.id,
          pdfBuffer: buffer,
        }).catch((err: any) => console.error('Failed to send completed email:', err.message));
      } catch (err: any) {
        console.error('Failed to generate/upload PDF:', err.message);
      }
    })();

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/contracts/:id/void ────────────────────────────────────────────
router.post('/:id/void', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (
      contract.status === ContractStatus.SIGNED ||
      contract.status === ContractStatus.VOIDED
    ) {
      return res.status(403).json({
        error: `Cannot void a contract with status "${contract.status}"`,
      });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.VOIDED,
        voidedAt: new Date(),
        voidedReason: reason || null,
        updatedAt: new Date(),
      },
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/contracts/:id/remind ──────────────────────────────────────────
router.post('/:id/remind', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (
      contract.status !== ContractStatus.SENT_FOR_SIGNATURE &&
      contract.status !== ContractStatus.VIEWED
    ) {
      return res.status(403).json({
        error: `Reminders can only be sent when status is SENT_FOR_SIGNATURE or VIEWED (current: ${contract.status})`,
      });
    }

    if (!contract.signerEmail || !contract.signerName || !contract.signingToken) {
      return res.status(400).json({ error: 'Contract is missing signer information' });
    }

    const owner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { firstName: true, lastName: true },
    });

    const senderName = owner ? `${owner.firstName} ${owner.lastName}` : 'Zietra';

    const daysOverdue = contract.sentAt
      ? Math.floor((Date.now() - contract.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Update DB first, then try email
    const updated = await prisma.contract.update({
      where: { id },
      data: {
        remindersSent: { increment: 1 },
        lastReminderAt: new Date(),
        updatedAt: new Date(),
      },
    });

    sendReminderEmail({
      to: contract.signerEmail,
      clientName: contract.signerName,
      contractTitle: contract.title,
      senderName,
      signingToken: contract.signingToken,
      daysOverdue,
    }).catch((err: any) => console.error('Failed to send reminder email:', err.message));

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

export default router;
