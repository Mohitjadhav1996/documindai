import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0A0A0F' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
