# EduAccess — Arquitectura y Referencia Técnica

## Descripción
Plataforma web educativa accesible para estudiantes con baja visión y TPAC. Permite a docentes crear cursos, lecciones y actividades; y a estudiantes completarlas con soporte de accesibilidad (voz, alto contraste, fuente grande, interfaz simplificada).

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL) + Supabase Auth PKCE + React Hook Form + Zod

---

## Estructura de archivos clave

```
app/
  page.tsx
  api/
    register/route.ts
    test-inicial/route.ts
    courses/route.ts
    lessons/route.ts
    lessons/[id]/route.ts
    courses/[id]/route.ts
    activities/route.ts
    activities/[id]/route.ts
    complete-lesson/route.ts       — POST: calcula estrellas, guarda intento_leccion, actualiza gamificación
                                     PUT: reinicia progresión (retry)
    lesson-attempts/route.ts       — GET: historial intento_leccion + intento_actividad (solo docentes)

components/
  auth/
    login-screen.tsx
    register-screen.tsx
  teacher/
    teacher-dashboard.tsx
    course-list.tsx
    create-course.tsx
    course-invite.tsx
    course-students.tsx
    lesson-management.tsx
    create-lesson.tsx
    edit-lesson.tsx
    edit-course.tsx
    activity-builder.tsx
    students-list.tsx
    teacher-analytics.tsx
  student/
    student-dashboard.tsx
    student-activity.tsx
    voice-activity.tsx
    initial-test.tsx
    student-progress.tsx
    student-lesson.tsx
    student-calendar.tsx
    join-group.tsx
  accessibility-settings.tsx       — Página "Ajustes": 3 tabs (Perfil, Notificaciones, Accesibilidad)
  landing-page.tsx

hooks/teacher/
  use-courses.ts
  use-lessons.ts
  use-teacher-dashboard.ts
  use-students.ts
  use-analytics.ts

hooks/student/
  use-student-dashboard.ts         — Usa alumno_curso; lee gamificacion (estrellas_totales, nivel)
  use-student-progress.ts          — Usa alumno_curso para cursoIds
  use-lesson-completion.ts         — completarLeccion(): llama POST /api/complete-lesson

lib/
  supabase.ts
  supabase-admin.ts
  auth-context.tsx
  accessibility-context.tsx
  activity-config.ts               — parseActivityConfig / serializeActivityConfig

components/ui/
  accessible-tooltip.tsx
  texto-con-glosario.tsx
```

---

## Navegación (app/page.tsx)

SPA — estado `currentScreen` controla qué componente se renderiza.

### Flujo docente
```
login → teacher-dashboard
  → courses → create-course
  → courses → course-students-{courseId} → invite-course-{id}
  → courses → edit-course-{courseId}
  → courses → lessons-{courseId}
      → edit-course-{courseId}
      → create-lesson
      → edit-lesson-{lessonId}
  → activities
  → students
  → analytics
  → accessibility
```

### Flujo estudiante
```
login → initial-test (si no completado)
      → student-dashboard
          → student-activity → voice-activity (modo individual)
          → student-progress
          → student-calendar
          → join-group
          → accessibility
```

### voice-activity — dos modos
- **Modo individual** (sin `lessonId`): navega a pantalla `voice-activity`. `onBack`/`onComplete` van a `student-lesson`, NO a `student-activity` (evita bucle: `student-activity` detecta `respuesta_oral` y re-lanza `voice-activity`).
- **Modo lección** (con `lessonId`): renderiza `<VoiceActivity>` inline dentro de `student-activity`. Al completar llama `handleAdvanceLesson()` sin cambiar `currentScreen`.

### Estado global de navegación
```typescript
currentScreen: Screen
selectedCourseId: string | null
selectedLessonId: string | null
selectedActivityType: string | null
```

### useEffect de redirección (AppContent)
- Docente en `["login","register","student-dashboard","initial-test"]` → `teacher-dashboard`
- Estudiante en `["login","register"]` → `initial-test` o `student-dashboard`
- Motivo: `handleLoginSuccess` lee `user` del closure antes del re-render. El useEffect corrige una vez que el estado se propaga.

---

## Base de datos (Supabase)

