export const DEPLOYED_URL = typeof window !== 'undefined' ? window.location.origin : "https://ogxai.obgynx.com";

export const PRICES = {
  consultant: {
    monthly: "price_1THR7HCQxnfnqCKeAsfFQZYN",
    yearly: "price_1THR7dCQxnfnqCKeZRti9FOQ",
  },
  enterprise: {
    monthly: "price_1THR60CQxnfnqCKeX79cLO3P",
    yearly: "price_1THR6sCQxnfnqCKeBAjwNLjF",
  }
};

export function successUrl(): string {
  return `${DEPLOYED_URL}/success`;
}

export function cancelUrl(): string {
  return `${DEPLOYED_URL}/failure`;
}
