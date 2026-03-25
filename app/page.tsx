"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { AccessibilityProvider } from "@/lib/accessibility-context"
import { LoginScreen } from "@/components/auth/login-screen"
import { RegisterScreen } from "@/components/auth/register-screen"
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard"
import { CourseList } from "@/components/teacher/course-list"
import { CreateCourse } from "@/components/teacher/create-course"
import { LessonManagement } from "@/components/teacher/lesson-management"
import { CreateLesson } from "@/components/teacher/create-lesson"
import { EditLesson } from "@/components/teacher/edit-lesson"
import { EditCourse } from "@/components/teacher/edit-course"
import { ActivityBuilder } from "@/components/teacher/activity-builder"
import { StudentsList } from "@/components/teacher/students-list"
import { TeacherAnalytics } from "@/components/teacher/teacher-analytics"
import { StudentDashboard } from "@/components/student/student-dashboard"
import { StudentActivity } from "@/components/student/student-activity"
import { VoiceActivity } from "@/components/student/voice-activity"
import { InitialTest } from "@/components/student/initial-test"
import { StudentProgress } from "@/components/student/student-progress"
import { StudentCalendar } from "@/components/student/student-calendar"
import { AccessibilitySettings } from "@/components/accessibility-settings"
import { GroupManagement } from "@/components/teacher/group-management"
import { JoinGroup } from "@/components/student/join-group"
import { StudentCourse } from "@/components/student/student-course"
import { StudentLesson } from "@/components/student/student-lesson"
import { BookOpen } from "lucide-react"

function AppContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout, isAuthenticated, loading, needsTest } = useAuth()
  const segments = pathname.split("/").filter(Boolean)
  const backTo = searchParams.get("back")
  const queryCourseId = searchParams.get("courseId")
  const queryCourseName = searchParams.get("courseName")
  const queryLessonName = searchParams.get("lessonName")

  const goToRoute = (screen: string) => {
    if (screen.startsWith("lessons-")) {
      const courseId = screen.replace("lessons-", "")
      router.push(`/maestro/cursos/${courseId}/lecciones`)
      return
    }

    if (screen.startsWith("edit-course-")) {
      const courseId = screen.replace("edit-course-", "")
      const currentIsLessonContext = segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "lecciones"
      router.push(`/maestro/cursos/${courseId}/editar?back=${currentIsLessonContext ? "lessons" : "courses"}`)
      return
    }

    if (screen.startsWith("edit-lesson-")) {
      const lessonId = screen.replace("edit-lesson-", "")
      if (segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "lecciones" && segments[2]) {
        router.push(`/maestro/lecciones/${lessonId}/editar?courseId=${segments[2]}`)
        return
      }
      router.push(`/maestro/lecciones/${lessonId}/editar`)
      return
    }

    if (screen.startsWith("course-")) {
      const rest = screen.replace("course-", "")
      const sepIdx = rest.indexOf("|")
      const cId = sepIdx > -1 ? rest.slice(0, sepIdx) : rest
      const cName = sepIdx > -1 ? rest.slice(sepIdx + 1) : ""
      router.push(`/estudiante/cursos/${cId}?name=${encodeURIComponent(cName)}`)
      return
    }

    switch (screen) {
      case "login":
        router.push("/iniciar-sesion")
        return
      case "register":
        router.push("/registro")
        return
      case "teacher-dashboard":
        router.push("/maestro")
        return
      case "courses":
        router.push("/maestro/cursos")
        return
      case "create-course":
        router.push("/maestro/cursos/crear")
        return
      case "create-lesson":
        if (segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "lecciones" && segments[2]) {
          router.push(`/maestro/cursos/${segments[2]}/lecciones/crear`)
        } else {
          router.push("/maestro/cursos")
        }
        return
      case "activities":
        router.push("/maestro/actividades")
        return
      case "students":
        router.push("/maestro/estudiantes")
        return
      case "analytics":
        router.push("/maestro/analiticas")
        return
      case "group-management":
        router.push("/maestro/grupos")
        return
      case "student-dashboard":
        router.push("/estudiante")
        return
      case "student-progress":
        router.push("/estudiante/progreso")
        return
      case "student-calendar":
        router.push("/estudiante/calendario")
        return
      case "join-group":
        router.push("/estudiante/unirse-grupo")
        return
      case "accessibility":
        router.push("/ajustes")
        return
      default:
        return
    }
  }

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      if (pathname !== "/iniciar-sesion" && pathname !== "/registro") {
        router.replace("/iniciar-sesion")
      }
      return
    }

    if (user?.role === "teacher") {
      if (pathname === "/iniciar-sesion" || pathname === "/registro" || pathname.startsWith("/estudiante")) {
        router.replace("/maestro")
      }
    } else {
      if (pathname === "/iniciar-sesion" || pathname === "/registro" || pathname.startsWith("/maestro")) {
        router.replace(needsTest ? "/estudiante/test-inicial" : "/estudiante")
      }
    }
  }, [loading, isAuthenticated, user, needsTest, pathname, router])

  const handleLoginSuccess = () => {
    if (user?.role === "teacher") {
      router.push("/maestro")
    } else {
      router.push(needsTest ? "/estudiante/test-inicial" : "/estudiante")
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/iniciar-sesion")
  }

  const renderScreen = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary-foreground animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">Cargando...</p>
          </div>
        </div>
      )
    }

    if (pathname === "/iniciar-sesion") {
      return (
        <LoginScreen
          onSwitchToRegister={() => router.push("/registro")}
          onLoginSuccess={handleLoginSuccess}
        />
      )
    }

    if (pathname === "/registro") {
      return (
        <RegisterScreen
          onSwitchToLogin={() => router.push("/iniciar-sesion")}
          onRegisterSuccess={handleLoginSuccess}
        />
      )
    }

    if (pathname === "/maestro") {
      return <TeacherDashboard onNavigate={goToRoute} onLogout={handleLogout} />
    }

    if (pathname === "/maestro/cursos") {
      return (
        <CourseList
          onNavigate={goToRoute}
          onBack={() => router.push("/maestro")}
        />
      )
    }

    if (pathname === "/maestro/cursos/crear") {
      return (
        <CreateCourse
          onBack={() => router.push("/maestro/cursos")}
          onSave={() => router.push("/maestro/cursos")}
        />
      )
    }

    if (segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "lecciones" && segments.length === 4) {
      const courseId = segments[2]
      return (
        <LessonManagement
          courseId={courseId}
          onNavigate={goToRoute}
          onBack={() => router.push("/maestro/cursos")}
        />
      )
    }

    if (segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "lecciones" && segments[4] === "crear") {
      const courseId = segments[2]
      return (
        <CreateLesson
          courseId={courseId}
          onBack={() => router.push(`/maestro/cursos/${courseId}/lecciones`)}
          onSave={() => router.push(`/maestro/cursos/${courseId}/lecciones`)}
        />
      )
    }

    if (segments[0] === "maestro" && segments[1] === "lecciones" && segments[3] === "editar") {
      const lessonId = segments[2]
      const parentCourse = queryCourseId
      return (
        <EditLesson
          lessonId={lessonId}
          onBack={() => router.push(parentCourse ? `/maestro/cursos/${parentCourse}/lecciones` : "/maestro/cursos")}
          onSave={() => router.push(parentCourse ? `/maestro/cursos/${parentCourse}/lecciones` : "/maestro/cursos")}
        />
      )
    }

    if (segments[0] === "maestro" && segments[1] === "cursos" && segments[3] === "editar") {
      const courseId = segments[2]
      const isLessonsBack = backTo === "lessons"
      return (
        <EditCourse
          courseId={courseId}
          onBack={() => router.push(isLessonsBack ? `/maestro/cursos/${courseId}/lecciones` : "/maestro/cursos")}
          onSave={() => router.push(isLessonsBack ? `/maestro/cursos/${courseId}/lecciones` : "/maestro/cursos")}
        />
      )
    }

    if (pathname === "/maestro/actividades") {
      return (
        <ActivityBuilder
          onBack={() => router.push("/maestro")}
          onSave={() => router.push("/maestro")}
        />
      )
    }

    if (pathname === "/maestro/estudiantes") {
      return (
        <StudentsList
          onNavigate={goToRoute}
          onBack={() => router.push("/maestro")}
        />
      )
    }

    if (pathname === "/maestro/analiticas") {
      return <TeacherAnalytics onBack={() => router.push("/maestro")} />
    }

    if (pathname === "/maestro/grupos") {
      return <GroupManagement onNavigate={goToRoute} />
    }

    if (pathname === "/estudiante") {
      return (
        <StudentDashboard
          onNavigate={goToRoute}
          onLogout={handleLogout}
        />
      )
    }

    if (segments[0] === "estudiante" && segments[1] === "cursos" && segments[2]) {
      const courseId = segments[2]
      const courseName = searchParams.get("name")
      return (
        <StudentCourse
          courseId={courseId}
          courseName={courseName}
          onSelectLesson={(id, name) => {
            router.push(`/estudiante/lecciones/${id}?lessonName=${encodeURIComponent(name)}&courseId=${courseId}&courseName=${encodeURIComponent(courseName ?? "")}`)
          }}
          onBack={() => router.push("/estudiante")}
        />
      )
    }

    if (segments[0] === "estudiante" && segments[1] === "lecciones" && segments[2]) {
      const lessonId = segments[2]
      return (
        <StudentLesson
          lessonId={lessonId}
          lessonName={queryLessonName}
          onSelectActivity={(id) => {
            router.push(`/estudiante/actividades/${id}?lessonId=${lessonId}&lessonName=${encodeURIComponent(queryLessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)
          }}
          onBack={() => {
            if (queryCourseId) {
              router.push(`/estudiante/cursos/${queryCourseId}?name=${encodeURIComponent(queryCourseName ?? "")}`)
              return
            }
            router.push("/estudiante")
          }}
        />
      )
    }

    if (segments[0] === "estudiante" && segments[1] === "actividades" && segments[2] && segments.length === 3) {
      const activityId = segments[2]
      const lessonId = searchParams.get("lessonId")
      const lessonName = searchParams.get("lessonName")
      return (
        <StudentActivity
          activityId={activityId}
          onBack={() => router.push(`/estudiante/lecciones/${lessonId ?? ""}?lessonName=${encodeURIComponent(lessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)}
          onComplete={() => router.push(`/estudiante/lecciones/${lessonId ?? ""}?lessonName=${encodeURIComponent(lessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)}
          onVoiceActivity={() => router.push(`/estudiante/actividades/${activityId}/voz?lessonId=${lessonId ?? ""}&lessonName=${encodeURIComponent(lessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)}
        />
      )
    }

    if (segments[0] === "estudiante" && segments[1] === "actividades" && segments[2] && segments[3] === "voz") {
      const activityId = segments[2]
      const lessonId = searchParams.get("lessonId")
      const lessonName = searchParams.get("lessonName")
      return (
        <VoiceActivity
          activityId={activityId}
          onBack={() => router.push(`/estudiante/lecciones/${lessonId ?? ""}?lessonName=${encodeURIComponent(lessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)}
          onComplete={() => router.push(`/estudiante/lecciones/${lessonId ?? ""}?lessonName=${encodeURIComponent(lessonName ?? "")}&courseId=${queryCourseId ?? ""}&courseName=${encodeURIComponent(queryCourseName ?? "")}`)}
        />
      )
    }

    if (pathname === "/estudiante/test-inicial") {
      return <InitialTest onComplete={() => router.push("/estudiante")} />
    }

    if (pathname === "/estudiante/progreso") {
      return <StudentProgress onBack={() => router.push("/estudiante")} />
    }

    if (pathname === "/estudiante/calendario") {
      return <StudentCalendar onBack={() => router.push("/estudiante")} />
    }

    if (pathname === "/estudiante/unirse-grupo") {
      return <JoinGroup onNavigate={goToRoute} />
    }

    if (pathname === "/ajustes") {
      return (
        <AccessibilitySettings
          onBack={() => {
            router.push(user?.role === "teacher" ? "/maestro" : "/estudiante")
          }}
        />
      )
    }

    return <LoginScreen onSwitchToRegister={() => router.push("/registro")} onLoginSuccess={handleLoginSuccess} />
  }

  return <>{renderScreen()}</>
}

export default function Home() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AppContent />
      </AccessibilityProvider>
    </AuthProvider>
  )
}
