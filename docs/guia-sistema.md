# Guía del Sistema EduAccess — 50 Preguntas Clave

---

## ¿Cómo se conecta a la base de datos?

EduAccess usa **Supabase** como base de datos (PostgreSQL en la nube).

Hay **dos clientes** de conexión:

| Cliente | Archivo | Quién lo usa | Qué puede hacer |
|---------|---------|--------------|-----------------|
| `supabase` (anon key) | `lib/supabase.ts` | Componentes del navegador | Respeta las reglas de seguridad (RLS) |
| `supabaseAdmin` (service_role) | `lib/supabase-admin.ts` | Solo en rutas API del servidor | Salta las reglas, accede a todo |

**Regla de oro:** Nunca usar `supabaseAdmin` en el navegador. Solo en archivos dentro de `app/api/`.

---

## Las tablas principales de la base de datos

```
perfil              → usuarios (docentes y alumnos)
grupo               → grupos creados por el docente
alumno_grupo        → qué alumnos pertenecen a qué grupo
alumno_curso        → qué cursos tiene inscrito cada alumno
curso               → cursos creados por el docente
leccion             → lecciones dentro de cada curso
actividad           → actividades dentro de cada lección
progresion_alumno   → progreso del alumno por lección (%)
intento_leccion     → historial de cada vez que completó una lección
intento_actividad   → historial de cada actividad respondida
gamificacion        → estrellas totales, nivel y racha del alumno
invitacion          → invitaciones del docente al alumno
glosario            → palabras del glosario por lección
```

---

## Las 5 rutas API del servidor

| Ruta | Método | Para qué sirve | Archivo |
|------|--------|----------------|---------|
| `/api/complete-lesson` | POST | Completar una lección (calcula estrellas, guarda historial, actualiza gamificación) | `app/api/complete-lesson/route.ts` |
| `/api/complete-lesson` | PUT | Reiniciar una lección (pone pct_completado en 0 para repetirla) | mismo archivo |
| `/api/attempts` | POST | Guardar el resultado de una actividad individual | `app/api/attempts/route.ts` |
| `/api/lesson-attempts` | GET | Obtener historial de intentos (solo docentes) | `app/api/lesson-attempts/route.ts` |
| `/api/invitations` | GET/POST/PATCH | Invitar alumnos a un grupo | `app/api/invitations/route.ts` |
| `/api/teacher/recent-activity` | GET | Actividad reciente del panel del docente | `app/api/teacher/recent-activity/route.ts` |

---

## 50 Preguntas y Respuestas

---

### ESTRELLAS

**1. ¿Cómo se calculan las estrellas de una lección?**
Cuando el alumno termina una lección, el servidor llama a una función de Supabase llamada `fn_calcular_estrellas`. Le pasa dos números:
- El porcentaje de actividades correctas al primer intento
- Cuántas veces el alumno tuvo que reintentar actividades

La función devuelve un número del 1 al 5.
**Archivo:** `app/api/complete-lesson/route.ts` línea 25.

---

**2. ¿Qué cuenta como "correcto al primer intento"?**
Una actividad se cuenta como correcta al primer intento si `r.correct === true` Y `r.attempts <= 1`.
Si el alumno lo intentó más de una vez, ya no cuenta como primer intento.
**Archivo:** `app/api/complete-lesson/route.ts` línea 20.

---

**3. ¿Dónde se guardan las estrellas de cada lección?**
En dos tablas a la vez:
- `intento_leccion.estrellas` → el resultado de ESA sesión (historial)
- `progresion_alumno.estrellas` → el resultado MÁS RECIENTE (se sobreescribe cada vez)

---

**4. ¿Las estrellas totales del alumno cómo se calculan?**
Después de completar una lección, el sistema suma las `estrellas` de TODAS las filas de `progresion_alumno` del alumno y guarda el total en `gamificacion.estrellas_totales`.
**Archivo:** `app/api/complete-lesson/route.ts` líneas 111-120.

---

**5. ¿Cómo se muestran las estrellas parciales (ej. 2.4 estrellas)?**
Se usa el componente `StarRow`. Cada estrella se divide en porcentaje de llenado:
- Si `stars >= i` → 100% llena
- Si `stars > i-1` → `(stars - (i-1)) * 100` % llena (parcial)
- Si no → vacía

