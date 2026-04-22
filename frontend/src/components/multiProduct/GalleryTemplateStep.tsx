import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Loader2, Sparkles, Bookmark, Plus, Trash2, BookmarkPlus } from 'lucide-react'
import clsx from 'clsx'
import ModelSelect from '../ModelSelect'
import { useMultiProductStore } from '../../store/multiProductStore'
import { startImport } from '../../api/shopify'
import { useAuthStore } from '../../store/authStore'

const STYLES = [
  'product photography',
  'lifestyle',
  'editorial',
  'minimalist studio',
  'UGC',
  'fashion campaign',
  'luxury 3D render',
  'vintage film',
]

const CREDITS_PER_IMAGE = 1
const SECONDS_PER_IMAGE = 12

interface ModelOption {
  id: string
  label: string
  description: string
}

export default function GalleryTemplateStep() {
  const {
    previewProducts,
    selectedProductIds,
    targetLocales,
    imageGenSlots,
    updateSlot,
    addSlot,
    removeSlot,
    savedPresets,
    addPreset,
    removePreset,
    activeConnectionId,
    collectionUrl,
    translationEngine,
    setStep,
    setActiveJobId,
  } = useMultiProductStore()

  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then((r) => r.data),
  })

  const updateCredits = useAuthStore((s) => s.updateCredits)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productsById = useMemo(
    () => Object.fromEntries(previewProducts.map((p) => [p.id, p])),
    [previewProducts],
  )

  const selectedProducts = previewProducts.filter((p) => selectedProductIds.includes(p.id))

  async function handleGenerate() {
    const validSlots = imageGenSlots.filter((s) => s.prompt.trim().length > 0)
    if (!activeConnectionId || selectedProducts.length === 0 || validSlots.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await startImport({
        connection_id: activeConnectionId,
        collection_url: collectionUrl,
        products: selectedProducts,
        target_locales: targetLocales,
        translation_engine: translationEngine,
        generate_images: true,
        image_prompts: validSlots,
      })
      setActiveJobId(res.job_id)
      setStep('progress')
      axios.get('/auth/me').then((r) => updateCredits(r.data.credits)).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Could not start generation')
    } finally {
      setSubmitting(false)
    }
  }

  const activeSlots = imageGenSlots.filter((s) => s.prompt.trim())
  const estimatedSeconds = activeSlots.length * SECONDS_PER_IMAGE
  const estimatedMin = Math.ceil(estimatedSeconds / 60)
  const cost = activeSlots.length * CREDITS_PER_IMAGE

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6 pb-28">
      <div>
        <button onClick={() => setStep('collection')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2">
          <ArrowLeft size={12} /> Back to products
        </button>
        <h1 className="text-2xl font-bold text-white">Design your creatives</h1>
        <p className="text-sm text-gray-400 mt-1">
          One prompt slot per product × locale. Tune the prompt, model and style — or load a saved variant.
        </p>
      </div>

      {/* Saved variants */}
      {savedPresets.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark size={12} className="text-brand-400" />
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Saved variants</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {savedPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addSlot({
                    item_id: selectedProducts[0]?.id || '',
                    prompt: p.prompt,
                    model: p.model,
                    style: p.style,
                  })
                }}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 hover:border-brand-500/60 text-xs text-brand-300 transition"
              >
                <Plus size={10} />
                {p.label}
                <Trash2
                  size={10}
                  onClick={(e) => { e.stopPropagation(); removePreset(p.id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {imageGenSlots.map((slot, idx) => {
          const product = productsById[slot.item_id]
          return (
            <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex gap-4">
              <div className="w-24 flex-shrink-0">
                <div className="aspect-square rounded-lg bg-surface-600 overflow-hidden">
                  {product?.featured_image ? (
                    <img src={product.featured_image} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">—</div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 truncate">{product?.title || 'Unknown'}</p>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Prompt</label>
                  <textarea
                    value={slot.prompt}
                    onChange={(e) => updateSlot(idx, { prompt: e.target.value })}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-xs text-white outline-none transition resize-none"
                    placeholder="A clean hero shot of the product on a pastel background…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block mb-1">Model</label>
                    <select
                      value={slot.model}
                      onChange={(e) => updateSlot(idx, { model: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white outline-none"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                      {models.length === 0 && <option value="flux-dev">flux-dev</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block mb-1">Style</label>
                    <select
                      value={slot.style}
                      onChange={(e) => updateSlot(idx, { style: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white outline-none"
                    >
                      {STYLES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      const label = prompt('Name this saved variant', slot.style || 'My variant')
                      if (label) addPreset({ label, prompt: slot.prompt, model: slot.model, style: slot.style })
                    }}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-400 transition"
                  >
                    <BookmarkPlus size={11} /> Save as variant
                  </button>
                  <button
                    onClick={() => removeSlot(idx)}
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => {
          const first = selectedProducts[0]
          if (first) addSlot({ item_id: first.id, prompt: '', model: 'flux-dev', style: STYLES[0] })
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.15] hover:border-brand-500/60 text-xs text-gray-400 hover:text-brand-400 transition"
      >
        <Plus size={12} /> Add prompt slot
      </button>

      {/* Sticky summary + generate */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(90%,900px)]">
        <div className="rounded-2xl border border-white/[0.1] bg-surface-800/95 backdrop-blur p-3 flex items-center gap-4 shadow-2xl">
          <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500">Images</p>
              <p className="text-white font-semibold">{activeSlots.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Est. time</p>
              <p className="text-white font-semibold">~{estimatedMin} min</p>
            </div>
            <div>
              <p className="text-gray-500">Cost</p>
              <p className="text-white font-semibold">{cost} credits</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={submitting || activeSlots.length === 0}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2 transition shadow-lg shadow-brand-500/30"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Generate images
          </button>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
