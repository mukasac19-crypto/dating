// How many screenshots can be combined into a single analysis.
// Free / anonymous (ad-funnel) users are capped; premium can attach many.
export const FREE_MAX_IMAGES = 2;
export const PREMIUM_MAX_IMAGES = 10;

export function maxImagesFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_MAX_IMAGES : FREE_MAX_IMAGES;
}
