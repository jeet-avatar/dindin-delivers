import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../app';
import { logger } from '../utils/logger';

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}
if (!process.env.GOOGLE_CALLBACK_URL) {
  throw new Error('GOOGLE_CALLBACK_URL environment variable is required');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Update last login
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              // Update Google ID if not set
              ...(user.passwordHash === null && { passwordHash: `google:${googleId}` })
            },
          });

          logger.info(`Google OAuth login: ${email}`);
          return done(null, user);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            passwordHash: `google:${googleId}`, // Store Google ID as password hash for OAuth users
            role: 'USER',
            isActive: true,
          },
        });

        logger.info(`New user created via Google OAuth: ${email}`);
        return done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
