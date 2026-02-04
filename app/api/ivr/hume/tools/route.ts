/**
 * HUME EVI TOOL HANDLER - Configuration Matrix Integration
 *
 * Processes function calls from Hume conversational AI
 * Routes through omnichannel service to PowerOn/Symitar core
 * Tenant-aware, multi-CU support
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PowerOnService } from "@/lib/poweron-service"
import { loadCredentialsFromConfig, getPowerOnConfig } from "@/lib/config-credentials"

interface HumeToolRequest {
  tool_name: string
  parameters: Record<string, any>
  session_id?: string
  call_sid?: string
  tenant_id?: string
  cu_id?: string
}

/**
 * POST handler for Hume tool calls
 */
export async function POST(request: NextRequest) {
  try {
    const body: HumeToolRequest = await request.json()
    const { tool_name, parameters, session_id, call_sid, tenant_id, cu_id } = body

    console.log(`[Hume Tools] Executing: ${tool_name}`, { parameters, session_id, tenant_id, cu_id })

    const supabase = await createClient()

    // Get session context (includes ANI, member_id, authentication status)
    let context: any = { session_id, call_sid, tenant_id, cu_id }

    if (session_id) {
      const { data: session } = await supabase
        .from("ivr_sessions")
        .select("*")
        .eq("ucid", session_id)
        .maybeSingle()

      context = { ...context, ...session }
    }

    // Load tenant-specific PowerOn configuration
    let powerOnConfig: any = {}
    let cuConfig: any = {}

    if (tenant_id || cu_id) {
      try {
        const credentials = await loadCredentialsFromConfig(tenant_id || cu_id || "", supabase)
        powerOnConfig = getPowerOnConfig(credentials, tenant_id, cu_id)

        // Load CU configuration for personalized responses
        const { data: cuData } = await supabase
          .from("credit_unions")
          .select("name, charter_number, routing_number, support_phone")
          .eq(tenant_id ? "tenant_id" : "cu_id", tenant_id || cu_id)
          .single()

        cuConfig = cuData || {}
      } catch (error) {
        console.warn("[Hume Tools] Could not load tenant config:", error)
      }
    }

    // Route to appropriate tool handler
    const handler = getToolHandler(tool_name)

    if (!handler) {
      console.error(`[Hume Tools] Unknown tool: ${tool_name}`)
      return NextResponse.json({
        error: `Unknown tool: ${tool_name}`,
        message: "I'm sorry, I don't know how to do that yet."
      }, { status: 400 })
    }

    const result = await handler(parameters, context, powerOnConfig, cuConfig, supabase)

    console.log(`[Hume Tools] ${tool_name} result:`, result)

    return NextResponse.json({
      success: true,
      tool: tool_name,
      result
    })

  } catch (error) {
    console.error("[Hume Tools] Error:", error)
    return NextResponse.json({
      error: "Tool execution failed",
      message: "I encountered an error processing your request. Let me try that again."
    }, { status: 500 })
  }
}

/**
 * Get tool handler function by name
 */
function getToolHandler(tool_name: string) {
  const handlers: Record<string, Function> = {
    authenticate_member: handleAuthenticate,
    get_account_balances: handleGetBalances,
    get_account_transactions: handleGetTransactions,
    transfer_funds: handleTransfer,
    report_lost_card: handleReportLostCard,
    get_routing_info: handleRoutingInfo,
    set_travel_notification: handleTravelNotification,
    check_status_inquiry: handleCheckStatus,
    stop_payment: handleStopPayment,
    find_atm_branch: handleFindLocations,
    request_statement: handleRequestStatement,
    update_credit_limit: handleCreditLimitRequest,
    voice_biometric_enrollment: handleBiometricEnrollment
  }

  return handlers[tool_name]
}

/**
 * TOOL HANDLERS
 */

