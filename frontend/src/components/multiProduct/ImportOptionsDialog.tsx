import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles, Image as ImageIcon, Globe, Languages } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import Modal from '../ui/Modal'
import { useMultiProductStore } from '../../store/multiProductStore'
import { listLanguages, startImport } from '../../api/shopify'
import { useAuthStore } from '../../store/authStore'
import axios from 'axios'

const CREDITS_PER_TRANSLATE = 1
const CREDITS_PER_IMAGE = 1

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportOptionsDialog({ open, onClose }: Props) {
  const {
    previewProducts,
    selectedProductIds,
    targetLocales,
    toggleLocale,
    setTargetLocales,
    translationEngine,
    setTranslationEngine,
    generateImages,
    setGenerateImages,
    activeConnectionId,
    collectionUrl,
    setStep,
    setActiveJobId,
    setImageGenSlots,
  } = useMultiProductStore()

  const updateCredits = useAuthStore((s) => s.updateCredits)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: languages = [] } = useQuery({
    queryKey: ['translate', 'languages'],
    queryFn: listLanguages,
    enabled: open,
  })

  const selectedProducts = previewProducts.filter((p) => selectedProductIds.includes(p.id))
  const translateCost = selectedProducts.length * targetLocales.length * CREDITS_PER_TRANSLATE
  const imageEstimate = generateImages ? selectedProducts.length * targetLocales.length : 0
  const imageCost = imageEstimate * CREDITS_PER_IMAGE
  const totalCost = translateCost + imageCost

  async function handleConfirm() {
    if (!activeConnectionId || selectedProducts.length === 0 || targetLocales.length === 0) return
    setSubmitting(true)
    setError(null)

    if (generateImages) {
      // Seed one prompt slot per (product × locale). The user can edit/duplicate in the gallery template.
      const slots = selectedProducts.flatMap((p) =>
        targetLocales.map((loc) => ({
          item_id: p.id,
          prompt: `${p.title} — hero product photo, clean studio background, soft lighting (${loc})`,
          model: 'flux-dev',
          style: 'product photography',
        })),
      )
      setImageGenSlots(slots)
      setStep('gallery')
      setSubmitting(false)
      onClose()
      return
    }

    // No image generation — kick the job off immediately.
    try {
      const res = await startImport({
        connection_id: activeConnectionId,
        collection_url: collectionUrl,
        products: selectedProducts,
        target_locales: targetLocales,
        translation_engine: translationEngine,
        generate_images: false,
        image_prompts: [],
      })
      setActiveJobId(res.job_id)
      setStep('progress')
      axios.get('/auth/me').then((r) => updateCredits(r.data.credits)).catch(() => {})
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Could not start import')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Import products"
      subtitle={`${selectedProducts.length} products selected`}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || targetLocales.length === 0}
            className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {generateImages ? 'Continue to image gen' : 'Start import'}
          </button>
        </>
      }
    >
      <div className="p-5 space-y-6">
        {/* Languages */}
        <section>
          <header className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Target languages</h3>
            <span className="text-xs text-gray-500">{targetLocales.length} selected</span>
            {languages.length > 0 && (
              <button
                onClick={() => setTargetLocales(targetLocales.length === languages.length ? [] : languages.map((l) => l.code))}
                className="ml-auto text-xs text-gray-500 hover:text-gray-300"
              >
                {targetLocales.length === languages.length ? 'Clear' : 'Select all'}
              </button>
            )}
          </header>
          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
            {languages.map((l) => {
              const on = targetLocales.includes(l.code)
              return (
                <button
                  key={l.code}
                  onClick={() => toggleLocale(l.code)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition',
                    on
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:border-white/[0.2]',
                  )}
                >
                  {l.name}
                </button>
              )
            })}
          </div>
        </section>

        {/* Translation engine */}
        <section>
          <header className="flex items-center gap-2 mb-2">
            <Languages size={14} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Translation engine</h3>
          </header>
          <div className="grid grid-cols-2 gap-2">
            {(['google', 'llm'] as const).map((eng) => {
              const on = translationEngine === eng
              return (
                <button
                  key={eng}
                  onClick={() => setTranslationEngine(eng)}
                  className={clsx(
                    'text-left p-3 rounded-xl border transition',
                    on
                      ? 'border-brand-500/60 bg-brand-500/8'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]',
                  )}
                >
                  <p className="text-sm font-semibold text-white">
                    {eng === 'google' ? 'Google Translate' : 'AI copywriter'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {eng === 'google'
                      ? 'Free, fast, literal. Best for simple product titles.'
                      : 'LLM rewrites with native tone + local idioms. Needs OPENAI/ANTHROPIC key.'}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Generate AI images toggle */}
        <section>
          <label className={clsx(
            'flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer',
            generateImages ? 'border-brand-500/60 bg-brand-500/8' : 'border-white/[0.08] bg-white/[0.02]',
          )}>
            <input
              type="checkbox"
              checked={generateImages}
              onChange={(e) => setGenerateImages(e.target.checked)}
              className="accent-brand-500"
            />
            <ImageIcon size={15} className={generateImages ? 'text-brand-400' : 'text-gray-500'} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Generate AI images</p>
              <p className="text-xs text-gray-500">
                Create fresh hero creatives per locale. One prompt slot per product/locale — customisable in the next step.
              </p>
            </div>
            <Sparkles size={14} className={generateImages ? 'text-brand-400' : 'text-gray-600'} />
          </label>
        </section>

        {/* Selected products summary */}
        <section>
          <header className="mb-2">
            <h3 className="text-sm font-semibold text-white">Selected products</h3>
          </header>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {selectedProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-md bg-surface-600 overflow-hidden flex-shrink-0">
                  {p.featured_image && <img src={p.featured_image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.title}</p>
                  <p className="text-[10px] text-gray-500">{p.price} {p.currency}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cost summary */}
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
          <div className="flex justify-between text-gray-400">
            <span>Translations ({selectedProducts.length} × {targetLocales.length})</span>
            <span>{translateCost} credits</span>
          </div>
          {generateImages && (
            <div className="flex justify-between text-gray-400">
              <span>AI images ({imageEstimate})</span>
              <span>{imageCost} credits</span>
            </div>
          )}
          <div className="flex justify-between text-white font-semibold pt-1 mt-1 border-t border-white/[0.06]">
            <span>Estimated total</span>
            <span>{totalCost} credits</span>
          </div>
        </section>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
