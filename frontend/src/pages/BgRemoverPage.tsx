import { useState, useRef } from 'react'
import axios from 'axios'
import { Eraser, Upload, Download, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

export default function BgRemoverPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'split' | 'result'>('split')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResultUrl(null)
  }

  const handleRemoveBg = async () => {
    if (!file) return
    setLoading(true)
    setResultUrl(null)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post<{ url: string }>('/tools/remove-bg', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultUrl(res.data.url)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Background removal failed. Please try again.'
      setError(msg)
      console.error('BG removal failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResultUrl(null)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Background Remover</h1>
        <p className="text-gray-400 text-sm mt-1">
          Remove backgrounds from product images instantly with AI.
        </p>
      </div>

      {!preview ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-2xl p-16 text-center cursor-pointer transition-colors"
        >
          <Eraser size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-300">Drop your product image here</p>
          <p className="text-sm text-gray-500 mt-2">PNG, JPG, WebP — perfect for supplier photos</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {resultUrl && (
                <>
                  <button
                    onClick={() => setViewMode('split')}
                    className={clsx(
                      'px-3 py-1.5 text-xs rounded-lg transition-colors',
                      viewMode === 'split' ? 'bg-brand-600 text-white' : 'bg-white/[0.05] text-gray-400',
                    )}
                  >
                    Before / After
                  </button>
                  <button
                    onClick={() => setViewMode('result')}
                    className={clsx(
                      'px-3 py-1.5 text-xs rounded-lg transition-colors',
                      viewMode === 'result' ? 'bg-brand-600 text-white' : 'bg-white/[0.05] text-gray-400',
                    )}
                  >
                    Result Only
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/[0.05] rounded-lg transition-colors"
              >
                <RefreshCw size={14} /> New image
              </button>
              {resultUrl && (
                <a
                  href={resultUrl}
                  download="no-background.png"
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Download size={15} /> Download PNG
                </a>
              )}
            </div>
          </div>

          {/* Image display */}
          <div className={clsx(
            'gap-6',
            viewMode === 'split' && resultUrl ? 'grid grid-cols-2' : 'flex justify-center',
          )}>
            {(viewMode === 'split' || !resultUrl) && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Original</p>
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0a0f]">
                  <img src={preview} alt="Original" className="w-full h-auto max-h-[500px] object-contain" />
                </div>
              </div>
            )}

            {resultUrl && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">No Background</p>
                <div
                  className="rounded-2xl overflow-hidden border border-white/[0.08]"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(#1a1a24 0% 25%, #22222e 0% 50%)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <img src={resultUrl} alt="No background" className="w-full h-auto max-h-[500px] object-contain" />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Remove button */}
          {!resultUrl && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRemoveBg}
                disabled={loading}
                className={clsx(
                  'w-full max-w-md flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer',
                  !loading
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'bg-white/[0.04] text-gray-500 cursor-not-allowed',
                )}
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> Removing background...</>
                ) : (
                  <><Eraser size={17} /> Remove Background</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Use cases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {[
          { title: 'Product Photos', desc: 'Clean white backgrounds for your store listings' },
          { title: 'Supplier Images', desc: 'Remove messy backgrounds from supplier photos' },
          { title: 'Ad Creatives', desc: 'Isolate products to place in custom scenes' },
        ].map(item => (
          <div key={item.title} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-medium text-gray-300">{item.title}</p>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
