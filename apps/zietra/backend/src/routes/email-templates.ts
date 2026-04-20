import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// Middleware
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * GET /api/email-templates
 * Get all email templates
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        isActive: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({ templates, total: templates.length });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

/**
 * GET /api/email-templates/:id
 * Get single email template
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

/**
 * POST /api/email-templates
 * Create new email template
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      subject,
      htmlContent,
      textContent,
      variables,
    } = req.body;

    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Name, subject, and HTML content are required' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent: textContent || '',
        variables: variables || [],
        userId: req.user!.id,
      },
    });

    res.status(201).json({ template, message: 'Email template created successfully' });
  } catch (error: any) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

/**
 * PUT /api/email-templates/:id
 * Update email template
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      htmlContent,
      textContent,
      variables,
      templateType,
      fromEmail,
      fromName,
      isActive,
    } = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(htmlContent && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(variables && { variables }),
        ...(templateType && { templateType }),
        ...(fromEmail && { fromEmail }),
        ...(fromName && { fromName }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ template, message: 'Email template updated successfully' });
  } catch (error: any) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

/**
 * DELETE /api/email-templates/:id
 * Delete email template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.emailTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Email template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

/**
 * POST /api/email-templates/:id/send
 * Send email using template
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { to, variables: replacementVars } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'Recipient email(s) required' });
    }

    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Replace variables in content
    let htmlContent = template.htmlContent;
    let textContent = template.textContent || '';
    let subject = template.subject;

    if (replacementVars) {
      Object.keys(replacementVars).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, replacementVars[key]);
        textContent = textContent.replace(regex, replacementVars[key]);
        subject = subject.replace(regex, replacementVars[key]);
      });
    }

    // Send emails
    const results = [];
    for (const recipient of to) {
      try {
        await transporter.sendMail({
          from: `Zietra <${process.env.SMTP_USER || 'support@zietra.com'}>`,
          to: recipient,
          subject,
          html: htmlContent,
          text: textContent,
        });

        results.push({ email: recipient, status: 'sent' });

        // Log email (skip if model incompatible)
        try {
          await prisma.emailLog.create({
            data: {
              toEmail: recipient,
              fromEmail: process.env.SMTP_USER || 'support@zietra.com',
              status: 'SENT',
              sentAt: new Date(),
              metadata: {
                subject,
                templateId: template.id
              } as any,
            } as any,
          });
        } catch (logError) {
          // Silently fail if email log incompatible
        }
      } catch (error: any) {
        console.error(`Failed to send email to ${recipient}:`, error);
        results.push({ email: recipient, status: 'failed', error: error.message });
      }
    }

    const successCount = results.filter((r) => r.status === 'sent').length;
    const failCount = results.filter((r) => r.status === 'failed').length;

    res.json({
      message: `Sent ${successCount} email(s), ${failCount} failed`,
      results,
      successCount,
      failCount,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * POST /api/email-templates/:id/test
 * Send test email
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { testEmail, variables: replacementVars } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address required' });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Replace variables
    let htmlContent = template.htmlContent;
    let textContent = template.textContent || '';
    let subject = `[TEST] ${template.subject}`;

    if (replacementVars) {
      Object.keys(replacementVars).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, replacementVars[key]);
        textContent = textContent.replace(regex, replacementVars[key]);
        subject = subject.replace(regex, replacementVars[key]);
      });
    }

    await transporter.sendMail({
      from: `Zietra <${process.env.SMTP_USER || 'support@zietra.com'}>`,
      to: testEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
