/**
 * Branding Configuration
 * Centralized place for all branding text, colors, and messaging
 * Edit this file to customize the application branding
 */

export const BRANDING = {
  // Company Information
  companyName: 'Zietra',
  tagline: 'Your AI-Powered Marketing CRM',

  // Login Page
  login: {
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Sign in to your account to continue',
    googleButtonText: 'Continue with Google',
    orDividerText: 'Or continue with email',
    emailLabel: 'Email address',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberMeText: 'Remember me',
    forgotPasswordText: 'Forgot password?',
    signInButtonText: 'Sign in',
    signingInButtonText: 'Signing in...',
    noAccountText: "Don't have an account?",
    signUpLinkText: 'Sign up for free',

    // Right side branding panel
    brandingPanel: {
      heading: 'AI-Powered Marketing CRM',
      description: 'Transform your sales and marketing with intelligent automation, AI-generated video campaigns, and powerful lead enrichment.',
      features: [
        {
          title: 'Auto-Generate Video Campaigns',
          description: 'AI creates personalized marketing videos from just your company name - with voice, script, and visuals'
        },
        {
          title: 'AI Lead Enrichment & Discovery',
          description: 'Automatically discover companies, enrich contact data, and find decision-makers with AI agents'
        },
        {
          title: 'Smart Campaign Analytics',
          description: 'Track email opens, clicks, and conversions with real-time analytics and AI-powered insights'
        }
      ]
    }
  },

  // Colors (using Tailwind color names)
  colors: {
    primary: 'orange',
    secondary: 'rose',
    gradientFrom: 'from-orange-500',
    gradientVia: 'via-rose-500',
    gradientTo: 'to-rose-600',
  }
} as const;
