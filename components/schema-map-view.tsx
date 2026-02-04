"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { CreditUnionData } from "@/lib/credit-union-data"
import { Database, Settings, Phone, Smartphone, Globe, MessageCircle, Layers, ChevronDown, ChevronRight, Search } from "lucide-react"

interface TableRowData {
  tableName: string
  columns: string[]
  configPaths: { configPath: string; confidence: string }[]
  channel: "IVR" | "Mobile" | "Web" | "Chat" | "Shared"
  tier: string
}

interface OmnichannelTablesResponse {
  success: boolean
  summary: {
    totalTables: number
    withColumns: number
    byChannel: { IVR: number; Mobile: number; Web: number; Chat: number; Shared: number }
  }
  tables: TableRowData[]
  byChannel: Record<string, TableRowData[]>
  byTier: Record<string, TableRowData[]>
  note?: string
}

interface SchemaMapViewProps {
  cu?: CreditUnionData
  onNavigateToConfig?: (tier?: string) => void
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  IVR: <Phone className="h-4 w-4" />,
  Mobile: <Smartphone className="h-4 w-4" />,
  Web: <Globe className="h-4 w-4" />,
  Chat: <MessageCircle className="h-4 w-4" />,
  Shared: <Layers className="h-4 w-4" />,
}

export function SchemaMapView({ onNavigateToConfig }: SchemaMapViewProps) {
  const [data, setData] = useState<OmnichannelTablesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"channel" | "tier">("channel")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch("/api/db/omnichannel-tables")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load tables")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filterTables = (tables: TableRowData[]) => {
    if (!search.trim()) return tables
    const q = search.trim().toLowerCase()
    return tables.filter(
      (t) =>
        t.tableName.toLowerCase().includes(q) ||
        t.tier.toLowerCase().includes(q) ||
        t.configPaths.some((p) => p.configPath.toLowerCase().includes(q)) ||
        t.columns.some((c) => c.toLowerCase().includes(q))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Checking Supabase and mapping tables…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load table map</CardTitle>
            <CardDescription>{error ?? "No data returned"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              When Supabase is configured, this view lists all tables mapped to config paths and omnichannel channels (IVR, Mobile, Web, Chat). With zero env vars, the list uses known mappings only.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-7 w-7" />
          Supabase → Omnichannel schema map
        </h1>
        <p className="text-muted-foreground">
          All tables mapped to configurable fields in the omnichannel experience (IVR, Mobile, Web, Chat). Each row is a configurable field within the full context.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables, config path, columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "channel" | "tier")}>
          <TabsList>
            <TabsTrigger value="channel">By channel</TabsTrigger>
            <TabsTrigger value="tier">By config tier</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateToConfig?.()}
        >
          <Settings className="h-4 w-4 mr-2" />
          Open Configuration
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="shrink-0 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Tables → config paths</CardTitle>
              <CardDescription>
                {data.summary.totalTables} tables · {data.summary.withColumns} with columns · IVR {data.summary.byChannel.IVR} · Mobile {data.summary.byChannel.Mobile} · Web {data.summary.byChannel.Web} · Chat {data.summary.byChannel.Chat} · Shared {data.summary.byChannel.Shared}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            {view === "channel" ? (
              <div className="p-4 space-y-6">
                {(["IVR", "Mobile", "Web", "Chat", "Shared"] as const).map((channel) => {
                  const list = filterTables(data.byChannel[channel] ?? [])
                  if (list.length === 0) return null
                  return (
                    <Collapsible key={channel} defaultOpen>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-3">
                          {CHANNEL_ICONS[channel]}
                          <span className="font-semibold">{channel}</span>
                          <Badge variant="secondary">{list.length}</Badge>
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Table</TableHead>
                              <TableHead>Columns</TableHead>
                              <TableHead>Config path (configurable)</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {list.map((t) => (
                              <TableRow key={t.tableName}>
                                <TableCell className="font-mono text-sm">{t.tableName}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {t.columns.length > 0 ? `${t.columns.length} cols` : "—"}
                                  {t.columns.length > 0 && t.columns.length <= 5 && ` (${t.columns.slice(0, 5).join(", ")})`}
                                  {t.columns.length > 5 && ` (${t.columns.slice(0, 3).join(", ")}…)`}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {t.configPaths.map((p) => (
                                      <Badge key={p.configPath} variant="outline" className="font-mono text-xs">
                                        {p.configPath}
                                      </Badge>
                                    ))}
                                    {t.configPaths.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onNavigateToConfig?.(t.tier)}
                                  >
                                    Configure
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {Object.entries(data.byTier)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([tier, list]) => {
                    const filtered = filterTables(list)
                    if (filtered.length === 0) return null
                    return (
                      <Collapsible key={tier} defaultOpen>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-3">
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-semibold">{tier}</span>
                            <Badge variant="secondary">{filtered.length}</Badge>
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Table</TableHead>
                                <TableHead>Channel</TableHead>
                                <TableHead>Columns</TableHead>
                                <TableHead>Config path (configurable)</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filtered.map((t) => (
                                <TableRow key={t.tableName}>
                                  <TableCell className="font-mono text-sm">{t.tableName}</TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center gap-1">
                                      {CHANNEL_ICONS[t.channel]}
                                      {t.channel}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-xs">
                                    {t.columns.length > 0 ? `${t.columns.length} cols` : "—"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {t.configPaths.map((p) => (
                                        <Badge key={p.configPath} variant="outline" className="font-mono text-xs">
                                          {p.configPath}
                                        </Badge>
                                      ))}
                                      {t.configPaths.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => onNavigateToConfig?.(t.tier)}
                                    >
                                      Configure
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {data.note && (
        <p className="text-xs text-muted-foreground mt-4">{data.note}</p>
      )}
    </div>
  )
}
