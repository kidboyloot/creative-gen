import { useState, useRef } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Package, Upload, Loader2, Download, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import ModelSelect from '../components/ModelSelect'

interface ModelOption { id: string; label: string; description: string }

const MOCKUP_TEMPLATES = [
  { id: 't-shirt', label: 'T-Shirt', icon: '👕', prompt: 'product design printed on a premium cotton t-shirt, professional product photography, clean studio background, soft shadows' },
  { id: 'hoodie', label: 'Hoodie', icon: '🧥', prompt: 'design printed on a high-quality hoodie, lifestyle product photography, urban setting, professional lighting' },
  { id: 'mug', label: 'Mug', icon: '☕', prompt: 'design printed on a ceramic coffee mug, studio product photography, marble surface, warm natural lighting' },
  { id: 'phone-case', label: 'Phone Case', icon: '📱', prompt: 'design on a premium phone case, product photography, minimalist background, professional studio lighting' },
  { id: 'poster', label: 'Poster / Print', icon: '🖼️', prompt: 'design as a framed poster on a modern wall, interior design photography, scandinavian room, natural light' },
  { id: 'tote-bag', label: 'Tote Bag', icon: '👜', prompt: 'design printed on a canvas tote bag, lifestyle photography, outdoor cafe setting, bright natural light' },
  { id: 'pillow', label: 'Pillow', icon: '🛋️', prompt: 'design printed on a throw pillow, home interior photography, cozy couch setting, warm ambient light' },
  { id: 'sticker', label: 'Stickers', icon: '🏷️', prompt: 'design as die-cut vinyl stickers on a laptop, close-up product photography, clean background' },
]

const SCENES = [
  { id: 'studio', label: 'Studio', desc: 'Clean white studio background' },
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Natural lifestyle setting' },
  { id: 'flat-lay', label: 'Flat Lay', desc: 'Top-down flat lay composition' },
  { id: 'outdoor', label: 'Outdoor', desc: 'Natural outdoor environment' },
  { id: 'luxury', label: 'Luxury', desc: 'Premium luxury aesthetic' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean minimalist background' },
]

const SCENE_PROMPTS: Record<string, string> = {
  studio: 'professional studio photography, clean white background, soft even lighting, sharp focus',
  lifestyle: 'lifestyle photography, natural setting, warm tones, authentic feel',
  'flat-lay': 'flat lay photography, top-down view, organized arrangement, clean surface',
  outdoor: 'outdoor photography, natural sunlight, green nature background, lifestyle',
  luxury: 'luxury product photography, dark marble surface, gold accents, premium feel',
  minimal: 'minimal photography, simple clean background, subtle shadows, modern aesthetic',
}

export default function MockupPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('t-shirt')
  const [selectedScene, setSelectedScene] = useState('studio')
  const [customPrompt, setCustomPrompt] = useState('')
  const [model, setModel] = useState('flux-dev')
  const [count, setCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then(r => r.data),
    staleTime: Infinity,
  })

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults([])
  }

  const handleGenerate = async () => {
    if (!file) return
    setLoading(true)
    setResults([])

    // Upload reference image first
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    const uploadRes = await axios.post<{ image_id: string }>('/upload', uploadForm, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const imageId = uploadRes.data.image_id

    // Build the mockup prompt
    const template = MOCKUP_TEMPLATES.find(t => t.id === selectedTemplate)
    const scenePrompt = SCENE_PROMPTS[selectedScene] || ''
    const fullPrompt = customPrompt
      ? `${customPrompt}, ${scenePrompt}`
      : `${template?.prompt || ''}, ${scenePrompt}`

    try {
      const res = await axios.post<{ job_id: string }>('/generate', {
        image_id: imageId,
        prompts: [fullPrompt],
        formats: ['1:1'],
        types: ['image'],
        count,
        model,
      })

      // Poll for results
      const jobId = res.data.job_id
      let done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 2000))
        const status = await axios.get<{
          status: string
          assets: { url: string; type: string }[]
        }>(`/generate/status/${jobId}`)

        if (status.data.status === 'done' || status.data.status === 'failed') {
          done = true
          setResults(status.data.assets.filter(a => a.type === 'image').map(a => a.url))
        }
      }
    } catch (err) {
      console.error('Mockup generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Product Mockups</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload your design and generate professional product mockups for your store.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product / Design Image</label>
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
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload size={24} className="mx-auto text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">Upload your product image</p>
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

          {/* Product type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MOCKUP_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors',
                    selectedTemplate === t.id
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300',
                  )}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scene */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scene</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SCENES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScene(s.id)}
                  className={clsx(
                    'py-2 px-2 text-xs rounded-lg border transition-colors',
                    selectedScene === s.id
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Prompt <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={2}
              placeholder="Override with your own prompt..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
            />
          </div>

          <ModelSelect models={models} value={model} onChange={setModel} />

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Variants: <span className="text-brand-500 font-bold">{count}</span>
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!file || loading}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              file && !loading
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed',
            )}
          >
            {loading ? (
              <><Loader2 size={17} className="animate-spin" /> Generating mockups...</>
            ) : (
              <><Package size={17} /> Generate {count} Mockup{count !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {results.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-gray-300">Generated Mockups</h2>
              <div className="grid grid-cols-2 gap-3">
                {results.map((url, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={url} alt={`Mockup ${i + 1}`} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                      <a
                        href={url}
                        download={`mockup_${i + 1}.png`}
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
              <p className="font-medium">Generating your mockups...</p>
              <p className="text-xs text-gray-600 mt-1">This may take a moment</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-600 text-sm rounded-2xl border border-dashed border-white/[0.06]">
              <Package size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Your product mockups will appear here</p>
              <p className="text-xs text-gray-700 mt-1">Upload an image and choose a product type to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
