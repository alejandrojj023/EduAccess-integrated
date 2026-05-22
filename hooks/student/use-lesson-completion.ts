import { supabase } from "@/lib/supabase"

interface ActivityResult {
  id: string
  correct: boolean
  attempts: number
}

export async function completarLeccion(
  _userId: string,
  lessonId: string,
  results: ActivityResult[],
  duracionSegundos?: number,
  lessonStartTime?: string,
): Promise<number> {
  if (results.length === 0) return 0

  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch("/api/complete-lesson", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ lessonId, results, duracionSegundos, lessonStartTime }),
  })
  if (!res.ok) return 0
  const data = await res.json()
  return data.stars ?? 0
}
