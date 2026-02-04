import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { KNOWN_TABLE_MAPPINGS } from "@/lib/schema-to-config-mapper"
import { ANI_IVR_TABLE_SCHEMAS, LOBBY_CONFIG_PATH_BY_TABLE } from "@/lib/mcp/supabase-table-mappings"

/**
 * GET /api/db/omnichannel-tables
 * Returns all Supabase tables mapped to config paths and omnichannel context (IVR, Mobile, Web, Chat).
 * Used by the Schema Map visual to show configurable fields within the omnichannel experience.
 */

const KNOWN_TABLE_NAMES = [
  "ncua_credit_unions",
  "cu_configs",
  "cu_logos",
  "cu_branches",
  "cu_feature_flags",
  "cu_api_endpoints",
  "cu_branding",
  "cu_details",
  "members",
  "accounts",
  "transactions",
  "loans",
  "loan_applications",
  "loan_payments",
  "cards",
  "card_transactions",
  "ach_transfers",
  "wire_transfers",
  "transfers",
  "payments",
  "payment_rails",
  "settlements",
  "compliance_checks",
  "fraud_alerts",
  "audit_logs",
  "kyc_verifications",
  "ofac_checks",
  "ivr_calls",
  "ivr_sessions",
  "ivr_transcripts",
  "ivr_config",
  "cms_pages",
  "cms_media",
  "feature_packages",
  "domains",
  "branding",
  "features",
  "api_endpoints",
  "ani_mappings",
  "member_phones",
  "cu_limits",
  "fraud_config",
  "kyc_config",
  "share_products",
  "loan_products",
  "credit_unions",
  "tenant_claims",
  "cu_email_domains",
  "cu_subscriptions",
  "state_background_photos",
] as const

function configPathToChannel(configPath: string): "IVR" | "Mobile" | "Web" | "Chat" | "Shared" {
  if (configPath.startsWith("channels.ivr")) return "IVR"
  if (configPath.startsWith("channels.mobile")) return "Mobile"
  if (configPath.startsWith("channels.web")) return "Web"
  if (configPath.startsWith("channels.chat")) return "Chat"
  return "Shared"
}

function configPathToTier(configPath: string): string {
  const parts = configPath.split(".")
  if (parts[0] === "tenant") return "Identity & Brand"
  if (parts[0] === "design") return "Design Tokens"
  if (parts[0] === "features") return "Features"
  if (parts[0] === "channels") return "Channels (IVR/Mobile/Web/Chat)"
  if (parts[0] === "products") return "Products"
  if (parts[0] === "rules") return "Business Rules"
  if (parts[0] === "fraud") return "Fraud & Risk"
  if (parts[0] === "compliance") return "Compliance"
  if (parts[0] === "integrations") return "Integrations"
  return parts[0] || "Other"
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Build table -> config paths from KNOWN_TABLE_MAPPINGS + ANI_IVR
    const tableToConfigPaths = new Map<string, { configPath: string; confidence: string }[]>()
    for (const m of KNOWN_TABLE_MAPPINGS) {
      for (const src of m.sourceTables) {
        let arr = tableToConfigPaths.get(src.table)
        if (!arr) {
          arr = []
          tableToConfigPaths.set(src.table, arr)
        }
        if (!arr.some((x) => x.configPath === m.configPath)) {
          arr.push({ configPath: m.configPath, confidence: m.confidence })
        }
      }
    }
    for (const [table, configPath] of Object.entries(LOBBY_CONFIG_PATH_BY_TABLE)) {
      const arr = tableToConfigPaths.get(table) ?? []
      if (!arr.some((x) => x.configPath === configPath)) {
        arr.push({ configPath, confidence: "high" })
      }
      tableToConfigPaths.set(table, arr)
    }

    const allTableNames = new Set<string>([
      ...KNOWN_TABLE_NAMES,
      ...KNOWN_TABLE_MAPPINGS.flatMap((m) => m.sourceTables.map((s) => s.table)),
      ...ANI_IVR_TABLE_SCHEMAS.map((s) => s.table),
    ])

    const tablesWithColumns: Array<{
      tableName: string
      columns: string[]
      configPaths: { configPath: string; confidence: string }[]
      channel: "IVR" | "Mobile" | "Web" | "Chat" | "Shared"
      tier: string
    }> = []

    for (const tableName of Array.from(allTableNames).sort()) {
      const configPaths = tableToConfigPaths.get(tableName) ?? []
      const primaryPath = configPaths[0]?.configPath ?? "tenant"
      const channel = configPathToChannel(primaryPath)
      const tier = configPathToTier(primaryPath)

      let columns: string[] = []
      try {
        const { data, error } = await supabase.from(tableName).select("*").limit(1)
        if (!error && data && data.length > 0 && typeof data[0] === "object") {
          columns = Object.keys(data[0] as Record<string, unknown>)
        }
      } catch {
        // Table may not exist (mock or missing)
      }

      tablesWithColumns.push({
        tableName,
        columns,
        configPaths,
        channel,
        tier,
      })
    }

    const byChannel = {
      IVR: tablesWithColumns.filter((t) => t.channel === "IVR"),
      Mobile: tablesWithColumns.filter((t) => t.channel === "Mobile"),
      Web: tablesWithColumns.filter((t) => t.channel === "Web"),
      Chat: tablesWithColumns.filter((t) => t.channel === "Chat"),
      Shared: tablesWithColumns.filter((t) => t.channel === "Shared"),
    }

    const byTier = new Map<string, typeof tablesWithColumns>()
    for (const t of tablesWithColumns) {
      const list = byTier.get(t.tier) ?? []
      list.push(t)
      byTier.set(t.tier, list)
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalTables: tablesWithColumns.length,
        withColumns: tablesWithColumns.filter((t) => t.columns.length > 0).length,
        byChannel: {
          IVR: byChannel.IVR.length,
          Mobile: byChannel.Mobile.length,
          Web: byChannel.Web.length,
          Chat: byChannel.Chat.length,
          Shared: byChannel.Shared.length,
        },
      },
      tables: tablesWithColumns,
      byChannel,
      byTier: Object.fromEntries(byTier),
      note: "Map all 700+ tables by posting a schema dump to POST /api/db/schema-mapping. This list uses known mappings + introspection.",
    })
  } catch (err) {
    console.error("[omnichannel-tables]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list tables" },
      { status: 500 }
    )
  }
}