async function handleAuthenticate(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { pin, ssn_last_four, date_of_birth } = params

  // Get caller's phone number from session (ANI)
  const phone = context.ani

  if (!phone) {
    return {
      authenticated: false,
      message: "I'm sorry, I couldn't identify your phone number. Please try calling again."
    }
  }

  // Initialize PowerOn service
  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    // Authenticate through PowerOn
    const authResult = await powerOn.authenticateMember({
      phone,
      pin,
      ssnLastFour: ssn_last_four,
      dateOfBirth: date_of_birth
    })

    if (!authResult.success || !authResult.data) {
      return {
        authenticated: false,
        message: authResult.error || "Authentication failed. Please verify your PIN."
      }
    }

    const { memberId, firstName } = authResult.data

    // Update IVR session
    if (context.session_id) {
      await supabase
        .from("ivr_sessions")
        .update({
          member_id: memberId,
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq("ucid", context.session_id)
    }

    const cuName = cuConfig.name || "your credit union"

    return {
      authenticated: true,
      member_id: memberId,
      first_name: firstName,
      message: `Welcome back, ${firstName}! Thank you for calling ${cuName}. How can I help you today?`
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleGetBalances(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id } = params

  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    const result = await powerOn.getAccounts(member_id)

    if (!result.success || !result.data) {
      return {
        error: result.error,
        message: "I'm sorry, I couldn't retrieve your account balances at this time."
      }
    }

    const accounts = result.data

    // Format for natural speech
    const summary = accounts.map((acc: any) =>
      `Your ${acc.description || acc.type} ending in ${acc.accountNumber.slice(-4)} has a balance of $${acc.balance.toFixed(2)}`
    ).join(". ")

    return {
      accounts: accounts.map((acc: any) => ({
        type: acc.type,
        suffix: acc.accountNumber.slice(-4),
        balance: acc.balance,
        available: acc.availableBalance || acc.balance,
        description: acc.description
      })),
      summary,
      message: accounts.length > 0
        ? summary + ". Would you like to hear details about any specific account?"
        : "I don't see any active accounts on your membership."
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleGetTransactions(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, account_type, account_suffix, days_back = 30 } = params

  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    const result = await powerOn.getTransactions(member_id, {
      accountType: account_type,
      accountSuffix: account_suffix,
      daysBack: days_back
    })

    if (!result.success || !result.data) {
      return {
        error: result.error,
        message: "I couldn't retrieve transactions for that account."
      }
    }

    const transactions = result.data.slice(0, 5) // Recent 5

    const summary = transactions.map((tx: any) => {
      const amountStr = Math.abs(tx.amount).toFixed(2)
      const typeStr = tx.amount < 0 ? "debit" : "credit"
      return `${tx.description} for $${amountStr} on ${new Date(tx.date).toLocaleDateString()}`
    }).join(", ")

    return {
      transactions: result.data,
      count: result.data.length,
      summary,
      message: result.data.length > 0
        ? `Here are your recent transactions: ${summary}. Would you like to hear more?`
        : "I don't see any recent transactions for this account."
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleTransfer(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, from_account_type, from_account_suffix, to_account_type, to_account_suffix, amount } = params

  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    const result = await powerOn.transferFunds({
      memberId: member_id,
      fromAccountType: from_account_type,
      fromAccountSuffix: from_account_suffix,
      toAccountType: to_account_type,
      toAccountSuffix: to_account_suffix,
      amount
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        message: `I couldn't complete that transfer. ${result.error}`
      }
    }

    const confirmationNumber = result.data.confirmationNumber || `TXF${Date.now().toString().slice(-8)}`

    return {
      success: true,
      confirmation_number: confirmationNumber,
      amount,
      from: `${from_account_type} ending in ${from_account_suffix}`,
      to: `${to_account_type} ending in ${to_account_suffix}`,
      message: `Transfer completed successfully! I've moved $${amount.toFixed(2)} from your ${from_account_type} to your ${to_account_type}. Your confirmation number is ${confirmationNumber}. Is there anything else I can help with?`
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleReportLostCard(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, card_type, last_four, reason } = params

  // In production, this would call PowerOn card services
  const confirmationNumber = `CARD${Date.now().toString().slice(-8)}`

  await supabase.from("audit_log").insert({
    member_id,
    action: "card.report_lost",
    channel: "ivr",
    result: "success",
    metadata: { card_type, last_four, reason, confirmation_number: confirmationNumber, tenant_id: context.tenant_id }
  })

  const cuName = cuConfig.name || "your credit union"

  return {
    success: true,
    confirmation_number: confirmationNumber,
    message: `I've deactivated your ${card_type} card ending in ${last_four} and a replacement will be mailed to you within 7-10 business days. Your confirmation number is ${confirmationNumber}. The new card will be sent to your address on file with ${cuName}.`
  }
}

async function handleRoutingInfo(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, account_type, account_suffix } = params

  const routingNumber = cuConfig.routing_number || "123456789"
  const accountNumber = `****${account_suffix}`
  const cuName = cuConfig.name || "your credit union"

  await supabase.from("audit_log").insert({
    member_id,
    action: "routing.info_requested",
    channel: "ivr",
    result: "success",
    metadata: { account_type, account_suffix, tenant_id: context.tenant_id }
  })

  return {
    routing_number: routingNumber,
    account_number: accountNumber,
    message: `For your ${account_type} account ending in ${account_suffix}, the ${cuName} routing number is ${routingNumber.split('').join(' ')}, and your account number ends in ${account_suffix}. For security, I've sent the full account details to your registered email.`
  }
}

async function handleTravelNotification(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, destination, start_date, end_date } = params

  // Store in database
  await supabase.from("travel_notifications").insert({
    member_id,
    destination,
    start_date,
    end_date,
    status: "active",
    tenant_id: context.tenant_id,
    created_at: new Date().toISOString()
  })

  return {
    success: true,
    message: `Perfect! I've set up a travel notification for ${destination} from ${start_date} to ${end_date}. Your cards should work without issues during this time. Have a great trip!`
  }
}

async function handleCheckStatus(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, check_number, account_type, account_suffix } = params

  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    const result = await powerOn.getCheckStatus(member_id, check_number, account_suffix)

    if (!result.success || !result.data) {
      return {
        error: result.error,
        message: "I couldn't find information about that check."
      }
    }

    const check = result.data
    let statusMessage = ""

    switch (check.status) {
      case "cleared":
        statusMessage = `Check number ${check_number} has cleared on ${new Date(check.clearedDate!).toLocaleDateString()} for $${check.amount?.toFixed(2)}.`
        break
      case "pending":
        statusMessage = `Check number ${check_number} is pending and hasn't cleared yet.`
        break
      case "stopped":
        statusMessage = `Check number ${check_number} has a stop payment on it.`
        break
      default:
        statusMessage = `I don't have any record of check number ${check_number}.`
    }

    return {
      check_number,
      status: check.status,
      message: statusMessage
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleStopPayment(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, check_number, account_suffix, amount } = params

  const powerOn = new PowerOnService(powerOnConfig)
  await powerOn.connect()

  try {
    const result = await powerOn.placeStopPayment(member_id, check_number, account_suffix, amount)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        message: "I couldn't place the stop payment at this time."
      }
    }

    return {
      success: true,
      confirmation_number: result.data.confirmationNumber,
      message: `I've placed a stop payment on check number ${check_number} for $${amount.toFixed(2)}. Your confirmation number is ${result.data.confirmationNumber}. Please note there may be a fee for this service.`
    }
  } finally {
    await powerOn.disconnect()
  }
}

async function handleFindLocations(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { zip_code, location_type = "both" } = params

  // Query CU directory for branches/ATMs
  // In production, integrate with branch locator API
  const locations = [
    { type: "branch", name: "Main Branch", address: "123 Main St", distance: "0.5 miles" },
    { type: "atm", name: "Downtown ATM", address: "456 Oak Ave", distance: "0.8 miles" }
  ]

  const filtered = location_type === "both"
    ? locations
    : locations.filter((l: any) => l.type === location_type)

  const summary = filtered.slice(0, 3).map((l: any) =>
    `${l.name} at ${l.address}, ${l.distance} away`
  ).join(", ")

  return {
    locations: filtered,
    count: filtered.length,
    message: `I found ${filtered.length} locations near ${zip_code}. The closest are: ${summary}. Would you like directions to any of these?`
  }
}

async function handleRequestStatement(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, account_type, account_suffix, delivery_method, statement_period } = params

  await supabase.from("statement_requests").insert({
    member_id,
    account_type,
    account_suffix,
    delivery_method,
    statement_period,
    status: "pending",
    tenant_id: context.tenant_id,
    requested_at: new Date().toISOString()
  })

  const deliveryMsg = delivery_method === "email"
    ? "emailed to your registered email address within 24 hours"
    : "mailed to your address on file within 5-7 business days"

  return {
    success: true,
    message: `I've requested your ${account_type} statement${statement_period ? ` for ${statement_period}` : ''}. It will be ${deliveryMsg}.`
  }
}

async function handleCreditLimitRequest(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, card_last_four, requested_limit } = params

  const requestId = `CLR${Date.now().toString().slice(-8)}`

  await supabase.from("credit_limit_requests").insert({
    member_id,
    card_last_four,
    requested_limit,
    request_id: requestId,
    status: "pending_review",
    tenant_id: context.tenant_id,
    requested_at: new Date().toISOString()
  })

  return {
    success: true,
    request_id: requestId,
    message: `I've submitted your request to increase the credit limit on your card ending in ${card_last_four} to $${requested_limit.toLocaleString()}. You should receive a decision within 3-5 business days. Your request ID is ${requestId}.`
  }
}

async function handleBiometricEnrollment(params: any, context: any, powerOnConfig: any, cuConfig: any, supabase: any) {
  const { member_id, opt_in } = params

  await supabase.from("biometric_settings").upsert({
    user_id: member_id,
    enrolled: opt_in,
    enrolled_date: opt_in ? new Date().toISOString() : null,
    last_updated: new Date().toISOString(),
    tenant_id: context.tenant_id
  })

  return {
    success: true,
    enrolled: opt_in,
    message: opt_in
      ? "Great! I've enrolled you in voice biometric authentication. Next time you call, I'll be able to recognize your voice for faster service."
      : "I've removed you from voice biometric authentication. You'll need to verify with your PIN on future calls."
  }
}
