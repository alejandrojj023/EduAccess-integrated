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
  accessibility-settings.tsx

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
  accessibility-context.tsx       — Configuracion de accesibilidad + TTS
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
  → accessibility
```

### Flujo estudiante
```
login → initial-test (si no lo ha completado)
      → student-dashboard
          → student-activity → voice-activity
          → student-progress
          → accessibility
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

### Mapeo DB a Frontend
| DB | Frontend |
|----|---------|
| `contraste: 'normal'/'alto'/'muy_alto'` | `highContrast: boolean` |
| `tamano_fuente: 16/24/32` | `textSize: 'normal'/'large'/'extra-large'` |
| `texto_a_voz_activo` | `voiceEnabled: boolean` |
| `interfaz_simplificada` | `simplifiedInterface: boolean` |

### TTS
Usa Web Speech API (`window.speechSynthesis`), idioma `es-ES`, velocidad `0.9`.
Solo habla si `settings.voiceEnabled === true`.

## Variables de entorno (.env.local)
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

4. **Actividades sin editor de preguntas**: los tipos de actividad se seleccionan al
   crear/editar una leccion. No existe editor de preguntas/opciones individual aun
   (`pregunta` y `opcion` existen en DB pero no tienen UI todavia).

5. **`progresion_alumno` es cache**: actualizada por trigger en cada `intento_actividad`.
   El docente la lee para el dashboard; el alumno no la consulta directamente.

6. **Orden de lecciones y actividades**: ambas tienen constraint UNIQUE por curso/leccion.
   Al crear: `count + 1`. Al editar actividades: se eliminan todas y se reinsertan.

7. **"Editar" curso**: no existe pantalla de edicion de metadatos del curso. El boton
   "Editar" en `course-list.tsx` navega a la gestion de lecciones (`lessons-{courseId}`).