**Archivos:** `components/student/student-progress.tsx` y `components/student/student-course.tsx`.

---

**6. ¿Qué significa cada cantidad de estrellas?**
| Estrellas | Mensaje |
|-----------|---------|
| 5 | ¡Perfecto! Dominas esta lección. |
| 4 | ¡Excelente trabajo! Casi lo tienes perfecto. |
| 3 | ¡Muy bien! Sigue practicando para mejorar. |
| 2 | ¡Buen esfuerzo! Puedes lograrlo mejor. |
| 1 | ¡Lo intentaste! Sigue practicando. |
| 0 | Sigue practicando, lo lograrás la próxima vez. |

**Archivo:** `components/student/student-activity.tsx` función `getStarMessage`.

---

**7. ¿Cómo convierte el docente estrellas a porcentaje?**
`estrellas × 20 = %`  (5★ = 100%, 4★ = 80%, 3★ = 60%...)
**Archivo:** `components/teacher/course-students.tsx`.

---

### NIVELES Y GAMIFICACIÓN

**8. ¿Cómo funciona el sistema de niveles?**
Se calcula con la función de Supabase `fn_calcular_nivel` que recibe las estrellas totales.

| Nivel | Nombre | Estrellas |
|-------|--------|-----------|
| 1 | Explorador 🔍 | 0 - 9 |
| 2 | Aprendiz 📚 | 10 - 29 |
| 3 | Aventurero 🧭 | 30 - 59 |
| 4 | Experto 🏆 | 60 - 99 |
| 5 | Maestro 👑 | 100+ |

**Archivo:** `hooks/student/use-student-dashboard.ts` constante `NIVELES`.

---

**9. ¿Dónde se guarda el nivel del alumno?**
En la tabla `gamificacion`, columna `nivel`. Se actualiza cada vez que el alumno completa una lección.
**Archivo:** `app/api/complete-lesson/route.ts` línea 157.

---

**10. ¿Cómo funciona la barra de progreso hacia el siguiente nivel?**
```
progressToNext = ((estrellasTotales - nivelMin) / (nivelMax - nivelMin + 1)) × 100
```
**Archivo:** `components/student/student-dashboard.tsx`.

---

### RACHA (STREAK)

**11. ¿Cómo funciona la racha de días?**
Reglas al completar una lección:
- **Mismo día** → la racha no cambia
- **Día siguiente** → la racha sube +1
- **2 o más días sin actividad** → la racha se reinicia a 1

**Archivo:** `app/api/complete-lesson/route.ts` líneas 128-151.

---

**12. ¿En qué zona horaria se calcula la racha?**
Zona horaria **America/Mexico_City** (hora de Tijuana).
Se usan las funciones `fechaTijuana()` y `diferenciaDias()`.
**Archivo:** `lib/utils.ts`.

---

**13. ¿Por qué la racha puede mostrar 0 en el panel sin haberse borrado en la base de datos?**
El panel calcula la racha de forma "lazy" (perezosa): si han pasado 2+ días desde el último acceso, muestra 0 con el mensaje "¡Recupera tu racha hoy!" pero NO escribe en la base de datos. Solo se actualiza la DB cuando el alumno completa una lección.
**Archivo:** `hooks/student/use-student-dashboard.ts` líneas 86-94.

---

**14. ¿Dónde se guarda la racha?**
En la tabla `gamificacion`, columnas `streaks_dias` y `ultimo_acceso`.

---

### LECCIONES Y ACTIVIDADES

**15. ¿Qué pasa exactamente cuando el alumno termina una lección?**
En orden:
1. Se llama a `/api/complete-lesson`
2. Se calcula el puntaje (correctas al primer intento / total)
3. Se calculan las estrellas con `fn_calcular_estrellas`
4. Se guarda un nuevo registro en `intento_leccion`
5. Se vinculan los `intento_actividad` de esa sesión al intento de lección
6. Se actualiza `progresion_alumno` (pct_completado = 100)
7. Se recalculan las estrellas totales
8. Se calcula el nuevo nivel
9. Se actualiza la racha
10. Se actualiza `gamificacion`

