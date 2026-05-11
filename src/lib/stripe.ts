import Stripe from 'stripe';

let stripe: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
  }

  stripe ??= new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return stripe;
}
