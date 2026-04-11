# EduAccess — CLAUDE.md

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase + React Hook Form + Zod

## Comandos
```bash
npm run dev      # servidor local
npm run build    # build producción
```

---

## Reglas críticas (no olvidar)

### Next.js 16 — params async
`params` en route handlers es una `Promise` — siempre awaitear:
```typescript
{ params }: { params: Promise<{ id: string }> }
const { id } = await params   // ✅  — params.id directo → undefined ❌
```
Afecta: `lessons/[id]`, `courses/[id]`, `activities/[id]`.

### nivel_dificultad — siempre convertir
Columna INTEGER en DB, el frontend envía strings. Mapeo en TODOS los API routes:
```
"facil" → 1 | "medio" → 2 | "dificil" → 3
```

### Roles — valores exactos
| Frontend | Base de datos |
|----------|--------------|
| `"teacher"` | `"docente"` |
| `"student"` | `"alumno"` |

### materia — con ñ
Valores válidos: `'español'` (con ñ), `'matematicas'`, `'otra'`

### supabase vs supabaseAdmin
- `supabase` (anon key) → respeta RLS → usar en componentes cliente
- `supabaseAdmin` (service_role) → bypasea RLS → **SOLO en API routes**

### Auth en API routes
```typescript
const token = request.headers.get("Authorization")?.substring(7)
const { data: { user } } = await supabaseAdmin.auth.getUser(token)
```
Desde componentes:
```typescript
const { data: { session } } = await supabase.auth.getSession()
fetch("/api/...", { headers: { "Authorization": `Bearer ${session.access_token}` } })
```

### Actividades — instrucciones como JSON
Config serializada en columna `instrucciones` (TEXT). Usar siempre:
`parseActivityConfig()` / `serializeActivityConfig()` de `lib/activity-config.ts`
```json
{
  "instrucciones": "texto",
  "opciones": [{"texto": "...", "correcta": true}],
  "respuesta_correcta": "...",
  "palabras_distractoras": "palabra1|palabra2",
  "palabras_sopa": ["palabra1", "palabra2"]
}
```
⚠️ Excepción: `completar_oracion` y `secuenciacion` guardan datos en tabla `pregunta`, no en `instrucciones`.

### Tipos de actividad — mapeo completo
| Frontend | Base de datos |
|----------|--------------|
| `image` | `identificacion` |
| `sound` | `reconocimiento_sonidos` |
| `sequence` | `secuenciacion` |
| `multiple` | `seleccion_guiada` |
| `short` | `respuesta_corta` |
| `voice` | `respuesta_oral` |
| `fill` | `completar_oracion` |
| `wordsearch` | `sopa_letras` |

### voice-activity — dos modos, comportamiento distinto
- **Modo individual** (sin `lessonId`): `student-activity` navega a pantalla `voice-activity`. `onBack`/`onComplete` van a `student-lesson` — NO a `student-activity` (evita bucle infinito).
- **Modo lección** (con `lessonId`): `student-activity` renderiza `<VoiceActivity>` **inline**. Al completar llama `handleAdvanceLesson()` — no cambia `currentScreen`.

### Inscripción — usar alumno_curso
Acceso a lecciones/actividades controlado por `alumno_curso`, NO por `alumno_grupo`.
Hooks `use-student-dashboard.ts` y `use-student-progress.ts` consultan `alumno_curso`.

### Sesiones en reporte de alumno
Usar `intento_leccion` como unidad de sesión (vía `GET /api/lesson-attempts`).
`intento_actividad.id_intento_leccion` vincula respuestas a su sesión (FK nullable).
Fallback: si no hay `intento_leccion`, usar `progresion_alumno` como sesión virtual.

### Grados — mapeo
| UI | DB |
|----|----|
| "1er Grado" | `"1"` |
| "2do Grado" | `"2"` |
| "3er Grado" | `"3"` |

### Orden en lecciones y actividades
UNIQUE constraint por curso/lección. Crear: `count + 1`. Editar actividades: eliminar todas y reinsertar.

---

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...    # cliente — pública
SUPABASE_SERVICE_ROLE_KEY=...        # servidor — NUNCA en cliente
```

## Referencia completa
Ver `docs/architecture.md` para esquema de DB, componentes, hooks, accesibilidad y decisiones de diseño.

