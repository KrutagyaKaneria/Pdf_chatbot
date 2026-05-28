import React from 'react'
import {Navigate, Route, Routes} from 'react-router-dom'
import WorkspacePage from './pages/WorkspacePage'
import LandingPage from './pages/LandingPage'
import ArchitecturePage from './pages/ArchitecturePage'
import {ProtectedRoute} from './auth/ProtectedRoute'
import {LoginPage} from './auth/LoginPage'
import {SignupPage} from './auth/SignupPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
