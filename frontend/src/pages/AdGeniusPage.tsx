import { useState, useRef } from 'react'
import axios from 'axios'
import {
  Search, Filter, TrendingUp, Heart, Play, Eye, Sparkles, X, Loader2,
  Zap, Target, Brain, MessageSquare, Copy, Check, ChevronDown,
  Upload, ArrowRight, Star, ExternalLink, RefreshCw, Download, Radio, Globe
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

// ── Types ──
interface MockAd {
  id: string
  brand: string
  brandLogo: string
  imageUrl: string
  platform: 'meta' | 'tiktok' | 'pinterest'
  mediaType: 'video' | 'image' | 'carousel'
  niche: string
  isFavorited: boolean
  reach?: string
  days?: number
}

interface LiveAd {
  id: string
  brand: string
  page_id: string
  headline: string
  body: string
  platforms: string[]
  start_date: string
  snapshot_url: string
  is_active: boolean
}

interface Analysis {
  hook?: string
  painPoint?: string
  emotionalTrigger?: string
  ctaType?: string
  targetAudience?: string
  visualStyle?: string
  colorPalette?: string
  whyItWorks?: string
  weaknesses?: string
  adCopy?: string
}

interface CopyVariation {
  headline: string
  body: string
  cta: string
}

// ── Real Brand Mock Data ──
const MOCK_ADS: MockAd[] = [
  // Beauty
  { id: '1', brand: 'Gymshark', brandLogo: '🦈', imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'video', niche: 'fitness', isFavorited: false, reach: '12.4M', days: 90 },
  { id: '2', brand: 'The Ordinary', brandLogo: '🧪', imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'image', niche: 'beauty', isFavorited: true, reach: '8.2M', days: 120 },
  { id: '3', brand: 'SHEIN', brandLogo: '👗', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=500&fit=crop', platform: 'tiktok', mediaType: 'video', niche: 'fashion', isFavorited: false, reach: '45M', days: 60 },
  { id: '4', brand: 'Dyson', brandLogo: '💨', imageUrl: 'https://images.unsplash.com/photo-1527515637462-cee1b5fae038?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'video', niche: 'home', isFavorited: false, reach: '6.8M', days: 75 },
  { id: '5', brand: 'CeraVe', brandLogo: '💧', imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', platform: 'meta', mediaType: 'carousel', niche: 'beauty', isFavorited: true, reach: '15M', days: 180 },
  { id: '6', brand: 'Nike', brandLogo: '✓', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'video', niche: 'fitness', isFavorited: false, reach: '28M', days: 45 },
  { id: '7', brand: 'IKEA', brandLogo: '🏠', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop', platform: 'pinterest', mediaType: 'image', niche: 'home', isFavorited: false, reach: '9.5M', days: 150 },
  { id: '8', brand: 'Zara', brandLogo: '🖤', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'video', niche: 'fashion', isFavorited: false, reach: '18M', days: 55 },
  { id: '9', brand: 'Glossier', brandLogo: '🌸', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop', platform: 'tiktok', mediaType: 'video', niche: 'beauty', isFavorited: true, reach: '5.2M', days: 38 },
  { id: '10', brand: 'Myprotein', brandLogo: '💪', imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'image', niche: 'fitness', isFavorited: false, reach: '7.1M', days: 95 },
  { id: '11', brand: 'H&M', brandLogo: '👔', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'carousel', niche: 'fashion', isFavorited: false, reach: '22M', days: 40 },
  { id: '12', brand: 'West Elm', brandLogo: '🪴', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop', platform: 'pinterest', mediaType: 'image', niche: 'home', isFavorited: false, reach: '3.4M', days: 110 },
  { id: '13', brand: 'Fenty Beauty', brandLogo: '💎', imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=500&fit=crop', platform: 'tiktok', mediaType: 'video', niche: 'beauty', isFavorited: false, reach: '11M', days: 65 },
  { id: '14', brand: 'Adidas', brandLogo: '☘', imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=500&fit=crop', platform: 'meta', mediaType: 'video', niche: 'fitness', isFavorited: false, reach: '20M', days: 50 },
  { id: '15', brand: 'Wayfair', brandLogo: '🏡', imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=400&fit=crop', platform: 'meta', mediaType: 'image', niche: 'home', isFavorited: false, reach: '8.9M', days: 85 },
  { id: '16', brand: 'Fashion Nova', brandLogo: '⭐', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop', platform: 'tiktok', mediaType: 'video', niche: 'fashion', isFavorited: false, reach: '32M', days: 30 },
]

const PLATFORMS = ['all', 'meta', 'tiktok', 'pinterest']
const MEDIA_TYPES = ['all', 'video', 'image', 'carousel']
const NICHES = ['all', 'beauty', 'fashion', 'fitness', 'home']
const SORT_OPTIONS = ['Most Recent', 'Longest Running', 'Highest Reach']
const TONES = [
  { id: 'aggressive', label: 'Aggressive', desc: 'Urgent, FOMO, direct-response' },
  { id: 'soft', label: 'Soft', desc: 'Empathetic, trust-building' },
  { id: 'humorous', label: 'Humorous', desc: 'Witty, meme-worthy' },
  { id: 'educational', label: 'Educational', desc: 'Authority, data-driven' },
]

export default function AdGeniusPage() {
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [mediaFilter, setMediaFilter] = useState('all')
  const [nicheFilter, setNicheFilter] = useState('all')
  const [sortBy, setSortBy] = useState('Longest Running')
  const [favorites, setFavorites] = useState<Set<string>>(new Set(MOCK_ADS.filter(a => a.isFavorited).map(a => a.id)))
  const [showFavOnly, setShowFavOnly] = useState(false)

  // Analyzer drawer
  const [selectedAd, setSelectedAd] = useState<MockAd | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null)

  // Copy generator
  const [showCopyGen, setShowCopyGen] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [product, setProduct] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [tone, setTone] = useState('aggressive')
  const [generatingCopy, setGeneratingCopy] = useState(false)
  const [copyVariations, setCopyVariations] = useState<CopyVariation[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Custom ad upload
  const [showUpload, setShowUpload] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // Live search (Meta API)
  const [viewMode, setViewMode] = useState<'library' | 'live'>('library')
  const [liveQuery, setLiveQuery] = useState('')
  const [liveCountry, setLiveCountry] = useState('US')
  const [liveAds, setLiveAds] = useState<LiveAd[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')

  const updateCredits = useAuthStore(s => s.updateCredits)

  const searchLiveAds = async () => {
    if (!liveQuery.trim()) return
    setLiveLoading(true)
    setLiveError('')
    try {
      const res = await axios.post('/adgenius/search', {
        query: liveQuery,
        country: liveCountry,
        limit: 20,
      })
      setLiveAds(res.data.ads)
    } catch (err: any) {
      setLiveError(err.response?.data?.detail || 'Search failed')
    } finally {
      setLiveLoading(false)
    }
  }

  // Filter logic
  const filtered = MOCK_ADS.filter(ad => {
    if (platformFilter !== 'all' && ad.platform !== platformFilter) return false
    if (mediaFilter !== 'all' && ad.mediaType !== mediaFilter) return false
    if (nicheFilter !== 'all' && ad.niche !== nicheFilter) return false
    if (showFavOnly && !favorites.has(ad.id)) return false
    if (searchQuery && !ad.brand.toLowerCase().includes(searchQuery.toLowerCase()) && !ad.niche.includes(searchQuery.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'Longest Running') return (b.days || 0) - (a.days || 0)
    if (sortBy === 'Highest Reach') return parseInt((b.reach || '0').replace(/[^0-9]/g, '')) - parseInt((a.reach || '0').replace(/[^0-9]/g, ''))
    return 0
  })

  // Unique brands
  const brands = Array.from(new Set(MOCK_ADS.map(a => a.brand))).map(name => {
    const ad = MOCK_ADS.find(a => a.brand === name)!
    return { name, logo: ad.brandLogo, count: MOCK_ADS.filter(a => a.brand === name).length }
  })

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Analyze a mock ad (downloads the image and sends to backend)
  const handleAnalyze = async (ad: MockAd) => {
    setSelectedAd(ad)
    setAnalyzing(true)
    setAnalysis(null)
    setShowCopyGen(false)
    setCopyVariations([])

    try {
      // Fetch the image and create a File object
      const res = await fetch(ad.imageUrl)
      const blob = await res.blob()
      const file = new File([blob], `${ad.brand}_ad.jpg`, { type: 'image/jpeg' })
      setAnalyzeFile(file)

      const formData = new FormData()
      formData.append('file', file)

      const analyzeRes = await axios.post(
        `/adgenius/analyze?niche=${encodeURIComponent(ad.niche)}&target_audience=`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setAnalysis(analyzeRes.data.analysis)
    } catch (err: any) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  // Analyze uploaded ad
  const handleUploadAnalyze = async (file: File) => {
    setSelectedAd({ id: 'custom', brand: 'Your Upload', brandLogo: '📤', imageUrl: URL.createObjectURL(file), platform: 'meta', mediaType: 'image', niche: 'custom', isFavorited: false })
    setAnalyzing(true)
    setAnalysis(null)
    setShowCopyGen(false)
    setCopyVariations([])
    setAnalyzeFile(file)
    setShowUpload(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post('/adgenius/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAnalysis(res.data.analysis)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateCopy = async () => {
    if (!analysis) return
    setGeneratingCopy(true)
    setCopyVariations([])

    try {
      const res = await axios.post('/adgenius/generate-copy', {
        analysis,
        brand_name: brandName,
        product,
        target_audience: targetAudience,
        tone,
      })
      setCopyVariations(res.data.variations || [])
    } catch (err) {
      console.error('Copy generation failed:', err)
    } finally {
      setGeneratingCopy(false)
    }
  }

  const copyCopyText = (idx: number, v: CopyVariation) => {
    navigator.clipboard.writeText(`${v.headline}\n\n${v.body}\n\n${v.cta}`)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const closeDrawer = () => {
    setSelectedAd(null)
    setAnalysis(null)
    setShowCopyGen(false)
    setCopyVariations([])
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className={clsx('flex-1 overflow-y-auto transition-all', selectedAd && 'mr-[480px]')}>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Ad Genius</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#8CFF2E]/20 text-[#8CFF2E] rounded-full">Intel</span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">Discover, analyze, and outperform competitor ads.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Library / Live toggle */}
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <button onClick={() => setViewMode('library')}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                    viewMode === 'library' ? 'bg-[#8CFF2E]/15 text-[#8CFF2E]' : 'text-gray-500 hover:text-gray-300')}>
                  <Eye size={12} /> Library
                </button>
                <button onClick={() => setViewMode('live')}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                    viewMode === 'live' ? 'bg-[#8CFF2E]/15 text-[#8CFF2E]' : 'text-gray-500 hover:text-gray-300')}>
                  <Radio size={12} /> Live Search
                </button>
              </div>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8CFF2E]/10 border border-[#8CFF2E]/20 text-[#8CFF2E] text-sm font-medium hover:bg-[#8CFF2E]/20 transition-colors">
                <Upload size={15} /> Analyze Your Own
              </button>
            </div>
          </div>

          {/* Live Search Panel */}
          {viewMode === 'live' && (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Radio size={14} className="text-[#8CFF2E]" />
                <h2 className="text-sm font-bold text-white">Meta Ads Library — Live Search</h2>
                <span className="text-[10px] text-gray-600">Real ads from Facebook & Instagram</span>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input value={liveQuery} onChange={e => setLiveQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchLiveAds()}
                    placeholder="Search brand name, keyword, product..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8CFF2E]/30" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="text-gray-500" />
                  <select value={liveCountry} onChange={e => setLiveCountry(e.target.value)}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-2.5 text-xs text-white focus:outline-none">
                    <option value="US">US</option><option value="PT">PT</option><option value="BR">BR</option>
                    <option value="GB">UK</option><option value="ES">ES</option><option value="FR">FR</option>
                    <option value="DE">DE</option><option value="IT">IT</option>
                  </select>
                </div>
                <button onClick={searchLiveAds} disabled={!liveQuery.trim() || liveLoading}
                  className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs transition-colors',
                    liveQuery.trim() && !liveLoading ? 'bg-[#8CFF2E] text-black hover:bg-[#9dff5a]' : 'bg-white/[0.04] text-gray-500')}>
                  {liveLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Search
                </button>
              </div>

              {liveError && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {liveError}
                  {liveError.includes('META_ACCESS_TOKEN') && (
                    <p className="mt-1 text-gray-500">
                      Get a token from{' '}
                      <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 underline">Facebook Graph Explorer</a>
                      {' '}and add <code className="bg-white/[0.05] px-1 rounded">META_ACCESS_TOKEN=your_token</code> to your .env file.
                    </p>
                  )}
                </div>
              )}

              {/* Live results */}
              {liveAds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-500">{liveAds.length} ads found</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {liveAds.map(ad => (
                      <div key={ad.id} className="flex gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{ad.brand}</p>
                          {ad.headline && <p className="text-[11px] text-[#8CFF2E] font-medium mt-0.5 truncate">{ad.headline}</p>}
                          {ad.body && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{ad.body}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            {ad.platforms.map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded text-[8px] font-medium uppercase bg-blue-500/15 text-blue-400">{p}</span>
                            ))}
                            {ad.is_active && <span className="flex items-center gap-1 text-[9px] text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active</span>}
                            {ad.start_date && <span className="text-[9px] text-gray-600">Since {new Date(ad.start_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {ad.snapshot_url && (
                          <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-[10px] self-start transition-colors">
                            <ExternalLink size={10} /> View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)}>
              <div className="bg-[#161620] border border-white/[0.08] rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-white mb-2">Upload Competitor Ad</h2>
                <p className="text-sm text-gray-500 mb-6">Screenshot from Instagram, Facebook, TikTok — any ad creative.</p>
                <div
                  onClick={() => uploadRef.current?.click()}
                  className="border-2 border-dashed border-white/[0.1] hover:border-[#8CFF2E]/40 rounded-xl p-10 text-center cursor-pointer transition-colors"
                >
                  <Upload size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-300">Drop or click to upload</p>
                </div>
                <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUploadAnalyze(e.target.files[0])} />
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search brands or keywords..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8CFF2E]/30"
              />
            </div>

            {/* Platform */}
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={clsx('px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize',
                    platformFilter === p ? 'bg-[#8CFF2E]/15 text-[#8CFF2E]' : 'text-gray-500 hover:text-gray-300')}>
                  {p === 'all' ? 'All' : p === 'meta' ? 'Meta' : p === 'tiktok' ? 'TikTok' : 'Pinterest'}
                </button>
              ))}
            </div>

            {/* Media type */}
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {MEDIA_TYPES.map(m => (
                <button key={m} onClick={() => setMediaFilter(m)}
                  className={clsx('px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize',
                    mediaFilter === m ? 'bg-[#8CFF2E]/15 text-[#8CFF2E]' : 'text-gray-500 hover:text-gray-300')}>
                  {m === 'all' ? 'All' : m}
                </button>
              ))}
            </div>

            {/* Niche */}
            <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[11px] text-gray-300 focus:outline-none capitalize">
              {NICHES.map(n => <option key={n} value={n}>{n === 'all' ? 'All Niches' : n}</option>)}
            </select>

            {/* Favorites */}
            <button onClick={() => setShowFavOnly(v => !v)}
              className={clsx('flex items-center gap-1 px-3 py-2 rounded-lg border text-[11px] transition-colors',
                showFavOnly ? 'border-[#8CFF2E]/30 bg-[#8CFF2E]/10 text-[#8CFF2E]' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
              <Heart size={12} fill={showFavOnly ? 'currentColor' : 'none'} /> Saved
            </button>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[11px] text-gray-300 focus:outline-none ml-auto">
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Brand pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {brands.map(b => (
              <button
                key={b.name}
                onClick={() => setSearchQuery(prev => prev === b.name ? '' : b.name)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border whitespace-nowrap transition-all flex-shrink-0',
                  searchQuery === b.name
                    ? 'border-[#8CFF2E]/30 bg-[#8CFF2E]/10 text-white'
                    : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.12]',
                )}
              >
                <span className="text-sm">{b.logo}</span>
                <span className="text-[11px] font-medium">{b.name}</span>
                <span className="text-[9px] text-gray-600 bg-white/[0.05] px-1.5 py-0.5 rounded-full">{b.count}</span>
              </button>
            ))}
          </div>

          {/* Ad grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(ad => (
              <div
                key={ad.id}
                className="group relative rounded-xl overflow-hidden border border-white/[0.06] bg-[#111116] hover:border-white/[0.12] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
              >
                {/* Brand header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm">{ad.brandLogo}</span>
                  <span className="text-[11px] font-medium text-gray-300 flex-1 truncate">{ad.brand}</span>
                  <button onClick={() => toggleFav(ad.id)} className="text-gray-600 hover:text-[#8CFF2E] transition-colors">
                    <Heart size={12} fill={favorites.has(ad.id) ? '#8CFF2E' : 'none'} className={favorites.has(ad.id) ? 'text-[#8CFF2E]' : ''} />
                  </button>
                </div>

                {/* Creative */}
                <div className="relative aspect-[4/5] bg-black/30">
                  <img src={ad.imageUrl} alt={ad.brand} className="w-full h-full object-cover" loading="lazy" />
                  {ad.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Play size={16} className="text-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3">
                    {/* Metrics */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-[10px] text-gray-300">
                        <Eye size={10} /> {ad.reach}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-300">
                        <TrendingUp size={10} /> {ad.days}d active
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAnalyze(ad)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#8CFF2E] text-black text-[11px] font-bold hover:bg-[#9dff5a] transition-colors"
                      >
                        <Brain size={12} /> Analyze
                      </button>
                      <button
                        onClick={() => { handleAnalyze(ad); setShowCopyGen(true) }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 backdrop-blur-sm text-white text-[11px] font-medium hover:bg-white/20 transition-colors"
                      >
                        <Sparkles size={12} /> Generate
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer badges */}
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-medium uppercase',
                    ad.platform === 'meta' ? 'bg-blue-500/15 text-blue-400' :
                    ad.platform === 'tiktok' ? 'bg-pink-500/15 text-pink-400' :
                    'bg-red-500/15 text-red-400')}>
                    {ad.platform}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[9px] text-gray-500 uppercase">{ad.mediaType}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[9px] text-gray-500 capitalize">{ad.niche}</span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No ads match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Analysis Drawer ── */}
      {selectedAd && (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-[#111116] border-l border-white/[0.06] overflow-y-auto z-40 shadow-2xl shadow-black/50">
          <div className="p-5 space-y-5">
            {/* Drawer header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedAd.brandLogo}</span>
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedAd.brand}</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ad Analysis</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Ad preview */}
            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              <img src={selectedAd.imageUrl} alt={selectedAd.brand} className="w-full max-h-56 object-cover" />
            </div>

            {/* Analysis */}
            {analyzing ? (
              <div className="flex flex-col items-center py-10">
                <Loader2 size={28} className="animate-spin text-[#8CFF2E] mb-3" />
                <p className="text-sm text-gray-400">Analyzing ad creative...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-[#8CFF2E] uppercase tracking-widest">Intelligence Report</h3>

                {[
                  { icon: Zap, label: 'Hook', value: analysis.hook, color: 'text-yellow-400' },
                  { icon: Target, label: 'Pain Point', value: analysis.painPoint, color: 'text-red-400' },
                  { icon: Brain, label: 'Emotional Trigger', value: analysis.emotionalTrigger, color: 'text-purple-400' },
                  { icon: MessageSquare, label: 'CTA Type', value: analysis.ctaType, color: 'text-blue-400' },
                  { icon: Eye, label: 'Target Audience', value: analysis.targetAudience, color: 'text-cyan-400' },
                  { icon: Star, label: 'Visual Style', value: analysis.visualStyle, color: 'text-orange-400' },
                ].filter(item => item.value).map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon size={11} className={item.color} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-xs text-gray-200 font-mono leading-relaxed">{item.value}</p>
                  </div>
                ))}

                {analysis.whyItWorks && (
                  <div className="p-3 rounded-lg bg-[#8CFF2E]/5 border border-[#8CFF2E]/10">
                    <p className="text-[10px] font-bold text-[#8CFF2E] uppercase tracking-wider mb-1">Why It Works</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.whyItWorks}</p>
                  </div>
                )}

                {analysis.weaknesses && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Weaknesses</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.weaknesses}</p>
                  </div>
                )}

                {/* Generate Variation button */}
                <button
                  onClick={() => setShowCopyGen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#8CFF2E] text-black font-bold text-sm hover:bg-[#9dff5a] transition-colors"
                >
                  <Sparkles size={16} /> Generate Variations
                </button>
              </div>
            ) : null}

            {/* Copy Generator */}
            {showCopyGen && analysis && (
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                <h3 className="text-[11px] font-bold text-[#8CFF2E] uppercase tracking-widest">Copy Generator</h3>

                <input value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="Your brand name"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8CFF2E]/30" />

                <input value={product} onChange={e => setProduct(e.target.value)}
                  placeholder="Product or niche"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8CFF2E]/30" />

                <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                  placeholder="Target audience"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8CFF2E]/30" />

                {/* Tone */}
                <div className="grid grid-cols-2 gap-1.5">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={clsx('p-2 rounded-lg border text-left transition-colors',
                        tone === t.id ? 'border-[#8CFF2E]/30 bg-[#8CFF2E]/10' : 'border-white/[0.04] hover:border-white/[0.1]')}>
                      <p className="text-[11px] font-medium text-gray-200">{t.label}</p>
                      <p className="text-[9px] text-gray-600">{t.desc}</p>
                    </button>
                  ))}
                </div>

                <button onClick={handleGenerateCopy} disabled={generatingCopy}
                  className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors',
                    !generatingCopy ? 'bg-[#8CFF2E] text-black hover:bg-[#9dff5a]' : 'bg-white/[0.04] text-gray-500')}>
                  {generatingCopy ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><Sparkles size={15} /> Generate 3 Variations</>}
                </button>

                {/* Copy results */}
                {copyVariations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Ad Copy</h4>
                    {copyVariations.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] group relative">
                        <p className="text-xs font-bold text-white mb-1.5">{v.headline}</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{v.body}</p>
                        <p className="text-[11px] font-semibold text-[#8CFF2E]">{v.cta}</p>
                        <button
                          onClick={() => copyCopyText(i, v)}
                          className="absolute top-2 right-2 p-1 rounded bg-white/[0.05] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {copiedIdx === i ? <Check size={11} className="text-[#8CFF2E]" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