### Tablas principales
| Tabla | Campos clave |
|-------|-------------|
| `perfil` | `id_perfil (uuid FK auth.users)`, `correo`, `rol ('docente'/'alumno')`, `nombre`, `condicion_tipo`, `grado_escolar` |
| `configuracion_accesibilidad` | `id_perfil`, `texto_a_voz_activo`, `tamano_fuente (16/24/32)`, `contraste ('normal'/'alto'/'muy_alto')`, `interfaz_simplificada` |
| `grupo` | `id_grupo`, `id_docente`, `nombre` (auto: "1ro A"), `grado ('1'/'2'/'3')`, `seccion` — UNIQUE(id_docente, grado, seccion) |
| `alumno_grupo` | `id_grupo`, `id_alumno` — membresía (existe pero acceso usa `alumno_curso`) |
| `alumno_curso` | `id_curso`, `id_alumno` — pivot inscripción por curso |
| `curso` | `id_curso`, `id_grupo`, `titulo`, `descripcion`, `materia ('español'/'matematicas'/'otra')`, `publicado`, `codigo_curso` (6 chars, trigger) |
| `invitacion_curso` | `id_invitacion`, `id_curso`, `id_alumno`, `id_docente`, `estado ('pendiente'/'aceptada'/'rechazada')` |
| `leccion` | `id_leccion`, `id_curso`, `titulo`, `contenido`, `orden` UNIQUE, `publicado`, `material_lectura`, `material_audiovisual`, `material_pdf_url`, `material_pdf_titulo` |
| `actividad` | `id_actividad`, `id_leccion`, `tipo (CHECK)`, `titulo`, `instrucciones`, `nivel_dificultad (INTEGER)`, `orden` UNIQUE, `publicado` |
| `pregunta` | `id_pregunta`, `id_actividad`, `enunciado`, `orden`, `respuesta_esperada`, `palabras_distractoras` (pipe-separated), `oraciones_contexto` (pipe-separated), `imagen_url` — para `reconocimiento_sonidos`, `completar_oracion`, `secuenciacion` |
| `glosario` | `id_glosario`, `id_leccion`, `palabra`, `definicion` — RLS: docente CRUD / alumno read |
| `test_inicial` | `id_alumno`, `puntaje`, `tipo_indicador`, `resultado ('requiere_sistema'/'no_requiere'/'revision_manual')` |
| `intento_actividad` | `id_alumno`, `id_actividad`, `id_grupo`, `puntaje_total`, `fecha_creacion`, `id_intento_leccion` (FK nullable) |
| `intento_leccion` | `id_intento_leccion`, `id_alumno`, `id_leccion`, `numero_intento`, `estrellas (0-5)`, `promedio_puntaje`, `total_actividades`, `correctas_primer_intento`, `total_reintentos`, `fecha_creacion` |
| `progresion_alumno` | `id_alumno`, `id_leccion`, `pct_completado`, `promedio_puntaje`, `estrellas`, `total_intentos`, `total_reintentos` — cache actualizado por `/api/complete-lesson` |
| `gamificacion` | `id_alumno`, `puntos_totales`, `streaks_dias`, `badges (jsonb)`, `estrellas_totales`, `nivel (1-5)` |

### Tipos de actividad
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

### Mapeo de grados
| UI | DB |
|----|----|
| "1er Grado" | `"1"` |
| "2do Grado" | `"2"` |
| "3er Grado" | `"3"` |

### RPCs
| RPC | Parámetros | Acción |
|-----|-----------|--------|
| `fn_unirse_por_codigo_curso` | `p_codigo text` | Inscribe alumno → `alumno_curso` + `alumno_grupo` |
| `fn_aceptar_invitacion_curso` | `p_id_invitacion uuid` | Acepta invitación |
| `fn_rechazar_invitacion_curso` | `p_id_invitacion uuid` | Rechaza invitación |
| `fn_calcular_estrellas` | `p_puntaje_porcentaje numeric, p_total_reintentos int` | Devuelve estrellas (0–5) |
| `fn_calcular_nivel` | `p_estrellas int` | Devuelve nivel (1–5) |

### Triggers automáticos
- Crear `perfil` → crea `configuracion_accesibilidad`
- Crear `perfil` con `rol='alumno'` → crea `gamificacion`
- Crear/actualizar `intento_actividad` → actualiza `progresion_alumno`
- Crear `curso` → genera `codigo_curso` (6 chars alfanumérico único)

---

## API Routes

