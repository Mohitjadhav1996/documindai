import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { theme } from './theme'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import AgentPage from './pages/AgentPage'
import UsersPage from './pages/UsersPage'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A26',
            color: '#F0F0FF',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 12,
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#4CAF82', secondary: '#0A0A0F' } },
          error: { iconTheme: { primary: '#FF5252', secondary: '#0A0A0F' } },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/users" element={
                <ProtectedRoute allowedRoles={['admin']} />
              }>
                <Route index element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