**Archivo:** `app/api/complete-lesson/route.ts`.

---

**16. ¿Qué es `pct_completado` en `progresion_alumno`?**
Es el porcentaje de completado de la lección:
- `0` → no iniciada o reiniciada
- `100` → completada

Siempre es 0 o 100, nunca un número intermedio.

---

**17. ¿Qué es `promedio_puntaje` en `progresion_alumno`?**
Es el porcentaje de actividades correctas al primer intento del último intento.
Ejemplo: 2 de 3 correctas al primer intento = 66.6%.

---

**18. ¿Qué pasa cuando el alumno repite una lección?**
Se llama a `PUT /api/complete-lesson`. Esto:
- Pone `pct_completado = 0` en `progresion_alumno`
- Incrementa `total_reintentos`
- Las estrellas se ponen en `null` hasta que termine de nuevo

**Archivo:** `app/api/complete-lesson/route.ts` líneas 168-196.

---

**19. ¿Cómo sabe el sistema cuántas veces intentó una lección el alumno?**
Cuenta las filas en `intento_leccion` con ese `id_alumno` e `id_leccion`. El número se guarda en `numero_intento`.
**Archivo:** `app/api/complete-lesson/route.ts` líneas 31-38.

---

**20. ¿Qué es `intento_leccion` vs `intento_actividad`?**
- `intento_leccion`: una fila por cada vez que el alumno completó una lección completa
- `intento_actividad`: una fila por cada actividad respondida (pueden ser varias por lección)
- Los `intento_actividad` se vinculan a su `intento_leccion` mediante `id_intento_leccion`

---

**21. ¿Cómo se guarda el resultado de una actividad individual?**
Se llama a `POST /api/attempts` enviando `activityId`, `puntaje` y `tiempoSegundos`. El servidor busca a qué grupo pertenece la actividad y guarda en `intento_actividad`.
**Archivo:** `app/api/attempts/route.ts`.

---

**22. ¿Qué tipos de actividad existen?**
| Nombre visible | Nombre en DB |
|----------------|-------------|
| Identificación de imágenes | `identificacion` |
| Reconocimiento de sonidos | `reconocimiento_sonidos` |
| Secuenciación | `secuenciacion` |
| Opción múltiple | `seleccion_guiada` |
| Respuesta corta | `respuesta_corta` |
| Respuesta oral | `respuesta_oral` |
| Completar oración | `completar_oracion` |
| Sopa de letras | `sopa_letras` |

---

**23. ¿Dónde se guarda la configuración de cada actividad?**
En la columna `instrucciones` de la tabla `actividad` (es texto JSON). Se serializa y deserializa con `parseActivityConfig()` y `serializeActivityConfig()`.
**Archivo:** `lib/activity-config.ts`.

Excepción: `completar_oracion` y `secuenciacion` guardan sus datos en la tabla `pregunta`.

---

**24. ¿Cómo sabe el sistema si una actividad está completada?**
Busca si existe al menos una fila en `intento_actividad` con ese `id_actividad`, `id_alumno` y `puntaje_total` no nulo.
**Archivo:** `components/student/student-lesson.tsx` líneas 133-143.

---

### CURSOS Y GRUPOS

**25. ¿Cuál es la diferencia entre `alumno_grupo` y `alumno_curso`?**
- `alumno_grupo`: el alumno pertenece al grupo del docente (para organizarlos)
- `alumno_curso`: el alumno está inscrito en un curso específico (para acceder a las lecciones)

El acceso a lecciones y actividades se controla por `alumno_curso`, NO por `alumno_grupo`.

---

**26. ¿Cómo se inscribe un alumno a un curso?**
Hay dos formas:
1. El alumno ingresa el **código del grupo** directamente
2. El docente envía una **invitación** por correo

Ambas crean una fila en `alumno_curso` y `alumno_grupo`.

---

**27. ¿Qué es un grupo?**
Un grupo es creado por el docente y agrupa alumnos. Un docente puede tener varios grupos. Cada curso pertenece a un grupo (`curso.id_grupo`).
**Tabla:** `grupo`.

---

