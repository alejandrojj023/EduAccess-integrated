# EduAccess — Contexto del Proyecto

## Descripción
Plataforma web educativa accesible para estudiantes con baja visión y TPAC (Trastorno del Procesamiento Auditivo Central). Permite a docentes crear cursos, lecciones y actividades; y a estudiantes completarlas con soporte de accesibilidad (voz, alto contraste, fuente grande, interfaz simplificada).

## Stack
- **Framework:** Next.js (App Router) + TypeScript
- **UI:** Tailwind CSS + Radix UI (shadcn/ui)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con PKCE
- **Formularios:** React Hook Form + Zod

## Roles de usuario
| Frontend | Base de datos | Descripción |
|----------|--------------|-------------|
| `"teacher"` | `"docente"` | Crea cursos, lecciones, actividades; ve analíticas |
| `"student"` | `"alumno"` | Completa actividades, hace test inicial |

## Estructura de archivos clave

```
app/
  page.tsx                        — Router principal (SPA con estado currentScreen)
  api/
    register/route.ts             — POST: crea usuario en Auth + perfil
    test-inicial/route.ts         — POST: guarda resultado del test inicial
    courses/route.ts              — POST: crea curso + grupo si no existe
    lessons/route.ts              — POST: crea leccion + actividades
    lessons/[id]/route.ts         — PUT: edita leccion + reemplaza actividades
    courses/[id]/route.ts         — PUT: edita titulo/descripcion/materia del curso
    activities/route.ts           — POST: crea una actividad en una leccion existente
    activities/[id]/route.ts      — PUT: edita instrucciones/nivel_dificultad de actividad

components/
  auth/
    login-screen.tsx
    register-screen.tsx
  teacher/
    teacher-dashboard.tsx         — Panel principal del docente
    course-list.tsx               — Lista de cursos (Editar navega a lessons-{id})
    create-course.tsx             — Formulario crear curso
    lesson-management.tsx         — Lista de lecciones de un curso
    create-lesson.tsx             — Formulario crear leccion (con config inline de actividades por tipo)
    edit-lesson.tsx               — Formulario editar leccion (precarga datos + config inline actividades)
    edit-course.tsx               — Formulario editar titulo/descripcion/materia de un curso
    activity-builder.tsx          — Constructor de actividades (grid tipos + ver existentes + config completo)
    students-list.tsx             — Lista de estudiantes del docente
    teacher-analytics.tsx         — Analiticas
  student/
    student-dashboard.tsx
    student-activity.tsx
    voice-activity.tsx
    initial-test.tsx
    student-progress.tsx
    student-calendar.tsx          — Calendario mensual con actividades completadas por dia
  accessibility-settings.tsx      — Pagina "Ajustes" con 3 pestanas: Perfil, Notificaciones, Accesibilidad

hooks/teacher/
  use-courses.ts                  — Fetch cursos + conteo lecciones/alumnos
  use-lessons.ts                  — Fetch lecciones + conteo actividades
  use-teacher-dashboard.ts        — Stats dashboard + actividad reciente (queries en paralelo)
  use-students.ts                 — Lista estudiantes con progreso
  use-analytics.ts                — Datos para graficas

lib/
  supabase.ts                     — Cliente publico (respeta RLS)
  supabase-admin.ts               — Cliente service_role (solo API routes)
  auth-context.tsx                — AuthProvider: login, register, logout, user state
  accessibility-context.tsx       — Configuracion de accesibilidad + TTS (ver tipos ContrastLevel, TooltipMode)
  activity-config.ts              — parseActivityConfig / serializeActivityConfig (JSON en instrucciones)

components/ui/
  accessible-tooltip.tsx          — Wrapper tooltip/TTS segun tooltipMode del usuario
```

## Navegacion (app/page.tsx)
La app es una SPA. El estado `currentScreen` controla que componente se renderiza.

