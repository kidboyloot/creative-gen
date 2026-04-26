import { useState } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Video, Loader2, Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import { useVideoStore } from '../store/videoStore'
import { useVideoStatus } from '../hooks/useVideoStatus'
import { useAuthStore } from '../store/authStore'
import {
  StudioControlButton, StudioModelDropdown, StudioOptionDropdown,
  StudioImageThumb,
} from '../components/StudioControls'
import StudioResultCanvas from '../components/StudioResultCanvas'

interface VideoModelOption {
  id: string
  label: string
  description: string
  supports_prompt: boolean
}

const RESOLUTIONS = ['360p', '480p', '540p', '720p', '1080p']
const ASPECT_RATIOS = ['auto', '9:16', '16:9', '1:1', '4:3', '3:4', '21:9', '2:3', '3:2', '5:4', '4:5', '5:6', '6:5', '1:2', '2:1', '9:21']
const DURATIONS = ['auto', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18', '20', '25', '30']

export default function VideoPage() {
  const {
    imageId, imagePreview,
    prompt, model, resolution, duration, aspectRatio, generateAudio, count,
    setImageId, setPrompt, setModel, setResolution, setDuration, setAspectRatio,
    setGenerateAudio, setCount, setJobId, jobId,
  } = useVideoStore()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const { data: jobStatus } = useVideoStatus(jobId)
  const { data: models = [] } = useQuery<VideoModelOption[]>({
    queryKey: ['video-models'],
    queryFn: () => axios.get<VideoModelOption[]>('/video/models').then((r) => r.data),
  })

  const selectedModel = models.find((m) => m.id === model)
  const activeJobRunning = jobStatus?.status === 'running' || jobStatus?.status === 'pending'

  async function handleUpload(file: File) {
    setUploading(true)
    const preview = URL.createObjectURL(file)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await axios.post<{ image_id: string }>('/upload', fd)
      setImageId(res.data.image_id, preview)
    } catch (e: any) {
      alert(`Upload failed: ${e?.response?.data?.detail || e.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerate() {
    if (!imageId) return
    setRequestError(null)
    setLoading(true)
    try {
      const res = await axios.post<{ job_id: string }>('/video/generate', {
        image_id: imageId,
        prompt,
        model,
        resolution,
        duration,
        aspect_ratio: aspectRatio,
        generate_audio: generateAudio,
        count,
      })
      setJobId(res.data.job_id)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Request failed'
      setRequestError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  const progress = jobStatus ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100) : 0
  const isRunning = loading || activeJobRunning
  const promptDisabled = selectedModel ? !selectedModel.supports_prompt : false

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050505] relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
      {/* HERO */}
      <div className="flex flex-col items-center mb-10 md:mb-20 animate-fade-in-up transition-all duration-700">
        <div className="mb-10 relative group">
          <div className="absolute inset-0 bg-[#d9ff00]/20 blur-[100px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5 overflow-hidden">
            <Video size={80} strokeWidth={1} className="text-[#d9ff00] opacity-20 absolute -right-4 -bottom-4" />
            <div className="w-16 h-16 bg-[#d9ff00]/10 rounded-2xl flex items-center justify-center border border-[#d9ff00]/20 shadow-studio-glow relative z-10">
              <Video size={32} strokeWidth={1.5} className="text-[#d9ff00]" />
            </div>
            <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">✨</div>
          </div>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-7xl font-black text-white tracking-widest uppercase mb-4 text-center px-4">Video Studio</h1>
        <p className="text-[#a1a1aa] text-sm font-medium tracking-wide opacity-60">Animate images into stunning AI videos with motion effects</p>
      </div>

      {/* PROMPT BAR */}
      <div className="w-full max-w-4xl relative z-40 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-5 flex flex-col gap-3 md:gap-5 shadow-studio-3xl">

          {/* Top row: thumb + textarea */}
          <div className="flex items-start gap-3 md:gap-5 px-2">
            <StudioImageThumb
              imageUrl={imagePreview}
              uploading={uploading}
              onUpload={handleUpload}
              onClear={() => setImageId('', '')}
              size={52}
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={promptDisabled}
              placeholder={promptDisabled
                ? 'This model uses image only — no prompt needed'
                : (imagePreview ? 'Describe the motion or effect (optional)' : 'Upload an image to enable video generation')}
              rows={1}
              className="flex-1 bg-transparent border-none text-white text-base md:text-xl placeholder:text-[#52525b] focus:outline-none resize-none pt-2 leading-relaxed min-h-[40px] max-h-[150px] md:max-h-[250px] overflow-y-auto custom-scrollbar disabled:opacity-50"
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, window.innerWidth < 768 ? 150 : 250) + 'px'
              }}
            />
          </div>

          {/* Bottom row: controls + GENERATE */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 md:gap-2.5 relative overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <StudioModelDropdown models={models} value={model} onChange={setModel} tooltip="Select video model" />

              <StudioOptionDropdown
                iconNode={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>}
                options={ASPECT_RATIOS}
                value={aspectRatio}
                onChange={setAspectRatio}
                tooltip="Aspect ratio"
              />

              <StudioOptionDropdown
                iconNode={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><path d="M6 2L3 6v15a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" /></svg>}
                options={RESOLUTIONS}
                value={resolution}
                onChange={(v) => setResolution(v as any)}
                tooltip="Resolution"
              />

              <StudioOptionDropdown
                iconNode={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                options={DURATIONS}
                value={duration}
                onChange={setDuration}
                tooltip="Duration (seconds)"
              />

              <button
                onClick={() => setGenerateAudio(!generateAudio)}
                title="Toggle audio generation"
                className={clsx(
                  'flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all border text-xs font-bold whitespace-nowrap',
                  generateAudio
                    ? 'bg-[#d9ff00]/20 border-[#d9ff00]/40 text-[#d9ff00]'
                    : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                )}
              >
                {generateAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{generateAudio ? 'Audio' : 'Mute'}</span>
              </button>

              <StudioControlButton
                iconNode={<span className="text-[10px] font-black text-[#a1a1aa]">×{count}</span>}
                label={`${count} variant${count !== 1 ? 's' : ''}`}
                tooltip="Click to change variants"
                onClick={() => setCount(count >= 10 ? 1 : count + 1)}
                noChevron
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!imageId || isRunning}
              className="bg-[#d9ff00] text-black px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-base hover:bg-white hover:shadow-studio-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isRunning ? (
                <><Loader2 size={16} className="animate-spin" /> Generating…</>
              ) : (
                <>Generate ✨</>
              )}
            </button>
          </div>
        </div>

        {!imageId && (
          <p className="text-[11px] text-center text-[#52525b] mt-3 uppercase tracking-widest font-bold">↑ Upload a reference image to enable</p>
        )}

        {requestError && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-xs font-bold text-red-400 mb-0.5 uppercase tracking-wider">Request failed</p>
            <p className="text-xs text-red-300/70 font-mono break-all">{requestError}</p>
          </div>
        )}
      </div>

      {/* PROGRESS — only while running */}
      {jobStatus && jobStatus.status !== 'done' && jobStatus.assets.length === 0 && (
        <div className="w-full max-w-4xl mt-8 animate-fade-in-up">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#a1a1aa] uppercase text-[10px] tracking-widest font-bold">Generating…</span>
              <span className="font-bold text-white">{jobStatus.done} / {jobStatus.total}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#d9ff00] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {jobStatus.errors?.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-1">
              <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">Generation errors</p>
              {jobStatus.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-300/70 font-mono break-all">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESULTS — Higgsfield-style horizontal filmstrip + lightbox */}
      {jobStatus && jobStatus.assets.length > 0 && (
        <div className="w-full mt-8 px-2">
          <StudioResultCanvas
            assets={jobStatus.assets.map(a => ({
              id: a.id,
              url: a.url,
              type: 'video',
              format: a.format,
              variant: a.variant,
              prompt,
              model: models.find(m => m.id === model)?.label || model,
              user: useAuthStore.getState().user?.name || 'You',
            }))}
            onClose={() => setJobId(null)}
            onRegenerate={handleGenerate}
          />
        </div>
      )}
    </div>
  )
}

