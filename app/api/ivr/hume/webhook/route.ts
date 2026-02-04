/**
 * HUME EVI WEBHOOK HANDLER
 * Processes events from Hume conversational AI during calls
 * Multi-tenant support with emotion tracking and analytics
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface HumeEvent {
  type: string
  timestamp: string
  call_sid?: string
  session_id?: string
  tenant_id?: string
  cu_id?: string
  data?: any
}

export async function POST(request: NextRequest) {
  try {
    const event: HumeEvent = await request.json()

    console.log("[Hume Webhook] Event received:", event.type, event)

    const supabase = await createClient()

    // Route event to appropriate handler
    switch (event.type) {
      case "conversation.started":
        return handleConversationStarted(event, supabase)

      case "conversation.ended":
        return handleConversationEnded(event, supabase)

      case "tool.call":
        return handleToolCall(event, supabase)

      case "message.user":
        return handleUserMessage(event, supabase)

      case "message.assistant":
        return handleAssistantMessage(event, supabase)

      case "emotion.detected":
        return handleEmotionDetected(event, supabase)

      case "error":
        return handleError(event, supabase)

      default:
        console.log("[Hume Webhook] Unhandled event type:", event.type)
        return NextResponse.json({ acknowledged: true })
    }

  } catch (error) {
    console.error("[Hume Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

async function handleConversationStarted(event: HumeEvent, supabase: any) {
  const { call_sid, session_id, tenant_id, cu_id, data } = event

  console.log("[Hume] Conversation started:", call_sid)

  // Update IVR session
  if (session_id) {
    await supabase
      .from("ivr_sessions")
      .update({
        metadata: {
          ...data,
          hume_conversation_started: event.timestamp
        },
        status: "active",
        updated_at: new Date().toISOString()
      })
      .eq("ucid", session_id)
  }

  // Audit log
  await supabase.from("audit_log").insert({
    session_id,
    action: "hume.conversation_started",
    channel: "ivr",
    result: "success",
    metadata: { call_sid, event_data: data, tenant_id, cu_id }
  })

  return NextResponse.json({ acknowledged: true })
}

async function handleConversationEnded(event: HumeEvent, supabase: any) {
  const { call_sid, session_id, tenant_id, cu_id, data } = event

  console.log("[Hume] Conversation ended:", call_sid, data)

  // Update session with end time and duration
  if (session_id) {
    const { data: session } = await supabase
      .from("ivr_sessions")
      .select("started_at, metadata")
      .eq("ucid", session_id)
      .single()

    if (session) {
      const duration = Math.floor(
        (new Date(event.timestamp).getTime() - new Date(session.started_at).getTime()) / 1000
      )

      await supabase
        .from("ivr_sessions")
        .update({
          ended_at: event.timestamp,
          status: "completed",
          metadata: {
            ...session.metadata,
            hume_conversation_ended: event.timestamp,
            call_duration_seconds: duration,
            end_reason: data?.reason
          }
        })
        .eq("ucid", session_id)
    }
  }

  // Audit log
  await supabase.from("audit_log").insert({
    session_id,
    action: "hume.conversation_ended",
    channel: "ivr",
    result: "success",
    metadata: { call_sid, event_data: data, tenant_id, cu_id }
  })

  return NextResponse.json({ acknowledged: true })
}

async function handleToolCall(event: HumeEvent, supabase: any) {
  const { session_id, tenant_id, cu_id, data } = event
  const { tool_name, parameters, result } = data || {}

  console.log("[Hume] Tool called:", tool_name, parameters)

  // Log tool execution
  await supabase.from("audit_log").insert({
    session_id,
    action: `tool.${tool_name}`,
    channel: "ivr",
    result: result?.success ? "success" : "failure",
    metadata: { tool_name, parameters, result, tenant_id, cu_id }
  })

  return NextResponse.json({ acknowledged: true })
}

async function handleUserMessage(event: HumeEvent, supabase: any) {
  const { session_id, tenant_id, data } = event
  const { message, transcript } = data || {}

  // Store user utterance for analytics
  if (session_id && transcript) {
    await supabase.from("conversation_messages").insert({
      session_id,
      role: "user",
      content: transcript,
      timestamp: event.timestamp,
      tenant_id,
      metadata: data
    })
  }

  return NextResponse.json({ acknowledged: true })
}

async function handleAssistantMessage(event: HumeEvent, supabase: any) {
  const { session_id, tenant_id, data } = event
  const { message, response } = data || {}

  // Store assistant response for analytics
  if (session_id && response) {
    await supabase.from("conversation_messages").insert({
      session_id,
      role: "assistant",
      content: response,
      timestamp: event.timestamp,
      tenant_id,
      metadata: data
    })
  }

  return NextResponse.json({ acknowledged: true })
}

async function handleEmotionDetected(event: HumeEvent, supabase: any) {
  const { session_id, tenant_id, data } = event
  const { emotions, dominant_emotion, confidence } = data || {}

  console.log("[Hume] Emotion detected:", dominant_emotion, confidence)

  // Track emotional state for analytics and potential intervention
  if (session_id) {
    await supabase.from("emotion_tracking").insert({
      session_id,
      dominant_emotion,
      confidence,
      all_emotions: emotions,
      timestamp: event.timestamp,
      tenant_id
    })

    // If frustration detected, flag for potential escalation
    if ((dominant_emotion === "frustration" || dominant_emotion === "anger") && confidence > 0.7) {
      console.log("[Hume] High frustration detected - flagging for review")

      await supabase.from("audit_log").insert({
        session_id,
        action: "emotion.high_frustration",
        channel: "ivr",
        result: "warning",
        metadata: { dominant_emotion, confidence, tenant_id }
      })

      // TODO: Trigger escalation workflow (transfer to agent, alert supervisor, etc.)
    }
  }

  return NextResponse.json({ acknowledged: true })
}

async function handleError(event: HumeEvent, supabase: any) {
  const { session_id, tenant_id, cu_id, data } = event
  const { error_type, message } = data || {}

  console.error("[Hume] Error event:", error_type, message)

  await supabase.from("audit_log").insert({
    session_id,
    action: "hume.error",
    channel: "ivr",
    result: "error",
    metadata: { error_type, message, event_data: data, tenant_id, cu_id }
  })

  return NextResponse.json({ acknowledged: true })
}

/**
 * GET handler for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    service: "CU IVR Hume Webhook",
    status: "operational",
    version: "1.0.0"
  })
}
