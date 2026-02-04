import { NextResponse } from "next/server"

const MOTION_API_TOKEN = process.env.MOTION_API_TOKEN
const MOTION_API_BASE = "https://api.usemotion.com/v1"

export async function GET() {
  if (!MOTION_API_TOKEN) {
    return NextResponse.json({ error: "MOTION_API_TOKEN not configured" }, { status: 503 })
  }
  try {
    const response = await fetch(`${MOTION_API_BASE}/workspaces`, {
      headers: {
        "X-API-Key": MOTION_API_TOKEN,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Motion API error: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      workspaces: data.workspaces || data,
      lastSync: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch workspaces",
      },
      { status: 500 },
    )
  }
}
