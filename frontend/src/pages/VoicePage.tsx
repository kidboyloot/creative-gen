import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Mic, Loader2, Download, Play, Pause, Volume2, RotateCcw,
  Wand2, Clock, Headphones, Radio, Waves, Settings2, Sparkles, Upload, Dna, Lock
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

interface Voice {
  id: string
  name: string
  lang: string
  gender: string
  tags?: string[]
}

const CATEGORIES = [
  { id: 'all', label: 'All Voices', icon: Headphones },
  { id: 'portuguese', label: 'Portuguese', icon: Radio },
  { id: 'english', label: 'English', icon: Radio },
  { id: 'european', label: 'European', icon: Radio },
  { id: 'other', label: 'Other', icon: Radio },
]

const VOICE_CATEGORIES: Record<string, (v: Voice) => boolean> = {
  all: () => true,
  portuguese: v => v.lang.includes('PT'),
  english: v => v.lang.includes('EN'),
  european: v => ['ES', 'FR', 'DE', 'IT', 'NL'].some(c => v.lang.includes(c)),
  other: v => !['PT', 'EN', 'ES', 'FR', 'DE', 'IT', 'NL'].some(c => v.lang.includes(c)),
}

const USE_CASES = [
  { label: 'Ad Voiceover', prompt: 'Read this as a professional advertisement voiceover, energetic and persuasive' },
  { label: 'Product Demo', prompt: 'Read this as a calm product demonstration narration' },
  { label: 'Story / UGC', prompt: 'Read this as a casual authentic story, like a real person sharing' },
  { label: 'Podcast', prompt: 'Read this as a podcast host, conversational and engaging' },
]

type Mode = 'preset' | 'clone'

