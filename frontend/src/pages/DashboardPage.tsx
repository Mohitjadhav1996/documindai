import { useEffect, useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, LinearProgress,
  Avatar, Chip, Skeleton,
} from '@mui/material'
import {
  Description, Chat, SmartToy, People, TrendingUp,
  CheckCircle, HourglassEmpty, Error,
} from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'
import { documentsApi, usersApi } from '../services/api'
import { Document, AdminStats } from '../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const STATUS_COLOR: Record<string, string> = {
  ready: '#4CAF82', processing: '#FFB547', pending: '#8888AA', failed: '#FF5252',
}
const STATUS_ICON: Record<string, JSX.Element> = {
  ready: <CheckCircle sx={{ fontSize: 14 }} />,
  processing: <HourglassEmpty sx={{ fontSize: 14 }} />,
  pending: <HourglassEmpty sx={{ fontSize: 14 }} />,
  failed: <Error sx={{ fontSize: 14 }} />,
}

function StatCard({ icon, label, value, color, loading }: any) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '20px !important' }}>
        <Avatar sx={{ background: `${color}22`, color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {loading
            ? <Skeleton width={60} height={32} />
            : <Typography variant="h5" fontWeight={700}>{value}</Typography>
          }
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [docs, setDocs] = useState<Document[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await documentsApi.list()
        setDocs(data)
        if (user?.role === 'admin') {
          const { data: s } = await usersApi.stats()
          setStats(s)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const readyDocs = docs.filter((d) => d.status === 'ready').length
  const processingDocs = docs.filter((d) => d.status === 'processing').length

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          Here's what's happening with your documents today.
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<Description />} label="Total Documents" value={docs.length}
            color="#6C63FF" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircle />} label="Ready to Chat" value={readyDocs}
            color="#4CAF82" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<HourglassEmpty />} label="Processing" value={processingDocs}
            color="#FFB547" loading={loading} />
        </Grid>
        {user?.role === 'admin' ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<People />} label="Total Users" value={stats?.total_users ?? '—'}
              color="#FF6584" loading={loading} />
          </Grid>
        ) : (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<Chat />} label="Chat Sessions" value={stats?.total_chat_sessions ?? '—'}
              color="#FF6584" loading={loading} />
          </Grid>
        )}
      </Grid>

      {/* Recent documents */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>Recent Documents</Typography>
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)
          ) : docs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Description sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography>No documents yet. Upload one to get started!</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {docs.slice(0, 6).map((doc) => (
                <Box key={doc.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 1.5, borderRadius: 2,
                  border: '1px solid rgba(108,99,255,0.08)',
                  '&:hover': { background: 'rgba(108,99,255,0.05)' },
                }}>
                  <Avatar sx={{ background: 'rgba(108,99,255,0.15)', color: 'primary.main', width: 36, height: 36, fontSize: 12, fontWeight: 700 }}>
                    {doc.file_type.toUpperCase()}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={500} noWrap>{doc.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(doc.file_size / 1024).toFixed(1)} KB · {dayjs(doc.created_at).fromNow()}
                    </Typography>
                  </Box>
                  <Chip
                    icon={STATUS_ICON[doc.status]}
                    label={doc.status}
                    size="small"
                    sx={{
                      color: STATUS_COLOR[doc.status],
                      background: `${STATUS_COLOR[doc.status]}18`,
                      border: `1px solid ${STATUS_COLOR[doc.status]}33`,
                      textTransform: 'capitalize',
                      '& .MuiChip-icon': { color: 'inherit' },
                    }}
                  />
                  {doc.total_chunks > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
                      {doc.total_chunks} chunks
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Grid container spacing={2} mt={1}>
        {[
          { label: 'Upload Document', desc: 'Add PDFs, DOCX or TXT files', icon: <Description />, color: '#6C63FF', path: '/documents' },
          { label: 'Start RAG Chat', desc: 'Ask questions about your docs', icon: <Chat />, color: '#4CAF82', path: '/chat' },
          { label: 'Use AI Agent', desc: 'Research with web + docs', icon: <SmartToy />, color: '#FFB547', path: '/agent' },
        ].map((action) => (
          <Grid item xs={12} md={4} key={action.label}>
            <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)' }, transition: 'transform 0.2s' }}
              onClick={() => window.location.href = action.path}>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ background: `${action.color}22`, color: action.color }}>
                  {action.icon}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={600}>{action.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{action.desc}</Typography>
                </Box>
                <TrendingUp sx={{ ml: 'auto', color: action.color, opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
