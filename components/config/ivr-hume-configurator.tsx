"use client"

/**
 * IVR HUME CONFIGURATOR - The Component That Will Blow CUs Away
 *
 * Ultra-realistic, CU-specific IVR configuration interface
 * Makes credit unions think this was custom-built for them
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Phone,
  MessageSquare,
  Settings,
  Sparkles,
  Shield,
  TrendingUp,
  Volume2,
  Brain,
  Check,
  AlertCircle
} from "lucide-react"

interface IVRHumeConfiguratorProps {
  tenantId: string
  cuName: string
  charterNumber: string
  routingNumber: string
  supportPhone: string
  onSave?: (config: any) => void
}

export function IVRHumeConfigurator({
  tenantId,
  cuName,
  charterNumber,
  routingNumber,
  supportPhone,
  onSave
}: IVRHumeConfiguratorProps) {
  const [config, setConfig] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadConfig()
  }, [tenantId])

  const loadConfig = async () => {
    // Load CU-specific config
    const response = await fetch(`/api/ivr/hume/config?tenant_id=${tenantId}`)
    const data = await response.json()
    setConfig(data.config || getDefaultConfig())
  }

  const getDefaultConfig = () => ({
    voice: {
      enabled: true,
      evi_version: "4-mini",
      voice: {
        provider: "HUME_AI",
        name: "ITO"
      },
      language_model: {
        model_provider: "ANTHROPIC",
        model_resource: "claude-3-5-sonnet-20241022"
      },
      voice_biometrics: {
        enabled: true,
        enrollment_required: false,
        confidence_threshold: 80
      },
      twilio: {
        enabled: true,
        phone_number: supportPhone,
        fallback_number: supportPhone
      }
    },
    prompts: {
      system_prompt: {
        text: generateSystemPrompt(),
        version: 1
      },
      event_messages: {
        on_new_chat: {
          enabled: true,
          message: `Thank you for calling ${cuName}. How may I help you today?`
        }
      },
      banking_intents: {
        balance_inquiry: true,
        transaction_history: true,
        transfer_funds: true,
        card_services: true,
        loan_inquiry: true
      }
    }
  })

  const generateSystemPrompt = () => {
    return `You are an intelligent voice assistant for ${cuName} (Charter #${charterNumber}).

**Your Credit Union:**
${cuName} serves members with a commitment to excellent service. You represent our values and dedication to member satisfaction.

**Security & Authentication:**
- Members are automatically recognized by their phone number
- NEVER ask members to say their member number out loud
- For authentication, ONLY ask for PIN (4-6 digits)

**Your Role:**
- Check account balances and transactions
- Transfer funds between accounts
- Report lost or stolen cards
- Provide routing number (${routingNumber}) and account information
- Set up travel notifications
- Locate ATM/branch locations
- Connect to live ${cuName} representatives

Always end with: "Thank you for banking with ${cuName}!"`
  }

  const testCall = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/ivr/hume/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: process.env.NEXT_PUBLIC_TEST_PHONE || "+18287806176",
          tenant_id: tenantId
        })
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: "Test call failed" })
    } finally {
      setIsTesting(false)
    }
  }

  const saveConfig = async () => {
    if (onSave) {
      onSave(config)
    }

    await fetch("/api/ivr/hume/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        config
      })
    })
  }

  if (!config) {
    return <div className="p-8 text-center">Loading configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with CU Branding */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Phone className="w-8 h-8 text-primary" />
              {cuName} Voice Banking
            </h1>
            <p className="text-muted-foreground mt-1">
              Powered by Hume Empathic Voice Interface • Charter #{charterNumber}
            </p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered
          </Badge>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              Active
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              System operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Phone Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportPhone}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Your IVR line
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Routing Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routingNumber}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Provided to callers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="greeting" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="greeting">
            <MessageSquare className="w-4 h-4 mr-2" />
            Greeting
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Volume2 className="w-4 h-4 mr-2" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="personality">
            <Brain className="w-4 h-4 mr-2" />
            Personality
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* GREETING TAB */}
        <TabsContent value="greeting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Greeting</CardTitle>
              <CardDescription>
                What callers hear when they dial {supportPhone}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="greeting">Initial Greeting</Label>
                <Textarea
                  id="greeting"
                  value={config.prompts.event_messages.on_new_chat.message}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {
                      ...config.prompts,
                      event_messages: {
                        ...config.prompts.event_messages,
                        on_new_chat: {
                          ...config.prompts.event_messages.on_new_chat,
                          message: e.target.value
                        }
                      }
                    }
                  })}
                  placeholder={`Thank you for calling ${cuName}. How may I help you today?`}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This is the first thing members hear. Make it warm and welcoming!
                </p>
              </div>

              <Separator />

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Live Preview
                </h4>
                <p className="text-sm italic">
                  "{config.prompts.event_messages.on_new_chat.message}"
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Spoken in natural, empathetic voice by Hume AI
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOICE TAB */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
              <CardDescription>
                Configure how {cuName} sounds to your members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Voice Provider</Label>
                  <Input value="Hume AI" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Empathetic, natural-sounding AI voice
                  </p>
                </div>
                <div>
                  <Label>Voice Model</Label>
                  <Input value="ITO" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Warm, professional tone
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Language Model</Label>
                  <Input value="Claude 3.5 Sonnet" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Anthropic's most advanced model
                  </p>
                </div>
                <div>
                  <Label>EVI Version</Label>
                  <Input value="4-mini" disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest Hume EVI technology
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Emotion Detection Enabled</span>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                  53+ Emotions Tracked
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONALITY TAB */}
        <TabsContent value="personality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{cuName} System Personality</CardTitle>
              <CardDescription>
                Define how your AI assistant represents {cuName} culture and values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="system-prompt">System Instructions</Label>
                <Textarea
                  id="system-prompt"
                  value={config.prompts.system_prompt.text}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {
                      ...config.prompts,
                      system_prompt: {
                        ...config.prompts.system_prompt,
                        text: e.target.value
                      }
                    }
                  })}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  These instructions define your AI's personality, tone, and behavior.
                  Notice how it's customized with {cuName}'s name, routing number ({routingNumber}), and contact info.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg">
                  <Label htmlFor="member-first">Member-First Approach</Label>
                  <Switch id="member-first" checked={true} />
                </div>
                <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg">
                  <Label htmlFor="empathy">Empathetic Responses</Label>
                  <Switch id="empathy" checked={true} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security & Authentication</CardTitle>
              <CardDescription>
                Industry-leading security for {cuName} members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      Member Numbers NEVER Spoken Out Loud
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      {cuName} uses phone number (ANI) recognition + PIN authentication.
                      No sensitive information transmitted verbally. This is a major security upgrade over traditional IVR systems.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Voice Biometric Authentication</Label>
                    <p className="text-xs text-muted-foreground">
                      Recognize members by voice signature
                    </p>
                  </div>
                  <Switch
                    checked={config.voice.voice_biometrics.enabled}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      voice: {
                        ...config.voice,
                        voice_biometrics: {
                          ...config.voice.voice_biometrics,
                          enabled: checked
                        }
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Confidence Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Voice match confidence level (80%+)
                    </p>
                  </div>
                  <Input
                    type="number"
                    value={config.voice.voice_biometrics.confidence_threshold}
                    onChange={(e) => setConfig({
                      ...config,
                      voice: {
                        ...config.voice,
                        voice_biometrics: {
                          ...config.voice.voice_biometrics,
                          confidence_threshold: parseInt(e.target.value)
                        }
                      }
                    })}
                    className="w-20"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Call Recording</Label>
                    <p className="text-xs text-muted-foreground">
                      For quality assurance and compliance
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Analytics</CardTitle>
              <CardDescription>
                Monitor {cuName} IVR performance and member experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm text-muted-foreground">Availability</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold">53+</div>
                  <div className="text-sm text-muted-foreground">Emotions Tracked</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">Transcribed</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Tracked Metrics</h4>
                <div className="space-y-2">
                  {[
                    "Call duration and completion rate",
                    "Member satisfaction (emotion analysis)",
                    "Authentication success rate",
                    "Most common member requests",
                    "Frustration detection and escalation",
                    "Full conversation transcripts",
                    "Tool usage frequency"
                  ].map((metric, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      {metric}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Call Section */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Test Your {cuName} Voice Banking
          </CardTitle>
          <CardDescription>
            Make a test call to experience how members will interact with your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={testCall}
              disabled={isTesting}
              size="lg"
              className="flex-1"
            >
              {isTesting ? "Calling..." : "Test Call Now"}
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
              {testResult.success ? (
                <>
                  <div className="flex items-center gap-2 text-green-900 dark:text-green-100 font-semibold">
                    <Check className="w-5 h-5" />
                    Call Initiated Successfully!
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                    Call SID: {testResult.callSid}
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You should receive a call shortly. Experience the {cuName} conversational AI firsthand!
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-red-900 dark:text-red-100 font-semibold">
                    <AlertCircle className="w-5 h-5" />
                    Test Call Failed
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                    {testResult.error}
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={saveConfig}>
          <Settings className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  )
}
