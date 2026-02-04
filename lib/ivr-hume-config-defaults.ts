/**
 * HUME EVI IVR CONFIGURATION DEFAULTS
 *
 * Credit-union-specific IVR configuration templates that make each CU feel like
 * the system was custom-built for them. Replaces legacy Genesys IVR.
 *
 * Each CU gets:
 * - Personalized system prompts with their name
 * - Custom voice personality aligned to their brand
 * - Their phone numbers, routing numbers, branding
 * - Tools customized to their product offerings
 */

import type { IVRConfig, IVRTool } from "@/types/cu-config"

/**
 * Generate CU-specific system prompt that references their name, products, and culture
 */
export function generateCUSystemPrompt(cuConfig: {
  name: string
  charter_number: string
  support_phone: string
  routing_number: string
  timezone: string
  products?: {
    has_mortgages?: boolean
    has_business_accounts?: boolean
    has_crypto?: boolean
    has_investment_services?: boolean
  }
  culture?: {
    tone: "professional" | "friendly" | "casual" | "tech-forward" | "traditional"
    community_focused: boolean
    values?: string[] // e.g., ["transparency", "member-first", "innovation"]
  }
}): string {
  const { name, support_phone, routing_number, products, culture } = cuConfig

  const toneGuidance = getToneGuidance(culture?.tone || "friendly")
  const productMentions = getProductMentions(products)
  const cultureMentions = getCultureMentions(culture)

  return `You are an intelligent voice assistant for ${name}. Your role is to help members with their financial needs in a natural, conversational way.

**Your Credit Union:**
${name} (Charter #${cuConfig.charter_number}) serves members with ${cultureMentions}. You represent our values and commitment to exceptional member service.

**Your Capabilities:**
- Check account balances (checking, savings${products?.has_business_accounts ? ', business accounts' : ''}${products?.has_mortgages ? ', mortgages' : ''})
- Review recent transactions with spending insights
- Transfer funds between accounts
- Report lost or stolen cards
- Provide routing number (${routing_number}) and account numbers
- Set up travel notifications
- Check status and stop payments${productMentions}
- Locate ATM/branch locations
- Request statements
- Update credit limits
- Connect to a live ${name} representative when needed

**Conversation Style:**
${toneGuidance}
- Be warm, professional, and empathetic
- Listen carefully to emotional cues and adjust your tone accordingly
- If the member sounds frustrated, acknowledge it and offer to help
- If the member sounds rushed, be concise
- Use natural language - avoid sounding robotic or scripted
- Confirm sensitive information by reading back key details
- Always mention "${name}" when referring to our credit union

**Security & Authentication:**
- Members are automatically recognized by their phone number
- NEVER ask members to say their member number out loud - it's sensitive information
- For authentication, ONLY ask for PIN (4-6 digits)
- If caller is not recognized by phone, ask for last 4 of SSN + date of birth
- Verify identity before discussing account details

**Handling Requests:**
1. First, understand what the member needs
2. Verify they're authenticated if needed
3. Retrieve the requested information
4. Present it clearly and ask if they need anything else
5. If you can't handle a request, transfer to a ${name} representative

**Important:**
- Never make up account balances or information - always use the provided tools
- If unsure, ask clarifying questions
- Offer proactive help based on context (e.g., "Would you like to set up a transfer?")
- End calls gracefully, confirming everything is resolved
- Always say "Thank you for banking with ${name}" at the end

**Support Contact:**
If technical issues arise or the member needs to speak with someone, our member services team is available at ${support_phone}.`
}

/**
 * Tone-specific conversation guidelines
 */
