import { Loader2 } from 'lucide-react'

export default function PushingStep() {
  return (
    <div className="max-w-md mx-auto p-16 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-4">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
      <h2 className="text-lg font-semibold text-white">Creating Shopify drafts…</h2>
      <p className="text-sm text-gray-400 mt-1">Hang tight — uploading translations and images to your store.</p>
    </div>
  )
}
