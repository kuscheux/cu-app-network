import { NextResponse } from "next/server"

// STRIPE COMMENTED OUT - no checkout
// import { getStripe } from "@/lib/stripe"
// import { SOURCE_CODE_PRODUCT } from "@/lib/products"

export async function POST() {
  return NextResponse.json(
    { error: "Stripe checkout is disabled." },
    { status: 503 }
  )
}