### Flujo docente
```
login → teacher-dashboard
  → courses → create-course
  → courses → edit-course-{courseId} → edit-course   (desde course-list "Editar Info")
  → courses → lessons-{courseId} → lessons
      → edit-course-{courseId} → edit-course           (desde lesson-management "Editar Curso")
      → create-lesson
      → edit-lesson-{lessonId} → edit-lesson
  → activities  (constructor: grid + "Ver existentes" + config por tipo)
  → students
  → analytics
  → accessibility  (pagina "Ajustes" con 3 tabs: Perfil, Notificaciones, Accesibilidad)
```

### Flujo estudiante
```
login → initial-test (si no lo ha completado)
      → student-dashboard
          → student-activity → voice-activity
          → student-progress
          → student-calendar   (nuevo: calendario mensual de actividades)
          → accessibility       (pagina "Ajustes" con 3 tabs)
```

### Estado global de navegacion
```typescript
currentScreen: Screen          // pantalla activa
selectedCourseId: string|null  // seteado al entrar a "lessons"
selectedLessonId: string|null  // seteado al entrar a "edit-lesson"
selectedActivityType: string|null
```

### Regla critica del useEffect de redireccion
El `useEffect` en `AppContent` corrige pantallas incorrectas cuando cambia el auth state:
- Docente en `["login","register","student-dashboard","initial-test"]` → `teacher-dashboard`
- Estudiante en `["login","register"]` → `initial-test` o `student-dashboard`
- **Motivo**: `handleLoginSuccess` lee `user` del closure antes de que React re-renderice,
  por lo que el rol puede ser null en ese momento. El `useEffect` corrige el destino
  una vez que el estado se propaga.

## Base de datos (Supabase)

### Tablas principales
| Tabla | Campos clave |
|-------|-------------|
| `perfil` | `id_perfil (uuid FK auth.users)`, `correo`, `rol ('docente'/'alumno')`, `nombre`, `condicion_tipo`, `grado_escolar` |
| `configuracion_accesibilidad` | `id_perfil`, `texto_a_voz_activo`, `tamano_fuente (16/24/32)`, `contraste ('normal'/'alto'/'muy_alto')`, `interfaz_simplificada` |
| `grupo` | `id_grupo`, `id_docente`, `nombre` (NOT NULL), `grado ('1'/'2'/'3')` |
| `alumno_grupo` | `id_grupo`, `id_alumno` — pivot muchos a muchos |
| `curso` | `id_curso`, `id_grupo`, `titulo`, `descripcion`, `materia ('espanol'/'matematicas') DEFAULT 'espanol'`, `publicado` |
| `leccion` | `id_leccion`, `id_curso`, `titulo`, `contenido`, `orden` (UNIQUE por curso), `publicado` |
| `actividad` | `id_actividad`, `id_leccion`, `tipo (CHECK)`, `titulo`, `instrucciones`, `nivel_dificultad`, `orden` (UNIQUE por leccion), `publicado` |
| `test_inicial` | `id_alumno`, `puntaje`, `tipo_indicador`, `resultado ('requiere_sistema'/'no_requiere'/'revision_manual')` |
| `intento_actividad` | `id_alumno`, `id_actividad`, `id_grupo`, `puntaje_total`, `fecha_creacion` |
| `progresion_alumno` | `id_alumno`, `id_leccion`, `pct_completado`, `promedio_puntaje` — cache actualizado por trigger |
| `gamificacion` | `id_alumno`, `puntos_totales`, `streaks_dias`, `badges (jsonb)` |

### Tipos de actividad (CHECK constraint en `actividad.tipo`)
| ID formulario | Valor en DB |
|--------------|------------|
| `image` | `identificacion` |
| `sound` | `reconocimiento_sonidos` |
| `sequence` | `secuenciacion` |
| `multiple` | `seleccion_guiada` |
| `short` | `respuesta_corta` |
| `voice` | `respuesta_oral` |

### Mapeo de grados
| Etiqueta UI | Valor en DB (`grado`) |
|------------|----------------------|
| `"1er Grado"` | `"1"` |
| `"2do Grado"` | `"2"` |
| `"3er Grado"` | `"3"` |

### Triggers automaticos
- Al crear `perfil` → se crea automaticamente `configuracion_accesibilidad`
- Al crear `perfil` con `rol='alumno'` → se crea automaticamente `gamificacion`
- Al crear/actualizar `intento_actividad` → se actualiza `progresion_alumno`

