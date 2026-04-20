import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
  private static readonly BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12');

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRE,
      issuer: 'crm-api',
      audience: 'crm-client',
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'crm-api',
        audience: 'crm-client',
      }) as TokenPayload;
    } catch (error) {
      const { AppError } = require('../middleware/errorHandler');
      throw new AppError('Invalid or expired token', 401);
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate random password
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
}

export { TokenPayload };