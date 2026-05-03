export type UserRole = 'admin' | 'manager' | 'user'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  is_active: boolean
  avatar_url?: string
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface Document {
  id: number
  title: string
  filename: string
  file_type: string
  file_size: number
  status: DocumentStatus
  summary?: string
  total_chunks: number
  owner_id: number
  created_at: string
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: number
  role: MessageRole
  content: string
  sources?: string
  created_at: string
}

export interface ChatSession {
  id: number
  title: string
  document_id?: number
  session_type: 'rag' | 'agent'
  created_at: string
}

export interface AdminStats {
  total_users: number
  total_documents: number
  total_chat_sessions: number
}

export interface SourceChunk {
  content: string
  chunk_index: number
  score: number
}
