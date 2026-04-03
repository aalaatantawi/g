export const DEPLOYED_URL = typeof window !== 'undefined' ? window.location.origin : "https://ogxai.obgynx.com";

// Frontend Stripe Initialization Key (if needed for custom elements, though Firebase Extension handles redirect)
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const PRICES = {
  specialist: {
    monthly: "price_1TI8kyC7VXAuMmMhH6bswv8K",
    yearly: "price_1TI8nvC7VXAuMmMh4FflOV3j",
  },
  consultant: {
    monthly: "price_1TI8oiC7VXAuMmMhwtJbojkY",
    yearly: "price_1TI8p5C7VXAuMmMhrqYDWuwu",
  }
};

export function successUrl(): string {
  return `${DEPLOYED_URL}/success`;
}

export function cancelUrl(): string {
  return `${DEPLOYED_URL}/failure`;
}
