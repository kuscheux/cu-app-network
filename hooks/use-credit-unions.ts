"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CreditUnionData } from "@/lib/credit-union-data"
import { TOP_20_CREDIT_UNIONS } from "@/lib/credit-union-data"

interface UseCreditUnionsOptions {
  search?: string
  state?: string
  limit?: number
  withLogosOnly?: boolean
  sortBy?: "total_assets" | "total_members" | "cu_name"
  sortOrder?: "asc" | "desc"
}

interface UseCreditUnionsResult {
  creditUnions: CreditUnionData[]
  isLoading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  /** 'supabase' = data from DB; 'fallback' = demo list (env missing or table empty) */
  dataSource: "supabase" | "fallback"
}

export function useCreditUnions(options: UseCreditUnionsOptions = {}): UseCreditUnionsResult {
  const {
    search = "",
    state = "",
    limit = 50,
    withLogosOnly = false,
    sortBy = "total_assets",
    sortOrder = "desc",
  } = options

  const [creditUnions, setCreditUnions] = useState<CreditUnionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback")

  const fetchCreditUnions = useCallback(
    async (reset = false) => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const currentOffset = reset ? 0 : offset

        // Build query - use credit_unions table (has all 4,300+ CUs with logos)
        let query = supabase
          .from("credit_unions")
          .select(
            `
            id,
            name,
            charter,
            city,
            state_id,
            website,
            total_assets,
            total_members,
            logo_url,
            primary_color,
            og_image_url
          `,
            { count: "exact" }
          )

        // Apply search
        if (search) {
          query = query.or(
            `name.ilike.%${search}%,city.ilike.%${search}%,charter.eq.${parseInt(search) || 0}`
          )
        }

        // Only with logos
        if (withLogosOnly) {
          query = query.not("logo_url", "is", null)
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === "asc", nullsFirst: false })

        // Apply pagination
        query = query.range(currentOffset, currentOffset + limit - 1)

        let data: unknown[] | null = null
        let fetchError: { message: string } | null = null
        let count: number | null = null

        const creditUnionsResult = await query
        data = creditUnionsResult.data
        fetchError = creditUnionsResult.error
        count = creditUnionsResult.count

        // If credit_unions table empty or missing, try ncua_credit_unions (same DB, different schema)
        if (fetchError || !data || data.length === 0) {
          const ncuaSelect = "charter_number, cu_name, city, state, website, total_assets, total_members, logo_url, primary_color"
          let ncuaQuery = supabase
            .from("ncua_credit_unions")
            .select(ncuaSelect, { count: "exact" })
            .eq("is_active", true)

          if (search) {
            const searchNum = parseInt(search, 10)
            if (Number.isNaN(searchNum)) {
              ncuaQuery = ncuaQuery.or(`cu_name.ilike.%${search}%,city.ilike.%${search}%`)
            } else {
              ncuaQuery = ncuaQuery.or(`cu_name.ilike.%${search}%,city.ilike.%${search}%,charter_number.eq.${searchNum}`)
            }
          }
          if (state) {
            ncuaQuery = ncuaQuery.eq("state", state.toUpperCase())
          }
          if (withLogosOnly) {
            ncuaQuery = ncuaQuery.not("logo_url", "is", null)
          }
          const sortCol = sortBy === "cu_name" ? "cu_name" : sortBy
          ncuaQuery = ncuaQuery.order(sortCol, { ascending: sortOrder === "asc", nullsFirst: false })
          ncuaQuery = ncuaQuery.range(currentOffset, currentOffset + limit - 1)

          const ncuaResult = await ncuaQuery
          if (!ncuaResult.error && ncuaResult.data && ncuaResult.data.length > 0) {
            const formattedCUs = (ncuaResult.data as Record<string, unknown>[]).map((row) =>
              formatCreditUnionFromNcua(row)
            )
            setDataSource("supabase")
            if (reset) {
              setCreditUnions(formattedCUs)
              setOffset(limit)
            } else {
              setCreditUnions((prev) => [...prev, ...formattedCUs])
              setOffset((prev) => prev + limit)
            }
            setTotalCount(ncuaResult.count ?? formattedCUs.length)
            setIsLoading(false)
            return
          }
        }

        // If Supabase returns no data or has an error, fallback to hardcoded data
        if (fetchError || !data || (data.length === 0 && currentOffset === 0)) {
          console.log("Supabase empty or error, using fallback data:", fetchError?.message || "No data")

          // Filter hardcoded data based on search
          let fallbackData = TOP_20_CREDIT_UNIONS
          if (search) {
            const searchLower = search.toLowerCase()
            fallbackData = fallbackData.filter(
              (cu) =>
                cu.name.toLowerCase().includes(searchLower) ||
                cu.displayName.toLowerCase().includes(searchLower) ||
                cu.headquarters?.toLowerCase().includes(searchLower)
            )
          }
          if (state) {
            fallbackData = fallbackData.filter((cu) => cu.state?.toUpperCase() === state.toUpperCase())
          }

          // Sort
          if (sortBy === "total_assets") {
            fallbackData = [...fallbackData].sort((a, b) =>
              sortOrder === "desc" ? b.assets - a.assets : a.assets - b.assets
            )
          } else if (sortBy === "total_members") {
            fallbackData = [...fallbackData].sort((a, b) =>
              sortOrder === "desc" ? b.members - a.members : a.members - b.members
            )
          }

          // Paginate
          const paginatedData = fallbackData.slice(currentOffset, currentOffset + limit)

          if (reset) {
            setCreditUnions(paginatedData)
            setOffset(limit)
          } else {
            setCreditUnions((prev) => [...prev, ...paginatedData])
            setOffset((prev) => prev + limit)
          }
          setTotalCount(fallbackData.length)
          setDataSource("fallback")
          return
        }

        setDataSource("supabase")
        // Format the data from Supabase
        const formattedCUs = (data || []).map((cu) => formatCreditUnion(cu))

        if (reset) {
          setCreditUnions(formattedCUs)
          setOffset(limit)
        } else {
          setCreditUnions((prev) => [...prev, ...formattedCUs])
          setOffset((prev) => prev + limit)
        }

        setTotalCount(count || 0)
      } catch (err) {
        // On complete failure, fallback to hardcoded data
        console.error("Failed to fetch from Supabase, using fallback:", err)
        if (reset) {
          setCreditUnions(TOP_20_CREDIT_UNIONS)
          setTotalCount(TOP_20_CREDIT_UNIONS.length)
          setOffset(TOP_20_CREDIT_UNIONS.length)
        }
        setDataSource("fallback")
        setError(null) // Clear error since we have fallback data
      } finally {
        setIsLoading(false)
      }
    },
    [search, state, limit, withLogosOnly, sortBy, sortOrder, offset]
  )

  // Initial fetch and refetch when filters change
  useEffect(() => {
    setOffset(0)
    fetchCreditUnions(true)
  }, [search, state, withLogosOnly, sortBy, sortOrder])

  const loadMore = useCallback(() => {
    if (!isLoading && offset < totalCount) {
      fetchCreditUnions(false)
    }
  }, [isLoading, offset, totalCount, fetchCreditUnions])

  const refresh = useCallback(() => {
    setOffset(0)
    fetchCreditUnions(true)
  }, [fetchCreditUnions])

  return {
    creditUnions,
    isLoading,
    error,
    totalCount,
    hasMore: offset < totalCount,
    loadMore,
    refresh,
    dataSource,
  }
}

