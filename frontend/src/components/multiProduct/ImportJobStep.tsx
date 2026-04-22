import { useNavigate } from 'react-router-dom'
import { Store, Loader2, CheckCircle2, XCircle, ExternalLink, PackagePlus, Eye, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import { useMultiProductStore } from '../../store/multiProductStore'
import { useShopifyImportStatus } from '../../hooks/useShopifyImportStatus'

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued',
  fetching: 'Fetching products',
  translating: 'Translating copy',
  generating_images: 'Generating AI images',
  ready: 'Ready',
}

export default function ImportJobStep() {
  const navigate = useNavigate()
  const { activeJobId, setStep, reset } = useMultiProductStore()
  const { data: status } = useShopifyImportStatus(activeJobId)

  const progress = status
    ? Math.round((status.done / Math.max(status.total, 1)) * 100)
    : 0

  const running = status?.status === 'running' || status?.status === 'pending'
  const done = status?.status === 'done'
  const failed = status?.status === 'failed'

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Shop header */}
      {status?.shop?.domain && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-400">
            <Store size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{status.shop.name || status.shop.domain}</p>
            <p className="text-xs text-gray-500">{status.shop.domain}</p>
          </div>
          <div className={clsx(
            'px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            running && 'bg-brand-500/15 text-brand-300',
            done && 'bg-emerald-500/15 text-emerald-400',
            failed && 'bg-red-500/15 text-red-400',
          )}>
            {running && 'Importing'}
            {done && 'Ready'}
            {failed && 'Failed'}
          </div>
        </div>
      )}

      {/* Progress card */}
      <div className="rounded-2xl border border-white/[0.08] bg-surface-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          {running && <Loader2 className="animate-spin text-brand-400" size={18} />}
          {done && <CheckCircle2 className="text-emerald-400" size={18} />}
          {failed && <XCircle className="text-red-400" size={18} />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {STEP_LABELS[status?.step || 'queued'] || 'Working'}…
            </p>
            <p className="text-xs text-gray-500">
              {status?.done ?? 0} of {status?.total ?? 0} products processed
            </p>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{progress}%</p>
        </div>

        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-700 ease-out',
              failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-brand-400',
            )}
            style={{ width: `${Math.max(progress, 3)}%` }}
          />
        </div>

        {failed && status?.error && (
          <p className="text-xs text-red-400">{status.error}</p>
        )}
      </div>

      {/* Items list */}
      {status && status.items.length > 0 && (
        <div className="space-y-2">
          {status.items.map((it) => {
            const variants = status.variants.filter((v) => v.item_id === it.id)
            const assets = status.assets.filter((a) => a.shopify_item_id === it.id)
            const source = it.source_images[0]?.src
            return (
              <div key={it.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-surface-600 overflow-hidden flex-shrink-0">
                  {source && <img src={source} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{it.source_title}</p>
                  <p className="text-xs text-gray-500">
                    {variants.length} variants · {assets.length} AI images
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                  {variants.map((v) => (
                    <span key={v.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-300 font-mono">
                      {v.locale}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      {done && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => { reset(); setStep('collection') }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium text-gray-200 transition"
          >
            <PackagePlus size={13} /> Import more
          </button>
          <button
            onClick={() => setStep('review')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white transition"
          >
            <Eye size={13} /> Review & push to Shopify
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium text-gray-200 transition"
          >
            <FolderOpen size={13} /> Go to Library
          </button>
        </div>
      )}
    </div>
  )
}
