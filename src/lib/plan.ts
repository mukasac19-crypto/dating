/**
 * Single source of truth for plan marketing copy shown on the homepage and in
 * the profile. The actual charge is driven by Stripe (STRIPE_PRICE_ID); keep
 * this price in sync with that Stripe Price.
 */
export const PREMIUM_PLAN = {
  name: 'Premium',
  priceLabel: '$25',
  intervalLabel: '/month',
  tagline: 'Unlimited everything.',
  blurb: 'Every feature, no limits. Cancel anytime.',
  features: [
    'Unlimited chat & screenshot analyses',
    'The full breakdown of every red and green flag',
    'Exact quotes, what each pattern means, and what to do',
    'Copy-paste suggested replies and exit plans',
    'Unlimited AI follow-up questions about any analysis',
    'Your full saved history, kept forever',
  ],
} as const;

export const FREE_PLAN = {
  name: 'Free',
  priceLabel: '$0',
  intervalLabel: '',
  tagline: 'See the verdict, free.',
  features: [
    'Run an analysis on any chat',
    'See the headline verdict and flag counts',
    'No card required',
  ],
} as const;
