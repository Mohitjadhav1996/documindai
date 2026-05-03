import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar,
  IconButton, Tooltip, LinearProgress, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Alert,
  Skeleton,
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import {
  CloudUpload, Delete, Chat, CheckCircle, Error,
  HourglassEmpty, Description, Refresh,
} from '@mui/icons-material'
import { documentsApi, chatApi } from '../services/api'
import { Document } from '../types'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const STATUS_CONFIG: Record<string, { color: string; icon: JSX.Element; label: string }> = {
  ready:      { color: '#4CAF82', icon: <CheckCircle sx={{ fontSize: 14 }} />, label: 'Ready' },
  processing: { color: '#FFB547', icon: <HourglassEmpty sx={{ fontSize: 14 }} />, label: 'Processing...' },
  pending:    { color: '#8888AA', icon: <HourglassEmpty sx={{ fontSize: 14 }} />, label: 'Pending' },
  failed:     { color: '#FF5252', icon: <Error sx={{ fontSize: 14 }} />, label: 'Failed' },
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const { data } = await documentsApi.list()
      setDocs(data)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e.response?.data?.detail || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      setUploading(true)
      try {
        await documentsApi.upload(formData)
        toast.success('Uploaded: ' + file.name)
        fetchDocs()
      } catch (e: any) {
        toast.error(e.response?.data?.detail || 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
  }, [fetchDocs])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: true,
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await documentsApi.delete(deleteId)
      setDocs((prev) => prev.filter((d) => d.id !== deleteId))
      toast.success('Document deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleteId(null)
    }
  }

  const handleChat = async (doc: Document) => {
    if (doc.status !== 'ready') return toast.error('Document is still processing')
    try {
      const { data } = await chatApi.createSession({ document_id: doc.id, session_type: 'rag' })
      navigate('/chat?session=' + data.id)
    } catch {
      toast.error('Could not start chat session')
    }
  }

  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>Documents</Typography>
          <Typography color="text.secondary" mt={0.5}>Upload and manage your knowledge base</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDocs}>Refresh</Button>
      </Box>

      {/* Dropzone */}
      <Card
        sx={{
          mb: 3,
          cursor: 'pointer',
          border: isDragActive ? '2px dashed #6C63FF' : '2px dashed rgba(108,99,255,0.25)',
          background: isDragActive ? 'rgba(108,99,255,0.08)' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': { border: '2px dashed #6C63FF', background: 'rgba(108,99,255,0.05)' },
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <CardContent sx={{ textAlign: 'center', py: 5 }}>
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
          <Typography variant="h6" fontWeight={600}>
            {isDragActive ? 'Drop your files here!' : 'Drag and drop files here'}
          </Typography>
          <Typography color="text.secondary" variant="body2" mt={1}>
            Supports PDF, DOCX, TXT, MD · Max 20MB per file
          </Typography>
          {uploading && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
        </CardContent>
      </Card>

      {/* Documents list */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton height={60} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Description sx={{ fontSize: 56, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No documents yet</Typography>
            <Typography variant="body2" color="text.secondary">Upload a PDF, DOCX, or TXT file above</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {docs.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
            const expanded = expandedId === doc.id
            return (
              <Card key={doc.id} sx={{ transition: 'all 0.2s' }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        background: 'rgba(108,99,255,0.15)',
                        color: 'primary.main',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {doc.file_type.toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={600} noWrap>{doc.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.filename} · {(doc.file_size / 1024).toFixed(1)} KB · {dayjs(doc.created_at).format('MMM D, YYYY')}
                        {doc.total_chunks > 0 && ' · ' + doc.total_chunks + ' chunks'}
                      </Typography>
                    </Box>

                    <Chip
                      icon={cfg.icon}
                      label={cfg.label}
                      size="small"
                      sx={{
                        color: cfg.color,
                        background: cfg.color + '18',
                        border: '1px solid ' + cfg.color + '33',
                        '& .MuiChip-icon': { color: 'inherit' },
                      }}
                    />

                    {doc.summary && (
                      <Tooltip title={expanded ? 'Hide summary' : 'View summary'}>
                        <IconButton size="small" onClick={() => setExpandedId(expanded ? null : doc.id)}>
                          <Description fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Chat with this document">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={doc.status !== 'ready'}
                          onClick={() => handleChat(doc)}
                        >
                          <Chat fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(doc.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {expanded && doc.summary && (
                    <Alert
                      severity="info"
                      sx={{ mt: 2, borderRadius: 2, fontSize: 13 }}
                      onClose={() => setExpandedId(null)}
                    >
                      <Typography variant="body2">{doc.summary}</Typography>
                    </Alert>
                  )}

                  {(doc.status === 'processing' || doc.status === 'pending') && (
                    <LinearProgress sx={{ mt: 1.5, borderRadius: 2, height: 3 }} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      {/* Delete dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Delete Document?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the document and all its AI embeddings. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
