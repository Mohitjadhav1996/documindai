import { useState } from 'react'
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Divider, IconButton, Tooltip, Chip,
} from '@mui/material'
import {
  Dashboard, Description, Chat, SmartToy, People,
  AutoAwesome, ChevronLeft, ChevronRight, Logout, Settings,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const DRAWER_FULL = 240
const DRAWER_MINI = 64

const NAV = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['admin', 'manager', 'user'] },
  { label: 'Documents', icon: <Description />, path: '/documents', roles: ['admin', 'manager', 'user'] },
  { label: 'Chat (RAG)', icon: <Chat />, path: '/chat', roles: ['admin', 'manager', 'user'] },
  { label: 'AI Agent', icon: <SmartToy />, path: '/agent', roles: ['admin', 'manager', 'user'] },
  { label: 'Users', icon: <People />, path: '/users', roles: ['admin'] },
]

const ROLE_COLOR: Record<string, string> = {
  admin: '#FF6584', manager: '#FFB547', user: '#4CAF82',
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const width = collapsed ? DRAWER_MINI : DRAWER_FULL

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filtered = NAV.filter((n) => user && n.roles.includes(user.role))

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          background: '#0E0E16',
          borderRight: '1px solid rgba(108,99,255,0.12)',
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2, flexShrink: 0,
          background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AutoAwesome sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        {!collapsed && (
          <Typography variant="subtitle1" fontWeight={700} sx={{
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            whiteSpace: 'nowrap',
          }}>
            DocuMind AI
          </Typography>
        )}
        <Box sx={{ ml: 'auto' }}>
          <IconButton size="small" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      <Divider />

      {/* Nav */}
      <List sx={{ px: 1, pt: 1, flex: 1 }}>
        {filtered.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={active}
                sx={{ mb: 0.5, minHeight: 44, px: collapsed ? 1.5 : 2 }}
              >
                <ListItemIcon sx={{
                  minWidth: collapsed ? 'unset' : 40,
                  color: active ? 'primary.main' : 'text.secondary',
                }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          )
        })}
      </List>

      <Divider />

      {/* User */}
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        {!collapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ width: 36, height: 36, background: '#6C63FF', fontSize: 14 }}>
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
              <Chip
                label={user?.role} size="small"
                sx={{
                  height: 18, fontSize: 10, borderRadius: 1,
                  color: ROLE_COLOR[user?.role || 'user'],
                  background: `${ROLE_COLOR[user?.role || 'user']}18`,
                }}
              />
            </Box>
            <Tooltip title="Logout">
              <IconButton size="small" onClick={handleLogout}><Logout fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Logout" placement="right">
            <IconButton size="small" onClick={handleLogout} sx={{ mx: 'auto', display: 'flex' }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Drawer>
  )
}
