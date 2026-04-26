import { useState, useRef, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Mic, Loader2, Image as ImageIcon, Video, Music, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { StudioModelDropdown, StudioOptionDropdown } from '../components/StudioControls'

interface LipSyncModel {
  id: string
  label: string
  description: string
  supports: string[]
  resolutions?: string[]
}

type Mode = 'image' | 'video'

interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  done: number
  total: number
  assets: { id: string; url: string }[]
  errors: string[]
}

const FALLBACK_MODELS: LipSyncModel[] = [
  { id: 'sync-1.6', label: 'Sync Labs 1.6', description: 'High-quality lip sync.', supports: ['image', 'video'], resolutions: ['480p', '720p'] },
  { id: 'sync-2.0', label: 'Sync Labs 2.0', description: 'Latest sync model.', supports: ['image', 'video'], resolutions: ['480p', '720p', '1080p'] },
  { id: 'kling-lipsync', label: 'Kling Lip Sync', description: 'Animates a still portrait.', supports: ['image'], resolutions: ['720p'] },
]

export default function LipSyncPage() {
  const [mode, setMode] = useState<Mode>('image')
  const [imageId, setImageId] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [audioId, setAudioId] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [videoName, setVideoName] = useState<string | null>(null)
  const [audioName, setAudioName] = useState<string | null>(null)
  const [model, setModel] = useState('sync-1.6')
  const [resolution, setResolution] = useState('720p')
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<'image' | 'video' | 'audio' | null>(null)

  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)
  const audInputRef = useRef<HTMLInputElement>(null)

  // Fetch models with retry off — fall back to local list if backend isn't running yet
  const { data: fetchedModels } = useQuery<LipSyncModel[]>({
    queryKey: ['lipsync-models', mode],
    queryFn: () => axios.get<LipSyncModel[]>(`/lipsync/models?input_mode=${mode}`).then(r => r.data),
    retry: false,
  })

  // Use fetched if available, else fallback filtered by mode (memoized so refs stay stable)
  const models = useMemo<LipSyncModel[]>(() => {
    if (fetchedModels && fetchedModels.length > 0) return fetchedModels
    return FALLBACK_MODELS.filter(m => m.supports.includes(mode))
  }, [fetchedModels, mode])

  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.id === model)) {
      setModel(models[0].id)
    }
  }, [models, model])

  const selectedModel = useMemo(() => models.find(m => m.id === model), [models, model])
  const availableResolutions = useMemo(() => selectedModel?.resolutions || ['720p'], [selectedModel])

  // Keep resolution valid for selected model
  useEffect(() => {
    if (!availableResolutions.includes(resolution)) {
      setResolution(availableResolutions[0])
    }
  }, [availableResolutions, resolution])

  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ['lipsync-job', jobId],
    queryFn: () => axios.get<JobStatus>(`/lipsync/status/${jobId}`).then(r => r.data),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'done' || s === 'failed' ? false : 2000
    },
  })

  async function uploadFile(file: File, kind: 'image' | 'video' | 'audio') {
    setUploading(kind)
    const fd = new FormData()
    fd.append('file', file)
    try {
      let url: string, key: string
      if (kind === 'image') { url = '/upload'; key = 'image_id' }
      else if (kind === 'video') { url = '/lipsync/upload-video'; key = 'video_id' }
      else { url = '/lipsync/upload-audio'; key = 'audio_id' }

      const res = await axios.post<Record<string, string>>(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const id = res.data[key]
      if (kind === 'image') { setImageId(id); setImageName(file.name) }
      else if (kind === 'video') { setVideoId(id); setVideoName(file.name) }
      else { setAudioId(id); setAudioName(file.name) }
    } catch (e: any) {
      alert(`${kind} upload failed: ${e?.response?.data?.detail || e.message}`)
    } finally {
      setUploading(null)
    }
  }

  async function handleGenerate() {
    setError(null)
    const mediaId = mode === 'image' ? imageId : videoId
    if (!mediaId || !audioId) return
    setLoading(true)
    try {
      const res = await axios.post<{ job_id: string }>('/lipsync/generate', {
        media_id: mediaId,
        audio_id: audioId,
        input_mode: mode,
        model,
        resolution,
      })
      setJobId(res.data.job_id)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = !!audioId && (mode === 'image' ? !!imageId : !!videoId)
  const isRunning = loading || jobStatus?.status === 'running' || jobStatus?.status === 'pending'

  function switchMode(next: Mode) {
    setMode(next)
    if (next === 'image') { setVideoId(null); setVideoName(null) }
    else { setImageId(null); setImageName(null) }
  }

  function clearMedia() {
    if (mode === 'image') { setImageId(null); setImageName(null) }
    else { setVideoId(null); setVideoName(null) }
  }

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050505] relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
      {/* HERO */}
      <div className="flex flex-col items-center mb-10 md:mb-20 animate-fade-in-up">
        <div className="mb-10 relative group">
          <div className="absolute inset-0 bg-[#d9ff00]/20 blur-[100px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5 overflow-hidden">
            <Mic size={80} strokeWidth={1} className="text-[#d9ff00] opacity-20 absolute -right-4 -bottom-4" />
            <div className="w-16 h-16 bg-[#d9ff00]/10 rounded-2xl flex items-center justify-center border border-[#d9ff00]/20 shadow-studio-glow relative z-10">
              <Mic size={32} strokeWidth={1.5} className="text-[#d9ff00]" />
            </div>
            <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">🎙</div>
          </div>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-7xl font-black text-white tracking-widest uppercase mb-4 text-center px-4">Lip Sync</h1>
        <p className="text-[#a1a1aa] text-sm font-medium tracking-wide opacity-60">Animate portraits or sync lips to audio with AI</p>
      </div>

      {/* PROMPT BAR */}
      <div className="w-full max-w-4xl relative z-40 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-5 flex flex-col gap-3 md:gap-5 shadow-studio-3xl">

          {/* Mode toggle */}
          <div className="flex items-center gap-2 px-2 flex-wrap">
            <span className="text-[10px] text-[#52525b] font-black uppercase tracking-widest mr-2">Input</span>
            <button
              type="button"
              onClick={() => switchMode('image')}
              className={clsx(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all border',
                mode === 'image'
                  ? 'border-[#d9ff00] bg-[#d9ff00]/10 text-[#d9ff00]'
                  : 'border-white/10 text-[#52525b] hover:border-white/30 hover:text-white'
              )}
            >🖼 Portrait Image</button>
            <button
              type="button"
              onClick={() => switchMode('video')}
              className={clsx(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all border',
                mode === 'video'
                  ? 'border-[#d9ff00] bg-[#d9ff00]/10 text-[#d9ff00]'
                  : 'border-white/10 text-[#52525b] hover:border-white/30 hover:text-white'
              )}
            >🎬 Video</button>
          </div>

          {/* Uploads row */}
          <div className="flex items-start gap-3 px-2 flex-wrap">
            <UploadSquare
              Icon={mode === 'image' ? ImageIcon : Video}
              label={mode === 'image' ? 'IMAGE' : 'VIDEO'}
              accept={mode === 'image' ? 'image/*' : 'video/*'}
              ready={mode === 'image' ? !!imageId : !!videoId}
              uploading={uploading === (mode === 'image' ? 'image' : 'video')}
              fileName={mode === 'image' ? imageName : videoName}
              inputRef={mode === 'image' ? imgInputRef : vidInputRef}
              onFile={(f) => uploadFile(f, mode === 'image' ? 'image' : 'video')}
              onClear={clearMedia}
            />
            <UploadSquare
              Icon={Music}
              label="AUDIO"
              accept="audio/*"
              ready={!!audioId}
              uploading={uploading === 'audio'}
              fileName={audioName}
              inputRef={audInputRef}
              onFile={(f) => uploadFile(f, 'audio')}
              onClear={() => { setAudioId(null); setAudioName(null) }}
            />

            <div className="flex-1 self-center min-w-[180px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#52525b] mb-1.5">Status</p>
              <p className="text-xs text-white/80 leading-relaxed">
                {!imageId && !videoId && !audioId && 'Upload a portrait + audio to generate'}
                {(imageId || videoId) && !audioId && 'Now upload an audio track →'}
                {!imageId && !videoId && audioId && '← Now upload a portrait/video'}
                {canGenerate && <span className="text-[#d9ff00] font-bold">Ready to generate ✓</span>}
              </p>
            </div>
          </div>

          {/* Bottom row: model + resolution + GENERATE */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 md:gap-2.5 relative overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <StudioModelDropdown models={models} value={model} onChange={setModel} tooltip="Lip-sync model" />
              <StudioOptionDropdown
                iconNode={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><path d="M6 2L3 6v15a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" /></svg>}
                options={availableResolutions}
                value={resolution}
                onChange={setResolution}
                tooltip="Output resolution"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isRunning}
              className="bg-[#d9ff00] text-black px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-base hover:bg-white hover:shadow-studio-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isRunning ? (
                <><Loader2 size={16} className="animate-spin" /> Syncing…</>
              ) : (
                <>Generate ✨</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-xs font-bold text-red-400 mb-0.5 uppercase tracking-wider">Request failed</p>
            <p className="text-xs text-red-300/70 font-mono break-all">{error}</p>
          </div>
        )}
      </div>

      {/* RESULT */}
      {jobStatus && (
        <div className="w-full max-w-4xl mt-8 space-y-4 animate-fade-in-up">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#a1a1aa] uppercase text-[10px] tracking-widest font-bold">Status</span>
              <span className={clsx('text-xs uppercase font-bold tracking-wider', {
                'text-yellow-400': jobStatus.status === 'running' || jobStatus.status === 'pending',
                'text-[#d9ff00]': jobStatus.status === 'done',
                'text-red-400': jobStatus.status === 'failed',
              })}>{jobStatus.status}</span>
            </div>
            {jobStatus.errors?.length > 0 && (
              <div className="text-xs text-red-300/70 font-mono break-all space-y-1 mt-2">
                {jobStatus.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>

          {jobStatus.assets.map(a => (
            <div key={a.id} className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
              <video src={a.url} controls className="w-full" style={{ maxHeight: 480 }} />
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] text-[#52525b] uppercase tracking-wider">Lip-synced output</span>
                <a
                  href={a.url}
                  download="lipsync.mp4"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#d9ff00] hover:text-white transition-colors"
                >↓ Download</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface UploadSquareProps {
  Icon: LucideIcon
  label: string
  accept: string
  ready: boolean
  uploading: boolean
  fileName: string | null
  inputRef: React.RefObject<HTMLInputElement>
  onFile: (file: File) => void
  onClear: () => void
}

function UploadSquare({ Icon, label, accept, ready, uploading, fileName, inputRef, onFile, onClear }: UploadSquareProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => ready ? onClear() : inputRef.current?.click()}
        title={ready && fileName ? `${fileName} — click to clear` : `Upload ${label.toLowerCase()}`}
        className={clsx(
          'flex-shrink-0 w-14 h-14 rounded-xl border transition-all flex items-center justify-center relative overflow-hidden group',
          ready
            ? 'bg-[#d9ff00]/10 border-[#d9ff00]/60'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#d9ff00]/40'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {uploading
          ? <Loader2 size={18} className="animate-spin text-[#d9ff00]" />
          : ready
          ? <Check size={20} className="text-[#d9ff00]" />
          : <Icon size={18} strokeWidth={2} className="text-[#52525b] group-hover:text-[#d9ff00] transition-colors" />
        }
      </button>
      <span className={clsx('text-[9px] font-black uppercase tracking-wider', ready ? 'text-[#d9ff00]' : 'text-[#52525b]')}>
        {label}
      </span>
    </div>
  )
}