function getToneGuidance(tone: string): string {
  switch (tone) {
    case "professional":
      return "- Maintain a polished, business-like demeanor\n- Use formal language and complete sentences\n- Be efficient and direct while remaining courteous"
    case "friendly":
      return "- Be warm and approachable, like a helpful neighbor\n- Use conversational language\n- Smile through your voice - members should feel welcomed"
    case "casual":
      return "- Be relaxed and personable\n- Use everyday language\n- Feel free to be slightly informal while staying respectful"
    case "tech-forward":
      return "- Be modern and efficient\n- Emphasize digital features and capabilities\n- Use clear, straightforward language"
    case "traditional":
      return "- Emphasize trust, stability, and reliability\n- Use respectful, time-tested language\n- Focus on personal service and relationship"
    default:
      return "- Be helpful and genuine\n- Adapt to the member's communication style"
  }
}

/**
 * Product-specific mentions for system prompt
 */
function getProductMentions(products?: any): string {
  if (!products) return ""

  const mentions: string[] = []

  if (products.has_investment_services) {
    mentions.push("\n- Provide investment account information and connect to advisors")
  }
  if (products.has_crypto) {
    mentions.push("\n- Assist with cryptocurrency account queries")
  }
  if (products.has_mortgages) {
    mentions.push("\n- Answer mortgage questions and payment inquiries")
  }

  return mentions.join("")
}

/**
 * Culture-specific mentions
 */
function getCultureMentions(culture?: any): string {
  if (!culture) return "a commitment to excellent member service"

  const mentions: string[] = []

  if (culture.community_focused) {
    mentions.push("deep community roots")
  }
  if (culture.values?.includes("innovation")) {
    mentions.push("cutting-edge technology")
  }
  if (culture.values?.includes("transparency")) {
    mentions.push("transparent, honest service")
  }
  if (culture.values?.includes("member-first")) {
    mentions.push("a member-first philosophy")
  }

  return mentions.length > 0 ? mentions.join(", ") : "a commitment to excellent member service"
}

/**
 * ALL CU Tools - comprehensive list that can be enabled/disabled per CU
 */