// Single credit union hook
export function useCreditUnion(charterNumber: number | null) {
  const [creditUnion, setCreditUnion] = useState<CreditUnionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!charterNumber) {
      setCreditUnion(null)
      return
    }

    const fetchCU = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const { data, error: fetchError } = await supabase
          .from("credit_unions")
          .select(
            `
            id,
            name,
            charter,
            city,
            state_id,
            website,
            total_assets,
            total_members,
            logo_url,
            primary_color,
            og_image_url
          `
          )
          .eq("charter", charterNumber)
          .single()

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        if (data) {
          setCreditUnion(formatCreditUnion(data))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch credit union")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCU()
  }, [charterNumber])

  return { creditUnion, isLoading, error }
}

// State ID to state code mapping
const STATE_CODES: Record<number, string> = {
  1: 'AL', 2: 'AK', 3: 'AZ', 4: 'AR', 5: 'CA', 6: 'CO', 7: 'CT', 8: 'DE', 9: 'FL', 10: 'GA',
  11: 'HI', 12: 'ID', 13: 'IL', 14: 'IN', 15: 'IA', 16: 'KS', 17: 'KY', 18: 'LA', 19: 'ME', 20: 'MD',
  21: 'MA', 22: 'MI', 23: 'MN', 24: 'MS', 25: 'MO', 26: 'MT', 27: 'NE', 28: 'NV', 29: 'NH', 30: 'NJ',
  31: 'NM', 32: 'NY', 33: 'NC', 34: 'ND', 35: 'OH', 36: 'OK', 37: 'OR', 38: 'PA', 39: 'RI', 40: 'SC',
  41: 'SD', 42: 'TN', 43: 'TX', 44: 'UT', 45: 'VT', 46: 'VA', 47: 'WA', 48: 'WV', 49: 'WI', 50: 'WY',
  51: 'DC', 52: 'PR', 53: 'VI', 54: 'GU', 55: 'AS', 56: 'MP'
}

