import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './auth'
import AdminLayout from './layouts/AdminLayout'

// 页面级懒加载：每个路由独立分包，减小首屏体积
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BanksPage = lazy(() => import('./pages/BanksPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const QuestionsPage = lazy(() => import('./pages/QuestionsPage'))
const ExamsPage = lazy(() => import('./pages/ExamsPage'))
const ExamRecordsPage = lazy(() => import('./pages/ExamRecordsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 96 }}>
      <Spin description="加载中…" size="large" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="banks" element={<BanksPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exam-records" element={<ExamRecordsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
