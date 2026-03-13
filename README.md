# EduAccess Integrated

Sistema web educativo accesible orientado al desarrollo cognitivo y académico de niños de primero a tercero de primaria con **Trastorno del Procesamiento Auditivo Central (TPAC)** y **baja visión**.

El proyecto busca ofrecer una plataforma digital inclusiva que permita a docentes y estudiantes interactuar mediante cursos, lecciones y actividades educativas accesibles, incorporando apoyos visuales permanentes, navegación guiada, lectura por voz opcional y captura de respuestas orales simples.

---

## Descripción general

**EduAccess Integrated** es una solución web enfocada en apoyar el aprendizaje de estudiantes que presentan dificultades visuales y auditivas no profundas, especialmente en contextos escolares de educación básica.

La plataforma está diseñada para:

- facilitar el acceso a contenidos educativos mediante interfaces claras y accesibles;
- permitir a docentes gestionar cursos, lecciones y actividades;
- registrar el progreso del estudiante a través de métricas educativas objetivas;
- incorporar un **test educativo inicial de carácter orientativo**, sin fines clínicos, para identificar a los estudiantes que podrían requerir el uso del sistema.

---

## Objetivo del proyecto

Desarrollar un sistema web educativo accesible e interactivo que apoye el desarrollo cognitivo y académico de niños de primero a tercero de primaria con TPAC y baja visión, mediante actividades educativas interactivas, apoyos visuales, navegación guiada, lectura por voz opcional y captura de respuestas orales simples.

---

## Características principales

- Autenticación de usuarios con roles de **docente** y **estudiante**.
- Gestión de cursos y lecciones.
- Actividades interactivas de tipo formativo.
- Evaluaciones con registro de:
  - porcentaje de respuestas correctas;
  - número de intentos;
  - tiempo de respuesta;
  - progreso del estudiante.
- Síntesis de voz como apoyo opcional para instrucciones y contenido breve.
- Reconocimiento de voz para respuestas orales simples.
- Diseño enfocado en accesibilidad para estudiantes con TPAC y baja visión.
- Interfaz responsiva, clara y guiada.
- Test educativo inicial de carácter orientativo.

---

## Enfoque de accesibilidad

Este sistema considera criterios de accesibilidad orientados a estudiantes con necesidades específicas de percepción visual y procesamiento auditivo.

Entre los apoyos contemplados se incluyen:

- alto contraste;
- tipografías legibles;
- redundancia de información visual y textual;
- apoyos visuales constantes;
- navegación paso a paso;
- instrucciones breves y claras;
- uso opcional de lectura por voz;
- evitar que el audio sea el único medio de interacción.

---

## Tecnologías utilizadas

De acuerdo con la planeación del proyecto, la solución integra las siguientes tecnologías:

### Frontend

- **React**
- **TypeScript**
- **Tailwind CSS**

### Backend

- **Node.js**

### Base de datos y autenticación

- **Supabase**

---

## Módulos del sistema

### 1. Autenticación y control de acceso

- Registro e inicio de sesión.
- Gestión de roles por tipo de usuario.
- Protección de rutas y funcionalidades.

### 2. Gestión de cursos

- Creación y administración de cursos por parte del docente.
- Organización del contenido educativo.

### 3. Gestión de lecciones

- Creación de lecciones estructuradas.
- Asociación de actividades y contenido de apoyo.

### 4. Actividades educativas

- Ejercicios interactivos de identificación, asociación, selección guiada y secuenciación básica.
- Respuestas escritas u orales simples.

### 5. Evaluaciones formativas

- Registro automático de resultados.
- Seguimiento del desempeño del estudiante.
- Visualización de avances para el docente.

### 6. Apoyos de accesibilidad

- Lectura guiada por voz.
- Reconocimiento de voz para ciertas respuestas.
- Interfaz adaptada a necesidades visuales y auditivas.

### 7. Test educativo inicial

- Aplicación orientativa para detectar posibles necesidades de uso del sistema.
- No sustituye evaluación clínica ni diagnóstico especializado.

---

## Alcance del proyecto

El sistema está dirigido a estudiantes con:

- **baja visión**;
- dificultades asociadas al **TPAC**.

Quedan fuera del alcance:

- sordera profunda;
- ceguera total;
- diagnósticos clínicos especializados;
- herramientas o dispositivos altamente especializados fuera del marco de una residencia profesional.

---

## Instalación y ejecución

> **Nota:** esta sección puede requerir ajustes según la estructura real del repositorio y los scripts definidos en `package.json`.

### 1. Clonar el repositorio

```bash
git clone https://github.com/alejandrojj023/EduAccess-integrated.git
cd EduAccess-integrated
```

### 2. Instalar dependencias

Si el proyecto utiliza un único entorno integrado:

```bash
npm install
```

Si frontend y backend están separados, instala dependencias en cada módulo correspondiente.

### 3. Configurar variables de entorno

Crea un archivo `.env` con las credenciales necesarias para Supabase y cualquier configuración adicional del sistema.

Ejemplo general:

```env
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_clave
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 4. Ejecutar el proyecto en desarrollo

```bash
npm run dev
```

Si el proyecto está dividido por módulos, ejecuta el frontend y el backend de acuerdo con los scripts definidos.

---

## Estructura sugerida del proyecto

La estructura puede variar, pero conceptualmente el sistema contempla componentes como los siguientes:

```bash
EduAccess-integrated/
├── frontend/            # Interfaz de usuario
├── backend/             # Lógica del sistema y servicios
├── database/            # Scripts, esquemas o documentación de BD
├── public/              # Recursos estáticos
├── src/                 # Componentes, vistas, hooks y utilidades
└── README.md
```

---

## Métricas de seguimiento

El sistema contempla el registro de indicadores educativos como:

- respuestas correctas por actividad;
- cantidad de intentos;
- tiempo de respuesta;
- progresión en lecciones;
- uso de apoyos del sistema.

Estas métricas permiten apoyar el seguimiento académico del estudiante desde una perspectiva educativa, no clínica.

---

## Estado del proyecto

Proyecto en desarrollo como parte de una **Residencia Profesional** del **Instituto Tecnológico de Tijuana**.

---

## Posibles mejoras futuras

- Paneles más avanzados de analítica para docentes.
- Mayor variedad de actividades cognitivas.
- Personalización de apoyos por perfil de estudiante.
- Exportación de reportes de progreso.
- Mejora continua en criterios de accesibilidad y experiencia de usuario.

---

## Autores

- **Daniel Alejandro Gonzalez Gutierrez**
- **José Preciado Becerra**

---

## Contexto académico

Este proyecto forma parte del desarrollo de una residencia profesional enfocada en el diseño e implementación de una herramienta web educativa accesible, alineada con necesidades de inclusión, accesibilidad digital y apoyo al aprendizaje en educación básica.

---

## Licencia

Pendiente de definir.

Si deseas publicar este proyecto formalmente en GitHub, se recomienda agregar una licencia, por ejemplo:

- MIT
- Apache 2.0
- GPLv3