export default function VoicePage() {
  const [mode, setMode] = useState<Mode>('preset')
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('en-US-AvaMultilingualNeural')
  const [rate, setRate] = useState(50)
  const [pitch, setPitch] = useState(50)
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [searchVoice, setSearchVoice] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  // Clone mode
  const [cloneFile, setCloneFile] = useState<File | null>(null)
  const [clonePreview, setClonePreview] = useState<string | null>(null)
  const cloneInputRef = useRef<HTMLInputElement>(null)
  const userPlan = useAuthStore(s => s.user?.plan) || 'free'
  const canClone = userPlan === 'pro' || userPlan === 'enterprise'
  const navigate = useNavigate()

  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ['voices'],
    queryFn: () => axios.get<Voice[]>('/voice/voices').then(r => r.data),
    staleTime: Infinity,
  })

  const filteredVoices = voices
    .filter(VOICE_CATEGORIES[category] || (() => true))
    .filter(v => !searchVoice || v.name.toLowerCase().includes(searchVoice.toLowerCase()) || v.lang.toLowerCase().includes(searchVoice.toLowerCase()))

  const selectedVoiceInfo = voices.find(v => v.id === selectedVoice)

  // Map slider 0-100 to rate/pitch strings
  const rateStr = `${rate - 50 >= 0 ? '+' : ''}${rate - 50}%`
  const pitchStr = `${pitch - 50 >= 0 ? '+' : ''}${(pitch - 50) * 0.4}Hz`

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMeta) }
  }, [audioUrl])

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setAudioUrl(null)

    try {
      if (mode === 'clone' && cloneFile) {
        // Voice cloning via F5-TTS
        const formData = new FormData()
        formData.append('audio', cloneFile)
        formData.append('text', text)
        const res = await axios.post<{ url: string }>(`/voice/clone?text=${encodeURIComponent(text)}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setAudioUrl(res.data.url)
      } else {
        // Edge TTS preset voice
        const res = await axios.post<{ url: string }>('/voice/generate', {
          text,
          voice: selectedVoice,
          rate: rateStr,
          pitch: pitchStr,
        })
        setAudioUrl(res.data.url)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Voice generation failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
  }

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const estDuration = Math.ceil(wordCount / 2.5) // ~150 wpm

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Voice selector ── */}
      <div className="w-[280px] flex-shrink-0 bg-surface-800 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-3">
            <button onClick={() => setMode('preset')}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                mode === 'preset' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-300')}>
              <Headphones size={12} /> Voices
            </button>
            <button onClick={() => canClone ? setMode('clone') : navigate('/pricing')}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                !canClone ? 'text-gray-600 cursor-pointer' :
                mode === 'clone' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300')}>
              {canClone ? <Dna size={12} /> : <Lock size={10} />}
              Clone
              {!canClone && <span className="text-[8px] px-1 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">PRO</span>}
            </button>
          </div>

          {mode === 'preset' && (
            <>
              <input value={searchVoice} onChange={e => setSearchVoice(e.target.value)} placeholder="Search voices..."
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50" />
              <div className="flex gap-1 mt-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={clsx('px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                      category === c.id ? 'bg-brand-600 text-white' : 'bg-white/[0.04] text-gray-500 hover:text-gray-300')}>
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'clone' && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 leading-relaxed">Upload a voice sample (5-30 seconds) and AI will clone it to speak any text. Powered by F5-TTS.</p>
              {cloneFile ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Dna size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{cloneFile.name}</p>
                    <p className="text-[10px] text-gray-500">{(cloneFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => { setCloneFile(null); setClonePreview(null) }}
                    className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                </div>
              ) : (
                <button onClick={() => cloneInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.03] cursor-pointer transition-colors">
                  <Upload size={20} className="text-purple-400" />
                  <span className="text-xs text-gray-400">Upload voice sample</span>
                  <span className="text-[10px] text-gray-600">WAV, MP3 · 5-30 seconds</span>
                </button>
              )}
              <input ref={cloneInputRef} type="file" accept="audio/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { setCloneFile(e.target.files[0]); setClonePreview(URL.createObjectURL(e.target.files[0])) } }} />
              {clonePreview && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Preview reference:</p>
                  <audio src={clonePreview} controls className="w-full h-8" style={{ filter: 'invert(0.8)' }} />
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <span className="text-[10px] text-brand-400">Uses credits — same as generating an image</span>
              </div>
            </div>
          )}
        </div>

        {/* Voice list (preset mode only) */}
        {mode === 'preset' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredVoices.map(v => {
              const isHD = v.tags?.includes('HD')
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all',
                    selectedVoice === v.id
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : 'hover:bg-white/[0.04] border border-transparent',
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    v.gender === 'Female'
                      ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20'
                      : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
                  )}>
                    <Mic size={16} className={v.gender === 'Female' ? 'text-pink-400' : 'text-blue-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">{v.name}</p>
                      {isHD && <span className="text-[8px] px-1 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">HD</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{v.lang} · {v.gender}</p>
                    {v.tags && (
                      <div className="flex gap-1 mt-1">
                        {v.tags.filter(t => t !== 'HD').slice(0, 2).map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-gray-500">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedVoice === v.id && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Clone info (clone mode) */}
        {mode === 'clone' && (
          <div className="flex-1 p-4 flex flex-col justify-end">
            <div className="space-y-2 text-[11px] text-gray-600">
              <p>🎯 Best results with clear speech, no background noise</p>
              <p>⏱ 10-20 second clips work best</p>
              <p>🗣 One speaker only — no music or effects</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Center: Editor ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-surface-800/30">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              selectedVoiceInfo?.gender === 'Female'
                ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20'
                : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
            )}>
              <Waves size={14} className={selectedVoiceInfo?.gender === 'Female' ? 'text-pink-400' : 'text-blue-400'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{selectedVoiceInfo?.name || 'Select a voice'}</p>
              <p className="text-[10px] text-gray-500">{selectedVoiceInfo?.lang} · {selectedVoiceInfo?.gender}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>{wordCount} words</span>
            <span>~{estDuration}s</span>
            <span className="flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Free</span>
          </div>
        </div>

        {/* Text area */}
        <div className="flex-1 overflow-y-auto p-6">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={5000}
            placeholder="Start typing or paste your script here...

Tips for best results:
• Use punctuation for natural pauses
• Add ... for longer pauses
• Write like you speak for a natural feel
• Keep sentences short for ad voiceovers"
            className="w-full h-full min-h-[300px] bg-transparent text-base text-white placeholder-gray-700 focus:outline-none resize-none leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        {/* Use case chips */}
        <div className="px-6 pb-2 flex gap-2">
          {USE_CASES.map(uc => (
            <button key={uc.label} onClick={() => setText(prev => prev || uc.prompt)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-gray-500 hover:text-white hover:border-brand-500/30 transition-all">
              {uc.label}
            </button>
          ))}
        </div>

        {/* Controls bar */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-surface-800/50">
          <div className="flex items-center gap-6">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <Settings2 size={13} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 w-10">Speed</span>
              <input type="range" min={0} max={100} value={rate} onChange={e => setRate(Number(e.target.value))}
                className="w-24 accent-brand-500 h-1" />
              <span className="text-[10px] text-gray-400 w-8">{rate < 50 ? `${50-rate}% ↓` : rate > 50 ? `${rate-50}% ↑` : '0'}</span>
            </div>

            {/* Pitch */}
            <div className="flex items-center gap-2">
              <Waves size={13} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 w-10">Pitch</span>
              <input type="range" min={0} max={100} value={pitch} onChange={e => setPitch(Number(e.target.value))}
                className="w-24 accent-brand-500 h-1" />
              <span className="text-[10px] text-gray-400 w-8">{pitch < 50 ? `${50-pitch} ↓` : pitch > 50 ? `${pitch-50} ↑` : '0'}</span>
            </div>

            <div className="flex-1" />

            <span className="text-[10px] text-gray-600">{text.length}/5,000</span>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={!text.trim() || loading}
              className={clsx('flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all',
                text.trim() && !loading
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate</>}
            </button>
          </div>
        </div>

        {/* Player bar — shows when audio is ready */}
        {audioUrl && (
          <div className="px-6 py-4 border-t border-brand-500/20 bg-gradient-to-r from-brand-500/5 via-purple-500/5 to-brand-500/5">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
            <div className="flex items-center gap-4">
              {/* Play button */}
              <button onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition-colors shadow-lg shadow-brand-500/30 flex-shrink-0">
                {isPlaying
                  ? <Pause size={18} className="text-white" />
                  : <Play size={18} className="text-white ml-0.5" />
                }
              </button>

              {/* Waveform / progress */}
              <div className="flex-1 space-y-1.5">
                <div className="relative h-8 cursor-pointer" onClick={seekTo}>
                  {/* Fake waveform bars */}
                  <div className="absolute inset-0 flex items-center gap-[2px]">
                    {Array.from({ length: 80 }).map((_, i) => {
                      const h = 20 + Math.sin(i * 0.7) * 40 + Math.random() * 20
                      const progress = duration ? currentTime / duration : 0
                      const barProgress = i / 80
                      return (
                        <div key={i} className="flex-1 flex items-center justify-center">
                          <div
                            className={clsx('w-full rounded-full transition-colors',
                              barProgress <= progress ? 'bg-brand-500' : 'bg-white/[0.08]')}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={audioUrl} download="voiceover.mp3"
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs rounded-lg transition-colors font-medium">
                  <Download size={13} /> MP3
                </a>
                <button onClick={() => { setAudioUrl(null); setIsPlaying(false); setCurrentTime(0); setDuration(0) }}
                  className="p-2 text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-lg transition-colors">
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">{error}</div>
        )}
      </div>
    </div>
  )
}