## API Routes

### Patron de autenticacion en API routes
Todas las rutas protegidas usan `supabaseAdmin` y verifican el token Bearer:
```typescript
const token = request.headers.get("Authorization")?.substring(7)
const { data: { user } } = await supabaseAdmin.auth.getUser(token)
```

Desde los componentes, se obtiene el token asi:
```typescript
const { data: { session } } = await supabase.auth.getSession()
fetch("/api/...", { headers: { "Authorization": `Bearer ${session.access_token}` } })
```

### POST /api/register
Crea usuario en Auth + inserta en `perfil`. Usa `service_role` para bypasear RLS.
Si falla la insercion del perfil, hace rollback eliminando el usuario de Auth.

### POST /api/courses
1. Mapea grado ("1er Grado" → "1")
2. Busca `grupo` existente para `id_docente + grado`, o lo crea (con `nombre = grade`)
3. Inserta `curso`

### POST /api/lessons
1. Cuenta lecciones existentes del curso para calcular `orden` (respeta `uq_leccion_orden`)
2. Inserta `leccion`
3. Inserta `actividad[]` con `orden` secuencial (rollback de la leccion si falla)
   - Mapea `nivel_dificultad`: "facil"→1, "medio"→2, "dificil"→3 (DB es INTEGER)

### PUT /api/lessons/[id]
1. Actualiza `titulo` y `contenido` de la leccion
2. Elimina todas las actividades existentes de esa leccion
3. Reinserta las nuevas actividades con `orden` secuencial
   - Mismo mapeo de dificultad a integer

### PUT /api/courses/[id]
Actualiza `titulo`, `descripcion`, `materia` del curso. El `grado` NO es editable desde aquí
(está en `grupo`, cambiar grado mueve alumnos — no expuesto).

### POST /api/activities
Crea una actividad en una lección existente:
1. Cuenta actividades de la lección para calcular `orden`
2. Inserta con tipo mapeado + dificultad como integer

### PUT /api/activities/[id]
Actualiza `instrucciones` y `nivel_dificultad` (con mapeo a integer) de una actividad existente.

### nivel_dificultad — IMPORTANTE
La columna `actividad.nivel_dificultad` es INTEGER en la DB.
Mapeo en TODOS los API routes: `"facil"→1, "medio"→2, "dificil"→3`
El frontend siempre envía strings ("facil"/"medio"/"dificil"), el API convierte.

## Auth Context (lib/auth-context.tsx)

### Funcion `loadUserAndTest`
Carga perfil + estado del test en **paralelo** para reducir latencia:
```typescript
const [perfilResult, testResult] = await Promise.all([
  supabase.from("perfil").select(...).eq("id_perfil", userId).single(),
  supabase.from("test_inicial").select(...).eq("id_alumno", userId).limit(1),
])
// needsTest = role === "student" ? testResult.data.length === 0 : null
```

### Listener `onAuthStateChange`
**Solo maneja `SIGNED_OUT`**. `login()` y `register()` setean el estado explicitamente
para evitar doble llamada a la DB (el evento `SIGNED_IN` lo dispara `signInWithPassword`).

### Register
No hace fetch del perfil tras registrar: construye el objeto `user` con los datos
del formulario (nombre, email, role ya conocidos) — elimina 1 round-trip a la DB.

## Accesibilidad (lib/accessibility-context.tsx)

### Tipos exportados
```typescript
type ContrastLevel = 'normal' | 'alto' | 'muy_alto'
type TooltipMode   = 'off' | 'voice' | 'visual' | 'both'
```

### Mapeo DB → Frontend
| DB (`configuracion_accesibilidad`) | Frontend (`AccessibilitySettings`) |
|------------------------------------|-------------------------------------|
| `contraste: 'normal'/'alto'/'muy_alto'` | `contrastLevel: ContrastLevel` + `highContrast: boolean` (derivado) |
| `tamano_fuente: 16/24/32` | `textSize: 'normal'/'large'/'extra-large'` |
| `texto_a_voz_activo` | `voiceEnabled: boolean` |
| `interfaz_simplificada` | `simplifiedInterface: boolean` |