// Format ncua_credit_unions row to CreditUnionData (id = cu_ + charter_number, name = cu_name, state = state code)
function formatCreditUnionFromNcua(row: Record<string, unknown>): CreditUnionData {
  const charter = row.charter_number != null ? String(row.charter_number) : ""
  const id = charter ? `cu_${charter}` : "cu_unknown"
  const name = (row.cu_name as string) || "Credit Union"
  const stateCode = (row.state as string) || ""
  const domain = (row.website as string)
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
  const primaryColor = (row.primary_color as string) || generateColorFromName(name)
  const displayName = name
    .replace(/FEDERAL CREDIT UNION$/i, "FCU")
    .replace(/CREDIT UNION$/i, "CU")
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
  const city = (row.city as string) || ""
  const headquarters = city && stateCode ? `${city}, ${stateCode}` : city

  return {
    id,
    rank: 0,
    name,
    displayName,
    charter,
    routing: "",
    assets: (row.total_assets as number) ?? 0,
    assetsFormatted: formatAssets((row.total_assets as number) ?? null),
    members: (row.total_members as number) ?? 0,
    membersFormatted: formatMembers((row.total_members as number) ?? null),
    headquarters,
    city,
    state: stateCode,
    website: (row.website as string) || "",
    logoUrl: (row.logo_url as string) || (domain ? `https://logo.clearbit.com/${domain}` : ""),
    logoUrls: {
      direct: (row.logo_url as string) || undefined,
      brandfetch: domain ? `https://cdn.brandfetch.io/${domain}/w/400/h/400` : undefined,
      clearbit: domain ? `https://logo.clearbit.com/${domain}` : "",
      google: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "",
      duckduckgo: domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : "",
    },
    logoDomain: domain || "",
    logoFallbackColor: primaryColor,
    appStoreId: null,
    playStoreId: null,
    primaryColor,
    founded: 0,
    ceo: "",
    source: "ncua",
    lastUpdated: new Date().toISOString(),
    coreBanking: {
      provider: "Unknown",
      platform: "Unknown",
      confidence: 0,
      source: "Not verified",
      lastVerified: "",
    },
  }
}

// Format raw Supabase data to CreditUnionData type
function formatCreditUnion(cu: Record<string, unknown>): CreditUnionData {
  const website = cu.website as string | undefined
  const domain = website
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]

  const name = (cu.name as string) || "Credit Union"
  const primaryColor = (cu.primary_color as string) || generateColorFromName(name)
  const stateCode = STATE_CODES[(cu.state_id as number)] || ""

  const displayName = name
    .replace(/FEDERAL CREDIT UNION$/i, "FCU")
    .replace(/CREDIT UNION$/i, "CU")
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

  const city = (cu.city as string) || ""
  return {
    id: cu.id as string,
    rank: 0,
    name,
    displayName,
    charter: cu.charter != null ? String(cu.charter) : "",
    routing: "",
    assets: (cu.total_assets as number) ?? 0,
    assetsFormatted: formatAssets((cu.total_assets as number) ?? null),
    members: (cu.total_members as number) ?? 0,
    membersFormatted: formatMembers((cu.total_members as number) ?? null),
    headquarters: city && stateCode ? `${city}, ${stateCode}` : city,
    city,
    state: stateCode,
    website: website || "",
    logoUrl: (cu.logo_url as string) || (domain ? `https://logo.clearbit.com/${domain}` : ""),
    logoUrls: {
      direct: cu.logo_url as string | undefined,
      brandfetch: domain ? `https://cdn.brandfetch.io/${domain}/w/400/h/400` : undefined,
      clearbit: domain ? `https://logo.clearbit.com/${domain}` : "",
      google: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "",
      duckduckgo: domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : "",
    },
    logoDomain: domain || "",
    logoFallbackColor: primaryColor,
    appStoreId: null,
    playStoreId: null,
    primaryColor,
    founded: 0,
    ceo: "",
    source: "ncua",
    lastUpdated: new Date().toISOString(),
    coreBanking: {
      provider: "Unknown",
      platform: "Unknown",
      confidence: 0,
      source: "Not verified",
      lastVerified: "",
    },
  }
}

function formatAssets(assets: number | null): string {
  if (!assets) return "N/A"
  if (assets >= 1_000_000_000) {
    return `$${(assets / 1_000_000_000).toFixed(1)}B`
  }
  if (assets >= 1_000_000) {
    return `$${(assets / 1_000_000).toFixed(0)}M`
  }
  return `$${assets.toLocaleString()}`
}

function formatMembers(members: number | null): string {
  if (!members) return "N/A"
  if (members >= 1_000_000) {
    return `${(members / 1_000_000).toFixed(1)}M`
  }
  if (members >= 1_000) {
    return `${(members / 1_000).toFixed(0)}K`
  }
  return members.toLocaleString()
}

function generateFallbackLogo(domain: string | null): string {
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  }
  return "/placeholder-logo.svg"
}

function generateColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  const s = 50 + (Math.abs(hash >> 8) % 30)
  const l = 35 + (Math.abs(hash >> 16) % 20)

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100
    l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0")
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  return hslToHex(h, s, l)
}
