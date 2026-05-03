import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, Button, Avatar, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material'
import { Add, Edit, Delete, People } from '@mui/icons-material'
import { usersApi } from '../services/api'
import { User, UserRole } from '../types'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const ROLE_COLOR: Record<string, string> = {
  admin: '#FF6584', manager: '#FFB547', user: '#4CAF82',
}

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as UserRole, is_active: true })

  const load = async () => {
    try {
      const { data } = await usersApi.list()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'user', is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editUser) {
        const payload: any = { name: form.name, email: form.email, role: form.role, is_active: form.is_active }
        const { data } = await usersApi.update(editUser.id, payload)
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)))
        toast.success('User updated')
      } else {
        const { data } = await usersApi.create(form)
        setUsers((prev) => [data, ...prev])
        toast.success('User created')
      }
      setDialogOpen(false)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error saving user')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await usersApi.delete(deleteId)
      setUsers((prev) => prev.filter((u) => u.id !== deleteId))
      toast.success('User deleted')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Delete failed')
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>User Management</Typography>
          <Typography color="text.secondary" mt={0.5}>Manage access and roles</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add User</Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(108,99,255,0.1)', fontWeight: 600, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' } }}>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ '& td': { borderColor: 'rgba(108,99,255,0.07)' }, '&:hover': { background: 'rgba(108,99,255,0.03)' } }}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 32, height: 32, background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role], fontSize: 13, fontWeight: 700 }}>
                        {u.name[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.role} size="small" sx={{
                      color: ROLE_COLOR[u.role], background: `${ROLE_COLOR[u.role]}18`,
                      border: `1px solid ${ROLE_COLOR[u.role]}33`, textTransform: 'capitalize', fontSize: 11,
                    }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={u.is_active ? 'Active' : 'Disabled'} size="small"
                      sx={{ color: u.is_active ? '#4CAF82' : '#888', background: u.is_active ? '#4CAF8218' : '#88888818', fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(u.created_at).format('MMM D, YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(u)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton size="small" color="error" disabled={u.id === me?.id}
                          onClick={() => setDeleteId(u.id)}>
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth size="small" />
          {!editUser && (
            <TextField label="Password" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth size="small" />
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} label="Role">
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
            label="Active"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Delete User?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the user and all their documents and chat history.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