**28. ¿Cómo funcionan las invitaciones?**
1. El docente busca al alumno por correo y le envía una invitación
2. Se crea una fila en `invitacion` con estado `"pendiente"`
3. El alumno la ve en su panel y la acepta
4. Al aceptar: se crea la fila en `alumno_grupo` y `alumno_curso`
5. El estado de la invitación cambia a `"aceptada"`

**Archivo:** `app/api/invitations/route.ts`.

---

**29. ¿Qué pasa si el docente publica o despublica una lección?**
Solo las lecciones con `publicado = true` son visibles para el alumno. Lo mismo aplica para las actividades.

---

**30. ¿En qué orden aparecen las lecciones y actividades?**
Por la columna `orden` (número entero). Al crear una nueva lección se le asigna `orden = count + 1`. Al editar actividades, se eliminan todas y se reinsertan en el nuevo orden.

---

### AUTENTICACIÓN Y ROLES

**31. ¿Cómo funciona el inicio de sesión?**
Usa Supabase Auth. Al hacer login:
1. Supabase valida email y contraseña
2. Devuelve un `access_token` (JWT)
3. El sistema lee el perfil del usuario de la tabla `perfil`
4. Detecta si es docente o alumno por el campo `rol`

**Archivo:** `lib/auth-context.tsx`.

---

**32. ¿Cómo sabe el sistema si eres docente o alumno?**
La tabla `perfil` tiene una columna `rol` con valores `"docente"` o `"alumno"`.
En el frontend se mapean a `"teacher"` y `"student"`.

---

**33. ¿Qué es el `access_token` y para qué sirve?**
Es una llave de seguridad que el navegador guarda al iniciar sesión. Se envía en el header `Authorization: Bearer <token>` cuando se hacen llamadas a las rutas API. El servidor lo usa para saber quién eres.

---

**34. ¿Qué son las RLS (Row Level Security)?**
Son reglas en Supabase que restringen qué filas puede leer o escribir cada usuario. Por ejemplo: un alumno solo puede leer SUS propios registros de `progresion_alumno`. El cliente `supabaseAdmin` salta estas reglas.

---

**35. ¿Qué es el `needsTest` en el contexto de autenticación?**
Es una bandera que indica si el alumno necesita completar un test inicial (evaluación diagnóstica) antes de poder usar la app.
**Archivo:** `lib/auth-context.tsx`.

---

### PANEL DEL ALUMNO

**36. ¿Qué carga el panel del alumno al abrirse?**
En paralelo:
1. Datos de `gamificacion` (estrellas, nivel, racha)
2. Cursos inscritos desde `alumno_curso`

Luego en paralelo:
3. Lecciones de esos cursos
4. Progresiones del alumno

**Archivo:** `hooks/student/use-student-dashboard.ts`.

---

**37. ¿Qué es el "caché de 2 minutos" del panel del alumno?**
Para evitar hacer las mismas consultas cada vez que navegas al panel, los datos se guardan temporalmente en memoria del navegador. Si abres el panel dentro de los 2 minutos siguientes, aparece instantáneo sin hacer consultas a Supabase.
**Archivo:** `hooks/student/use-student-dashboard.ts`.

---

**38. ¿Cómo funciona el botón "Continuar Aprendiendo"?**
Prioridad:
1. Si hay cursos no iniciados (progreso = 0%) → elige uno al azar
2. Si hay cursos en progreso (entre 0% y 100%) → elige uno al azar
3. Si todos están completados → elige uno al azar para repetir

**Archivo:** `components/student/student-dashboard.tsx` función `handleContinuar`.

---

**39. ¿Qué muestra "Mi Progreso"?**
- Estadísticas generales (lecciones completadas, puntaje promedio, estrellas, intentos totales)
- Barra de progreso animada
- Lista de lecciones con estrellas y opción de ver historial de intentos

**Archivo:** `components/student/student-progress.tsx`.

---

**40. ¿Qué muestra "Mi Calendario"?**
- Calendario mensual con puntos de colores en días donde completó lecciones
- Color del punto según las estrellas obtenidas (verde = 4-5★, amarillo = 2.5-4★, rojo = menos de 2.5★)
- Estadísticas del mes: lecciones completadas, promedio de estrellas, días activos

**Archivo:** `components/student/student-calendar.tsx`.

---

### PANEL DEL DOCENTE

