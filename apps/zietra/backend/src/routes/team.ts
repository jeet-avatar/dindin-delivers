import { Router } from 'express';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/team/verify-invite/:token
 * Verify invitation token and get user info (PUBLIC - no auth required)
 */
router.get('/verify-invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        inviteAccepted: true,
        invitedAt: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid invite token', 404);
    }

    if (user.inviteAccepted) {
      throw new AppError('Invitation already accepted', 400);
    }

    // Check if token is expired (7 days)
    const invitedAt = new Date(user.invitedAt!);
    const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      throw new AppError('Invitation has expired', 400);
    }

    res.json({
      message: 'Valid invitation',
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/team/accept-invite
 * Accept team invitation and set password (PUBLIC - no auth required)
 * Body: { inviteToken: string, password: string }
 */
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { inviteToken, password } = req.body;

    // Validate input
    if (!inviteToken || !password) {
      throw new AppError('Invite token and password are required', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken },
    });

    if (!user) {
      throw new AppError('Invalid invite token', 400);
    }

    if (user.inviteAccepted) {
      throw new AppError('Invitation already accepted', 400);
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user - mark for password change on first login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteAccepted: true,
        acceptedAt: new Date(),
        inviteToken: null, // Clear token after acceptance
        requirePasswordChange: true, // Force password change on first login
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        teamRole: true,
        inviteAccepted: true,
        acceptedAt: true,
      },
    });

    res.json({
      message: 'Invitation accepted successfully. Please log in with your new password.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// All routes below require authentication
router.use(authenticate);

/**
 * GET /api/team
 * Get all team members for the current user's account
 * - OWNER: Returns all team members they've invited
 * - MEMBER: Returns error (only owners can view team)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can view team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can view team members', 403);
    }

    // Get all team members for this account owner
    const teamMembers = await prisma.user.findMany({
      where: {
        accountOwnerId: userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        teamRole: true,
        inviteAccepted: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      teamMembers,
      count: teamMembers.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/team/invite
 * Invite a new team member
 * Body: { email: string, firstName: string, lastName: string }
 */
router.post('/invite', async (req, res, next) => {
  try {
    console.log('🎯 Team invite endpoint called');
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can invite team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can invite team members', 403);
    }

    let { email, firstName, lastName } = req.body;

    // Normalize email to lowercase and trim whitespace
    email = email ? email.toLowerCase().trim() : email;

    console.log(`🎯 Inviting ${email} (${firstName} ${lastName})`);

    // Validate input
    if (!email || !firstName || !lastName) {
      throw new AppError('Email, first name, and last name are required', 400);
    }

    // Check if user with this email already exists (case-insensitive)
    console.log('🎯 Checking if user exists...');
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      },
    });

    if (existingUser) {
      console.log('🎯 User already exists');
      throw new AppError('A user with this email already exists', 400);
    }

    // Generate invite token
    console.log('🎯 Generating invite token...');
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create temporary password (user will be required to change it on first login)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create new user with MEMBER role
    console.log('🎯 Creating new user in database...');
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: 'USER',
        teamRole: 'MEMBER',
        accountOwnerId: userId,
        invitedById: userId,
        inviteToken,
        inviteAccepted: false,
        invitedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        teamRole: true,
        inviteAccepted: true,
        invitedAt: true,
      },
    });

    // Send invitation email
    console.log(`📧 Starting email invitation for ${email}...`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`);
    try {
      const { EmailService } = await import('../services/google-smtp.service');
      console.log('Google SMTP EmailService imported successfully');
      const emailService = new EmailService();
      console.log('Google SMTP EmailService instance created');

      const inviteUrl = `${process.env.FRONTEND_URL || 'https://zietra.com'}/accept-invite?token=${inviteToken}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>${req.user?.firstName || 'Your team lead'} ${req.user?.lastName || ''} has invited you to join their team on <strong>Zietra Intelligent CRM</strong>!</p>
              <p>Click the button below to accept the invitation and set up your password:</p>
              <p style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </p>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>${inviteUrl}</p>
              <p><strong>This invitation will expire in 7 days.</strong></p>
              <p>Once you accept, you'll have access to:</p>
              <ul>
                <li>View and manage shared contacts and companies</li>
                <li>Collaborate on deals and activities</li>
                <li>Access team analytics and reports</li>
              </ul>
              <p>If you have any questions, please reach out to your team lead.</p>
            </div>
            <div class="footer">
              <p>© 2025 Zietra Intelligent CRM. All rights reserved.</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        from: process.env.SMTP_USER || 'noreply@zietra.com',
        to: [email],
        subject: `${req.user?.firstName || ''} ${req.user?.lastName || ''} invites you to Zietra Intelligent CRM`,
        html: emailHtml,
      });

      console.log(`✉️  Invitation email sent to ${email}`);
    } catch (emailError: any) {
      console.error('Failed to send invitation email:', emailError.message);
      // Don't fail the request if email fails - user can still be invited manually
    }

    res.status(201).json({
      message: 'Team member invited successfully. An invitation email has been sent.',
      teamMember: newUser,
      inviteUrl: `${process.env.FRONTEND_URL || 'https://zietra.com'}/accept-invite?token=${inviteToken}`,
    });
  } catch (error: any) {
    const fs = require('fs');
    fs.appendFileSync('/tmp/team-invite-error.log', `${new Date().toISOString()} - ERROR: ${error.message}\n${error.stack}\n\n`);
    console.error('🚨 Team invite error:', error.message, error.stack);
    next(error);
  }
});

/**
 * PUT /api/team/:userId/role
 * Change a team member's role
 * Only account owners can change team roles
 * Body: { teamRole: 'MEMBER' | 'ADMIN' }
 */
router.put('/:userId/role', async (req, res, next) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      throw new AppError('User not authenticated', 401);
    }

    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can change team roles', 403);
    }

    const { userId } = req.params;
    const { teamRole } = req.body;

    if (!teamRole || !['MEMBER', 'ADMIN'].includes(teamRole)) {
      throw new AppError('Valid teamRole is required (MEMBER or ADMIN)', 400);
    }

    const teamMember = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountOwnerId: true, teamRole: true },
    });

    if (!teamMember) {
      throw new AppError('Team member not found', 404);
    }

    if (teamMember.accountOwnerId !== ownerId) {
      throw new AppError('You can only change roles for members of your own team', 403);
    }

    if (teamMember.teamRole === 'OWNER') {
      throw new AppError('Cannot change the role of account owners', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamRole: teamRole as any },
      select: { id: true, email: true, firstName: true, lastName: true, teamRole: true },
    });

    res.json({
      message: `Team role updated to ${teamRole} successfully`,
      teamMember: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/team/:userId
 * Remove a team member
 * Only account owners can remove team members
 */
router.delete('/:userId', async (req, res, next) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can remove team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can remove team members', 403);
    }

    const { userId } = req.params;

    // Find team member
    const teamMember = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountOwnerId: true,
        teamRole: true,
      },
    });

    if (!teamMember) {
      throw new AppError('Team member not found', 404);
    }

    // Verify this team member belongs to the current account owner
    if (teamMember.accountOwnerId !== ownerId) {
      throw new AppError('You can only remove members from your own team', 403);
    }

    // Cannot remove account owners
    if (teamMember.teamRole === 'OWNER') {
      throw new AppError('Cannot remove account owners', 400);
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    res.json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
