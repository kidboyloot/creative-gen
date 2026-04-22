import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Gem, Upload, Loader2, Download, RefreshCw, Sparkles, Image as ImageIcon,
  Layers, CreditCard, Camera
} from 'lucide-react'
import clsx from 'clsx'
import Dropdown from '../components/ui/Dropdown'
import { useAuthStore } from '../store/authStore'

interface ModelOption { id: string; label: string; description: string }
type Tab = 'ads' | 'scenario' | 'cards'

const JEWELLERY_TYPES = [
  { id: 'ring', label: 'Rings', icon: '💍' },
  { id: 'necklace', label: 'Necklaces', icon: '📿' },
  { id: 'bracelet', label: 'Bracelets', icon: '⌚' },
  { id: 'earrings', label: 'Earrings', icon: '✨' },
  { id: 'watch', label: 'Watches', icon: '⏱️' },
  { id: 'pendant', label: 'Pendants', icon: '🔮' },
]

// ── Ads Tab ──
const AD_SCENES = [
  { id: 'studio-white', label: 'Studio White', prompt: 'clean white studio background, professional product photography, soft even lighting, sharp focus, luxury feel' },
  { id: 'studio-dark', label: 'Studio Dark', prompt: 'dark moody studio background, dramatic lighting, elegant shadows, luxury jewellery photography, premium feel' },
  { id: 'marble', label: 'Marble Surface', prompt: 'white marble surface, elegant product photography, soft reflections, luxury aesthetic, clean minimalist' },
  { id: 'velvet', label: 'Velvet Box', prompt: 'dark velvet jewellery box, close-up product shot, rich texture, luxury presentation, gift ready' },
  { id: 'model-hand', label: 'On Model (Hand)', prompt: 'jewellery worn on elegant female hand, close-up lifestyle photography, natural skin tones, soft bokeh background' },
  { id: 'model-neck', label: 'On Model (Neck)', prompt: 'jewellery worn on neck/décolletage, lifestyle photography, elegant pose, soft natural lighting, beauty editorial' },
  { id: 'flat-lay', label: 'Flat Lay', prompt: 'flat lay arrangement, top-down product photography, scattered petals and fabric, aesthetic composition, instagram style' },
  { id: 'golden-hour', label: 'Golden Hour', prompt: 'golden hour sunlight, warm glow on jewellery, outdoor lifestyle, dreamy bokeh, romantic feel' },
]

const AD_STYLES = [
  { id: 'luxury', label: 'Luxury', prompt: 'luxury premium aesthetic, high-end, sophisticated, elegant' },
  { id: 'minimal', label: 'Minimal', prompt: 'minimal clean aesthetic, simple composition, modern, less is more' },
  { id: 'editorial', label: 'Editorial', prompt: 'editorial fashion photography, magazine quality, artistic, high fashion' },
  { id: 'lifestyle', label: 'Lifestyle', prompt: 'lifestyle photography, authentic, warm, everyday luxury, relatable' },
  { id: 'bold', label: 'Bold Ad', prompt: 'bold advertisement style, eye-catching, vibrant, promotional, commercial' },
  { id: 'vintage', label: 'Vintage', prompt: 'vintage aesthetic, antique feel, warm film tones, classic elegance, retro' },
]

// ── Scenario Creator Tab ──
const SCENARIO_ENVIRONMENTS = [
  { id: 'beach-sunset', label: 'Beach Sunset', prompt: 'jewellery displayed on sand at sunset beach, ocean waves in background, golden warm light, tropical luxury, paradise vibes' },
  { id: 'paris-cafe', label: 'Paris Café', prompt: 'jewellery on a marble café table in Paris, croissant and espresso nearby, Eiffel Tower blurred in background, romantic parisian aesthetic' },
  { id: 'snowy-mountain', label: 'Snow & Ice', prompt: 'jewellery on ice crystals, snowy winter landscape, cold blue tones, sparkling frost, winter luxury campaign' },
  { id: 'garden', label: 'Botanical Garden', prompt: 'jewellery among fresh flowers and green leaves, botanical garden setting, natural light, organic luxury, spring collection' },
  { id: 'city-night', label: 'City Nightlife', prompt: 'jewellery with city lights bokeh at night, urban luxury, neon reflections, metropolitan glamour, night out' },
  { id: 'underwater', label: 'Underwater', prompt: 'jewellery underwater with light rays and bubbles, aquatic blue tones, surreal luxury, ocean inspired, mermaid aesthetic' },
  { id: 'desert', label: 'Desert Dunes', prompt: 'jewellery on desert sand dunes, golden hour, warm earth tones, Arabian luxury, exotic landscape' },
  { id: 'cherry-blossom', label: 'Cherry Blossom', prompt: 'jewellery with pink cherry blossom petals falling, japanese spring aesthetic, soft pastel tones, romantic, delicate' },
  { id: 'christmas', label: 'Christmas', prompt: 'jewellery in Christmas gift setting, red ribbon, pine branches, gold ornaments, festive warm lighting, holiday gift guide' },
  { id: 'valentines', label: 'Valentine\'s Day', prompt: 'jewellery with red roses and hearts, romantic Valentine setting, love and luxury, gift for her, red and gold tones' },
  { id: 'wedding', label: 'Wedding', prompt: 'bridal jewellery on white lace and silk, wedding bouquet nearby, soft romantic lighting, bridal editorial, elegant and timeless' },
  { id: 'art-gallery', label: 'Art Gallery', prompt: 'jewellery displayed like art in modern gallery, minimalist white walls, museum lighting, art meets fashion, cultural luxury' },
]