**41. ¿Qué muestra el panel del docente?**
- Número total de estudiantes en sus grupos
- Número de cursos activos
- Porcentaje de progreso general (promedio de todos los alumnos)
- Actividad reciente (últimas lecciones completadas por alumnos)

**Archivo:** `components/teacher/teacher-dashboard.tsx` + `hooks/teacher/use-teacher-dashboard.ts`.

---

**42. ¿Cómo funciona la "Actividad Reciente" del docente?**
Se llama a `/api/teacher/recent-activity` con el token del docente. Esta ruta usa `supabaseAdmin` para leer los `intento_leccion` recientes de todos sus alumnos (saltando RLS). Se actualiza automáticamente cada 60 segundos y también cuando un alumno completa una lección (usando Supabase Realtime).

---

**43. ¿Qué puede ver el docente del progreso de un alumno específico?**
En el reporte por alumno puede ver:
- Progreso por lección (% y estrellas)
- Historial de intentos de cada lección
- Detalle de actividades por intento (cuáles respondió bien/mal)
- Estadísticas: correctas al primer intento y reintentos

**Archivo:** `components/teacher/course-students.tsx`.

---

**44. ¿Cómo funciona Supabase Realtime en el panel del docente?**
Se suscribe a los eventos `INSERT` en las tablas `intento_leccion` e `intento_actividad`. Cuando cualquier alumno completa algo, el servidor notifica al navegador del docente y este actualiza el panel después de 1.5 segundos (debounce).
**Archivo:** `hooks/teacher/use-teacher-dashboard.ts` líneas 53-66.

---

### ACCESIBILIDAD Y VOZ

**45. ¿Cómo funciona la lectura en voz alta?**
Usa la API nativa del navegador `SpeechSynthesis`. La función `speak()` convierte texto a voz en español. Solo funciona si el alumno tiene activada la opción de voz en configuración.
**Archivo:** `lib/accessibility-context.tsx` función `speak`.

---

**46. ¿Por qué el audio de "Lección completada" siempre suena aunque la voz esté desactivada?**
Es un caso especial: ese audio usa `window.speechSynthesis` directamente sin revisar si `voiceEnabled` está activo, porque es una notificación importante de logro para el alumno.
**Archivo:** `components/student/student-activity.tsx` useEffect del audio de lección completada.

---

**47. ¿Qué dice el audio cuando se completa una lección?**
`"¡Lección completada! Obtuviste X estrella(s). [mensaje según estrellas]"`
Suena 600ms después de que aparece la animación de estrellas.

---

### DATOS Y SEGURIDAD

**48. ¿Dónde están las variables de entorno y qué significan?**
En el archivo `.env.local` (no está en el repositorio por seguridad):
```
NEXT_PUBLIC_SUPABASE_URL      → dirección de tu base de datos Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY → llave pública (puede estar en el navegador)
SUPABASE_SERVICE_ROLE_KEY     → llave privada (SOLO en el servidor, nunca en el navegador)
```

---

**49. ¿Por qué algunos datos no se pueden leer directamente desde el navegador?**
Porque Supabase tiene reglas RLS que solo permiten al usuario ver sus propios datos. Por ejemplo, un alumno no puede leer los datos de otro alumno. Para que el docente vea datos de sus alumnos, se usa una ruta API del servidor con `supabaseAdmin` que sí puede leer todo.

---

**50. ¿Cómo se estructura el proyecto en carpetas?**
```
app/
  api/          → rutas del servidor (POST, GET, etc.)
  page.tsx      → página principal (enruta según el rol)

components/
  student/      → pantallas del alumno
  teacher/      → pantallas del docente
  ui/           → componentes reutilizables (botones, tarjetas...)

hooks/
  student/      → lógica de datos del alumno
  teacher/      → lógica de datos del docente

lib/
  supabase.ts        → cliente público de la BD
  supabase-admin.ts  → cliente privado de la BD (solo servidor)
  auth-context.tsx   → manejo de sesión e inicio de sesión
  utils.ts           → funciones de fecha y utilidades
  activity-config.ts → serializar/deserializar actividades

public/         → imágenes y archivos estáticos
```

---

*Documento generado el 14 de Abril de 2026 — EduAccess*
