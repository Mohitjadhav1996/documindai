import { Box, Avatar, Typography, Paper, Chip, Collapse, IconButton } from '@mui/material'
import { SmartToy, Person, ExpandMore, ExpandLess } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { SourceChunk } from '../../types'

interface Props {
  role: 'user' | 'assistant'
  content: string
  sources?: string
  isStreaming?: boolean
}

export default function MessageBubble({ role, content, sources, isStreaming }: Props) {
  const isUser = role === 'user'
  const [showSources, setShowSources] = useState(false)

  let parsedSources: SourceChunk[] = []
  if (sources) {
    try { parsedSources = JSON.parse(sources) } catch {}
  }

  return (
    <Box sx={{
      display: 'flex', gap: 2, alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
      mb: 2,
    }}>
      <Avatar sx={{
        width: 32, height: 32, flexShrink: 0,
        background: isUser ? 'rgba(108,99,255,0.2)' : 'linear-gradient(135deg,#6C63FF,#FF6584)',
        color: isUser ? 'primary.main' : '#fff',
      }}>
        {isUser ? <Person sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
      </Avatar>

      <Box sx={{ maxWidth: '80%', minWidth: 0 }}>
        <Paper sx={{
          p: 2, borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.04)',
          border: isUser ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}>
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{content}</Typography>
          ) : (
            <Box sx={{
              '& p': { margin: '0 0 8px', lineHeight: 1.7, fontSize: 14 },
              '& p:last-child': { marginBottom: 0 },
              '& code': { background: 'rgba(108,99,255,0.2)', px: 0.5, py: 0.2, borderRadius: 1, fontSize: 13, fontFamily: 'monospace' },
              '& pre': { background: 'rgba(0,0,0,0.4)', p: 2, borderRadius: 2, overflow: 'auto', '& code': { background: 'none', p: 0 } },
              '& ul, & ol': { pl: 2.5, mb: 1 },
              '& li': { mb: 0.5, fontSize: 14 },
              '& h1,& h2,& h3': { mt: 1.5, mb: 0.5 },
              '& strong': { color: 'primary.light' },
              '& blockquote': { borderLeft: '3px solid rgba(108,99,255,0.5)', pl: 1.5, ml: 0, color: 'text.secondary' },
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              {isStreaming && (
                <Box component="span" sx={{
                  display: 'inline-block', width: 8, height: 16, background: 'primary.main',
                  ml: 0.5, animation: 'blink 1s step-start infinite',
                  '@keyframes blink': { '50%': { opacity: 0 } },
                }} />
              )}
            </Box>
          )}
        </Paper>

        {/* Sources */}
        {parsedSources.length > 0 && (
          <Box mt={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={`${parsedSources.length} source${parsedSources.length > 1 ? 's' : ''}`}
                size="small"
                sx={{ fontSize: 11, height: 22, background: 'rgba(108,99,255,0.1)', color: 'primary.light', cursor: 'pointer' }}
                onClick={() => setShowSources(!showSources)}
              />
              <IconButton size="small" onClick={() => setShowSources(!showSources)} sx={{ p: 0.3 }}>
                {showSources ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
              </IconButton>
            </Box>
            <Collapse in={showSources}>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {parsedSources.map((src, i) => (
                  <Paper key={i} sx={{
                    p: 1.5, background: 'rgba(108,99,255,0.05)',
                    border: '1px solid rgba(108,99,255,0.15)', borderRadius: 2,
                  }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="primary.light" fontWeight={600}>
                        Chunk #{src.chunk_index}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(src.score * 100).toFixed(0)}% match
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                      {src.content}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  )
}