### Campos solo en localStorage (no DB)
| Key localStorage | Campo en settings | Default |
|-----------------|-------------------|---------|
| `ea_tooltipMode` | `tooltipMode` | `'off'` |
| `ea_voiceRate`   | `voiceRate`   | `0.9`   |
| `ea_voiceName`   | `voiceName`   | `''`    |

### TTS
Usa Web Speech API (`window.speechSynthesis`), idioma `es-ES`.
- Velocidad configurable via `voiceRate` (0.5–2.0), default 0.9
- Voz seleccionable via `voiceName` (nombre de SpeechSynthesisVoice)
- Solo habla si `settings.voiceEnabled === true`

### Listener global hover-to-speak (en AccessibilityProvider)
Escucha `mouseover`/`mouseout` a nivel `document`. Funciona en TODA la app
automáticamente sin tocar componentes individuales.
- Tags leídos: `P, H1–H6, SPAN, LI, LABEL, TD, TH, CAPTION`
- Excluye: botones, links, inputs y sus descendientes
- Debounce de 180ms para evitar lecturas al mover el cursor rápido
- Indicador visual: `data-tts-hover="true"` → subrayado punteado primario (CSS global)
- Usa `settingsRef` (ref al settings actual) para evitar stale closures sin re-crear el listener
- Modos:
  - `off`    → listener no hace nada
  - `voice`  → lee el texto (si `voiceEnabled`)
  - `visual` → pone `data-tts-hover` en el elemento
  - `both`   → ambos

### CSS de contraste
- `normal`    → sin clase CSS
- `alto`      → clase `high-contrast` (fondo oscuro, texto blanco)
- `muy_alto`  → clase `very-high-contrast` (fondo negro, primario amarillo)

### AccessibleTooltip (components/ui/accessible-tooltip.tsx)
Tres exports para cubrir todos los casos de TTS en la UI:

1. **`<AccessibleTooltip label="..." position="top|bottom|left|right">`**
   Para botones de solo icono. Muestra tooltip visual y/o lee en voz.

2. **`useSpeakOnHover(label)`**
   Hook para botones con texto visible. Solo activa la voz al hover.
   Uso: `<Button {...useSpeakOnHover("Ir a Mi Progreso")}>Mi Progreso</Button>`

3. **`<SpeakableText as="p|h1|h2|h3|span|li" speakText="..." className="...">`**
   Para bloques de texto de contenido (instrucciones, párrafos, títulos, nombres de cursos).
   Al hover en modo `voice`/`both`: lee el texto en voz alta.
   Al hover en modo `visual`/`both`: muestra subrayado punteado color primario.
   `speakText` es opcional — si se omite, usa el texto de `children` (si es string).
   Aplicado en: `student-activity.tsx` (instrucciones, pregunta, opciones, feedback),
   `student-dashboard.tsx` (saludo, nombre de cursos, lección siguiente, progreso).

Comportamiento según `tooltipMode`:
- `off`    → nada (sin voz ni indicador visual)
- `visual` → tooltip/subrayado al hover
- `voice`  → `speak(label)` al hover (requiere `voiceEnabled === true`)
- `both`   → visual + voz simultáneamente

### Pagina de Ajustes (accessibility-settings.tsx — ahora "Ajustes")
3 pestanas con `role="tablist/tab/tabpanel"` + `title` + `aria-label` descriptivos en cada tab:
- **Perfil**: avatar con iniciales, editar nombre (PUT a `perfil.nombre`), correo y rol (read-only)
- **Notificaciones**: 3 toggles guardados en localStorage (`ea_notif_lesson/activity/teacher`)
- **Accesibilidad**: contraste (3 niveles), tamano texto, TTS (toggle + velocidad + voz), tooltips, interfaz simplificada, vista previa en tiempo real

## HTML Semántico y SEO