const SCENARIO_MOODS = [
  { id: 'romantic', label: 'Romantic', prompt: 'romantic, soft, warm tones, intimate, dreamy' },
  { id: 'dramatic', label: 'Dramatic', prompt: 'dramatic, high contrast, bold shadows, intense, cinematic' },
  { id: 'fresh', label: 'Fresh & Clean', prompt: 'fresh, clean, bright, airy, modern, crisp' },
  { id: 'mysterious', label: 'Mysterious', prompt: 'mysterious, dark, moody, enigmatic, alluring' },
  { id: 'playful', label: 'Playful', prompt: 'playful, colorful, fun, youthful, energetic' },
  { id: 'regal', label: 'Regal', prompt: 'regal, royal, majestic, opulent, crown jewels aesthetic' },
]

// ── Cards Creator Tab ──
const CARD_TEMPLATES = [
  { id: 'product-card', label: 'Product Card', prompt: 'single product showcase, clean background, product name space at bottom, price tag area, ecommerce product card layout' },
  { id: 'sale-card', label: 'Sale / Discount', prompt: 'sale promotion card, bold discount badge, urgent feel, limited time offer layout, promotional jewellery card' },
  { id: 'new-arrival', label: 'New Arrival', prompt: 'new arrival announcement card, fresh and exciting, spotlight on product, NEW badge, collection launch' },
  { id: 'collection', label: 'Collection Card', prompt: 'jewellery collection showcase, multiple pieces arranged elegantly, collection name space, brand aesthetic, catalog style' },
  { id: 'gift-guide', label: 'Gift Guide', prompt: 'gift guide card, wrapped present elements, for her / for him, gift suggestion layout, holiday shopping' },
  { id: 'testimonial', label: 'Testimonial', prompt: 'customer review card, 5 stars, quote space, product photo with social proof, trust building layout' },
  { id: 'comparison', label: 'Before / After', prompt: 'before and after comparison card, split layout, transformation showcase, styling suggestion' },
  { id: 'story-slide', label: 'Story Slide', prompt: 'instagram story slide card, 9:16 vertical, swipe up layout, engaging story content, jewellery featured' },
]

const CARD_FORMATS = [
  { id: '1:1', label: '1:1 Feed' },
  { id: '9:16', label: '9:16 Story' },
  { id: '4:5', label: '4:5 Portrait' },
  { id: '16:9', label: '16:9 Banner' },
]

const CARD_COLOR_THEMES = [
  { id: 'gold-black', label: 'Gold & Black', prompt: 'gold and black color scheme, luxury dark theme, gold accents' },
  { id: 'rose-gold', label: 'Rose Gold', prompt: 'rose gold and blush pink color scheme, feminine luxury, soft metallic' },
  { id: 'silver-white', label: 'Silver & White', prompt: 'silver and white color scheme, clean modern luxury, platinum tones' },
  { id: 'navy-gold', label: 'Navy & Gold', prompt: 'navy blue and gold color scheme, royal luxury, classic elegance' },
  { id: 'blush-cream', label: 'Blush & Cream', prompt: 'blush pink and cream color scheme, soft romantic, feminine' },
  { id: 'emerald', label: 'Emerald', prompt: 'emerald green and gold color scheme, rich jewel tones, opulent' },
]

const FORMATS = ['1:1', '9:16', '16:9']

