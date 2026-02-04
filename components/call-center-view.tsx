"use client"

import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LobbySidebar } from "@/components/lobby/lobby-sidebar"
import { CallBanner } from "@/components/lobby/call-banner"
import { MemberSearch } from "@/components/lobby/member-search"
import type { PhoneCallData, MemberLookupResult } from "@/types/member"
import type { CreditUnionData } from "@/lib/credit-union-data"
import { Phone, Mic, Settings, ExternalLink } from "lucide-react"

interface CallCenterViewProps {
  cu: CreditUnionData
}

export function CallCenterView({ cu }: CallCenterViewProps) {
  const [activeTab, setActiveTab] = useState<"lobby" | "ivr">("lobby")
  const [ucid, setUcid] = useState("")
  const [ani, setAni] = useState("")
  const [callData, setCallData] = useState<PhoneCallData | null>(null)
  const [lookupResult, setLookupResult] = useState<MemberLookupResult | null>(null)
  const [selectedMemberNumber, setSelectedMemberNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tenantId = cu?.id ?? undefined

  const fetchCallContext = useCallback(async () => {
    if (!ucid.trim()) return null
    try {
      const res = await fetch(
        `/api/ivr/call-context?ucid=${encodeURIComponent(ucid.trim())}${tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : ""}`
      )
      if (!res.ok) return null
      const json = await res.json()
      return json.result ?? json.data ?? null
    } catch {
      return null
    }
  }, [ucid, tenantId])

  const fetchMemberLookup = useCallback(async () => {
    if (!ani.trim()) return null
    try {
      const res = await fetch("/api/members/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: ani.trim(), tenantId }),
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [ani, tenantId])

  const loadCall = useCallback(async () => {
    if (!ucid.trim() && !ani.trim()) return
    setLoading(true)
    try {
      const [ctx, lookup] = await Promise.all([fetchCallContext(), fetchMemberLookup()])
      if (ctx) setCallData(ctx)
      if (lookup) setLookupResult(lookup)
      if (lookup?.seeking_service_on_membership) setSelectedMemberNumber(lookup.seeking_service_on_membership)
      else if (lookup?.member_numbers?.length === 1) setSelectedMemberNumber(lookup.member_numbers[0])
    } finally {
      setLoading(false)
    }
  }, [fetchCallContext, fetchMemberLookup, ucid, ani])

  useEffect(() => {
    if (ucid.trim() || ani.trim()) loadCall()
    else {
      setCallData(null)
      setLookupResult(null)
    }
  }, [ucid, ani])

  const phoneCallData =
    callData ??
    (lookupResult && {
      phoneNumber: lookupResult.phone_number ?? ani ?? "",
      individuals: lookupResult.individuals ?? [],
      isIdentified: lookupResult.is_identified ?? false,
      isAuthorized: lookupResult.is_authorized ?? false,
      seekingServiceOnMembership: lookupResult.seeking_service_on_membership ?? selectedMemberNumber ?? "",
      beginTime: "",
      transferTime: "",
      endTime: "",
    } as PhoneCallData)

  return (
    <div className="flex flex-col h-full min-h-0">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "lobby" | "ivr")} className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-6 pt-4 pb-2 border-b">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lobby" className="gap-2">
              <Phone className="h-4 w-4" />
              Call Center / Lobby
            </TabsTrigger>
            <TabsTrigger value="ivr" className="gap-2">
              <Mic className="h-4 w-4" />
              IVR
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="lobby" className="flex-1 flex min-h-0 mt-0 p-0 data-[state=inactive]:hidden">
          <div className="flex flex-1 min-w-0 min-h-0">
            <aside className="w-80 border-r bg-muted/20 flex flex-col shrink-0 overflow-auto">
              <div className="p-4 space-y-4 border-b">
                <p className="text-sm font-medium text-muted-foreground">Simulate incoming call</p>
                <div className="space-y-2">
                  <Input
                    placeholder="UCID (call id)"
                    value={ucid}
                    onChange={(e) => setUcid(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="ANI / caller phone"
                    value={ani}
                    onChange={(e) => setAni(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={loadCall} disabled={loading || (!ucid.trim() && !ani.trim())}>
                    {loading ? "Loading…" : "Load call"}
                  </Button>
                </div>
              </div>
              <LobbySidebar
                phoneCallData={phoneCallData}
                lookupResult={lookupResult}
                selectedMemberNumber={selectedMemberNumber}
                onSelectMember={setSelectedMemberNumber}
              />
            </aside>
            <main className="flex-1 flex flex-col min-w-0 overflow-auto">
              {ucid && (
                <CallBanner
                  ani={phoneCallData?.phoneNumber ?? ani}
                  start={phoneCallData?.beginTime}
                  end={phoneCallData?.endTime}
                  isVerified={!!phoneCallData?.isAuthorized}
                  isIdentified={!!phoneCallData?.isIdentified}
                />
              )}
              <div className="flex-1 p-6">
                {selectedMemberNumber ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Member selected</CardTitle>
                      <CardDescription>
                        Serving member: <strong>{selectedMemberNumber}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      Proceed to verification or member dashboard as needed. Aligned with config (IVR tier, identity).
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Lobby</CardTitle>
                        <CardDescription>
                          Enter UCID and/or ANI in the sidebar and click &quot;Load call&quot; to see caller context and member lookup. Select a member to serve.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MemberSearch tenantId={tenantId} onSelectMember={setSelectedMemberNumber} />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </main>
          </div>
        </TabsContent>

        <TabsContent value="ivr" className="flex-1 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
          <div className="max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  IVR (Genesys / Twilio)
                </CardTitle>
                <CardDescription>
                  IVR flows are controlled by the Configuration → IVR tier. Call context and member lookup use the same config.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Call context API:</strong> <code className="text-xs bg-muted px-1 rounded">GET /api/ivr/call-context?ucid=...&tenantId=...</code>
                  <br />
                  <strong>Genesys IVR:</strong> <code className="text-xs bg-muted px-1 rounded">POST /api/ivr/genesys</code> — routes through omnichannel to PowerOn.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open("/?view=config", "_self")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Open Config → IVR tier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open("/lobby?ucid=demo&ani=5551234567&tenantId=" + (cu?.id ?? ""), "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Lobby page (new tab)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
