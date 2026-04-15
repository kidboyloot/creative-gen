import { useState, useRef } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, Upload, Loader2, Download, RefreshCw, Type } from 'lucide-react'
import clsx from 'clsx'
import ModelSelect from '../components/ModelSelect'

interface ModelOption { id: string; label: string; description: string }

const PLATFORMS = [
  { id: 'ig-story', label: 'IG Story', format: '9:16', size: '1080×1920' },
  { id: 'ig-feed', label: 'IG Feed', format: '1:1', size: '1080×1080' },
  { id: 'fb-ad', label: 'Facebook Ad', format: '1:1', size: '1080×1080' },
  { id: 'tiktok', label: 'TikTok', format: '9:16', size: '1080×1920' },
  { id: 'shopify', label: 'Shopify Banner', format: '16:9', size: '1920×1080' },
]

const STYLE_PRESETS = [
  { id: 'minimal', label: 'Minimal', prompt: 'minimalist clean design, white space, elegant typography, modern' },
  { id: 'bold-sale', label: 'Bold Sale', prompt: 'bold sale advertisement, vibrant colors, big typography, urgent, eye-catching, promotional' },
  { id: 'luxury', label: 'Luxury', prompt: 'luxury premium aesthetic, dark background, gold accents, elegant, sophisticated' },
  { id: 'streetwear', label: 'Streetwear', prompt: 'urban streetwear aesthetic, grunge textures, bold graphics, edgy, youth culture' },
  { id: 'seasonal', label: 'Seasonal', prompt: 'seasonal themed advertisement, festive, warm colors, holiday feel, celebratory' },
  { id: 'organic', label: 'Organic / Natural', prompt: 'organic natural aesthetic, earth tones, botanical elements, sustainable feel, clean' },
]

export default function AdCreatorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [headline, setHeadline] = useState('')
  const [cta, setCta] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ig-feed'])
  const [selectedStyle, setSelectedStyle] = useState('minimal')
  const [brandColors, setBrandColors] = useState({ primary: '#ff9800', secondary: '#1a1a2e' })
  const [model, setModel] = useState('flux-dev')
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ url: string; format: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then(r => r.data),
    staleTime: Infinity,
  })

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults([])
  }

  const handleGenerate = async () => {
    if (!file || selectedPlatforms.length === 0) return
    setLoading(true)
    setResults([])

    // Upload
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    const uploadRes = await axios.post<{ image_id: string }>('/upload', uploadForm, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const imageId = uploadRes.data.image_id

    const style = STYLE_PRESETS.find(s => s.id === selectedStyle)
    const formats = [...new Set(selectedPlatforms.map(p => PLATFORMS.find(pl => pl.id === p)?.format || '1:1'))]

    // Build ad-optimized prompt
    const adPrompt = [
      `Professional advertisement creative`,
      headline && `featuring headline text "${headline}"`,
      cta && `with call-to-action "${cta}"`,
      `brand colors ${brandColors.primary} and ${brandColors.secondary}`,
      style?.prompt,
      'high quality, professional advertising, commercial photography',
    ].filter(Boolean).join(', ')

    try {
      const res = await axios.post<{ job_id: string }>('/generate', {
        image_id: imageId,
        prompts: [adPrompt],
        formats,
        types: ['image'],
        count,
        model,
      })

      // Poll
      const jobId = res.data.job_id
      let done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 2000))
        const status = await axios.get<{
          status: string
          assets: { url: string; type: string; format: string }[]
        }>(`/generate/status/${jobId}`)

        if (status.data.status === 'done' || status.data.status === 'failed') {
          done = true
          setResults(
            status.data.assets
              .filter(a => a.type === 'image')
              .map(a => ({ url: a.url, format: a.format }))
          )
        }
      }
    } catch (err) {
      console.error('Ad creation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ad Creator</h1>
        <p className="text-gray-400 text-sm mt-1">
          Generate scroll-stopping ad creatives for every platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Image</label>
            {preview ? (
              <div className="relative group">
                <img src={preview} alt="Product" className="w-full rounded-xl border border-white/[0.08]" />
                <button
                  onClick={() => { setFile(null); setPreview(null); setResults([]) }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload size={20} className="mx-auto text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">Upload product image</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Headline + CTA */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Headline</label>
              <input
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="e.g. Summer Sale — 50% OFF"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">CTA</label>
              <input
                value={cta}
                onChange={e => setCta(e.target.value)}
                placeholder="e.g. Shop Now"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          {/* Platform selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Platforms</label>
            <div className="flex gap-1.5 flex-wrap">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={clsx(
                    'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                    selectedPlatforms.includes(p.id)
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-white/[0.06] text-gray-500 hover:text-gray-300',
                  )}
                >
                  {p.label}
                  <span className="ml-1 text-[10px] text-gray-600">{p.format}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Style Preset</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={clsx(
                    'py-2 text-xs rounded-lg border transition-colors',
                    selectedStyle === s.id
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-white/[0.06] text-gray-500 hover:text-gray-300',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand colors */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Brand Colors</label>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColors.primary}
                  onChange={e => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-white/[0.1] cursor-pointer bg-transparent"
                />
                <span className="text-xs text-gray-500">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColors.secondary}
                  onChange={e => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-white/[0.1] cursor-pointer bg-transparent"
                />
                <span className="text-xs text-gray-500">Secondary</span>
              </div>
            </div>
          </div>

          <ModelSelect models={models} value={model} onChange={setModel} />

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Variants: <span className="text-brand-500 font-bold">{count}</span>
            </label>
            <input type="range" min={1} max={12} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-brand-500" />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!file || selectedPlatforms.length === 0 || loading}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              file && selectedPlatforms.length > 0 && !loading
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed',
            )}
          >
            {loading ? (
              <><Loader2 size={17} className="animate-spin" /> Creating ads...</>
            ) : (
              <><Megaphone size={17} /> Create {count} Ad{count !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {results.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-gray-300">Generated Ads</h2>
              <div className="grid grid-cols-2 gap-3">
                {results.map((r, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={r.url} alt={`Ad ${i + 1}`} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-xs text-white bg-black/40 px-2 py-1 rounded">{r.format}</span>
                      <a
                        href={r.url}
                        download={`ad_${r.format.replace(':', 'x')}_${i + 1}.png`}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <Download size={16} className="text-white" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <Loader2 size={40} className="animate-spin mb-4 text-brand-500" />
              <p className="font-medium">Creating your ad creatives...</p>
              <p className="text-xs text-gray-600 mt-1">This may take a moment</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-600 text-sm rounded-2xl border border-dashed border-white/[0.06]">
              <Megaphone size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Your ad creatives will appear here</p>
              <p className="text-xs text-gray-700 mt-1">Upload a product image to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
