"use server"

// STRIPE COMMENTED OUT - no checkout/access checks
// import { getStripe } from "@/lib/stripe"
// import { GITHUB_CLONE_PRODUCTS } from "@/lib/products"
// import { createClient } from "@/lib/supabase/server"

export async function startGitHubCloneCheckout(_productId: string) {
  // Stripe disabled - throw so UI can show "not available"
  throw new Error("Stripe checkout is disabled. Re-enable in app/actions/stripe.ts if needed.")
}

export async function checkGitHubCloneAccess(): Promise<{
  hasAccess: boolean
  planName?: string
  features?: string[]
}> {
  // Always allow access when Stripe is disabled
  return { hasAccess: true }
}