### Etiquetas semánticas usadas por componente
| Etiqueta | Dónde | Propósito |
|---|---|---|
| `<header>` | Todos los dashboards | Barra de navegación superior |
| `<main>` | Todos los dashboards | Contenido principal de la página |
| `<section aria-label="...">` | Secciones lógicas (bienvenida, stats, cursos, progreso, calendario) | Agrupa contenido con significado |
| `<nav aria-label="...">` | Menú principal docente, acciones rápidas estudiante, acciones de curso/lección | Navegación entre pantallas |
| `<article>` | Tarjeta de curso, lección, actividad reciente, pregunta, entrada de día | Contenido autónomo reutilizable |
| `<aside>` | Acciones rápidas del docente, leyenda del calendario | Contenido complementario |
| `<ul>/<li>` | Listas de stats, cursos, lecciones, menú de navegación, resumen del mes | Listas semánticas en lugar de divs |
| `<figure>/<figcaption>` | Imagen en student-activity | Imagen con descripción accesible |
| `<fieldset>/<legend>` | Opciones de respuesta en actividad | Agrupa controles de formulario relacionados |
| `<time>` | Timestamps en actividad reciente | Fecha/hora semántica |
| `<abbr title="...">` | Días de la semana en el calendario | Abreviaturas con nombre completo |
| `role="tablist/tab/tabpanel"` | Pestañas de accessibility-settings | Semántica ARIA de pestañas con id/aria-controls |
| `role="grid/gridcell"` | Grilla del calendario mensual | Semántica de cuadrícula interactiva |
| `aria-live="polite"` | Resultado de respuesta en actividad, mes seleccionado en calendario | Anuncia cambios dinámicos a lectores de pantalla |
| `aria-current="date"` | Día actual en el calendario | Identifica el día de hoy |
| `aria-pressed` | Día seleccionado en el calendario | Estado de botón togglable |
| `aria-label` | Secciones, botones, listas, artículos | Describe el propósito cuando no hay texto visible |
| `aria-hidden="true"` | Iconos decorativos, indicadores de puntos | Oculta de lectores de pantalla |

### Componentes con HTML semántico aplicado
- `teacher-dashboard.tsx` — `<section>`, `<nav>`, `<ul>/<li>`, `<article>`, `<time>`, `<aside>`
- `student-dashboard.tsx` — `<section>`, `<nav>`, `<ul>/<li>`, `<article>`
- `student-activity.tsx` — `<section>`, `<article>`, `<figure>`, `<fieldset>/<legend>`, `aria-live`
- `course-list.tsx` — `<section>`, `<ul>/<li>`, `<article>`, `<nav>` por curso
- `lesson-management.tsx` — `<section>`, `<ul>/<li>`, `<article>`, `<nav>` por lección
- `student-progress.tsx` — `<section>` (perfil, stats, progreso general, detalle), `<ul>/<li>`, `<article>` por lección
- `student-calendar.tsx` — `<section>`, `<nav>` (meses), `<aside>` (leyenda), `<ul>/<li>` (resumen), `role="grid/gridcell"`, `aria-current="date"`
- `accessibility-settings.tsx` — `role="tablist/tab/tabpanel"` con `id`/`aria-controls` + `title`/`aria-label` descriptivos en las 3 pestañas
- `students-list.tsx` — `<section>` (resumen, lista), `<ul>/<li>`, `<article>` por alumno, `<time>` en última actividad; botón "Volver" → `aria-label="Regresar al panel principal"`; `useSpeakOnHover` en las 3 tarjetas de stats
- `teacher-analytics.tsx` — `<section>` para stats generales, `<ul>/<li>` para tarjetas; `useSpeakOnHover` en cada stat card con descripción contextual; botón "Volver" → `aria-label="Regresar al panel principal"`
- `teacher-dashboard.tsx` (hover adicionales) — `useSpeakOnHover` en las 3 tarjetas de stats (Estudiantes, Cursos, Progreso General) con valor dinámico; `useSpeakOnHover` en el header de "Actividad Reciente"; estado vacío en "Actividad Reciente" con icono `History` y mensaje descriptivo cuando `recentActivity.length === 0`

### Bug corregido: NaN% en Progreso Promedio (students-list.tsx)
`Math.round(students.reduce(...) / students.length)` producía `NaN` cuando `students.length === 0`.
Corregido extrayendo la variable `averageProgress` con guardia: `students.length > 0 ? Math.round(...) : 0`.

