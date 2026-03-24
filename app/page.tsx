"use client"

import { useState, useEffect } from "react"
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

type Screen =
  | "login"
  | "register"
  | "teacher-dashboard"
  | "courses"
  | "create-course"
  | "lessons"
  | "create-lesson"
  | "edit-lesson"
  | "edit-course"
  | "activities"
  | "students"
  | "analytics"
  | "student-dashboard"
  | "student-activity"
  | "voice-activity"
  | "initial-test"
  | "student-progress"
  | "student-calendar"
  | "join-group"
  | "group-management"
  | "student-course"
  | "student-lesson"
  | "accessibility"

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")
  const [selectedCourseId,      setSelectedCourseId]      = useState<string | null>(null)
  const [selectedLessonId,      setSelectedLessonId]      = useState<string | null>(null)
  const [selectedActivityType,  setSelectedActivityType]  = useState<string | null>(null)
  const [editCourseBackTo,      setEditCourseBackTo]      = useState<"courses" | "lessons">("courses")
  // Student navigation state
  const [studentCourseId,   setStudentCourseId]   = useState<string | null>(null)
  const [studentCourseName, setStudentCourseName] = useState<string | null>(null)
  const [studentLessonId,   setStudentLessonId]   = useState<string | null>(null)
  const [studentLessonName, setStudentLessonName] = useState<string | null>(null)
  const [studentActivityId, setStudentActivityId] = useState<string | null>(null)
  const { user, logout, isAuthenticated, loading, needsTest } = useAuth()

  // Redirigir automáticamente cuando cambia el estado de autenticación
  useEffect(() => {
    if (loading || !isAuthenticated) return

    if (user?.role === "teacher") {
      // Si un docente termina en una pantalla de auth o de estudiante, corregir
      if (["login", "register", "student-dashboard", "initial-test"].includes(currentScreen)) {
        setCurrentScreen("teacher-dashboard")
      }
    } else {
      // Si un estudiante termina en una pantalla de auth, redirigir
      if (["login", "register"].includes(currentScreen)) {
        setCurrentScreen(needsTest ? "initial-test" : "student-dashboard")
      }
    }
  }, [loading, isAuthenticated, user, needsTest, currentScreen])

  const handleLoginSuccess = () => {
    if (user?.role === "teacher") {
      setCurrentScreen("teacher-dashboard")
    } else {
      // Verificación real: ¿el alumno ya completó el test?
      setCurrentScreen(needsTest ? "initial-test" : "student-dashboard")
    }
  }

  const handleLogout = () => {
    logout()
    setCurrentScreen("login")
  }

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen)
  }

  const renderScreen = () => {
    // Mostrar pantalla de carga mientras se verifica la sesión
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

    switch (currentScreen) {
      case "login":
        return (
          <LoginScreen
            onSwitchToRegister={() => setCurrentScreen("register")}
            onLoginSuccess={handleLoginSuccess}
          />
        )

      case "register":
        return (
          <RegisterScreen
            onSwitchToLogin={() => setCurrentScreen("login")}
            onRegisterSuccess={handleLoginSuccess}
          />
        )

      case "teacher-dashboard":
        return <TeacherDashboard onNavigate={handleNavigate} onLogout={handleLogout} />

      case "courses":
        return (
          <CourseList
            onNavigate={(screen) => {
              if (screen.startsWith("lessons-")) {
                setSelectedCourseId(screen.replace("lessons-", ""))
                setCurrentScreen("lessons")
              } else if (screen.startsWith("edit-course-")) {
                setSelectedCourseId(screen.replace("edit-course-", ""))
                setEditCourseBackTo("courses")
                setCurrentScreen("edit-course")
              } else {
                handleNavigate(screen)
              }
            }}
            onBack={() => setCurrentScreen("teacher-dashboard")}
          />
        )

      case "create-course":
        return (
          <CreateCourse
            onBack={() => setCurrentScreen("courses")}
            onSave={() => setCurrentScreen("courses")}
          />
        )

      case "lessons":
        return (
          <LessonManagement
            courseId={selectedCourseId}
            onNavigate={(screen) => {
              if (screen.startsWith("edit-lesson-")) {
                setSelectedLessonId(screen.replace("edit-lesson-", ""))
                setCurrentScreen("edit-lesson")
              } else if (screen.startsWith("edit-course-")) {
                setSelectedCourseId(screen.replace("edit-course-", ""))
                setEditCourseBackTo("lessons")
                setCurrentScreen("edit-course")
              } else {
                handleNavigate(screen)
              }
            }}
            onBack={() => setCurrentScreen("courses")}
          />
        )

      case "edit-lesson":
        return (
          <EditLesson
            lessonId={selectedLessonId}
            onBack={() => setCurrentScreen("lessons")}
            onSave={() => setCurrentScreen("lessons")}
          />
        )

      case "edit-course":
        return (
          <EditCourse
            courseId={selectedCourseId}
            onBack={() => setCurrentScreen(editCourseBackTo)}
            onSave={() => setCurrentScreen(editCourseBackTo)}
          />
        )

      case "create-lesson":
        return (
          <CreateLesson
            courseId={selectedCourseId}
            onBack={() => setCurrentScreen("lessons")}
            onSave={() => setCurrentScreen("lessons")}
          />
        )

      case "activities":
        return (
          <ActivityBuilder
            onBack={() => setCurrentScreen("teacher-dashboard")}
            onSave={() => setCurrentScreen("teacher-dashboard")}
          />
        )

      case "students":
        return (
          <StudentsList
            onNavigate={handleNavigate}
            onBack={() => setCurrentScreen("teacher-dashboard")}
          />
        )

      case "analytics":
        return (
          <TeacherAnalytics
            onBack={() => setCurrentScreen("teacher-dashboard")}
          />
        )

      case "student-dashboard":
        return (
          <StudentDashboard
            onNavigate={(screen) => {
              if (screen.startsWith("course-")) {
                // course-{id}|{name} — navigate to course lessons
                const rest = screen.replace("course-", "")
                const sepIdx = rest.indexOf("|")
                const cId   = sepIdx > -1 ? rest.slice(0, sepIdx) : rest
                const cName = sepIdx > -1 ? rest.slice(sepIdx + 1) : ""
                setStudentCourseId(cId)
                setStudentCourseName(cName)
                setCurrentScreen("student-course")
              } else {
                handleNavigate(screen)
              }
            }}
            onLogout={handleLogout}
          />
        )

      case "student-course":
        return (
          <StudentCourse
            courseId={studentCourseId}
            courseName={studentCourseName}
            onSelectLesson={(id, name) => {
              setStudentLessonId(id)
              setStudentLessonName(name)
              setCurrentScreen("student-lesson")
            }}
            onBack={() => setCurrentScreen("student-dashboard")}
          />
        )

      case "student-lesson":
        return (
          <StudentLesson
            lessonId={studentLessonId}
            lessonName={studentLessonName}
            onSelectActivity={(id) => {
              setStudentActivityId(id)
              setCurrentScreen("student-activity")
            }}
            onBack={() => setCurrentScreen("student-course")}
          />
        )

      case "student-activity":
        return (
          <StudentActivity
            activityId={studentActivityId}
            onBack={() => setCurrentScreen("student-lesson")}
            onComplete={() => setCurrentScreen("student-lesson")}
            onVoiceActivity={() => setCurrentScreen("voice-activity")}
          />
        )

      case "voice-activity":
        return (
          <VoiceActivity
            activityId={studentActivityId}
            onBack={() => setCurrentScreen("student-lesson")}
            onComplete={() => setCurrentScreen("student-lesson")}
          />
        )

      case "initial-test":
        return (
          <InitialTest
            onComplete={() => setCurrentScreen("student-dashboard")}
          />
        )

      case "student-progress":
        return (
          <StudentProgress
            onBack={() => setCurrentScreen("student-dashboard")}
          />
        )

      case "student-calendar":
        return (
          <StudentCalendar
            onBack={() => setCurrentScreen("student-dashboard")}
          />
        )

      case "join-group":
        return (
          <JoinGroup
            onNavigate={handleNavigate}
          />
        )

      case "group-management":
        return (
          <GroupManagement
            onNavigate={handleNavigate}
          />
        )

      case "accessibility":
        return (
          <AccessibilitySettings
            onBack={() => {
              if (user?.role === "teacher") {
                setCurrentScreen("teacher-dashboard")
              } else {
                setCurrentScreen("student-dashboard")
              }
            }}
          />
        )

      default:
        return (
          <LoginScreen
            onSwitchToRegister={() => setCurrentScreen("register")}
            onLoginSuccess={handleLoginSuccess}
          />
        )
    }
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
