import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/export-allowed?tenantId=...
 * When Settings > "Admin / everything unlocked" is ON, client uses stripped mode and does not gate.
 * When OFF, this API runs: export allowed only when user signed in, email confirmed, and
 * tenant_claims verified or cu_email_domains matches.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId")
    if (!tenantId) {
      return NextResponse.json({ allowed: false, reason: "Tenant is required." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { allowed: false, reason: "Sign in required to export." },
        { status: 200 }
      )
    }

    const email = user.email?.toLowerCase().trim()
    if (!email) {
      return NextResponse.json(
        { allowed: false, reason: "Confirm your email to export." },
        { status: 200 }
      )
    }

    const emailConfirmedAt = (user as { email_confirmed_at?: string | null }).email_confirmed_at
    if (!emailConfirmedAt) {
      return NextResponse.json(
        { allowed: false, reason: "Confirm your email to export." },
        { status: 200 }
      )
    }

    const charter = tenantId.replace(/^cu_/, "")
    const admin = createAdminClient()

    const { data: claim } = await admin
      .from("tenant_claims")
      .select("id, status")
      .eq("charter_number", charter)
      .eq("claimer_email", email)
      .eq("status", "verified")
      .maybeSingle()

    if (claim) {
      return NextResponse.json({ allowed: true }, { status: 200 })
    }

    const userDomain = email.includes("@") ? (email.split("@")[1] ?? "").toLowerCase() : ""
    if (!userDomain) {
      return NextResponse.json(
        { allowed: false, reason: "Use an email at your credit union's verified domain to export." },
        { status: 200 }
      )
    }

    const { data: domains } = await admin
      .from("cu_email_domains")
      .select("domain")
      .or(`tenant_id.eq.${tenantId},tenant_id.eq.${charter}`)
      .eq("is_verified", true)

    const verifiedDomains = (domains ?? []).map((d) => (d.domain || "").toLowerCase().trim())
    if (verifiedDomains.includes(userDomain)) {
      return NextResponse.json({ allowed: true }, { status: 200 })
    }

    return NextResponse.json(
      {
        allowed: false,
        reason:
          "Use an email at your credit union's verified domain and confirm it to export.",
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[export-allowed]", message)
    return NextResponse.json(
      { allowed: false, reason: "Could not check export permission." },
      { status: 500 }
    )
  }
}