### useSpeakOnHover en tarjetas de estadísticas
Las tarjetas de resumen numérico en `students-list.tsx` y `teacher-analytics.tsx` usan `useSpeakOnHover`
con descripciones contextuales que incluyen el valor actual. Ejemplo:
```
useSpeakOnHover(`Progreso promedio: porcentaje de avance de todos tus alumnos. Actualmente ${averageProgress}%`)
```
Esto permite que al pasar el cursor, el TTS explique qué significa el número, no solo lo repita.

### Metadata SEO (app/layout.tsx)
- `lang="es"` en `<html>` para idioma correcto
- `description` completa con contexto de accesibilidad
- `keywords` con términos relevantes
- `openGraph` con tipo, título y descripción
- `robots: noindex` mientras la app es SPA sin SSR

### Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # clave publica, usar en cliente
SUPABASE_SERVICE_ROLE_KEY=...       # clave privada, SOLO en API routes, nunca en cliente
```

## Decisiones de diseno importantes

1. **SPA sin router**: toda la navegacion es estado React (`currentScreen`). No hay
   rutas URL distintas. Al recargar la pagina siempre va a login.

2. **`supabase` vs `supabaseAdmin`**: el cliente `supabase` (anon key) respeta RLS.
   El `supabaseAdmin` (service_role) la bypasea — solo se usa en API routes del servidor.

3. **Grupo por docente+grado**: cada docente tiene un `grupo` por cada grado que usa.
   Al crear un curso se busca o crea el grupo correspondiente (`id_docente + grado`).

4. **Actividades: config completa en `instrucciones` JSON**: al crear/editar una actividad
   (en `create-lesson`, `edit-lesson` o `activity-builder`), el formulario inline muestra:
   - `instrucciones`: texto libre para el estudiante
   - `opciones de respuesta` (A/B/C con marca de correcta): para tipos `multiple`, `image`, `sound`
   - `respuesta_correcta`: para tipos `short`, `voice`
   - `nivel_dificultad`: Facil/Medio/Dificil
   Todo se serializa como JSON en la columna `instrucciones` (TEXT) via `lib/activity-config.ts`.
   Formato: `{ instrucciones: string, opciones?: [{texto, correcta}], respuesta_correcta?: string }`.
   Parser retrocompatible: si no es JSON valido, trata el valor como texto plano.
   Helper: `parseActivityConfig(raw)` / `serializeActivityConfig(config)` en `lib/activity-config.ts`.

5. **`progresion_alumno` es cache**: actualizada por trigger en cada `intento_actividad`.
   El docente la lee para el dashboard; el alumno no la consulta directamente.

6. **Orden de lecciones y actividades**: ambas tienen constraint UNIQUE por curso/leccion.
   Al crear: `count + 1`. Al editar actividades: se eliminan todas y se reinsertan.

7. **Editar curso**: existe `edit-course.tsx` + `PUT /api/courses/[id]`. Accesible desde:
   - `course-list.tsx` → boton "Editar Info" (navega a `edit-course-{id}`)
   - `lesson-management.tsx` → boton "Editar Curso" en el header
   Permite editar `titulo`, `descripcion`, `materia`. El `grado` NO es editable (esta en
   `grupo`; cambiarlo moveria a todos los alumnos del grupo).

8. **Constructor de actividades (`activities`)**: 3 vistas:
   - **Grid**: grid de 6 tarjetas de tipo + boton "Ver actividades existentes" + icono engranaje
     en el header con dropdown para cambiar entre "Crear nueva actividad" / "Ver actividades existentes"
   - **Existing**: lista agrupada por curso → leccion, con boton "Editar" por actividad
   - **Config**: formulario completo con instrucciones, opciones por tipo (con marca de correcta),
     respuesta_correcta, dificultad. Selector de leccion usa `<optgroup>` agrupado por curso.
     Al editar: los campos se pre-llenan parseando el JSON de `instrucciones` desde DB.
     Al guardar: serializa config completo via `serializeActivityConfig`.

9. **`nivel_dificultad` es INTEGER en DB**: el frontend usa strings "facil"/"medio"/"dificil".
   Todos los API routes convierten: facil→1, medio→2, dificil→3 antes del INSERT/UPDATE.
   Al leer desde DB, convertir integer a string antes de usar en estado React.

10. **Next.js 16 — params async**: en los route handlers `[id]`, `params` es una
    `Promise<{id: string}>` y debe awaitearse. Usar siempre:
    ```typescript
    { params }: { params: Promise<{ id: string }> }
    const { id } = await params
    ```
    Usar `params.id` directamente (sin await) da `undefined`, que al template-stringear
    produce la URL `/api/.../undefined` y Supabase devuelve error UUID inválido.
    Afecta: `lessons/[id]`, `courses/[id]`, `activities/[id]`.

11. **Animaciones e interacciones** (`globals.css`): transiciones globales en todos los `button`:
    - `hover`        → `brightness(1.06)`
    - `active`       → `scale(0.96)` (efecto táctil de pulsación)
    - `focus-visible` → outline de 3px con `--ring`
    Clase CSS nueva: `.very-high-contrast` (fondo negro, primario amarillo) para contraste máximo.

12. **AccessibleTooltip + useSpeakOnHover** (`components/ui/accessible-tooltip.tsx`):
    - `<AccessibleTooltip>`: para botones de solo icono — muestra tooltip visual y/o habla
    - `useSpeakOnHover(label)`: hook para botones con texto — solo activa la voz al hover
    - Ambos respetan `settings.tooltipMode` y `settings.voiceEnabled`
    - Aplicados en `teacher-dashboard.tsx` y `student-dashboard.tsx`
    - Patrón: icono → wrapper; texto → `{...useSpeakOnHover(...)}`

13. **Página de Ajustes** (`accessibility-settings.tsx`): renombrada de "Accesibilidad" a
    "Ajustes". Dividida en 3 pestañas:
    - **Perfil**: color de avatar (12 colores, `ea_avatar_color` en localStorage), editar nombre
      (PUT a `perfil.nombre`), correo read-only, y **cambiar contraseña** (nueva + confirmar,
      validación mínimo 6 chars + coincidencia, usa `supabase.auth.updateUser({ password })`).
      Feedback inline: banner verde (éxito) o rojo (error) con auto-dismiss a 3 s.
    - **Notificaciones**: 3 toggles en localStorage (`ea_notif_lesson`, `ea_notif_activity`, `ea_notif_teacher`)
    - **Accesibilidad**: contraste 3 niveles (Normal/Alto/Muy Alto), tamaño texto, TTS con
      velocidad (slider 0.5–2.0x) y selector de voz del sistema, modo de tooltips (4 opciones),
      interfaz simplificada, **vista previa en tiempo real** con resumen de config activa

15. **Sistema de color de avatar** (`ea_avatar_color` en localStorage): 12 colores predefinidos
    (`AVATAR_COLORS[]` en `accessibility-settings.tsx`). Persistido como hex string en
    `localStorage("ea_avatar_color")`. Se muestra en:
    - `accessibility-settings.tsx` (pestaña Perfil): modal con grid 4×3 de círculos de color
      mostrando las iniciales del usuario. Click en el avatar abre el selector.
    - `student-dashboard.tsx`: card de bienvenida — fondo del círculo con la inicial.
    - `teacher-dashboard.tsx`: sección "Hola" — fondo del cuadrado con la inicial.
    Los 3 componentes leen `ea_avatar_color` en `useEffect` y usan `hsl(var(--primary))` como fallback.

14. **Calendario de estudiante** (`student-calendar.tsx`): calendario mensual con navegación
    por meses. Consulta `intento_actividad` filtrando por `id_alumno` y rango del mes.
    - Dots de color por puntaje: verde ≥80%, naranja 50–79%, rojo <50%, gris sin calificación
    - Click en un día muestra lista detallada de actividades completadas ese día
    - Resumen del mes: total completadas, promedio de puntaje, días activos
    - Accesible desde `student-dashboard` → botón "Mi Calendario"
