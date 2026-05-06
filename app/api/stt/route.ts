import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { audio } = await request.json()
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 })

  const apiKey = process.env.GOOGLE_STT_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_STT_API_KEY not configured" }, { status: 500 })

  const res = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          languageCode: "es-MX",
          alternativeLanguageCodes: ["es-US"],
          model: "latest_short",
          maxAlternatives: 3,
          enableAutomaticPunctuation: false,
        },
        audio: { content: audio },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.warn("Cloud STT error", res.status, err.slice(0, 200))
    return NextResponse.json({ error: "STT failed" }, { status: res.status })
  }

  const data = await res.json()
  const alts: string[] = data.results?.[0]?.alternatives?.map((a: any) => a.transcript) ?? []
  if (alts.length === 0) return NextResponse.json({ transcript: null })

  return NextResponse.json({ transcript: alts.join(" | ") })
}
