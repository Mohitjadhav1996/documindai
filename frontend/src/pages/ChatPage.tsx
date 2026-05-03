import { useEffect, useRef, useState } from 'react'
import {
  Box, Typography, Card, TextField, IconButton, Button,
  List, ListItemButton, ListItemText, Divider, Select,
  MenuItem, FormControl, InputLabel, Chip, Avatar, Paper,
  CircularProgress,
} from '@mui/material'
import { Send, Add, Delete, Chat, Description } from '@mui/icons-material'
import { chatApi, documentsApi, BASE_URL } from '../services/api'
import { ChatMessage, ChatSession, Document } from '../types'
import { useSearchParams } from 'react-router-dom'
import MessageBubble from '../components/chat/MessageBubble'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [docs, setDocs] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('')
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingSources, setStreamingSources] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
    loadDocs()
  }, [])

  useEffect(() => {
    const sid = searchParams.get('session')
    if (sid && sessions.length) {
      const found = sessions.find((s) => s.id === Number(sid))
      if (found) selectSession(found)
    }
  }, [sessions, searchParams])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const loadSessions = async () => {
    try {
      const { data } = await chatApi.listSessions()
      setSessions(data.filter((s: ChatSession) => s.session_type === 'rag'))
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to load chat sessions')
    }
  }

  const loadDocs = async () => {
    try {
      const { data } = await documentsApi.list()
      setDocs(data.filter((d: Document) => d.status === 'ready'))
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to load documents')
    }
  }

  const selectSession = async (session: ChatSession) => {
    setActiveSession(session)
    setMessages([])
    const { data } = await chatApi.getMessages(session.id)
    setMessages(data)
  }

  const createSession = async () => {
    if (!selectedDocId) return toast.error('Select a document first')
    const { data } = await chatApi.createSession({ document_id: selectedDocId, session_type: 'rag' })
    setSessions((prev) => [data, ...prev])
    selectSession(data)
    setSelectedDocId('')
  }

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await chatApi.deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSession?.id === id) { setActiveSession(null); setMessages([]) }
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || streaming) return
    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, {
      id: Date.now(), role: 'user', content: userText,
      created_at: new Date().toISOString(),
    }])

    setStreaming(true)
    setStreamingContent('')
    setStreamingSources(undefined)

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${BASE_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: activeSession.id, message: userText }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let sources: string | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'sources') sources = parsed.data
            else if (parsed.type === 'token') { fullContent += parsed.data; setStreamingContent(fullContent) }
            else if (parsed.type === 'done') {
              setMessages((prev) => [...prev, {
                id: Date.now(), role: 'assistant', content: fullContent,
                sources, created_at: new Date().toISOString(),
              }])
              setStreamingContent('')
            }
          } catch {}
        }
      }
    } catch {
      toast.error('Stream error. Please try again.')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', gap: 2 }}>
      {/* Sessions sidebar */}
      <Card sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Box p={2}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>New Chat</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Select Document</InputLabel>
            <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value as number)} label="Select Document">
              {docs.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  <Typography variant="body2" noWrap>{d.title}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button fullWidth variant="contained" size="small" startIcon={<Add />} onClick={createSession}>
            Start Chat
          </Button>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense disablePadding sx={{ p: 1 }}>
            {sessions.map((s) => (
              <ListItemButton
                key={s.id} selected={activeSession?.id === s.id}
                onClick={() => selectSession(s)}
                sx={{ borderRadius: 2, mb: 0.5, pr: 1 }}
              >
                <Chat sx={{ fontSize: 14, mr: 1, color: 'text.secondary', flexShrink: 0 }} />
                <ListItemText
                  primary={s.title}
                  primaryTypographyProps={{ fontSize: 12, noWrap: true }}
                />
                <IconButton size="small" onClick={(e) => deleteSession(s.id, e)} sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Card>

      {/* Chat area */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeSession ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, color: 'text.secondary' }}>
            <Description sx={{ fontSize: 56, opacity: 0.2 }} />
            <Typography variant="h6" color="text.secondary">Select or start a chat session</Typography>
            <Typography variant="body2">Choose a document and click "Start Chat"</Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(108,99,255,0.1)' }}>
              <Typography variant="subtitle1" fontWeight={600}>{activeSession.title}</Typography>
              <Typography variant="caption" color="text.secondary">RAG-powered Q&A · Answers grounded in document content</Typography>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', pt: 6, color: 'text.secondary' }}>
                  <Typography variant="body2">Ask anything about this document!</Typography>
                </Box>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
              ))}
              {streaming && streamingContent && (
                <MessageBubble role="assistant" content={streamingContent} isStreaming />
              )}
              {streaming && !streamingContent && (
                <Box display="flex" gap={1} alignItems="center" ml={5}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">Thinking...</Typography>
                </Box>
              )}
              <div ref={bottomRef} />
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(108,99,255,0.1)' }}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth size="small" placeholder="Ask about the document..."
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  disabled={streaming} multiline maxRows={4}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <IconButton onClick={sendMessage} disabled={!input.trim() || streaming}
                  sx={{ background: 'linear-gradient(135deg,#6C63FF,#9D97FF)', color: '#fff', borderRadius: 2, width: 44, height: 44, '&:hover': { opacity: 0.9 }, '&.Mui-disabled': { opacity: 0.4 } }}>
                  <Send sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Box>
  )
}