### POST /api/register
Crea usuario en Auth + inserta `perfil`. Rollback si falla el perfil.

### POST /api/courses
Acepta `{ titulo, descripcion, id_grupo, materia }`. `id_grupo` calculado en cliente por `create-course.tsx` con `maybeSingle()` sobre `(id_docente, grado, seccion)`.

### POST /api/lessons
1. Calcula `orden` (count + 1)
2. Inserta `leccion`
3. Inserta `actividad[]` — rollback de lección si falla

### PUT /api/lessons/[id]
1. Actualiza `titulo` y `contenido`
2. Elimina todas las actividades
3. Reinserta con orden secuencial

### PUT /api/courses/[id]
Actualiza `titulo`, `descripcion`, `materia`. El `grado` NO es editable.

### POST /api/activities
Cuenta actividades → calcula `orden` → inserta.

### PUT /api/activities/[id]
Actualiza `instrucciones` y `nivel_dificultad`.

### POST /api/complete-lesson
Llamado por `use-lesson-completion.ts` al terminar modo lección:
1. Calcula `puntajePct` = correctas primer intento / total × 100
2. Llama `fn_calcular_estrellas(puntajePct, totalReintentos)` → estrellas (0–5)
3. Inserta `intento_leccion` con `numero_intento` = intentos previos + 1
4. Vincula `intento_actividad` de la sesión → UPDATE donde `id_intento_leccion IS NULL`
5. Upsert `progresion_alumno` con `pct_completado=100`, `estrellas`, `promedio_puntaje`
6. Recalcula `estrellas_totales` → `fn_calcular_nivel` → actualiza `gamificacion`
Responde: `{ stars, totalEstrellas, nivel }`

### PUT /api/complete-lesson
Reinicia progreso (retry): upsert `progresion_alumno` con `pct_completado=0`, `estrellas=null`, incrementa `total_reintentos`.

### GET /api/lesson-attempts
Solo docentes. Params: `alumnoId`, `leccionIds` (comma-separated).
Devuelve `{ intentosLeccion[], intentosAct[], actividades[] }` — historial con `intento_actividad` vinculados.

---

## Gamificación

### Niveles
| Nivel | Nombre | Rango estrellas |
|-------|--------|----------------|
| 1 | Explorador | 0–9 |
| 2 | Aprendiz | 10–29 |
| 3 | Aventurero | 30–59 |
| 4 | Experto | 60–99 |
| 5 | Maestro | 100+ |

- `gamificacion.estrellas_totales` = suma de `estrellas` de todas las `progresion_alumno` del alumno.
- `gamificacion.nivel` calculado por `fn_calcular_nivel(estrellas_totales)`.
- `student-dashboard` muestra nivel, nombre, emoji y barra de progreso al siguiente nivel.

---

## Auth Context (lib/auth-context.tsx)

- `loadUserAndTest`: carga perfil + test en paralelo con `Promise.all`
- `onAuthStateChange`: solo maneja `SIGNED_OUT`; login/register setean estado explícitamente
- `register`: construye objeto `user` con datos del formulario — evita round-trip a DB

---

## Accesibilidad (lib/accessibility-context.tsx)

### Tipos exportados
```typescript
type ContrastLevel = 'normal' | 'alto' | 'muy_alto'
type TooltipMode   = 'off' | 'voice' | 'visual' | 'both'
```

### Mapeo DB → Frontend
| DB | Frontend |
|----|----------|
| `contraste: 'normal'/'alto'/'muy_alto'` | `contrastLevel` + `highContrast: boolean` |
| `tamano_fuente: 16/24/32` | `textSize: 'normal'/'large'/'extra-large'` |
| `texto_a_voz_activo` | `voiceEnabled: boolean` |
| `interfaz_simplificada` | `simplifiedInterface: boolean` |

### Campos solo en localStorage
| Key | Campo | Default |
|-----|-------|---------|
| `ea_tooltipMode` | `tooltipMode` | `'off'` |
| `ea_voiceRate` | `voiceRate` | `0.9` |
| `ea_voiceName` | `voiceName` | `''` |
| `ea_avatar_color` | color hex del avatar | `hsl(var(--primary))` |
| `ea_notif_lesson` / `ea_notif_activity` / `ea_notif_teacher` | toggles notificaciones | — |

