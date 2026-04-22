import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ExternalLink, PackagePlus, FolderOpen, AlertTriangle } from 'lucide-react'
import { useMultiProductStore } from '../../store/multiProductStore'

export default function PushSuccess() {
  const navigate = useNavigate()
  const { pushResults, reset, setStep } = useMultiProductStore()
  const ok = pushResults.filter((r) => r.ok)
  const failed = pushResults.filter((r) => !r.ok)

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} />
        </div>
        <h1 className="text-2xl font-bold text-white">
          Imported {ok.length} {ok.length === 1 ? 'product' : 'products'} successfully
        </h1>
        <p className="text-sm text-gray-400 mt-1.5">
          Each one is waiting as a draft in your Shopify admin.
        </p>
      </div>

      <div className="space-y-2">
        {ok.map((r) => (
          <a
            key={r.variant_id}
            href={r.draft_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-brand-500/40 hover:bg-brand-500/5 transition group"
          >
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-300">
              {r.locale}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{r.title}</p>
              <p className="text-[11px] text-gray-500 truncate">{r.draft_url}</p>
            </div>
            <ExternalLink size={14} className="text-gray-500 group-hover:text-brand-400" />
          </a>
        ))}
        {failed.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle size={13} /> {failed.length} failed to push
            </div>
            {failed.map((r) => (
              <p key={r.variant_id} className="text-[11px] text-red-300/80">
                {r.variant_id}: {r.error}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { reset(); setStep('collection') }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white transition"
        >
          <PackagePlus size={13} /> Import more
        </button>
        <button
          onClick={() => navigate('/history')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-medium text-gray-200 transition"
        >
          <FolderOpen size={13} /> Go to Library
        </button>
      </div>
    </div>
  )
}
