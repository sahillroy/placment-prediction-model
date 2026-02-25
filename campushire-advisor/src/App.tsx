import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Register from '@/pages/Register'
import Login from '@/pages/Login'
import ProfileWizard from '@/pages/ProfileWizard'
import Results from '@/pages/Results'
import WhatIf from '@/pages/WhatIf'
import { useAuth } from '@/hooks/useAuth'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfileWizard />
          </PrivateRoute>
        }
      />
      <Route
        path="/results/:id"
        element={
          <PrivateRoute>
            <Results />
          </PrivateRoute>
        }
      />
      <Route
        path="/whatif/:id"
        element={
          <PrivateRoute>
            <WhatIf />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