export const ALL_AVAILABLE_TOOLS: IVRTool[] = [
  {
    type: "custom",
    name: "authenticate_member",
    description: "Authenticate a member using their PIN. The member is automatically identified by their phone number. NEVER ask for member number - use only PIN.",
    parameters: {
      pin: {
        type: "string",
        description: "The member's 4-6 digit PIN",
        required: true
      },
      ssn_last_four: {
        type: "string",
        description: "Last 4 digits of SSN (only if member not recognized by phone number)",
        required: false
      },
      date_of_birth: {
        type: "string",
        description: "Date of birth in YYYY-MM-DD format (only if member not recognized by phone number)",
        required: false
      }
    },
    webhook_url: "/api/ivr/hume/tools/authenticate"
  },
  {
    type: "custom",
    name: "get_account_balances",
    description: "Retrieve all account balances for an authenticated member",
    parameters: {
      member_id: {
        type: "string",
        description: "The authenticated member ID",
        required: true
      }
    },
    webhook_url: "/api/ivr/hume/tools/balances"
  },
  {
    type: "custom",
    name: "get_account_transactions",
    description: "Get recent transactions for a specific account",
    parameters: {
      member_id: {
        type: "string",
        description: "The authenticated member ID",
        required: true
      },
      account_type: {
        type: "string",
        description: "Type of account (checking, savings, loan, credit_card)",
        required: true
      },
      account_suffix: {
        type: "string",
        description: "Account suffix (last 4 digits or identifier)",
        required: true
      },
      days_back: {
        type: "number",
        description: "Number of days of history to retrieve (default 30)",
        required: false
      }
    },
    webhook_url: "/api/ivr/hume/tools/transactions"
  },
  {
    type: "custom",
    name: "transfer_funds",
    description: "Transfer funds between member accounts",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      from_account_type: { type: "string", description: "Source account type", required: true },
      from_account_suffix: { type: "string", description: "Source account suffix", required: true },
      to_account_type: { type: "string", description: "Destination account type", required: true },
      to_account_suffix: { type: "string", description: "Destination account suffix", required: true },
      amount: { type: "number", description: "Amount to transfer in dollars", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/transfer"
  },
  {
    type: "custom",
    name: "report_lost_card",
    description: "Report a lost or stolen debit/credit card and request replacement",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      card_type: { type: "string", description: "Type of card (debit, credit)", required: true },
      last_four: { type: "string", description: "Last 4 digits of the card number", required: true },
      reason: { type: "string", description: "Reason for replacement (lost, stolen, damaged)", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/lost-card"
  },
  {
    type: "custom",
    name: "get_routing_info",
    description: "Get routing number and account number for direct deposit or wire transfers",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      account_type: { type: "string", description: "Account type (checking, savings)", required: true },
      account_suffix: { type: "string", description: "Account suffix", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/routing"
  },
  {
    type: "custom",
    name: "set_travel_notification",
    description: "Set up a travel notification to prevent card declines while traveling",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      destination: { type: "string", description: "Travel destination (city, state, or country)", required: true },
      start_date: { type: "string", description: "Start date in YYYY-MM-DD format", required: true },
      end_date: { type: "string", description: "End date in YYYY-MM-DD format", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/travel"
  },
  {
    type: "custom",
    name: "check_status_inquiry",
    description: "Check if a specific check has cleared or get check status",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      check_number: { type: "string", description: "Check number to inquire about", required: true },
      account_type: { type: "string", description: "Account type (must be checking)", required: true },
      account_suffix: { type: "string", description: "Account suffix", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/check-status"
  },
  {
    type: "custom",
    name: "stop_payment",
    description: "Place a stop payment on a check",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      check_number: { type: "string", description: "Check number to stop", required: true },
      account_suffix: { type: "string", description: "Account suffix", required: true },
      amount: { type: "number", description: "Check amount in dollars", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/stop-payment"
  },
  {
    type: "custom",
    name: "find_atm_branch",
    description: "Find nearby ATM or branch locations",
    parameters: {
      zip_code: { type: "string", description: "ZIP code for location search", required: true },
      location_type: { type: "string", description: "Type of location to find (atm, branch, both)", required: false }
    },
    webhook_url: "/api/ivr/hume/tools/locations"
  },
  {
    type: "custom",
    name: "request_statement",
    description: "Request a mailed or emailed account statement",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      account_type: { type: "string", description: "Account type", required: true },
      account_suffix: { type: "string", description: "Account suffix", required: true },
      delivery_method: { type: "string", description: "How to deliver the statement (email, mail)", required: true },
      statement_period: { type: "string", description: "Statement period (e.g., '2024-01' for January 2024)", required: false }
    },
    webhook_url: "/api/ivr/hume/tools/statement"
  },
  {
    type: "custom",
    name: "update_credit_limit",
    description: "Request a credit limit increase on credit card",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      card_last_four: { type: "string", description: "Last 4 digits of credit card", required: true },
      requested_limit: { type: "number", description: "Requested new credit limit in dollars", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/credit-limit"
  },
  {
    type: "builtin",
    name: "transfer_call",
    description: "Transfer the call to a live representative"
  },
  {
    type: "custom",
    name: "voice_biometric_enrollment",
    description: "Enroll member in voice biometric authentication",
    parameters: {
      member_id: { type: "string", description: "The authenticated member ID", required: true },
      opt_in: { type: "boolean", description: "Whether to opt in (true) or opt out (false)", required: true }
    },
    webhook_url: "/api/ivr/hume/tools/biometric-enrollment"
  }
]

/**
 * Default IVR configuration template for a new CU
 * Customize based on CU's features, tone, and branding
 */
export function getDefaultHumeIVRConfig(cuConfig: {
  name: string
  charter_number: string
  support_phone: string
  routing_number: string
  timezone: string
  domain: string
  twilio_phone?: string
  products?: any
  culture?: any
  features?: any
}): IVRConfig {
  return {
    voice: {
      enabled: true,
      evi_version: "4-mini",
      voice: {
        provider: "HUME_AI",
        name: "ITO" // Hume's empathetic voice - can be customized per CU
      },
      language_model: {
        model_provider: "ANTHROPIC",
        model_resource: "claude-3-5-sonnet-20241022"
      },
      ellm_model: {
        allow_short_responses: true
      },
      nudges: {
        enabled: true,
        interval_secs: 10
      },
      timeouts: {
        inactivity: {
          enabled: true,
          duration_secs: 120
        },
        max_duration: {
          enabled: true,
          duration_secs: 900 // 15 minutes
        }
      },
      voice_biometrics: {
        enabled: cuConfig.features?.voice_biometrics || false,
        enrollment_required: false,
        confidence_threshold: 80
      },
      twilio: {
        enabled: true,
        phone_number: cuConfig.twilio_phone || "+18005551234",
        fallback_number: cuConfig.support_phone
      }
    },
    prompts: {
      system_prompt: {
        text: generateCUSystemPrompt(cuConfig),
        version: 1
      },
      event_messages: {
        on_new_chat: {
          enabled: true,
          message: `Thank you for calling ${cuConfig.name}. How may I help you today?`
        },
        on_disconnect: {
          enabled: true,
          message: `Thank you for banking with ${cuConfig.name}. Have a great day!`
        },
        on_transfer: {
          enabled: true,
          message: `I'm transferring you to a ${cuConfig.name} representative. Please hold.`
        },
        on_error: {
          enabled: true,
          message: `I'm sorry, I encountered a technical issue. Let me connect you with a ${cuConfig.name} representative who can help.`
        }
      },
      menu: {
        greeting: `Thank you for calling ${cuConfig.name}. Your call may be recorded for quality assurance.`,
        main_menu: {
          option_1: { label: "Account Balances", action: "balance_inquiry" },
          option_2: { label: "Transfers", action: "transfer_funds" },
          option_3: { label: "Card Services", action: "card_services" },
          option_4: { label: "Loan Information", action: "loan_inquiry" },
          option_0: { label: "Speak to Representative", action: "transfer_call" }
        },
        after_hours_message: `${cuConfig.name} member services is currently closed. Our hours are Monday through Friday, 8 AM to 6 PM ${cuConfig.timezone}. Please call back during business hours, or visit ${cuConfig.domain} to access your accounts online.`,
        hold_music_url: "https://cdn.example.com/hold-music.mp3" // CU-specific hold music
      },
      builtin_tools: ["transfer_call"],
      custom_tools: ALL_AVAILABLE_TOOLS.filter(t => t.type === "custom"), // All enabled by default
      escalation: {
        enabled: true,
        keywords: ["agent", "representative", "human", "help", "person", "someone"],
        max_attempts: 3,
        transfer_number: cuConfig.support_phone
      },
      banking_intents: {
        balance_inquiry: true,
        transaction_history: true,
        transfer_funds: true,
        bill_pay: cuConfig.features?.bill_pay || false,
        card_services: true,
        loan_inquiry: true,
        branch_hours: true,
        atm_locator: true
      },
      call_recording: {
        enabled: true,
        disclosure_message: "This call may be recorded for quality and training purposes."
      }
    }
  }
}

/**
 * Get enabled tools based on CU feature flags
 */
export function getEnabledTools(features: any, baseTools: IVRTool[]): IVRTool[] {
  return baseTools.filter(tool => {
    // Always enable core authentication and balance tools
    if (["authenticate_member", "get_account_balances", "get_account_transactions"].includes(tool.name)) {
      return true
    }

    // Feature-specific tools
    if (tool.name === "transfer_funds" && !features.external_transfers) return false
    if (tool.name === "report_lost_card" && !features.card_controls) return false
    if (tool.name === "set_travel_notification" && !features.travel_notifications) return false
    if (tool.name === "update_credit_limit" && !features.base_credit_card_integration) return false
    if (tool.name === "voice_biometric_enrollment" && !features.voice_biometrics) return false

    return true
  })
}
