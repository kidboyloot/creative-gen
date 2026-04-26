import { useState, useEffect } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles, X, Download, RotateCw, Plus, Settings } from 'lucide-react'
import clsx from 'clsx'
import {
  CAMERA_MAP, LENS_MAP, FOCAL_PERSPECTIVE, APERTURE_EFFECT,
  ASPECT_RATIOS, RESOLUTIONS, buildCinemaPrompt,
} from '../lib/cinemaPrompts'
import CameraWheel from '../components/CameraWheel'

interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  done: number
  total: number
  assets: { id: string; url: string }[]
  errors: string[]
}

interface HistoryEntry {
  url: string
  timestamp: number
  settings: {
    prompt: string
    camera: string
    lens: string
    focal: number
    aperture: string
    aspect_ratio: string
    resolution: string
  }
}

const HISTORY_KEY = 'cinema_history_v1'

export default function CinemaPage() {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  const [resolution, setResolution] = useState<string>('2K')
  const [camera, setCamera] = useState(Object.keys(CAMERA_MAP)[0])
  const [lens, setLens] = useState(Object.keys(LENS_MAP)[0])
  const [focal, setFocal] = useState<number>(35)
  const [aperture, setAperture] = useState('f/1.4')

  const [overlayOpen, setOverlayOpen] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
  })

  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ['cinema-job', jobId],
    queryFn: () => axios.get<JobStatus>(`/cinema/status/${jobId}`).then(r => r.data),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'done' || s === 'failed' ? false : 2000
    },
  })

  // When a job finishes, push to history + show result
  useEffect(() => {
    if (jobStatus?.status === 'done' && jobStatus.assets[0]) {
      const url = jobStatus.assets[0].url
      setResultUrl(url)
      const entry: HistoryEntry = {
        url,
        timestamp: Date.now(),
        settings: { prompt, camera, lens, focal, aperture, aspect_ratio: aspectRatio, resolution },
      }
      const next = [entry, ...history].slice(0, 50)
      setHistory(next)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    }
    if (jobStatus?.status === 'failed') {
      setError(jobStatus.errors?.[0] || 'Generation failed')
    }
  }, [jobStatus?.status])

  async function handleGenerate() {
    if (!prompt.trim()) return
    setError(null)
    setResultUrl(null)
    setLoading(true)
    const finalPrompt = buildCinemaPrompt(prompt, camera, lens, focal, aperture)
    try {
      const res = await axios.post<{ job_id: string }>('/cinema/generate', {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        resolution,
      })
      setJobId(res.data.job_id)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  function loadHistoryItem(e: HistoryEntry) {
    setPrompt(e.settings.prompt)
    setCamera(e.settings.camera)
    setLens(e.settings.lens)
    setFocal(e.settings.focal)
    setAperture(e.settings.aperture)
    setAspectRatio(e.settings.aspect_ratio)
    setResolution(e.settings.resolution)
    setResultUrl(e.url)
  }

  function resetToPrompt() {
    setResultUrl(null)
    setPrompt('')
    setJobId(null)
    setError(null)
  }

  const isRunning = loading || jobStatus?.status === 'running' || jobStatus?.status === 'pending'
  const summaryValue = `${lens}, ${focal}mm, ${aperture}`

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* History sidebar */}
      <div className="fixed right-0 top-0 h-full w-20 md:w-24 bg-black/60 backdrop-blur-xl border-l border-white/5 z-30 flex flex-col items-center py-4 gap-3 overflow-y-auto custom-scrollbar">
        <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">History</div>
        {history.length === 0 && (
          <div className="text-[8px] text-white/20 text-center px-2">No shots yet</div>
        )}
        <div className="flex flex-col gap-2 w-full px-2">
          {history.map((e, i) => (
            <button
              key={`${e.timestamp}-${i}`}
              onClick={() => loadHistoryItem(e)}
              className={clsx(
                'relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300',
                resultUrl === e.url ? 'border-[#d9ff00] shadow-studio-glow-sm' : 'border-white/10 hover:border-white/30'
              )}
            >
              <img src={e.url} className="w-full h-full object-cover opacity-80" />
            </button>
          ))}
        </div>
      </div>

      {/* Result canvas */}
      {resultUrl ? (
        <div className="absolute inset-0 right-20 md:right-24 flex flex-col items-center justify-center p-4 md:p-16 z-20 bg-black/90 backdrop-blur-3xl animate-fade-in-up">
          <img
            src={resultUrl}
            className="max-h-[60vh] max-w-[90%] rounded-2xl shadow-2xl border border-white/10 object-contain"
          />
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => { setResultUrl(null); setTimeout(handleGenerate, 200) }}
              className="studio-secondary-btn flex items-center gap-2"
            >
              <RotateCw size={14} /> Regenerate
            </button>
            <a
              href={resultUrl}
              download={`cinema-shot-${Date.now()}.png`}
              className="studio-generate-btn flex items-center gap-2 px-6 h-auto py-2.5 text-xs"
            >
              <Download size={14} /> Download
            </a>
            <button onClick={resetToPrompt} className="studio-secondary-btn flex items-center gap-2">
              <Plus size={14} /> New Shot
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="flex flex-col items-center justify-center text-center px-4 animate-fade-in-up mr-20 md:mr-24">
            <div className="mb-4 text-xs font-bold text-white/40 tracking-[0.2em] uppercase">Cinema Studio</div>
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight leading-tight mb-2">
              What would you shoot<br />with infinite budget?
            </h1>
          </div>

          {/* Floating prompt bar */}
          <div className="absolute bottom-8 left-4 right-24 md:right-28 md:left-1/2 md:-translate-x-1/2 md:max-w-4xl md:w-[calc(100%-9rem)] z-20">
            <div className="bg-studio-card-bg-2 border border-white/10 rounded-[2rem] p-4 flex justify-between gap-3 shadow-studio-3xl items-end">
              {/* Left */}
              <div className="flex-1 flex flex-col gap-3 min-h-[80px] justify-between py-1 px-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your scene…"
                  rows={1}
                  className="flex-1 bg-transparent border-none text-white text-base md:text-lg font-medium placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
                  style={{ minHeight: 28 }}
                  onInput={(e) => {
                    const el = e.target as HTMLTextAreaElement
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <SmallSelect
                    label={aspectRatio}
                    options={ASPECT_RATIOS as readonly string[]}
                    value={aspectRatio}
                    onChange={setAspectRatio}
                  />
                  <SmallSelect
                    label={resolution}
                    options={RESOLUTIONS as readonly string[]}
                    value={resolution}
                    onChange={setResolution}
                  />
                </div>
              </div>

              {/* Summary card */}
              <div className="flex items-center gap-2 self-end mb-1">
                <button
                  onClick={() => setOverlayOpen(true)}
                  className="flex flex-col items-start justify-center px-4 py-2 bg-[#2a2a2a] rounded-xl border border-white/10 hover:border-[#d9ff00]/40 transition-colors text-left flex-1 min-w-[140px] max-w-[240px] h-[56px] relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 w-2 h-2 bg-[#d9ff00] rounded-full shadow-studio-glow-sm" />
                  <span className="text-[10px] font-black text-white uppercase truncate w-full tracking-wide">{camera}</span>
                  <span className="text-[10px] font-medium text-white/60 truncate w-full">{summaryValue}</span>
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isRunning}
                  className="studio-generate-btn flex items-center gap-2"
                >
                  {isRunning ? (
                    <><Loader2 size={14} className="animate-spin" /> SHOOTING…</>
                  ) : (
                    <><Sparkles size={14} /> GENERATE</>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-300/80 font-mono break-all">
                {error}
              </div>
            )}
          </div>
        </>
      )}

      {/* Camera builder overlay */}
      {overlayOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOverlayOpen(false) }}
        >
          <div className="w-full max-w-5xl bg-[#141414] border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-[#d9ff00]" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Camera Builder</h2>
              </div>
              <button onClick={() => setOverlayOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <CameraWheel
              cameras={Object.keys(CAMERA_MAP)}
              lenses={Object.keys(LENS_MAP)}
              focals={Object.keys(FOCAL_PERSPECTIVE).map(f => parseInt(f))}
              apertures={Object.keys(APERTURE_EFFECT)}
              value={{ camera, lens, focal, aperture }}
              onChange={(next) => {
                setCamera(next.camera)
                setLens(next.lens)
                setFocal(next.focal)
                setAperture(next.aperture)
              }}
            />

            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-widest mb-2">Prompt Preview</p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-[#a1a1aa] leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                {buildCinemaPrompt(prompt || '<your scene>', camera, lens, focal, aperture)}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setOverlayOpen(false)}
                className="bg-[#d9ff00] text-black px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-white transition-colors flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SmallSelect({
  label, options, value, onChange,
}: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
      >
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 bg-studio-card-bg-2 border border-white/10 rounded-xl py-1 shadow-2xl z-20 min-w-[80px]">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={clsx(
                  'block w-full px-3 py-2 text-xs font-bold text-left hover:bg-white/10 transition-colors',
                  opt === value ? 'text-[#d9ff00]' : 'text-white'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

