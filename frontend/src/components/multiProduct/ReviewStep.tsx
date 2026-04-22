import { useMemo, useState } from 'react'
import { ArrowLeft, CheckSquare, Square, Loader2, Upload, X } from 'lucide-react'
import clsx from 'clsx'
import { useMultiProductStore } from '../../store/multiProductStore'
import { useShopifyImportStatus } from '../../hooks/useShopifyImportStatus'
import ConfirmPushDialog from './ConfirmPushDialog'

export default function ReviewStep() {
  const {
    activeJobId,
    reviewOverrides,
    setOverride,
    setStep,
  } = useMultiProductStore()
  const { data: status } = useShopifyImportStatus(activeJobId)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const variants = status?.variants || []
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const effectiveId = activeVariantId || variants[0]?.id || null
  const activeVariant = variants.find((v) => v.id === effectiveId) || null
  const activeItem = activeVariant ? status?.items.find((it) => it.id === activeVariant.item_id) : null

  const itemAssets = useMemo(() => {
    if (!activeVariant || !status) return []
    return status.assets.filter((a) => a.shopify_item_id === activeVariant.item_id)
  }, [activeVariant, status])

  const override = activeVariant ? reviewOverrides[activeVariant.id] : undefined
  const title = override?.title ?? activeVariant?.translated_title ?? activeItem?.source_title ?? ''
  const description = override?.description ?? activeVariant?.translated_description ?? ''
  const tags = override?.tags ?? activeVariant?.translated_tags ?? []
  const price = override?.price ?? activeVariant?.price ?? activeItem?.source_price ?? '0.00'
  const currency = override?.currency ?? activeVariant?.currency ?? activeItem?.source_currency ?? 'USD'

  // selected image ids: start with generated assets + all source images as fallback
  const defaultSelected = useMemo(() => {
    if (!activeItem) return [] as string[]
    const gen = itemAssets.map((a) => a.id)
    const src = activeItem.source_images.map((i) => `src:${i.id || i.src}`)
    return gen.length ? gen : src
  }, [activeItem, itemAssets])
  const selectedImageIds = override?.selectedImageIds ?? defaultSelected

  const readyToPush = variants.filter((v) => !v.pushed).length

  function toggleImage(id: string) {
    if (!activeVariant) return
    const current = override?.selectedImageIds ?? defaultSelected
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setOverride(activeVariant.id, { selectedImageIds: next })
  }

  function updateTag(idx: number, v: string) {
    if (!activeVariant) return
    const current = override?.tags ?? [...(activeVariant.translated_tags || [])]
    const next = [...current]
    next[idx] = v
    setOverride(activeVariant.id, { tags: next })
  }
  function addTag() {
    if (!activeVariant) return
    const current = override?.tags ?? [...(activeVariant.translated_tags || [])]
    setOverride(activeVariant.id, { tags: [...current, ''] })
  }
  function removeTag(idx: number) {
    if (!activeVariant) return
    const current = override?.tags ?? [...(activeVariant.translated_tags || [])]
    setOverride(activeVariant.id, { tags: current.filter((_, i) => i !== idx) })
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => setStep('progress')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2">
            <ArrowLeft size={12} /> Back to job
          </button>
          <h1 className="text-2xl font-bold text-white">Review import</h1>
          <p className="text-sm text-gray-400 mt-1">
            Pick images and refine copy per locale before pushing to Shopify as drafts.
          </p>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={readyToPush === 0}
          className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2 transition"
        >
          <Upload size={13} /> Import to Shopify ({readyToPush})
        </button>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Variants sidebar */}
        <aside className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {variants.map((v) => {
            const item = status?.items.find((it) => it.id === v.item_id)
            const active = v.id === effectiveId
            return (
              <button
                key={v.id}
                onClick={() => setActiveVariantId(v.id)}
                className={clsx(
                  'w-full text-left rounded-lg border px-2.5 py-2 transition',
                  active
                    ? 'border-brand-500/60 bg-brand-500/8'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15]',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-300">
                    {v.locale}
                  </span>
                  {v.pushed && <span className="text-[10px] text-emerald-400">pushed</span>}
                </div>
                <p className="text-xs font-medium text-white truncate mt-1">{item?.source_title || '—'}</p>
              </button>
            )
          })}
        </aside>

        {/* Review panel */}
        {activeVariant && activeItem ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
            {/* Images */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Images</h3>
              <div className="grid grid-cols-3 gap-2">
                {itemAssets.map((a) => {
                  const on = selectedImageIds.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleImage(a.id)}
                      className={clsx(
                        'relative aspect-square rounded-lg overflow-hidden border transition',
                        on ? 'border-brand-500 shadow-[0_0_0_2px_rgba(139,92,246,0.35)]' : 'border-white/[0.08]',
                      )}
                    >
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                      {on && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded bg-brand-500 flex items-center justify-center">
                          <CheckSquare size={10} className="text-white" />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] px-1 py-0.5 rounded bg-black/60 text-white font-mono">
                        AI
                      </span>
                    </button>
                  )
                })}
                {activeItem.source_images.map((img) => {
                  const syntheticId = `src:${img.id || img.src}`
                  const on = selectedImageIds.includes(syntheticId)
                  return (
                    <button
                      key={syntheticId}
                      onClick={() => toggleImage(syntheticId)}
                      className={clsx(
                        'relative aspect-square rounded-lg overflow-hidden border transition',
                        on ? 'border-brand-500 shadow-[0_0_0_2px_rgba(139,92,246,0.35)]' : 'border-white/[0.08]',
                      )}
                    >
                      <img src={img.src} alt="" className="w-full h-full object-cover" />
                      {on && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded bg-brand-500 flex items-center justify-center">
                          <CheckSquare size={10} className="text-white" />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] px-1 py-0.5 rounded bg-black/60 text-gray-300 font-mono">
                        ORIG
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Copy form */}
            <section className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</label>
                <input
                  value={title}
                  onChange={(e) => setOverride(activeVariant.id, { title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setOverride(activeVariant.id, { description: e.target.value })}
                  rows={6}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition resize-y"
                />
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</label>
                  <input
                    value={price}
                    onChange={(e) => setOverride(activeVariant.id, { price: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</label>
                  <input
                    value={currency}
                    onChange={(e) => setOverride(activeVariant.id, { currency: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                      <input
                        value={t}
                        onChange={(e) => updateTag(i, e.target.value)}
                        className="bg-transparent text-xs text-white outline-none w-24"
                      />
                      <button onClick={() => removeTag(i)} className="text-gray-500 hover:text-red-400">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addTag}
                    className="px-2 py-0.5 rounded-full text-xs border border-dashed border-white/[0.15] text-gray-400 hover:border-brand-500/60 hover:text-brand-400 transition"
                  >
                    + tag
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-12">Nothing to review yet.</div>
        )}
      </div>

      <ConfirmPushDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </div>
  )
}
