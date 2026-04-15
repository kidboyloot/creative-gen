import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Send, Loader2, Bot, User, Sparkles, Trash2, Copy, Check,
  FileText, Upload, X, File as FileIcon, Paperclip
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
  "What ad creatives convert best for dropshipping?",
  "Give me 5 headline ideas for a summer sale campaign",
  "How can I improve my product page conversion rate?",
  "What's the best strategy for scaling Facebook ads?",
  "Analyze my recent generations and suggest improvements",
  "Write me ad copy for a fitness product targeting young adults",
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

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await axios.post<{ reply: string }>('/chat', { messages: history })
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.data.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.response?.data?.detail || 'Please try again.'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
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

  return (
    <div
      className="flex flex-col h-full relative"
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
        <div className="absolute inset-0 z-50 bg-brand-500/10 border-2 border-dashed border-brand-500/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload size={40} className="mx-auto text-brand-400 mb-3" />
            <p className="text-lg font-semibold text-white">Drop file to upload</p>
            <p className="text-sm text-gray-400 mt-1">PDF, TXT, MD, CSV</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-surface-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Vendro Chat</h1>
            <p className="text-[11px] text-gray-500">Powered by Gemini 2.5 Flash — Free</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Knowledge base toggle */}
          <button
            onClick={() => setShowDocs(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
              showDocs || docs.length > 0
                ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                : 'border-white/[0.06] bg-white/[0.05] text-gray-400 hover:text-gray-300',
            )}
          >
            <FileText size={12} />
            Knowledge Base
            {docs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-500 text-[9px] text-white flex items-center justify-center font-bold">
                {docs.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Knowledge base panel */}
      {showDocs && (
        <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-300">
              Uploaded Documents
              <span className="text-gray-600 ml-1">— AI will use these as context</span>
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-[11px] font-medium transition-colors"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              Upload PDF / TXT
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
                <div key={doc.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <FileIcon size={12} className="text-brand-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-300 truncate max-w-[150px]">{doc.name}</span>
                  <span className="text-[9px] text-gray-600">{Math.round(doc.chars / 1000)}k</span>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-600">No documents yet. Upload PDFs, TXT, or CSV files to give the AI more context about your business.</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Bot size={28} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Hey {userName.split(' ')[0]}! 👋</h2>
            <p className="text-sm text-gray-500 mb-2 max-w-md">
              I'm your AI ecommerce strategist. Ask me anything about ads, products, copy, scaling, or your CreativeGen data.
            </p>
            <p className="text-xs text-gray-600 mb-6 max-w-md">
              Upload PDFs with your product info, competitor research, or brand guidelines — I'll use them as context.
            </p>

            {/* Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-brand-500/30 hover:bg-brand-500/5 text-xs text-gray-400 hover:text-gray-200 transition-all leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'user' ? 'bg-brand-500/20' : 'bg-purple-500/20',
              )}>
                {msg.role === 'user'
                  ? <User size={14} className="text-brand-400" />
                  : <Bot size={14} className="text-purple-400" />
                }
              </div>

              <div className={clsx(
                'group relative max-w-[75%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-brand-600/20 border border-brand-500/20'
                  : 'bg-white/[0.04] border border-white/[0.06]',
              )}>
                <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="absolute -right-2 top-2 p-1 rounded-md bg-white/[0.05] text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-purple-400" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="px-6 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20 max-w-3xl mx-auto">
            <Loader2 size={13} className="animate-spin text-brand-400" />
            <span className="text-xs text-brand-300">Uploading document...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-5 pt-2 flex-shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-gray-500 hover:text-brand-400 transition-all flex-shrink-0"
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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none transition-colors"
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
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !loading
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-white/[0.04] text-gray-600 cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-700 mt-2">
          Powered by Gemini 2.5 Flash — 100% free · {docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? 's' : ''} loaded` : 'Drop files or click 📎 to upload'}
        </p>
      </div>
    </div>
  )
}
