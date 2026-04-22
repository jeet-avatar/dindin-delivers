import { Request, Response, NextFunction } from 'express';
import { AuthUtils, TokenPayload } from '../utils/auth';
import { AppError } from './errorHandler';
import { prisma } from '../app';
import { verifySupabaseJwt, isSupabaseJwtConfigured, SupabaseClaims } from './supabaseAuth';

async function resolveUserFromSupabase(claims: SupabaseClaims) {
  const email = claims.email?.toLowerCase();
  if (!email) {
    throw new AppError('Supabase JWT missing email', 401);
  }
  let user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      isActive: true,
      teamRole: true,
      accountOwnerId: true,
    },
  });
  if (!user) {
    const metaFirst = (claims.user_metadata?.first_name as string | undefined)
      || (claims.user_metadata?.firstName as string | undefined) || '';
    const metaLast = (claims.user_metadata?.last_name as string | undefined)
      || (claims.user_metadata?.lastName as string | undefined) || '';
    user = await prisma.user.create({
      data: {
        email,
        firstName: metaFirst,
        lastName: metaLast,
        passwordHash: `supabase:${claims.sub}`,
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        teamRole: true,
        accountOwnerId: true,
      },
    });
  }
  return user;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    let user: Awaited<ReturnType<typeof resolveUserFromSupabase>> | null = null;

    if (isSupabaseJwtConfigured()) {
      try {
        const claims = await verifySupabaseJwt(token);
        user = await resolveUserFromSupabase(claims);
      } catch (err) {
        if (process.env.AUTH_DEBUG === '1') {
          console.log('[auth] Supabase verify fell through:', (err as Error).message);
        }
      }
    } else if (process.env.AUTH_DEBUG === '1') {
      console.log('[auth] Supabase JWKS not configured');
    }

    if (!user) {
      const payload: TokenPayload = AuthUtils.verifyToken(token);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
          teamRole: true,
          accountOwnerId: true,
        },
      });
    }

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    req.user = user as any;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Team Collaboration Helper: Get Account Owner ID
 * Returns the account owner ID for the current user
 * - If user is OWNER, returns their own ID
 * - If user is MEMBER, returns their accountOwnerId
 */
export const getAccountOwnerId = (req: Request): string => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // If user is account owner, return their own ID
  if (req.user.teamRole === 'OWNER') {
    return req.user.id;
  }

  // If user is team member, return their account owner's ID
  if (req.user.teamRole === 'MEMBER' && req.user.accountOwnerId) {
    return req.user.accountOwnerId;
  }

  // Fallback to user's own ID (for backward compatibility)
  return req.user.id;
};

/**
 * Team Collaboration Helper: Check if User Owns Resource
 * Returns true if the user owns the resource (created it themselves)
 */
export const isResourceOwner = (req: Request, resourceUserId: string): boolean => {
  return req.user?.id === resourceUserId;
};

/**
 * Team Collaboration Helper: Check if User Can Access Resource
 * Returns true if user can access the resource based on:
 * - User owns the resource
 * - User is account owner
 * - Resource is shared with the user
 */
export const canAccessResource = async (
  req: Request,
  resourceType: 'contact' | 'company' | 'deal' | 'activity',
  resourceId: string,
  resourceUserId: string,
): Promise<boolean> => {
  if (!req.user) {
    return false;
  }

  // User owns the resource
  if (resourceUserId === req.user.id) {
    return true;
  }

  // User is account owner - can access all team resources
  if (req.user.teamRole === 'OWNER') {
    const accountOwnerId = getAccountOwnerId(req);
    const resourceOwnerAccountOwnerId = await getResourceOwnerAccountOwnerId(resourceUserId);
    if (accountOwnerId === resourceOwnerAccountOwnerId) {
      return true;
    }
  }

  // Check if resource is shared with user
  const isShared = await checkResourceSharing(resourceType, resourceId, req.user.id);
  return isShared;
};

/**
 * Get Account Owner ID for a Given User
 */
const getResourceOwnerAccountOwnerId = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamRole: true, accountOwnerId: true, id: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user.teamRole === 'OWNER' ? user.id : user.accountOwnerId || user.id;
};

/**
 * Check if Resource is Shared with User
 */
const checkResourceSharing = async (
  resourceType: 'contact' | 'company' | 'deal' | 'activity',
  resourceId: string,
  userId: string,
): Promise<boolean> => {
  switch (resourceType) {
    case 'contact':
      const contactShare = await prisma.contactShare.findUnique({
        where: { contactId_userId: { contactId: resourceId, userId } },
      });
      return !!contactShare;

    case 'company':
      const companyShare = await prisma.companyShare.findUnique({
        where: { companyId_userId: { companyId: resourceId, userId } },
      });
      return !!companyShare;

    case 'deal':
      const dealShare = await prisma.dealShare.findUnique({
        where: { dealId_userId: { dealId: resourceId, userId } },
      });
      return !!dealShare;

    case 'activity':
      const activityShare = await prisma.activityShare.findUnique({
        where: { activityId_userId: { activityId: resourceId, userId } },
      });
      return !!activityShare;

    default:
      return false;
  }
};

/**
 * Alias for authenticate middleware (for compatibility)
 */
export const authenticateToken = authenticate;

/**
 * Super Admin Middleware
 * Ensures the user has SUPER_ADMIN role
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Super admin access required', 403);
  }

  next();
};