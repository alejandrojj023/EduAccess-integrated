import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 })

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_TTS_API_KEY not configured" }, { status: 500 })

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "es-US", name: "es-US-Neural2-A" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.warn("Cloud TTS error", res.status, err.slice(0, 200))
    return NextResponse.json({ error: "No se pudo generar audio" }, { status: res.status })
  }

  const data = await res.json()
  if (!data.audioContent) return NextResponse.json({ error: "No audio content" }, { status: 500 })

  return NextResponse.json({ audio: data.audioContent, mimeType: "audio/mp3" })
}
