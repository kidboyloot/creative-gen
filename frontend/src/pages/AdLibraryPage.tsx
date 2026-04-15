import { useState, useEffect } from 'react'
import {
  ExternalLink, Search, Globe, Filter, TrendingUp, Eye, X, Heart,
  Instagram, Facebook, Sparkles, ArrowRight, BookOpen, Calendar,
  Target, DollarSign, BarChart3, ShoppingCart, MousePointer, Users
} from 'lucide-react'
import clsx from 'clsx'

const COUNTRIES = [
  { code: 'ALL', label: 'All Countries' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'AT', label: 'Austria' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SE', label: 'Sweden' },
  { code: 'DK', label: 'Denmark' },
  { code: 'IE', label: 'Ireland' },
  { code: 'FI', label: 'Finland' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'PT', label: 'Portugal' },
  { code: 'BR', label: 'Brazil' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
]

const AD_TYPES = [
  { id: 'all', label: 'All Ads' },
  { id: 'political_and_issue_ads', label: 'Political & Issue' },
]

const PLATFORMS = [
  { id: '', label: 'All Platforms', icon: Globe },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
]

// Keywords by country from research sheet
const KEYWORDS_BY_COUNTRY: Record<string, string[]> = {
  FR: [
    'Livraison gratuite', '.fr/products', 'paris.fr', 'toulouse.fr', 'Stock limité disponible !',
    "jusqu'à 23h59", '50% Reduction', 'Dernier Stock Disponible', 'boutique.fr',
    'paris.fr/products', '.com/products', 'shop/products', 'fr/collections',
  ],
  DE: [
    'rabatt', 'Kostenloser Versand', 'de/collections', '.de/products', '.com/products',
    'modehaus.de', 'modehaus', 'mode.de', 'outlet.de', 'Ausverkauf',
    'boutique.de', '-fashion.de', 'shop/products', 'com/collections', 'mode.com',
    'munchen.de', '-munchen', 'munich.de', 'munich', 'berlin.de', 'zurich.ch',
  ],
  AT: [
    'salzburg.at', 'vienna.at', 'Kostenloser Versand', 'rabatt', '.at/products',
    'com/products', 'shop/products', 'com/collections', 'at/collections', 'Rabatt',
  ],
  NL: [
    'korting', 'gratis verzending', 'laatste kans', 'amsterdam.nl', 'mode.nl',
    'utrecht.nl', '-utrecht', '-amsterdam', 'boutique.nl', 'modehuis.nl',
    'eindigt vandaag', 'fashion.nl', '.nl/products', 'com/products', 'shop/products',
    'com/collections', 'nl/collections',
  ],
  SE: [
    '-stockholm.se', '-mode.se', '-malmo.se', '-mode', 'Fri Frakt', 'malmo.se',
    'rabatt', '.se/products', 'com/products', 'shop/products', 'com/collections',
    'se/collections', '-stockholm.com', 'nordic',
  ],
  DK: [
    'rabat', 'copenhagen.dk', '-København', 'kobenhavn', '-mode.dk', 'gratis fragt',
    '-aarhus', 'aarhus.dk', '.dk/products', '.com/products', 'shop/products',
    '.com/collections', '.dk/collections', '-aarhus.com', 'nordic',
  ],
  IE: [
    'kildare', '.com/products', 'dublin.com', '-dublin', 'Free Shipping',
    'Limited stock available', 'SALE IS ENDING SOON!', '50% Off', 'Sale Ends Today',
    'com/products', 'shop/products', 'com/collections', 'ie/collections',
  ],
  FI: [
    'helsinki.fi/products', 'helsinki.com/products', '-helsinki', '.com/products',
    '.fi/products', 'com/collections', 'fi/collections', 'ilmainen toimitus', 'nordic',
  ],
  ES: [
    'madrid.es/products', '-madrid', 'Envío gratuito', 'descuento', 'última oportunidad',
    'La oferta termina hoy!', '-marbella', '-barcelona', 'es/products',
    '.com/products', '.com/collections', 'es/collections', 'barcelona.es',
  ],
  IT: [
    'com/products', 'it/products', '-milano.it', 'spedizione gratuita', 'sconto',
    'ultima possibilità', "l'offerta termina oggi!", 'com/collections', 'it/collections',
    'brescia.it/products', 'roma.it/products', 'vestiti.it/products', 'roma.com/products',
    'moda.it/products', 'moda.it/collections',
  ],
  GB: [
    'com/products', 'uk/products', 'london.uk/products', 'london.com/products',
    'sovro.uk/products', 'sovro.com/products', 'Free Shipping', 'Discount',
    'Sale ends soon', 'com/collections', 'uk/collections',
  ],
  US: [
    'com/products', 'us/products', 'newyork', 'new-york', 'com/collections', 'us/collections',
  ],
}

// Map country codes to the ones used in COUNTRIES
const COUNTRY_KEYWORD_MAP: Record<string, string> = {
  FR: 'FR', DE: 'DE', AT: 'AT', NL: 'NL', SE: 'SE', DK: 'DK',
  IE: 'IE', FI: 'FI', ES: 'ES', IT: 'IT', GB: 'GB', US: 'US',
}

const TIPS = [
  { title: 'Spy on competitors', desc: 'Search their brand name to see all their active ads across platforms.' },
  { title: 'Find winning creatives', desc: 'Look for ads running for 30+ days — those are likely profitable.' },
  { title: 'Analyze ad copy', desc: 'Study headlines, CTAs, and hooks that competitors use repeatedly.' },
  { title: 'Track ad formats', desc: 'Note which formats (video, carousel, image) each niche uses most.' },
]

// KPI data from PR _ MARKETS - KPIs.csv
// Products reach targets — Collections = double these values
interface ReachKPI {
  days: string
  products: string
  collections: string
}

interface MarketKPIs {
  label: string
  countries: string[]
  data: ReachKPI[]
}

const MARKET_KPIS: MarketKPIs[] = [
  {
    label: 'DK | FIN | IE',
    countries: ['DK', 'FI', 'IE'],
    data: [
      { days: '3-4 dias', products: '15k', collections: '30k' },
      { days: '5-6 dias', products: '35k', collections: '70k' },
      { days: '7-11 dias', products: '50k', collections: '100k' },
      { days: '12-20 dias', products: '100k', collections: '200k' },
      { days: '21-29 dias', products: '150k', collections: '300k' },
      { days: '30 dias+', products: '200k', collections: '400k' },
    ],
  },
  {
    label: 'NL | SWE',
    countries: ['NL', 'SE'],
    data: [
      { days: '3-4 dias', products: '15k', collections: '30k' },
      { days: '5-6 dias', products: '40k', collections: '80k' },
      { days: '7-11 dias', products: '70k', collections: '140k' },
      { days: '12-20 dias', products: '140k', collections: '280k' },
      { days: '21-29 dias', products: '200k', collections: '400k' },
      { days: '30 dias+', products: '280k', collections: '560k' },
    ],
  },
  {
    label: 'Germany',
    countries: ['DE', 'AT'],
    data: [
      { days: '3-4 dias', products: '15k', collections: '30k' },
      { days: '5-6 dias', products: '35k', collections: '70k' },
      { days: '7-11 dias', products: '50k', collections: '100k' },
      { days: '12-20 dias', products: '100k', collections: '200k' },
      { days: '21-29 dias', products: '150k', collections: '300k' },
      { days: '30 dias+', products: '200k', collections: '400k' },
    ],
  },
  {
    label: 'FR | ES | IT',
    countries: ['FR', 'ES', 'IT'],
    data: [
      { days: '3-4 dias', products: 'X', collections: 'X' },
      { days: '5-6 dias', products: 'X', collections: 'X' },
      { days: '7-11 dias', products: '130k', collections: '260k' },
      { days: '12-20 dias', products: '260k', collections: '520k' },
      { days: '21-29 dias', products: '390k', collections: '780k' },
      { days: '30 dias+', products: '520k', collections: '1.04M' },
    ],
  },
]

const STORAGE_KEY = 'ad-library-fav-keywords'

export default function AdLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [country, setCountry] = useState('ALL')
  const [platform, setPlatform] = useState('')
  const [adStatus, setAdStatus] = useState('active')
  const [mediaType, setMediaType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Favorite keywords — persisted in localStorage
  const [favKeywords, setFavKeywords] = useState<{ kw: string; countryCode: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favKeywords))
  }, [favKeywords])

  const toggleFavKeyword = (kw: string, countryCode: string) => {
    setFavKeywords(prev => {
      const exists = prev.some(f => f.kw === kw && f.countryCode === countryCode)
      if (exists) return prev.filter(f => !(f.kw === kw && f.countryCode === countryCode))
      return [...prev, { kw, countryCode }]
    })
  }

  const isFaved = (kw: string, countryCode: string) =>
    favKeywords.some(f => f.kw === kw && f.countryCode === countryCode)

  const buildUrl = (query?: string) => {
    const q = query || searchQuery
    const params = new URLSearchParams()
    params.set('active_status', adStatus)
    params.set('ad_type', 'all')
    params.set('country', country)
    params.set('media_type', mediaType)
    if (q) params.set('q', q)
    if (platform) params.set('publisher_platforms[0]', platform)
    if (startDate) params.set('start_date[min]', startDate)
    if (endDate) params.set('start_date[max]', endDate)
    return `https://www.facebook.com/ads/library/?${params.toString()}`
  }

  const openLibrary = (query?: string) => {
    window.open(buildUrl(query), '_blank')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) openLibrary()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Meta Ads Library</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-full">
            External
          </span>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Search and analyze competitor ads across Facebook & Instagram. Find winning creatives in any niche.
        </p>
      </div>

      {/* Search box */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search brand, competitor, product, or keyword..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className={clsx(
              'flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all',
              searchQuery.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed',
            )}
          >
            <ExternalLink size={16} /> Search Ads
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-end">
          {/* Country */}
          <div>
            <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Country</label>
            <div className="flex items-center gap-1.5">
              <Globe size={12} className="text-gray-500" />
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Platform</label>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {PLATFORMS.map(p => (
                <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] transition-colors',
                    platform === p.id ? 'bg-blue-500/15 text-blue-400' : 'text-gray-500 hover:text-gray-300')}>
                  <p.icon size={11} /> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Status</label>
            <select value={adStatus} onChange={e => setAdStatus(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Media type */}
          <div>
            <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Media</label>
            <select value={mediaType} onChange={e => setMediaType(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50">
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="meme">Memes</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="flex items-center gap-1 text-[10px] text-gray-600 uppercase tracking-wider mb-1">
              <Calendar size={10} /> From
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50" />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] text-gray-600 uppercase tracking-wider mb-1">
              <Calendar size={10} /> To
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50" />
          </div>

          {/* Clear filters */}
          {(startDate || endDate || adStatus !== 'active' || mediaType !== 'all' || platform || country !== 'ALL') && (
            <button type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setAdStatus('active'); setMediaType('all'); setPlatform(''); setCountry('ALL') }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-red-400 transition-colors">
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </form>

      {/* Keywords by country */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Search size={14} className="text-blue-400" />
            Keywords by Country
          </h2>
          <p className="text-[10px] text-gray-600">Click a keyword to search · Select a country to filter</p>
        </div>

        {/* Country pills */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {Object.keys(KEYWORDS_BY_COUNTRY).map(code => {
            const c = COUNTRIES.find(c => c.code === code)
            return (
              <button
                key={code}
                onClick={() => setCountry(code)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all',
                  country === code
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                    : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.12]',
                )}
              >
                {c?.label || code}
                <span className="ml-1 text-[9px] text-gray-600">{KEYWORDS_BY_COUNTRY[code]?.length || 0}</span>
              </button>
            )
          })}
        </div>

        {/* Keywords grid for selected country */}
        {(() => {
          const openWithCountry = (kw: string, cc: string) => {
            setCountry(cc)
            setSearchQuery(kw)
            const params = new URLSearchParams()
            params.set('active_status', adStatus)
            params.set('ad_type', 'all')
            params.set('country', cc)
            params.set('media_type', mediaType)
            params.set('q', kw)
            if (platform) params.set('publisher_platforms[0]', platform)
            if (startDate) params.set('start_date[min]', startDate)
            if (endDate) params.set('start_date[max]', endDate)
            window.open(`https://www.facebook.com/ads/library/?${params.toString()}`, '_blank')
          }

          const KeywordPill = ({ kw, cc, showFlag }: { kw: string; cc: string; showFlag?: boolean }) => (
            <div className="group flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
              <button
                onClick={() => openWithCountry(kw, cc)}
                className="flex items-center gap-1.5 px-3 py-1.5"
              >
                <span className="text-xs text-gray-400 group-hover:text-white">{kw}</span>
                {showFlag && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-600 group-hover:text-blue-400">{cc}</span>}
              </button>
              <button
                onClick={e => { e.stopPropagation(); toggleFavKeyword(kw, cc) }}
                className="pr-2 text-gray-700 hover:text-pink-400 transition-colors"
              >
                <Heart size={10} fill={isFaved(kw, cc) ? 'currentColor' : 'none'} className={isFaved(kw, cc) ? 'text-pink-400' : ''} />
              </button>
            </div>
          )

          if (country !== 'ALL' && KEYWORDS_BY_COUNTRY[country]) {
            const keywords = KEYWORDS_BY_COUNTRY[country]
            const countryLabel = COUNTRIES.find(c => c.code === country)?.label || country
            return (
              <div>
                <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">
                  {countryLabel} — {keywords.length} keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => <KeywordPill key={`${kw}-${i}`} kw={kw} cc={country} />)}
                </div>
              </div>
            )
          }

          // All countries
          const allKeywords: { kw: string; countryCode: string }[] = []
          for (const [code, kws] of Object.entries(KEYWORDS_BY_COUNTRY)) {
            for (const kw of kws.slice(0, 4)) {
              if (!allKeywords.some(k => k.kw === kw)) {
                allKeywords.push({ kw, countryCode: code })
              }
            }
          }

          return (
            <div>
              <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">
                Top keywords — click to search in the correct country
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allKeywords.map((item, i) => <KeywordPill key={`${item.kw}-${i}`} kw={item.kw} cc={item.countryCode} showFlag />)}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Favorite keywords */}
      {favKeywords.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Heart size={14} className="text-pink-400" fill="currentColor" />
            Saved Keywords
            <span className="text-[10px] text-gray-600 font-normal">{favKeywords.length}</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {favKeywords.map((fav, i) => (
              <div key={`fav-${i}`} className="group flex items-center rounded-lg bg-pink-500/5 border border-pink-500/15 hover:border-pink-500/30 transition-all">
                <button
                  onClick={() => {
                    setCountry(fav.countryCode)
                    setSearchQuery(fav.kw)
                    const params = new URLSearchParams()
                    params.set('active_status', adStatus)
                    params.set('ad_type', 'all')
                    params.set('country', fav.countryCode)
                    params.set('media_type', mediaType)
                    params.set('q', fav.kw)
                    if (platform) params.set('publisher_platforms[0]', platform)
                    window.open(`https://www.facebook.com/ads/library/?${params.toString()}`, '_blank')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5"
                >
                  <span className="text-xs text-pink-300">{fav.kw}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400/60">{fav.countryCode}</span>
                </button>
                <button
                  onClick={() => toggleFavKeyword(fav.kw, fav.countryCode)}
                  className="pr-2 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs — Facebook Reach Targets */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
          <BarChart3 size={14} className="text-blue-400" />
          Facebook Reach KPIs
        </h2>
        <p className="text-[10px] text-gray-500 mb-4">Active Days vs Facebook Reach targets. <span className="text-orange-400">Products</span> and <span className="text-purple-400">Collections (2x)</span>. Ads with "X" = not ready yet.</p>

        {(() => {
          // If a specific country is selected, highlight its market group
          const selectedMarket = country !== 'ALL'
            ? MARKET_KPIS.find(m => m.countries.includes(country))
            : null

          const marketsToShow = selectedMarket ? [selectedMarket] : MARKET_KPIS

          return (
            <div className={clsx('grid gap-4', selectedMarket ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
              {marketsToShow.map(market => (
                <div key={market.label} className={clsx(
                  'rounded-xl border overflow-hidden',
                  selectedMarket ? 'border-blue-500/20' : 'border-white/[0.06]',
                )}>
                  {/* Market header */}
                  <div className={clsx(
                    'px-4 py-2.5 flex items-center justify-between',
                    selectedMarket ? 'bg-blue-500/10' : 'bg-white/[0.03]',
                  )}>
                    <div className="flex items-center gap-2">
                      <Globe size={12} className={selectedMarket ? 'text-blue-400' : 'text-gray-500'} />
                      <span className="text-xs font-bold text-white">{market.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {market.countries.map(c => (
                        <button key={c} onClick={() => setCountry(c)}
                          className={clsx('px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                            country === c ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.05] text-gray-500 hover:text-gray-300')}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* KPI table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/[0.02]">
                        <th className="text-left px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Active Days</th>
                        <th className="text-right px-4 py-2 text-[10px] text-orange-400/70 font-semibold uppercase tracking-wider">Products Reach</th>
                        <th className="text-right px-4 py-2 text-[10px] text-purple-400/70 font-semibold uppercase tracking-wider">Collections Reach</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.data.map((row, i) => (
                        <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2 text-gray-300 font-medium">{row.days}</td>
                          <td className={clsx('px-4 py-2 text-right font-semibold',
                            row.products === 'X' ? 'text-red-400/50' : 'text-orange-400')}>
                            {row.products}
                          </td>
                          <td className={clsx('px-4 py-2 text-right font-semibold',
                            row.collections === 'X' ? 'text-red-400/50' : 'text-purple-400')}>
                            {row.collections}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Products</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Collections (2x Products)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400/50" /> X = Not Ready</span>
          <span className="ml-auto">1-2 days = Not Ready (observação)</span>
        </div>
      </div>

      {/* Tips */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-brand-400" />
          How to Spy on Competitors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-brand-400">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{tip.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direct link */}
      <div className="flex items-center justify-center pt-2">
        <a
          href="https://www.facebook.com/ads/library/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-400 transition-colors"
        >
          <BookOpen size={14} />
          Open Meta Ads Library directly
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
