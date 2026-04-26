import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Send, Loader2, Bot, User, Trash2, Copy, Check,
  FileText, Upload, X, File as FileIcon, Paperclip,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface KBDoc {
  id: string
  name: string
  chars: number
}

const SUGGESTIONS = [
  'What ad creatives convert best for dropshipping?',
  'Give me 5 headline ideas for a summer sale campaign',
  'How can I improve my product page conversion rate?',
  "What's the best strategy for scaling Facebook ads?",
  'Analyze my recent generations and suggest improvements',
  'Write me ad copy for a fitness product targeting young adults',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userName = useAuthStore(s => s.user?.name) || 'User'
  const queryClient = useQueryClient()

  const { data: docs = [] } = useQuery<KBDoc[]>({
    queryKey: ['chat-docs'],
    queryFn: () => axios.get<KBDoc[]>('/chat/docs').then(r => r.data),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const uploadDoc = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await axios.post('/chat/upload-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['chat-docs'] })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteDoc = async (id: string) => {
    await axios.delete(`/chat/docs/${id}`)
    queryClient.invalidateQueries({ queryKey: ['chat-docs'] })
  }

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await axios.post<{ reply: string }>('/chat', { messages: history })
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: res.data.reply, timestamp: new Date() }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.response?.data?.detail || 'Please try again.'}`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className="flex flex-col h-full relative bg-studio-app-bg"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) uploadDoc(file)
      }}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 bg-[#d9ff00]/10 backdrop-blur-md border-4 border-dashed border-[#d9ff00]/50 flex items-center justify-center">
          <div className="text-center">
            <Upload size={40} className="mx-auto text-[#d9ff00] mb-3" />
            <p className="text-lg font-black uppercase tracking-widest text-white">Drop file to upload</p>
            <p className="text-sm text-studio-muted mt-1">PDF, TXT, MD, CSV</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-white/[0.03] flex items-center justify-between px-6 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#d9ff00] flex items-center justify-center">
            <Bot size={16} className="text-black" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">Agent Studio</span>
            <p className="text-[10px] text-studio-muted uppercase tracking-widest">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors uppercase tracking-wider',
              showDocs || docs.length > 0
                ? 'border-[#d9ff00]/50 bg-[#d9ff00]/10 text-[#d9ff00]'
                : 'border-white/10 bg-white/5 text-studio-secondary hover:text-white',
            )}
          >
            <FileText size={12} />
            Knowledge Base
            {docs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#d9ff00] text-[9px] text-black flex items-center justify-center font-black">
                {docs.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-studio-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KB panel */}
      {showDocs && (
        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-studio-secondary">
              Uploaded Documents
              <span className="text-studio-muted ml-2 normal-case tracking-normal font-medium">— AI uses these as context</span>
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#d9ff00]/20 hover:bg-[#d9ff00]/30 text-[#d9ff00] text-[11px] font-bold transition-colors uppercase tracking-wider"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadDoc(e.target.files[0])}
            />
          </div>

          {docs.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <FileIcon size={12} className="text-[#d9ff00] flex-shrink-0" />
                  <span className="text-[11px] text-white truncate max-w-[150px]">{doc.name}</span>
                  <span className="text-[9px] text-studio-muted">{Math.round(doc.chars / 1000)}k</span>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="text-studio-muted hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-studio-muted">No documents yet. Upload PDFs, TXT, or CSV files to add context.</p>
          )}
        </div>
      )}

      {/* Empty state — hero */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in-up overflow-y-auto custom-scrollbar">
          <div className="mb-10 relative group">
            <div className="studio-hero-glow" />
            <div className="studio-hero-icon">
              <div className="studio-hero-inner">
                <Bot size={32} />
              </div>
              <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">💬</div>
            </div>
          </div>
          <h1 className="studio-hero-title">Agent Studio</h1>
          <p className="text-studio-secondary text-sm font-medium tracking-wide opacity-60 mb-2">
            Hey {userName.split(' ')[0]} — your AI ecommerce strategist
          </p>
          <p className="text-xs text-studio-muted mb-8 max-w-md text-center">
            Ask anything about ads, products, copy, scaling, or your CreativeGen data. Upload PDFs, TXT, or CSV to give context.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-left px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#d9ff00]/30 hover:bg-[#d9ff00]/5 text-xs text-studio-secondary hover:text-white transition-all leading-relaxed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'user' ? 'bg-white/10' : 'bg-[#d9ff00]',
              )}>
                {msg.role === 'user'
                  ? <User size={14} className="text-white" />
                  : <Bot size={14} className="text-black" />
                }
              </div>

              <div className={clsx(
                'group relative max-w-[75%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-[#d9ff00]/10 border border-[#d9ff00]/20'
                  : 'bg-studio-card-bg border border-white/10',
              )}>
                <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                <p className="text-[10px] text-studio-muted mt-1.5">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="absolute -right-2 top-2 p-1 rounded-md bg-white/10 text-studio-muted hover:text-[#d9ff00] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-[#d9ff00]" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#d9ff00] flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-black" />
              </div>
              <div className="bg-studio-card-bg border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#d9ff00] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#d9ff00] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#d9ff00] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {uploading && (
        <div className="px-6 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#d9ff00]/10 border border-[#d9ff00]/20 max-w-3xl mx-auto">
            <Loader2 size={13} className="animate-spin text-[#d9ff00]" />
            <span className="text-xs text-[#d9ff00] font-bold uppercase tracking-wider">Uploading…</span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-6 pb-5 pt-2 flex-shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 hover:border-[#d9ff00]/40 text-studio-muted hover:text-[#d9ff00] transition-all flex-shrink-0"
            title="Upload PDF, TXT, CSV"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about ecommerce, ads, strategy..."
              rows={1}
              className="w-full bg-studio-card-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-studio-muted focus:outline-none focus:border-[#d9ff00]/50 resize-none transition-colors"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 font-black',
              input.trim() && !loading
                ? 'bg-[#d9ff00] text-black hover:bg-white hover:shadow-studio-glow'
                : 'bg-white/5 text-studio-muted cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-[10px] text-studio-muted mt-2 uppercase tracking-widest">
          Powered by Gemini 2.5 Flash · {docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? 's' : ''} loaded` : 'Drop files to upload'}
        </p>
      </div>
    </div>
  )
}
