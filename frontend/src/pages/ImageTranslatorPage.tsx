import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Languages, ArrowRightLeft, Loader2, Copy, Check, Plus, Trash2,
  FileText, Download, Upload, Image as ImageIcon, X, Volume2, Type, RefreshCw
} from 'lucide-react'
import clsx from 'clsx'

interface Language {
  code: string
  name: string
}

type Tab = 'text' | 'bulk' | 'extract' | 'image'

const OCR_LANGS = [
  { code: 'eng', name: 'English' },
  { code: 'por', name: 'Portuguese' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'ara', name: 'Arabic' },
  { code: 'rus', name: 'Russian' },
  { code: 'nld', name: 'Dutch' },
]

export default function ImageTranslatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('text')

  // Single text
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [detectedLang, setDetectedLang] = useState('')
  const [copied, setCopied] = useState(false)

  // Bulk
  const [bulkTexts, setBulkTexts] = useState<string[]>([''])
  const [bulkResults, setBulkResults] = useState<{ original: string; translated: string }[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Text extractor
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrPreview, setOcrPreview] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrBlocks, setOcrBlocks] = useState<string[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrLang, setOcrLang] = useState('eng')
  const [ocrCopied, setOcrCopied] = useState(false)
  const ocrInputRef = useRef<HTMLInputElement>(null)

  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['translate-languages'],
    queryFn: () => axios.get<Language[]>('/translate/languages').then(r => r.data),
    staleTime: Infinity,
  })

  const sourceLangs = languages
  const targetLangs = languages.filter(l => l.code !== 'auto')

  const handleTranslate = async () => {
    if (!sourceText.trim()) return
    setLoading(true)
    try {
      const res = await axios.post('/translate', {
        text: sourceText,
        source: sourceLang,
        target: targetLang,
      })
      setTranslatedText(res.data.translated)
      setDetectedLang(res.data.detected_language)
    } catch (err) {
      setTranslatedText('[Translation failed]')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkTranslate = async () => {
    const texts = bulkTexts.filter(t => t.trim())
    if (texts.length === 0) return
    setBulkLoading(true)
    setBulkResults([])
    try {
      const res = await axios.post('/translate/bulk', {
        texts,
        source: sourceLang,
        target: targetLang,
      })
      setBulkResults(res.data.results)
    } catch {
      setBulkResults(texts.map(t => ({ original: t, translated: '[failed]' })))
    } finally {
      setBulkLoading(false)
    }
  }

  const swapLangs = () => {
    if (sourceLang === 'auto') return
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyAllBulk = () => {
    const text = bulkResults.map(r => r.translated).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportBulkCSV = () => {
    const csv = 'Original,Translated\n' + bulkResults.map(r =>
      `"${r.original.replace(/"/g, '""')}","${r.translated.replace(/"/g, '""')}"`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'translations.csv'
    a.click()
  }

  const handleExtractText = async () => {
    if (!ocrFile) return
    setOcrLoading(true)
    setOcrError('')
    setOcrText('')
    setOcrBlocks([])
    const formData = new FormData()
    formData.append('file', ocrFile)
    try {
      const res = await axios.post<{ text: string; blocks: string[] }>(`/translate/extract-text?lang=${ocrLang}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setOcrText(res.data.text)
      setOcrBlocks(res.data.blocks)
    } catch (err: any) {
      setOcrError(err.response?.data?.detail || 'Text extraction failed')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleOcrFile = (f: File) => {
    setOcrFile(f)
    setOcrPreview(URL.createObjectURL(f))
    setOcrText('')
    setOcrBlocks([])
    setOcrError('')
  }

  const copyOcrText = () => {
    navigator.clipboard.writeText(ocrText)
    setOcrCopied(true)
    setTimeout(() => setOcrCopied(false), 2000)
  }

  const TABS: { id: Tab; label: string; icon: typeof Languages }[] = [
    { id: 'text', label: 'Text', icon: Languages },
    { id: 'bulk', label: 'Bulk Translate', icon: FileText },
    { id: 'extract', label: 'Text Extractor', icon: Type },
    { id: 'image', label: 'Image Translator', icon: ImageIcon },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Translator</h1>
        <p className="text-gray-400 text-sm mt-1">
          Translate text, bulk content, and images — 30+ languages, 100% free.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === t.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Text Translation ── */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          {/* Language bar */}
          <div className="flex items-center gap-3">
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 flex-1">
              {sourceLangs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>

            <button onClick={swapLangs} disabled={sourceLang === 'auto'}
              className={clsx('p-2.5 rounded-xl border transition-colors',
                sourceLang !== 'auto' ? 'border-white/[0.08] text-gray-400 hover:text-white hover:border-brand-500/30' : 'border-white/[0.04] text-gray-700 cursor-not-allowed')}>
              <ArrowRightLeft size={16} />
            </button>

            <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 flex-1">
              {targetLangs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          {/* Translation panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source */}
            <div className="relative">
              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleTranslate() }}
                rows={8}
                placeholder="Type or paste text to translate..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
              />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <span className="text-[10px] text-gray-600">
                  {sourceText.length}/5000
                  {detectedLang && sourceLang === 'auto' && (
                    <span className="ml-2">Detected: <span className="text-brand-400">{languages.find(l => l.code === detectedLang)?.name || detectedLang}</span></span>
                  )}
                </span>
                {sourceText && (
                  <button onClick={() => { setSourceText(''); setTranslatedText('') }}
                    className="text-gray-600 hover:text-gray-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Target */}
            <div className="relative">
              <div className={clsx(
                'w-full min-h-[208px] bg-white/[0.02] border rounded-2xl px-5 py-4 text-sm leading-relaxed',
                translatedText ? 'border-brand-500/20 text-white' : 'border-white/[0.06] text-gray-600',
              )}>
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" /> Translating...
                  </div>
                ) : (
                  translatedText || 'Translation will appear here...'
                )}
              </div>
              {translatedText && !loading && (
                <div className="absolute bottom-3 right-4 flex gap-1.5">
                  <button onClick={() => copyResult(translatedText)}
                    className="p-1.5 rounded-lg bg-white/[0.05] text-gray-500 hover:text-white transition-colors">
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Translate button */}
          <button onClick={handleTranslate} disabled={!sourceText.trim() || loading}
            className={clsx('w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              sourceText.trim() && !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Translating...</> : <><Languages size={16} /> Translate</>}
          </button>

          <p className="text-center text-[10px] text-gray-700">Ctrl+Enter to translate · Powered by Google Translate — 100% free</p>
        </div>
      )}

      {/* ── Bulk Translation ── */}
      {activeTab === 'bulk' && (
        <div className="space-y-5">
          {/* Language bar */}
          <div className="flex items-center gap-3">
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 flex-1">
              {sourceLangs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <ArrowRightLeft size={16} className="text-gray-600" />
            <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 flex-1">
              {targetLangs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          {/* Bulk input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Texts to translate
                <span className="text-xs text-gray-500 ml-2 font-normal">{bulkTexts.filter(t => t.trim()).length} items</span>
              </label>
              <button onClick={() => setBulkTexts(prev => [...prev, ''])}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {bulkTexts.map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] text-gray-600 font-mono mt-3 w-5 text-right">{i + 1}</span>
                  <textarea
                    value={text}
                    onChange={e => {
                      const next = [...bulkTexts]
                      next[i] = e.target.value
                      setBulkTexts(next)
                    }}
                    rows={1}
                    placeholder={`Text ${i + 1}...`}
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                  {bulkTexts.length > 1 && (
                    <button onClick={() => setBulkTexts(prev => prev.filter((_, j) => j !== i))}
                      className="mt-2 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Paste bulk */}
            <button
              onClick={() => {
                navigator.clipboard.readText().then(text => {
                  const lines = text.split('\n').filter(l => l.trim())
                  if (lines.length > 0) setBulkTexts(lines)
                })
              }}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand-400 transition-colors"
            >
              <Copy size={11} /> Paste from clipboard (one per line)
            </button>
          </div>

          {/* Translate button */}
          <button onClick={handleBulkTranslate} disabled={bulkLoading || bulkTexts.every(t => !t.trim())}
            className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              !bulkLoading && bulkTexts.some(t => t.trim()) ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
            {bulkLoading ? <><Loader2 size={16} className="animate-spin" /> Translating {bulkTexts.filter(t => t.trim()).length} texts...</> : <><Languages size={16} /> Translate All</>}
          </button>

          {/* Results */}
          {bulkResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-300">Results</h2>
                <div className="flex gap-2">
                  <button onClick={copyAllBulk}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-xs transition-colors">
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} Copy all
                  </button>
                  <button onClick={exportBulkCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs transition-colors">
                    <Download size={12} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Original</div>
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Translated</div>
                </div>
                {/* Rows */}
                {bulkResults.map((r, i) => (
                  <div key={i} className={clsx('grid grid-cols-2 gap-px', i > 0 && 'border-t border-white/[0.04]')}>
                    <div className="px-4 py-2.5 text-xs text-gray-400">{r.original}</div>
                    <div className="px-4 py-2.5 text-xs text-white font-medium group relative">
                      {r.translated}
                      <button
                        onClick={() => copyResult(r.translated)}
                        className="absolute right-2 top-2 p-1 rounded bg-white/[0.05] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Image Translator ── */}
      {/* ── Text Extractor (OCR) ── */}
      {activeTab === 'extract' && (
        <div className="space-y-6">
          {!ocrPreview ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleOcrFile(e.dataTransfer.files[0]) }}
              onClick={() => ocrInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-2xl p-14 text-center cursor-pointer transition-colors"
            >
              <Type size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-lg font-medium text-gray-300">Drop an image with text</p>
              <p className="text-sm text-gray-500 mt-1">AI will extract all text — ready to copy or translate</p>
              <input ref={ocrInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleOcrFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Image + controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Source Image</p>
                  <button onClick={() => { setOcrFile(null); setOcrPreview(null); setOcrText(''); setOcrBlocks([]); setOcrError('') }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    <RefreshCw size={11} /> New
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0a0f]">
                  <img src={ocrPreview} alt="Source" className="w-full h-auto max-h-[400px] object-contain" />
                </div>

                {/* Language + Extract button */}
                <div className="flex gap-2">
                  <select value={ocrLang} onChange={e => setOcrLang(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50">
                    {OCR_LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                  <button onClick={handleExtractText} disabled={ocrLoading}
                    className={clsx('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
                      !ocrLoading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                    {ocrLoading ? <><Loader2 size={15} className="animate-spin" /> Extracting...</> : <><Type size={15} /> Extract Text</>}
                  </button>
                </div>
              </div>

              {/* Right: Extracted text */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Extracted Text {ocrText && <span className="text-brand-400 normal-case">({ocrText.length} chars)</span>}
                  </p>
                  {ocrText && (
                    <div className="flex gap-2">
                      <button onClick={copyOcrText}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs transition-colors">
                        {ocrCopied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy All</>}
                      </button>
                      <button onClick={() => { setSourceText(ocrText); setActiveTab('text') }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white text-xs transition-colors">
                        <Languages size={11} /> Translate
                      </button>
                    </div>
                  )}
                </div>

                {ocrError && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{ocrError}</div>
                )}

                {ocrText ? (
                  <div className="space-y-3">
                    {/* Full text */}
                    <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 max-h-[300px] overflow-y-auto">
                      <pre className="text-sm text-white whitespace-pre-wrap font-sans leading-relaxed">{ocrText}</pre>
                    </div>

                    {/* Text blocks */}
                    {ocrBlocks.length > 1 && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Text Blocks ({ocrBlocks.length})</p>
                        <div className="space-y-1.5">
                          {ocrBlocks.map((block, i) => (
                            <div key={i} className="flex items-start gap-2 group">
                              <span className="text-[10px] text-gray-600 font-mono mt-1 w-4 text-right">{i + 1}</span>
                              <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-gray-300">
                                {block}
                              </div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(block); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                                className="mt-1 p-1 rounded text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                                <Copy size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : ocrLoading ? (
                  <div className="flex items-center justify-center h-40 text-gray-500">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-600 rounded-2xl border border-dashed border-white/[0.06]">
                    <Type size={24} className="mb-2 opacity-30" />
                    <p className="text-xs">Extracted text will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'image' && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ height: 'calc(100vh - 220px)' }}>
          <iframe
            src="/image-translator.html"
            title="Image Text Translator"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      )}
    </div>
  )
}
