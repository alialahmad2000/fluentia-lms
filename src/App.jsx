import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// ─── Placeholder Page ────────────────────────────────────────
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted">قريباً...</p>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-darkest flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="skeleton h-10 w-48 mx-auto" />
        <div className="skeleton h-4 w-64 mx-auto" />
        <div className="space-y-4 mt-10">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-12 w-3/4" />
        </div>
      </div>
    </div>
  )
}

// ─── Protected Route ─────────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

// ─── Role-Based Redirect ─────────────────────────────────────
function RoleRedirect() {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />

  switch (profile?.role) {
    case 'student':
      return <Navigate to="/student" replace />
    case 'trainer':
      return <Navigate to="/trainer" replace />
    case 'admin':
      return <Navigate to="/admin" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* Role-based redirect from root */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<PlaceholderPage title="تسجيل الدخول" />} />
        <Route path="/test" element={<PlaceholderPage title="اختبار تحديد المستوى" />} />

        {/* Student routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<PlaceholderPage title="لوحة الطالب" />} />
          <Route path="/student/assignments" element={<PlaceholderPage title="الواجبات" />} />
          <Route path="/student/schedule" element={<PlaceholderPage title="الجدول" />} />
          <Route path="/student/grades" element={<PlaceholderPage title="الدرجات" />} />
          <Route path="/student/writing" element={<PlaceholderPage title="الكتابة" />} />
          <Route path="/student/profile" element={<PlaceholderPage title="الملف الشخصي" />} />
        </Route>

        {/* Trainer routes */}
        <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
          <Route path="/trainer" element={<PlaceholderPage title="لوحة المدرب" />} />
          <Route path="/trainer/groups" element={<PlaceholderPage title="المجموعات" />} />
          <Route path="/trainer/assignments" element={<PlaceholderPage title="إدارة الواجبات" />} />
          <Route path="/trainer/students" element={<PlaceholderPage title="الطلاب" />} />
          <Route path="/trainer/schedule" element={<PlaceholderPage title="الجدول" />} />
          <Route path="/trainer/writing" element={<PlaceholderPage title="تصحيح الكتابة" />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<PlaceholderPage title="لوحة الإدارة" />} />
          <Route path="/admin/users" element={<PlaceholderPage title="إدارة المستخدمين" />} />
          <Route path="/admin/groups" element={<PlaceholderPage title="إدارة المجموعات" />} />
          <Route path="/admin/trainers" element={<PlaceholderPage title="إدارة المدربين" />} />
          <Route path="/admin/packages" element={<PlaceholderPage title="الباقات" />} />
          <Route path="/admin/reports" element={<PlaceholderPage title="التقارير" />} />
          <Route path="/admin/settings" element={<PlaceholderPage title="الإعدادات" />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
