/**
 * HUME EVI CALL INITIATION - Multi-Tenant
 * Initiates IVR calls using Hume EVI with CU-specific configuration
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDefaultHumeIVRConfig } from "@/lib/ivr-hume-config-defaults"

export async function POST(request: NextRequest) {
  try {
    const { to, tenant_id, cu_id } = await request.json()
    const targetNumber = to || process.env.TWILIO_TEST_PHONE || "+18287806176"

    const supabase = await createClient()

    // Load CU configuration
    const { data: cuData, error: cuError } = await supabase
      .from("credit_unions")
      .select("*")
      .eq(tenant_id ? "tenant_id" : "cu_id", tenant_id || cu_id)
      .single()

    if (cuError || !cuData) {
      return NextResponse.json(
        { error: "Credit union not found" },
        { status: 404 }
      )
    }

    // Load IVR configuration for this CU
    const { data: ivrConfigData } = await supabase
      .from("cu_ivr_configs")
      .select("*")
      .eq(tenant_id ? "tenant_id" : "cu_id", tenant_id || cu_id)
      .single()

    // Use custom config or generate default
    const ivrConfig = ivrConfigData?.config || getDefaultHumeIVRConfig({
      name: cuData.name,
      charter_number: cuData.charter_number,
      support_phone: cuData.support_phone,
      routing_number: cuData.routing_number,
      timezone: cuData.timezone || "America/New_York",
      domain: cuData.domain,
      twilio_phone: cuData.twilio_phone_number,
      products: cuData.products,
      culture: cuData.culture,
      features: cuData.features
    })

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = ivrConfig.voice.twilio.phone_number

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 500 }
      )
    }

    const humeApiKey = process.env.HUME_API_KEY
    const humeConfigId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

    if (!humeApiKey || !humeConfigId) {
      return NextResponse.json(
        { error: "Hume AI credentials not configured" },
        { status: 500 }
      )
    }

    // Get base URL for webhooks
    const baseUrl = getBaseUrl(request)

    // Create IVR session for tracking
    const ani = targetNumber.replace(/\D/g, '')
    const ucid = `UCID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Check if caller is a known member
    let memberId = null
    const { data: member } = await supabase
      .from("members")
      .select("id, consumer_id, first_name, last_name, membership_status")
      .eq("phone", ani)
      .eq(tenant_id ? "tenant_id" : "cu_id", tenant_id || cu_id)
      .single()

    if (member) {
      memberId = member.id
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("ivr_sessions")
      .insert({
        ucid,
        ani,
        member_id: memberId,
        tenant_id: tenant_id || cu_id,
        status: "initiated",
        started_at: new Date().toISOString(),
        metadata: {
          direction: "outbound",
          target_number: targetNumber,
          hume_config_id: humeConfigId,
          cu_name: cuData.name
        }
      })
      .select("ucid")
      .single()

    if (sessionError) {
      console.error("[IVR] Session creation failed:", sessionError)
    }

    // Audit log
    await supabase.from("audit_log").insert({
      session_id: session?.ucid,
      member_id: memberId,
      action: "ivr.call_initiated",
      channel: "ivr",
      result: "pending",
      metadata: {
        target_number: targetNumber,
        session_id: session?.ucid,
        tenant_id: tenant_id || cu_id,
        cu_name: cuData.name
      }
    })

    // Hume EVI webhook with CU configuration
    const humeWebhookUrl = `https://api.hume.ai/v0/evi/twilio?config_id=${humeConfigId}&api_key=${humeApiKey}`
    const statusUrl = `${baseUrl}/api/ivr/status`
    const humeEventWebhook = `${baseUrl}/api/ivr/hume/webhook`

    console.log(`[IVR] Initiating ${cuData.name} Hume AI call to ${targetNumber}`)
    console.log(`[IVR] Using Hume EVI config: ${humeConfigId}`)
    console.log(`[IVR] Session: ${ucid}`)

    // Use Twilio REST API directly
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`
    const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: targetNumber,
        From: twilioPhone,
        Url: humeWebhookUrl,
        StatusCallback: statusUrl,
        StatusCallbackEvent: 'initiated ringing answered completed',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Twilio API error')
    }

    const call = await response.json()

    // Update session with call SID
    if (session) {
      await supabase
        .from("ivr_sessions")
        .update({
          metadata: {
            ...session.metadata,
            call_sid: call.sid
          }
        })
        .eq("ucid", session.ucid)
    }

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      sessionId: session?.ucid,
      status: call.status,
      to: targetNumber,
      from: twilioPhone,
      memberRecognized: !!memberId,
      cuName: cuData.name,
      humeConfig: humeConfigId
    })
  } catch (error) {
    console.error("Twilio call error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate call" },
      { status: 500 }
    )
  }
}

function getBaseUrl(request: Request): string {
  if (process.env.NGROK_URL) {
    return process.env.NGROK_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  const host = request.headers.get("host") || "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"
  return `${protocol}://${host}`
}
