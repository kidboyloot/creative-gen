import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { useMultiProductStore } from '../../store/multiProductStore'
import { useShopifyImportStatus } from '../../hooks/useShopifyImportStatus'
import { pushDrafts } from '../../api/shopify'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ConfirmPushDialog({ open, onClose }: Props) {
  const {
    activeJobId,
    reviewOverrides,
    setStep,
    setPushResults,
  } = useMultiProductStore()
  const { data: status } = useShopifyImportStatus(activeJobId)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!activeJobId || !status) return
    setSubmitting(true)
    setError(null)
    setStep('pushing')
    try {
      const unpushed = status.variants.filter((v) => !v.pushed)
      const overrides = unpushed
        .map((v) => {
          const o = reviewOverrides[v.id] || {}
          if (Object.keys(o).length === 0) return null
          return {
            variant_id: v.id,
            translated_title: o.title,
            translated_description: o.description,
            translated_tags: o.tags,
            price: o.price,
            currency: o.currency,
            selected_image_ids: o.selectedImageIds,
          }
        })
        .filter(Boolean) as any[]

      const res = await pushDrafts(
        activeJobId,
        unpushed.map((v) => v.id),
        overrides,
      )
      setPushResults(res.created)
      setStep('success')
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Push failed')
      setStep('review')
    } finally {
      setSubmitting(false)
    }
  }

  const unpushedCount = status?.variants.filter((v) => !v.pushed).length ?? 0
  const shopName = status?.shop?.name || status?.shop?.domain || 'your store'

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Create drafts on Shopify?"
      size="sm"
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
            disabled={submitting || unpushedCount === 0}
            className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create {unpushedCount} drafts
          </button>
        </>
      }
    >
      <div className="p-5 space-y-3 text-sm text-gray-300">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            Products will be created as <span className="text-white font-semibold">drafts</span> on{' '}
            <span className="text-brand-400">{shopName}</span>. They stay hidden until you publish them from the
            Shopify admin.
          </p>
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