### TTS
Web Speech API, idioma `es-ES`. Solo habla si `voiceEnabled === true`.
Velocidad: `voiceRate` (0.5–2.0). Voz: `voiceName` (SpeechSynthesisVoice).

### Listener global hover-to-speak
`mouseover`/`mouseout` en `document`. Debounce 180ms. Usa `settingsRef` para evitar stale closures.
Tags: `P, H1–H6, SPAN, LI, LABEL, TD, TH, CAPTION`. Excluye botones, links, inputs.
Indicador visual: `data-tts-hover="true"` → subrayado punteado primario.

### CSS de contraste
- `normal` → sin clase
- `alto` → clase `high-contrast`
- `muy_alto` → clase `very-high-contrast` (fondo negro, primario amarillo)

### AccessibleTooltip (3 exports)
```typescript
// Botones de solo icono
<AccessibleTooltip label="..." position="top|bottom|left|right">

// Botones con texto visible
<Button {...useSpeakOnHover("label")}>Texto</Button>

// Bloques de texto de contenido
<SpeakableText as="p|h1|span|li" speakText="...">
```

---

## Decisiones de diseño importantes

1. **SPA sin router**: navegación por `currentScreen`. Al recargar → login.

2. **Grupo por docente+grado+sección**: UNIQUE en `(id_docente, grado, seccion)`. Nombre auto: `"${gradoShort} ${seccion}"`. El `grado` NO es editable.

3. **Actividades: config en `instrucciones` JSON**: `parseActivityConfig()` / `serializeActivityConfig()`. `completar_oracion` y `secuenciacion` usan tabla `pregunta`.

4. **`progresion_alumno` es cache**: actualizada por `/api/complete-lesson`, no por trigger directo.

5. **`nivel_dificultad` es INTEGER en DB**: convertir siempre `facil→1, medio→2, dificil→3`.

6. **Next.js 16 — params async**: siempre `await params` en route handlers.

7. **Inscripción por `alumno_curso`**: dos flujos — código de curso (`fn_unirse_por_codigo_curso`) e invitación (`fn_aceptar_invitacion_curso`).

8. **`materia` con ñ**: `'español'` — CHECK constraint en DB.

9. **Sesiones en reporte**: `intento_leccion` como unidad (1 sesión = 1 vez que completó la lección). `intento_actividad.id_intento_leccion` vincula respuestas. Fallback a `progresion_alumno`.

10. **Gamificación**: `fn_calcular_estrellas` al completar lección → actualiza `gamificacion.estrellas_totales` y `nivel`.

11. **Animaciones** (`globals.css`): hover `brightness(1.06)`, active `scale(0.96)`, focus-visible outline 3px.

12. **Avatar color**: `ea_avatar_color` en localStorage, 12 colores en `AVATAR_COLORS[]`. Fallback `hsl(var(--primary))`.

13. **completar_oracion**: tabla `pregunta` con `enunciado` (incluye `___`), `respuesta_esperada`, `palabras_distractoras` (pipe-separated), `oraciones_contexto` (pipe-separated). 2 intentos antes de revelar.

14. **sopa_letras**: palabras en `instrucciones` JSON → `palabras_sopa: string[]`. Grilla NxN con `generateWordSearchGrid()`. Click en primera y última celda para marcar.

15. **secuenciacion (drag-and-drop)**: columna izq (imágenes arrastrables) → columna der (zonas numeradas). Click en imagen colocada la devuelve. 2 intentos fallidos → revela orden. Estado: `seqItems`, `seqZones`, `seqDragging`, `seqDragOver`, `seqChecked`, `seqResult`, `seqAttempts`.

16. **Reporte de alumno** (`course-students.tsx`): Accordion + Sheet (`max-w-[700px]`). `BarraIntento`: barra vertical por sesión, expandible con segmentos multicolor por actividad + tooltip.

17. **Analíticas**: `useAnalytics(filters)` acepta `{ grupoId, cursoId, alumnoId, fechaDesde, fechaHasta }`. Botón "Configurar" por gráfico con Popover shadcn. PENDIENTE: exportar PDF.

18. **Landing page — carrusel**: CSS puro con `@keyframes marquee`. Tarjetas duplicadas para loop infinito. `animationPlayState: paused` al hover.

---

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...    # pública — cliente
SUPABASE_SERVICE_ROLE_KEY=...        # privada — SOLO API routes
```
