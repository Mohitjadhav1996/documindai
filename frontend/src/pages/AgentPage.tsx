import { useRef, useState } from 'react'
import {
  Box, Typography, Card, TextField, IconButton,
  Chip, CircularProgress, Button, Alert,
} from '@mui/material'
import { Send, SmartToy, AutoAwesome, Science } from '@mui/icons-material'
import { BASE_URL } from '../services/api'
import MessageBubble from '../components/chat/MessageBubble'
import { ChatMessage } from '../types'
import toast from 'react-hot-toast'

const EXAMPLE_QUERIES = [
  'Search the web for the latest AI trends in 2025',
  'List my uploaded documents and summarize the key topics',
  'What are the main findings across all my documents?',
  'Research recent developments in LLMs and compare with my docs',
]

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [streamContent, setStreamContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

  const sendQuery = async (query?: string) => {
    const text = (query || input).trim()
    if (!text || streaming) return
    setInput('')
    setMessages((prev) => [...prev, {
      id: Date.now(), role: 'user', content: text,
      created_at: new Date().toISOString(),
    }])
    setStreaming(true)
    setStreamContent('')
    scrollBottom()

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${BASE_URL}/api/v1/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: text, session_id: sessionId }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Agent stream failed (${res.status})`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let newSessionId = sessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'session_id') {
              newSessionId = parsed.data
              setSessionId(parsed.data)
            } else if (parsed.type === 'token') {
              fullContent += parsed.data
              setStreamContent(fullContent)
              scrollBottom()
            } else if (parsed.type === 'done') {
              setMessages((prev) => [...prev, {
                id: Date.now(), role: 'assistant', content: fullContent,
                created_at: new Date().toISOString(),
              }])
              setStreamContent('')
            }
          } catch {}
        }
      }
    } catch {
      toast.error('Agent error. Please try again.')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <Box sx={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box>
        <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg,#FFB547,#FF6584)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SmartToy sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>AI Research Agent</Typography>
            <Typography variant="caption" color="text.secondary">
              Web search · Document analysis · Multi-step reasoning
            </Typography>
          </Box>
          {sessionId && (
            <Chip label={`Session #${sessionId}`} size="small"
              sx={{ ml: 'auto', background: 'rgba(255,181,71,0.1)', color: '#FFB547' }} />
          )}
        </Box>
        <Alert severity="info" icon={<Science />} sx={{ borderRadius: 2, mt: 1, fontSize: 13 }}>
          The agent can search the web, query your documents, and reason across multiple steps to answer complex questions.
        </Alert>
      </Box>

      {/* Messages area */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
                <AutoAwesome sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                <Typography variant="body1" fontWeight={500}>What would you like to research?</Typography>
                <Typography variant="body2" mt={0.5}>Try one of these examples or ask anything</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {EXAMPLE_QUERIES.map((q) => (
                  <Card key={q} onClick={() => sendQuery(q)} sx={{
                    cursor: 'pointer', p: 1.5, background: 'rgba(255,181,71,0.05)',
                    border: '1px solid rgba(255,181,71,0.15)',
                    '&:hover': { background: 'rgba(255,181,71,0.1)', borderColor: 'rgba(255,181,71,0.4)' },
                    transition: 'all 0.2s',
                  }}>
                    <Typography variant="caption" sx={{ lineHeight: 1.5 }}>{q}</Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {streaming && streamContent && (
            <MessageBubble role="assistant" content={streamContent} isStreaming />
          )}
          {streaming && !streamContent && (
            <Box display="flex" gap={1} alignItems="center" ml={5} mt={1}>
              <CircularProgress size={16} sx={{ color: '#FFB547' }} />
              <Typography variant="caption" color="text.secondary">Agent is thinking and using tools...</Typography>
            </Box>
          )}
          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,181,71,0.1)' }}>
          {messages.length > 0 && (
            <Button size="small" variant="text" sx={{ mb: 1, fontSize: 11 }}
              onClick={() => { setMessages([]); setSessionId(null); setStreamContent('') }}>
              Clear conversation
            </Button>
          )}
          <Box display="flex" gap={1}>
            <TextField
              fullWidth size="small"
              placeholder="Ask the agent to research, analyze, or reason across your documents..."
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery() } }}
              disabled={streaming} multiline maxRows={4}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <IconButton onClick={() => sendQuery()} disabled={!input.trim() || streaming}
              sx={{
                background: 'linear-gradient(135deg,#FFB547,#FF6584)', color: '#fff',
                borderRadius: 2, width: 44, height: 44,
                '&:hover': { opacity: 0.9 }, '&.Mui-disabled': { opacity: 0.4 },
              }}>
              <Send sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </Card>
    </Box>
  )
}
