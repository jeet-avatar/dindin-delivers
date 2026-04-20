import { loadStripe, Stripe } from '@stripe/stripe-js';

// This will be set from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export interface CheckoutSessionParams {
  planTier: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
  billingCycle: 'monthly' | 'annual';
}

export const createCheckoutSession = async (params: CheckoutSessionParams): Promise<void> => {
  try {
    const token = localStorage.getItem('crmToken');

    if (!token) {
      throw new Error('Not authenticated');
    }

    // Call backend to create checkout session
    const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        planTier: params.planTier,
        billingCycle: params.billingCycle,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/pricing`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const createPortalSession = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('crmToken');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/settings`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

export default {
  createCheckoutSession,
  createPortalSession,
};
