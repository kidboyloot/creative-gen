import { useState } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Loader2, Plus, X, Image as ImageIcon, Info, Sliders } from 'lucide-react'
import clsx from 'clsx'
import { useGenerateStore } from '../store/generateStore'
import { useAuthStore } from '../store/authStore'
import { useJobStatus } from '../hooks/useJobStatus'
import {
  StudioControlButton, StudioDropdown, StudioModelDropdown, StudioOptionDropdown,
  StudioImageThumb,
} from '../components/StudioControls'
import StudioResultCanvas from '../components/StudioResultCanvas'

interface ModelOption { id: string; label: string; description: string }

const FORMATS = ['1:1', '9:16', '16:9', '4:3', '3:4', '21:9', '2:3', '3:2']
const TYPES = [
  { id: 'image', label: 'Static' },
  { id: 'video', label: 'Video' },
  { id: 'collage', label: 'Collage' },
] as const

export default function GeneratePage() {
  const {
    imageId, imagePreview, prompts, formats, types, count, model,
    setImageId, setPrompt, addPrompt, removePrompt,
    toggleFormat, toggleType, setCount, setModel, setJobId, jobId,
  } = useGenerateStore()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showVariants, setShowVariants] = useState(false)
  const { data: jobStatus } = useJobStatus(jobId)
  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then((r) => r.data),
  })

  const activePrompts = prompts.filter(p => p.trim())
  const multiMode = prompts.length > 1
  const effectiveCount = multiMode ? activePrompts.length : count
  const totalImages = effectiveCount * formats.length * types.length
  const canGenerate = activePrompts.length > 0 && formats.length > 0 && types.length > 0

  const updateCredits = useAuthStore(s => s.updateCredits)

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
    if (!canGenerate) return
    setLoading(true)
    try {
      const res = await axios.post<{ job_id: string }>('/generate', {
        image_id: imageId || undefined,
        prompts: activePrompts,
        formats,
        types,
        count: effectiveCount,
        model,
      })
      setJobId(res.data.job_id)
      axios.get('/auth/me').then(r => updateCredits(r.data.credits)).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  const progress = jobStatus ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100) : 0
  const isRunning = loading || jobStatus?.status === 'running'
  const primaryFormat = formats[0] || '1:1'

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050505] relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
      {/* HERO */}
      <div className="flex flex-col items-center mb-10 md:mb-20 animate-fade-in-up transition-all duration-700">
        <div className="mb-10 relative group">
          <div className="absolute inset-0 bg-[#d9ff00]/20 blur-[100px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5 overflow-hidden">
            <ImageIcon size={80} strokeWidth={1} className="text-[#d9ff00] opacity-20 absolute -right-4 -bottom-4" />
            <div className="w-16 h-16 bg-[#d9ff00]/10 rounded-2xl flex items-center justify-center border border-[#d9ff00]/20 shadow-studio-glow relative z-10">
              <ImageIcon size={32} strokeWidth={1.5} className="text-[#d9ff00]" />
            </div>
            <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">✨</div>
          </div>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-7xl font-black text-white tracking-widest uppercase mb-4 text-center px-4">Image Studio</h1>
        <p className="text-[#a1a1aa] text-sm font-medium tracking-wide opacity-60">Transform images with AI — upscale, stylize, animate and more</p>
      </div>

      {/* PROMPT BAR */}
      <div className="w-full max-w-4xl relative z-40 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-5 flex flex-col gap-3 md:gap-5 shadow-studio-3xl">

          {/* Top row: thumb + main textarea */}
          <div className="flex items-start gap-3 md:gap-5 px-2">
            <StudioImageThumb
              imageUrl={imagePreview}
              uploading={uploading}
              onUpload={handleUpload}
              onClear={() => setImageId('', '')}
              size={52}
            />
            <textarea
              value={prompts[0] || ''}
              onChange={(e) => setPrompt(0, e.target.value)}
              placeholder={imagePreview ? 'Describe how to transform this image (optional)' : 'Describe the image you want to create'}
              rows={1}
              className="flex-1 bg-transparent border-none text-white text-base md:text-xl placeholder:text-[#52525b] focus:outline-none resize-none pt-2 leading-relaxed min-h-[40px] max-h-[150px] md:max-h-[250px] overflow-y-auto custom-scrollbar"
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, window.innerWidth < 768 ? 150 : 250) + 'px'
              }}
            />
          </div>

          {/* Multi-prompt extras (user's bulk feature) */}
          {prompts.length > 1 && (
            <div className="flex flex-col gap-2 px-2">
              {prompts.slice(1).map((p, idx) => {
                const i = idx + 1
                return (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="mt-2 text-[10px] font-mono text-[#52525b] select-none w-5">{i + 1}</span>
                    <textarea
                      value={p}
                      onChange={(e) => setPrompt(i, e.target.value)}
                      rows={1}
                      placeholder={`Prompt ${i + 1}…`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#d9ff00]/50 resize-none transition-colors"
                    />
                    <button
                      onClick={() => removePrompt(i)}
                      className="mt-1.5 p-1.5 text-[#52525b] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom row: controls (left, scrollable) + GENERATE (right) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 md:gap-2.5 relative overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <StudioModelDropdown models={models} value={model} onChange={setModel} />

              <StudioOptionDropdown
                iconNode={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>}
                options={FORMATS}
                value={primaryFormat}
                onChange={(v) => { if (!formats.includes(v)) toggleFormat(v); formats.filter(f => f !== v).forEach(toggleFormat) }}
                tooltip="Aspect ratio"
              />

              <StudioDropdown
                triggerIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="opacity-60 text-[#a1a1aa]"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
                triggerLabel={TYPES.find(t => t.id === types[0])?.label || 'Type'}
                triggerTooltip="Creative type"
                items={TYPES.map(t => ({ id: t.id, label: t.label }))}
                selectedId={types[0] || ''}
                onSelect={(v) => { if (!types.includes(v)) toggleType(v); types.filter(t => t !== v).forEach(toggleType) }}
                minWidth={140}
              />

              {!multiMode && (
                <StudioControlButton
                  iconNode={<Sliders size={14} className="opacity-60 text-[#a1a1aa]" />}
                  label={`${count} variant${count !== 1 ? 's' : ''}`}
                  tooltip="Variants count"
                  active={showVariants}
                  onClick={() => setShowVariants(v => !v)}
                  noChevron
                />
              )}

              <button
                onClick={addPrompt}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-white hover:text-[#d9ff00] text-xs font-bold whitespace-nowrap transition-all"
                title="Add prompt"
              >
                <Plus size={14} /> Prompt
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isRunning}
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

        {/* Variants slider — opens below the bar when toggled */}
        {showVariants && !multiMode && (
          <div className="mt-3 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa]">Variants</span>
              <span className="text-xs font-black text-[#d9ff00]">{count} × {formats.length} format{formats.length > 1 ? 's' : ''} = {totalImages} image{totalImages > 1 ? 's' : ''}</span>
            </div>
            <input
              type="range" min={1} max={50} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-[#d9ff00]"
            />
            <div className="flex justify-between text-[10px] text-[#52525b] mt-1 font-mono"><span>1</span><span>50</span></div>
          </div>
        )}

        {multiMode && activePrompts.length > 0 && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-[#d9ff00]/10 border border-[#d9ff00]/20">
            <Info size={13} className="text-[#d9ff00] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#d9ff00] leading-relaxed font-bold">
              {activePrompts.length} prompt{activePrompts.length > 1 ? 's' : ''}
              {formats.length > 1 ? ` × ${formats.length} formats` : ''}
              {types.length > 1 ? ` × ${types.length} types` : ''}
              {' = '}{totalImages} image{totalImages > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* PROGRESS — only shown while running */}
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
        </div>
      )}

      {/* RESULTS — Higgsfield-style horizontal filmstrip + lightbox */}
      {jobStatus && jobStatus.assets.length > 0 && (
        <div className="w-full mt-8 px-2">
          <StudioResultCanvas
            assets={jobStatus.assets.map(a => ({
              id: a.id,
              url: a.url,
              type: a.type,
              format: a.format,
              variant: a.variant,
              prompt: activePrompts[(a.variant ?? 1) - 1] || activePrompts[0] || '',
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
