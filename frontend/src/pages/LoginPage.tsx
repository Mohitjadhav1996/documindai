import { useState } from 'react'
import {
  Box, Button, TextField, Typography, Paper, InputAdornment,
  IconButton, Alert, CircularProgress, Divider, Chip,
} from '@mui/material'
import {
  Email, Lock, Visibility, VisibilityOff, AutoAwesome,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const DEMO_USERS = [
  { label: 'Admin', email: 'admin@documind.ai', password: 'Admin@123', color: '#FF6584' },
  { label: 'Manager', email: 'manager@documind.ai', password: 'Manager@123', color: '#FFB547' },
  { label: 'User', email: 'user@documind.ai', password: 'User@123', color: '#4CAF82' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (user: typeof DEMO_USERS[0]) => {
    setEmail(user.email)
    setPassword(user.password)
    setError('')
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,101,132,0.1) 0%, transparent 60%), #0A0A0F',
      p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3,
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2, boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
          }}>
            <AutoAwesome sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            DocuMind AI
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Your intelligent document assistant
          </Typography>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>Sign in to your account</Typography>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email address" type="email" fullWidth required
              value={email} onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>
              }}
            />
            <TextField
              label="Password" fullWidth required
              type={showPw ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw(!showPw)} size="small">
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}
              sx={{ py: 1.5, fontSize: 16 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">Demo accounts</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {DEMO_USERS.map((u) => (
              <Chip
                key={u.label} label={u.label} clickable onClick={() => fillDemo(u)}
                sx={{
                  flex: 1, borderRadius: 2, border: `1px solid ${u.color}44`,
                  color: u.color, background: `${u.color}11`,
                  '&:hover': { background: `${u.color}22` },
                }}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
