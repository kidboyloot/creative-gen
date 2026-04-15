import { useState } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Loader2, Plus, X, Info } from 'lucide-react'
import clsx from 'clsx'
import UploadZone from '../components/UploadZone'
import Gallery from '../components/Gallery'
import ModelSelect from '../components/ModelSelect'
import { useGenerateStore } from '../store/generateStore'
import { useAuthStore } from '../store/authStore'
import { useJobStatus } from '../hooks/useJobStatus'

interface ModelOption { id: string; label: string; description: string }

const FORMATS = ['1:1', '9:16']
const TYPES = ['image', 'video', 'collage']
const TYPE_LABELS: Record<string, string> = { image: 'Static Image', video: 'Video', collage: 'Collage' }

export default function GeneratePage() {
  const {
    imageId, prompts, formats, types, count, model,
    setPrompt, addPrompt, removePrompt,
    toggleFormat, toggleType, setCount, setModel, setJobId, jobId,
  } = useGenerateStore()

  const [loading, setLoading] = useState(false)
  const { data: jobStatus } = useJobStatus(jobId)
  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then((r) => r.data),
  })

  const activePrompts = prompts.filter(p => p.trim())
  const multiMode = prompts.length > 1
  // In multi-prompt mode: count = number of prompts (1 prompt → 1 variant)
  const effectiveCount = multiMode ? activePrompts.length : count
  // Real total images = variants × formats × types
  const totalImages = effectiveCount * formats.length * types.length
  const canGenerate = activePrompts.length > 0 && formats.length > 0 && types.length > 0

  const updateCredits = useAuthStore(s => s.updateCredits)

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
      // Refresh credits
      axios.get('/auth/me').then(r => updateCredits(r.data.credits)).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  const progress = jobStatus ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">New Generation</h1>
        <p className="text-gray-400 text-sm mt-1">Upload a reference image and describe the variants you want.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: inputs */}
        <div className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reference Image <span className="text-xs text-gray-500 font-normal">(optional)</span></label>
            <UploadZone />
          </div>

          {/* Multi-prompt editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Prompts
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  {prompts.length > 1 ? `${activePrompts.length} active` : ''}
                </span>
              </label>
              <button
                onClick={addPrompt}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus size={13} /> Add prompt
              </button>
            </div>

            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-3 text-[11px] text-gray-600 font-mono select-none">
                      {i + 1}
                    </span>
                    <textarea
                      value={p}
                      onChange={(e) => setPrompt(i, e.target.value)}
                      rows={2}
                      placeholder={i === 0 ? 'e.g. summer sale campaign, vibrant tropical colors…' : `Prompt ${i + 1}…`}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none transition-colors"
                    />
                  </div>
                  {prompts.length > 1 && (
                    <button
                      onClick={() => removePrompt(i)}
                      className="mt-2.5 p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Hint when multi-prompt */}
            {multiMode && activePrompts.length > 0 && (
              <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <Info size={13} className="text-brand-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-brand-300 leading-relaxed">
                  {activePrompts.length} prompt{activePrompts.length > 1 ? 's' : ''}
                  {formats.length > 1 ? ` × ${formats.length} formats` : ''}
                  {types.length > 1 ? ` × ${types.length} types` : ''}
                  {' = '}<strong>{totalImages} image{totalImages > 1 ? 's' : ''}</strong>
                </p>
              </div>
            )}
          </div>

          <ModelSelect models={models} value={model} onChange={setModel} />

          {/* Formats */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Formats</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFormat(f)}
                  className={clsx(
                    'flex-1 py-2 text-sm rounded-lg border transition-colors',
                    formats.includes(f)
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Types */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Creative Types</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    types.includes(t)
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]'
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Count — hidden in multi-prompt mode (count = number of prompts) */}
          {!multiMode && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Variants: <span className="text-brand-500 font-bold">{count}</span>
                {formats.length > 1 && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    × {formats.length} formats = <span className="text-brand-400">{totalImages} images</span>
                  </span>
                )}
              </label>
              <input
                type="range" min={1} max={50} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1</span><span>50</span>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading || jobStatus?.status === 'running'}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              canGenerate && !loading
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed'
            )}
          >
            {loading || jobStatus?.status === 'running' ? (
              <><Loader2 size={17} className="animate-spin" /> Generating…</>
            ) : (
              <><Sparkles size={17} /> Generate {totalImages} Image{totalImages !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* Right: progress + results */}
        <div className="space-y-4">
          {jobStatus && (
            <>
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-medium">{jobStatus.done} / {jobStatus.total} assets</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className={clsx('text-xs capitalize', {
                    'text-yellow-400': jobStatus.status === 'running',
                    'text-green-400': jobStatus.status === 'done',
                    'text-red-400': jobStatus.status === 'failed',
                    'text-gray-400': jobStatus.status === 'pending',
                  })}>
                    {jobStatus.status}
                  </span>
                  <span className="text-xs text-gray-500">{progress}%</span>
                </div>
              </div>

              {jobStatus.assets.length > 0 && (
                <Gallery assets={jobStatus.assets} jobId={jobStatus.job_id} />
              )}
            </>
          )}

          {!jobStatus && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-sm">
              <Sparkles size={40} className="mb-3 opacity-20" />
              <p>Your generated creatives will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
