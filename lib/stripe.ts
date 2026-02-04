import "server-only"

// STRIPE COMMENTED OUT - no payments/checkout
// import Stripe from "stripe"
// export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
export const stripe = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStripe(): any {
  throw new Error("Stripe is disabled. Re-enable in lib/stripe.ts if needed.")
}
