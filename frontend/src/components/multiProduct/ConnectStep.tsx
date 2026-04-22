import { useEffect, useState } from 'react'
import { Plus, Store, Trash2, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Modal from '../ui/Modal'
import { useMultiProductStore } from '../../store/multiProductStore'
import { connectStore, deleteConnection, listConnections } from '../../api/shopify'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function ConnectStep() {
  const qc = useQueryClient()
  const {
    connections,
    activeConnectionId,
    setConnections,
    setActiveConnectionId,
    setStep,
  } = useMultiProductStore()

  const [addOpen, setAddOpen] = useState(false)
  const [mode, setMode] = useState<'oauth_cc' | 'static'>('oauth_cc')
  const [shop, setShop] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: fetched } = useQuery({
    queryKey: ['shopify', 'connections'],
    queryFn: listConnections,
    retry: false,
  })

  useEffect(() => {
    if (Array.isArray(fetched)) setConnections(fetched)
  }, [fetched, setConnections])

  // Auto-skip Connect step on first page load only — if the user came back
  // via "Back to stores" they explicitly want to manage connections, so we
  // use sessionStorage (not component state) so the flag survives the
  // unmount/remount caused by setStep().
  useEffect(() => {
    if (!Array.isArray(fetched) || fetched.length === 0) return
    if (sessionStorage.getItem('mpc.autoSkipped') === '1') return
    sessionStorage.setItem('mpc.autoSkipped', '1')
    setStep('collection')
  }, [fetched, setStep])

  const canSubmit =
    shop.trim().length > 0 &&
    (mode === 'oauth_cc'
      ? clientId.trim().length > 0 && clientSecret.trim().length > 0
      : token.trim().length > 0)

  async function handleAdd() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = mode === 'oauth_cc'
        ? { shop_domain: shop.trim(), client_id: clientId.trim(), client_secret: clientSecret.trim() }
        : { shop_domain: shop.trim(), access_token: token.trim() }
      const conn = await connectStore(payload)
      const next = [conn, ...connections.filter((c) => c.id !== conn.id)]
      setConnections(next)
      setActiveConnectionId(conn.id)
      setShop('')
      setClientId('')
      setClientSecret('')
      setToken('')
      setAddOpen(false)
      qc.invalidateQueries({ queryKey: ['shopify', 'connections'] })
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Could not connect')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this Shopify store from Creative Gen? Your products stay safe on Shopify.')) return
    await deleteConnection(id)
    setConnections(connections.filter((c) => c.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Connect your Shopify store</h1>
        <p className="text-sm text-gray-400 mt-1.5">
          Paste a shop URL and Admin API access token. Create one under{' '}
          <span className="text-gray-300">Settings → Apps and sales channels → Develop apps → Install app</span>{' '}
          with read/write permissions for products and collections.
        </p>
      </div>

      <div className="space-y-2">
        {connections.length === 0 && (
          <div className="px-5 py-6 rounded-xl border border-dashed border-white/10 text-center text-sm text-gray-500">
            No stores connected yet.
          </div>
        )}
        {connections.map((c) => {
          const active = c.id === activeConnectionId
          return (
            <div
              key={c.id}
              onClick={() => setActiveConnectionId(c.id)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition',
                active
                  ? 'border-brand-500/60 bg-brand-500/8 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]',
              )}
            >
              <div className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                active ? 'bg-brand-500 text-white' : 'bg-white/[0.05] text-gray-400',
              )}>
                <Store size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {c.shop_name || c.shop_domain}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {c.shop_domain} · {c.currency}
                </p>
              </div>
              {active && <Check size={14} className="text-brand-400" />}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setAddOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-sm font-medium text-gray-200 transition"
        >
          <Plus size={14} /> Add store
        </button>
        <button
          onClick={() => setStep('collection')}
          disabled={!activeConnectionId}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition"
        >
          Continue
        </button>
      </div>

      <Modal
        open={addOpen}
        onClose={() => !submitting && setAddOpen(false)}
        title="Add Shopify store"
        subtitle="We store your token locally to sync products. You can remove it anytime."
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting || !canSubmit}
              className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Connect
            </button>
          </>
        }
      >
        <div className="p-5 space-y-4">
          {/* Mode switch */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('oauth_cc')}
              className={clsx(
                'text-left p-3 rounded-xl border text-xs transition',
                mode === 'oauth_cc'
                  ? 'border-brand-500/60 bg-brand-500/8 text-white'
                  : 'border-white/[0.08] bg-white/[0.02] text-gray-300 hover:border-white/[0.15]',
              )}
            >
              <p className="font-semibold">Client ID + Secret</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Recommended. Required for apps created after Jan 2026. Token renovates automaticamente.</p>
            </button>
            <button
              onClick={() => setMode('static')}
              className={clsx(
                'text-left p-3 rounded-xl border text-xs transition',
                mode === 'static'
                  ? 'border-brand-500/60 bg-brand-500/8 text-white'
                  : 'border-white/[0.08] bg-white/[0.02] text-gray-300 hover:border-white/[0.15]',
              )}
            >
              <p className="font-semibold">Admin API token (legacy)</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Só para apps antigas que ainda têm <span className="font-mono">shpat_…</span>.</p>
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Shop domain</label>
            <input
              autoFocus
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="mystore.myshopify.com"
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition"
            />
          </div>

          {mode === 'oauth_cc' ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Client ID</label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="ex: 1abc234de5f6g7…"
                  className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Client Secret</label>
                <input
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="shpss_…"
                  type="password"
                  className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Copia da tua Custom App em <span className="text-gray-400">Settings → Apps and sales channels → Develop apps → a tua app → API credentials</span>. Começa por <span className="font-mono text-gray-400">1…</span> (client_id) e <span className="font-mono text-gray-400">shpss_…</span> (client_secret). A app tem que estar <span className="text-gray-300">Installed</span>.
              </p>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin API access token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="shpat_…"
                type="password"
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none transition font-mono"
              />
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