export default function JewelleryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ads')

  // Shared
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [jewelleryType, setJewelleryType] = useState('ring')
  const [model, setModel] = useState('flux-jewellery')
  const [count, setCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateCredits = useAuthStore(s => s.updateCredits)

  // Ads tab
  const [adScene, setAdScene] = useState('studio-white')
  const [adStyle, setAdStyle] = useState('luxury')
  const [adFormat, setAdFormat] = useState('1:1')

  // Scenario tab
  const [scenarioEnv, setScenarioEnv] = useState('beach-sunset')
  const [scenarioMood, setScenarioMood] = useState('romantic')
  const [scenarioFormat, setScenarioFormat] = useState('1:1')

  // Cards tab
  const [cardTemplate, setCardTemplate] = useState('product-card')
  const [cardFormat, setCardFormat] = useState('1:1')
  const [cardColorTheme, setCardColorTheme] = useState('gold-black')
  const [cardHeadline, setCardHeadline] = useState('')
  const [cardSubtext, setCardSubtext] = useState('')

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

  const generate = async (prompt: string, format: string) => {
    if (!file) return
    setLoading(true)
    setResults([])

    const uploadForm = new FormData()
    uploadForm.append('file', file)
    const uploadRes = await axios.post<{ image_id: string }>('/upload', uploadForm, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    try {
      const res = await axios.post<{ job_id: string }>('/generate', {
        image_id: uploadRes.data.image_id,
        prompts: [prompt],
        formats: [format],
        types: ['image'],
        count,
        model,
      })

      const jobId = res.data.job_id
      let done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 2000))
        const status = await axios.get<{ status: string; assets: { url: string; type: string }[] }>(`/generate/status/${jobId}`)
        if (status.data.status === 'done' || status.data.status === 'failed') {
          done = true
          setResults(status.data.assets.filter(a => a.type === 'image').map(a => a.url))
          axios.get('/auth/me').then(r => updateCredits(r.data.credits)).catch(() => {})
        }
      }
    } catch (err) {
      console.error('Generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAds = () => {
    const typeInfo = JEWELLERY_TYPES.find(t => t.id === jewelleryType)
    const sceneInfo = AD_SCENES.find(s => s.id === adScene)
    const styleInfo = AD_STYLES.find(s => s.id === adStyle)
    const prompt = customPrompt
      ? `${customPrompt}, ${sceneInfo?.prompt}, ${styleInfo?.prompt}, jewellery photography`
      : `Beautiful ${typeInfo?.label.toLowerCase()} product photography, ${sceneInfo?.prompt}, ${styleInfo?.prompt}, professional jewellery ad, sharp details`
    generate(prompt, adFormat)
  }

  const handleGenerateScenario = () => {
    const typeInfo = JEWELLERY_TYPES.find(t => t.id === jewelleryType)
    const envInfo = SCENARIO_ENVIRONMENTS.find(e => e.id === scenarioEnv)
    const moodInfo = SCENARIO_MOODS.find(m => m.id === scenarioMood)
    const prompt = customPrompt
      ? `${customPrompt}, ${envInfo?.prompt}, ${moodInfo?.prompt}`
      : `${typeInfo?.label.toLowerCase()} jewellery, ${envInfo?.prompt}, ${moodInfo?.prompt}, professional campaign photography, high quality`
    generate(prompt, scenarioFormat)
  }

  const handleGenerateCards = () => {
    const typeInfo = JEWELLERY_TYPES.find(t => t.id === jewelleryType)
    const templateInfo = CARD_TEMPLATES.find(t => t.id === cardTemplate)
    const colorInfo = CARD_COLOR_THEMES.find(c => c.id === cardColorTheme)
    let prompt = `${typeInfo?.label.toLowerCase()} jewellery, ${templateInfo?.prompt}, ${colorInfo?.prompt}, social media card design, professional`
    if (cardHeadline) prompt += `, with text "${cardHeadline}"`
    if (cardSubtext) prompt += `, subtitle "${cardSubtext}"`
    if (customPrompt) prompt = `${customPrompt}, ${prompt}`
    generate(prompt, cardFormat)
  }

  const TABS = [
    { id: 'ads' as Tab, label: 'Ad Creatives', icon: Camera },
    { id: 'scenario' as Tab, label: 'Scenario Creator', icon: Layers },
    { id: 'cards' as Tab, label: 'Cards Creator', icon: CreditCard },
  ]

  // Shared upload component
  const UploadSection = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Jewellery Photo</label>
      {preview ? (
        <div className="relative group">
          <img src={preview} alt="Jewellery" className="w-full rounded-xl border border-white/[0.08]" />
          <button onClick={() => { setFile(null); setPreview(null); setResults([]) }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <RefreshCw size={14} />
          </button>
        </div>
      ) : (
        <div onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-amber-500/20 hover:border-amber-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors bg-amber-500/[0.02]">
          <Gem size={24} className="mx-auto text-amber-500/40 mb-2" />
          <p className="text-sm text-gray-400">Upload jewellery image</p>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )

  const TypeSelector = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
      <div className="grid grid-cols-3 gap-1.5">
        {JEWELLERY_TYPES.map(t => (
          <button key={t.id} onClick={() => setJewelleryType(t.id)}
            className={clsx('flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors',
              jewelleryType === t.id ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
            <span className="text-sm">{t.icon}</span>
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const ResultsPanel = () => (
    <div className="lg:col-span-2">
      {results.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-300">Results</h2>
          <div className="grid grid-cols-2 gap-3">
            {results.map((url, i) => (
              <div key={i} className="group relative rounded-xl overflow-hidden border border-white/[0.08] bg-black">
                <img src={url} alt={`Result ${i + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-xs text-white bg-black/40 px-2 py-1 rounded">#{i + 1}</span>
                  <a href={url} download={`jewellery_${activeTab}_${i + 1}.png`}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <Download size={16} className="text-white" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <Loader2 size={40} className="animate-spin mb-4 text-amber-500" />
          <p className="font-medium">Creating jewellery creatives...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-96 text-gray-600 text-sm rounded-2xl border border-dashed border-amber-500/10">
          <Gem size={48} className="mb-4 opacity-20 text-amber-500" />
          <p className="font-medium">Your jewellery creatives will appear here</p>
          <p className="text-xs text-gray-700 mt-1">Upload an image and configure your settings</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Jewellery Ads</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-full">Studio</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">Professional jewellery ad creatives, scenarios, and social media cards.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setResults([]) }}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === t.id ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Ads Tab ── */}
        {activeTab === 'ads' && (
          <div className="lg:col-span-1 space-y-4">
            <UploadSection />
            <TypeSelector />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Scene</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {AD_SCENES.map(s => (
                  <button key={s.id} onClick={() => setAdScene(s.id)}
                    className={clsx('py-2 px-2 text-[11px] rounded-lg border transition-colors text-left',
                      adScene === s.id ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
              <div className="grid grid-cols-3 gap-1.5">
                {AD_STYLES.map(s => (
                  <button key={s.id} onClick={() => setAdStyle(s.id)}
                    className={clsx('py-1.5 text-[11px] rounded-lg border transition-colors',
                      adStyle === s.id ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Custom Prompt <span className="text-xs text-gray-500 font-normal">(optional)</span></label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder="e.g. diamond ring on rose petals..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex gap-1">
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => setAdFormat(f)}
                      className={clsx('flex-1 py-1.5 text-xs rounded-lg border transition-colors',
                        adFormat === f ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white/[0.03] border-white/[0.08] text-gray-400')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <Dropdown
                className="w-20"
                value={String(count)}
                onChange={(v) => setCount(Number(v))}
                searchable={false}
                options={[2, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
              />
            </div>

            <button onClick={handleGenerateAds} disabled={!file || loading}
              className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                file && !loading ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Generating...</> : <><Camera size={17} /> Generate {count} Ads</>}
            </button>
          </div>
        )}

        {/* ── Scenario Creator Tab ── */}
        {activeTab === 'scenario' && (
          <div className="lg:col-span-1 space-y-4">
            <UploadSection />
            <TypeSelector />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Environment</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {SCENARIO_ENVIRONMENTS.map(e => (
                  <button key={e.id} onClick={() => setScenarioEnv(e.id)}
                    className={clsx('py-2 px-2.5 text-[11px] rounded-lg border transition-colors text-left',
                      scenarioEnv === e.id ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
              <div className="grid grid-cols-3 gap-1.5">
                {SCENARIO_MOODS.map(m => (
                  <button key={m.id} onClick={() => setScenarioMood(m.id)}
                    className={clsx('py-1.5 text-[11px] rounded-lg border transition-colors',
                      scenarioMood === m.id ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Custom Prompt <span className="text-xs text-gray-500 font-normal">(optional)</span></label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder="e.g. floating in space with stars..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex gap-1">
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => setScenarioFormat(f)}
                      className={clsx('flex-1 py-1.5 text-xs rounded-lg border transition-colors',
                        scenarioFormat === f ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white/[0.03] border-white/[0.08] text-gray-400')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <Dropdown
                className="w-20"
                value={String(count)}
                onChange={(v) => setCount(Number(v))}
                searchable={false}
                options={[2, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
              />
            </div>

            <button onClick={handleGenerateScenario} disabled={!file || loading}
              className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                file && !loading ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Creating scenarios...</> : <><Layers size={17} /> Generate {count} Scenarios</>}
            </button>
          </div>
        )}

        {/* ── Cards Creator Tab — full-width iframe ── */}
        {activeTab === 'cards' && (
          <div className="lg:col-span-3 -mx-8 -mb-8" style={{ height: 'calc(100vh - 180px)' }}>
            <iframe
              src="/card-creator.html"
              title="Card Creator Pro"
              className="w-full h-full border-none"
            />
          </div>
        )}

        {/* Results panel (for ads + scenario tabs) */}
        {activeTab !== 'cards' && <ResultsPanel />}
      </div>
    </div>
  )
}
