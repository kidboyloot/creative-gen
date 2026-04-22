import { useState } from 'react'
import { ArrowLeft, Loader2, Search, CheckSquare, Square, Link2 } from 'lucide-react'
import clsx from 'clsx'
import { useMultiProductStore } from '../../store/multiProductStore'
import { previewCollection } from '../../api/shopify'
import ImportOptionsDialog from './ImportOptionsDialog'

export default function CollectionStep() {
  const {
    activeConnectionId,
    collectionUrl,
    setCollectionUrl,
    previewProducts,
    setPreviewProducts,
    selectedProductIds,
    toggleSelectProduct,
    selectAll,
    clearSelection,
    setStep,
    connections,
  } = useMultiProductStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const activeConn = connections.find((c) => c.id === activeConnectionId) || null

  async function handleFetch() {
    if (!activeConnectionId || !collectionUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await previewCollection(activeConnectionId, collectionUrl.trim())
      setPreviewProducts(res.products)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Could not load collection')
      setPreviewProducts([])
    } finally {
      setLoading(false)
    }
  }

  const allSelected = previewProducts.length > 0 && selectedProductIds.length === previewProducts.length

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => setStep('connect')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2">
            <ArrowLeft size={12} /> Back to stores
          </button>
          <h1 className="text-2xl font-bold text-white">Import from a collection</h1>
          <p className="text-sm text-gray-400 mt-1">
            Connected to <span className="text-brand-400">{activeConn?.shop_name || activeConn?.shop_domain}</span>.
            Paste the URL of the Shopify collection you want to clone.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={collectionUrl}
            onChange={(e) => setCollectionUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetch() }}
            placeholder="https://mystore.myshopify.com/collections/all"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition"
          />
        </div>
        <button
          onClick={handleFetch}
          disabled={loading || !collectionUrl.trim()}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2 transition"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Fetch products
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {previewProducts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{selectedProductIds.length}</span> of {previewProducts.length} selected
            </p>
            <button
              onClick={() => (allSelected ? clearSelection() : selectAll(previewProducts.map((p) => p.id)))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
            >
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previewProducts.map((p) => {
              const selected = selectedProductIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSelectProduct(p.id)}
                  className={clsx(
                    'group relative rounded-xl overflow-hidden border text-left transition',
                    selected
                      ? 'border-brand-500 shadow-[0_0_0_2px_rgba(139,92,246,0.4)]'
                      : 'border-white/[0.08] hover:border-white/[0.2]',
                  )}
                >
                  <div className="aspect-square bg-surface-600 overflow-hidden">
                    {p.featured_image ? (
                      <img src={p.featured_image} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-2.5 bg-surface-800/80">
                    <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{p.price} {p.currency} · {p.variant_count} variants</p>
                  </div>
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center shadow-lg">
                      <CheckSquare size={11} className="text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={() => setOptionsOpen(true)}
              disabled={selectedProductIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white transition shadow-lg shadow-brand-500/20"
            >
              Import products ({selectedProductIds.length})
            </button>
          </div>
        </>
      )}

      <ImportOptionsDialog open={optionsOpen} onClose={() => setOptionsOpen(false)} />
    </div>
  )
}
