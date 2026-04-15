import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  LayoutGrid, Upload, Star, Download, Loader2, Trash2, GripVertical, X
} from 'lucide-react'
import clsx from 'clsx'

interface LayoutOption {
  id: string
  label: string
  description: string
  min_images: number
}

const DEFAULT_LAYOUTS: LayoutOption[] = [
  { id: 'grid_2x2', label: 'Grid 2×2', description: '4 images in a 2×2 grid', min_images: 4 },
  { id: 'strip_3', label: '3-Panel Strip', description: '3 images stacked vertically', min_images: 3 },
  { id: 'featured', label: 'Featured', description: '1 large top + 2 small bottom', min_images: 2 },
  { id: 'hero_center', label: 'Hero Center', description: '1 large center + 4 small in corners', min_images: 3 },
  { id: 'hero_left', label: 'Hero Left', description: 'Hero 60% left + stacked right', min_images: 2 },
  { id: 'hero_top', label: 'Hero Top', description: 'Hero 65% top + 3 images bottom row', min_images: 2 },
  { id: 'mosaic', label: 'Mosaic', description: 'Asymmetric Pinterest-style layout', min_images: 3 },
  { id: 'filmstrip', label: 'Filmstrip', description: 'Horizontal strip of images side by side', min_images: 2 },
  { id: 'auto', label: 'Auto', description: 'Picks best layout based on format and image count', min_images: 2 },
]

interface ImageItem {
  id: string
  file: File
  preview: string
  isHero: boolean
}

const FORMATS = ['1:1', '9:16', '16:9']

// Mini SVG previews for each layout
const LAYOUT_PREVIEWS: Record<string, React.ReactNode> = {
  grid_2x2: (
    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
      <div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" />
      <div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" />
    </div>
  ),
  strip_3: (
    <div className="flex flex-col gap-0.5 w-full h-full">
      <div className="flex-1 bg-current rounded-sm" />
      <div className="flex-1 bg-current rounded-sm" />
      <div className="flex-1 bg-current rounded-sm" />
    </div>
  ),
  featured: (
    <div className="flex flex-col gap-0.5 w-full h-full">
      <div className="flex-[3] bg-current rounded-sm" />
      <div className="flex-[2] flex gap-0.5">
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
      </div>
    </div>
  ),
  hero_center: (
    <div className="relative w-full h-full">
      <div className="absolute inset-[15%] bg-current rounded-sm z-10" />
      <div className="absolute top-0 left-0 w-[14%] h-[14%] bg-current rounded-sm opacity-60" />
      <div className="absolute top-0 right-0 w-[14%] h-[14%] bg-current rounded-sm opacity-60" />
      <div className="absolute bottom-0 left-0 w-[14%] h-[14%] bg-current rounded-sm opacity-60" />
      <div className="absolute bottom-0 right-0 w-[14%] h-[14%] bg-current rounded-sm opacity-60" />
    </div>
  ),
  hero_left: (
    <div className="flex gap-0.5 w-full h-full">
      <div className="flex-[3] bg-current rounded-sm" />
      <div className="flex-[2] flex flex-col gap-0.5">
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
      </div>
    </div>
  ),
  hero_top: (
    <div className="flex flex-col gap-0.5 w-full h-full">
      <div className="flex-[3] bg-current rounded-sm" />
      <div className="flex-[1] flex gap-0.5">
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
      </div>
    </div>
  ),
  mosaic: (
    <div className="flex gap-0.5 w-full h-full">
      <div className="flex-[3] bg-current rounded-sm" />
      <div className="flex-[2] flex flex-col gap-0.5">
        <div className="flex-[3] bg-current rounded-sm" />
        <div className="flex-[2] flex gap-0.5">
          <div className="flex-1 bg-current rounded-sm" />
          <div className="flex-1 bg-current rounded-sm" />
        </div>
      </div>
    </div>
  ),
  filmstrip: (
    <div className="flex gap-0.5 w-full h-full">
      <div className="flex-1 bg-current rounded-sm" />
      <div className="flex-1 bg-current rounded-sm" />
      <div className="flex-1 bg-current rounded-sm" />
      <div className="flex-1 bg-current rounded-sm" />
    </div>
  ),
  auto: (
    <div className="flex items-center justify-center w-full h-full text-current">
      <LayoutGrid size={16} />
    </div>
  ),
}

type Mode = 'single' | 'bulk'

export default function CollagePage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedLayout, setSelectedLayout] = useState('auto')
  const [format, setFormat] = useState('1:1')
  const [gap, setGap] = useState(4)
  const [loading, setLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('single')
  const [bulkResults, setBulkResults] = useState<{ layout: string; url: string }[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkVariants, setBulkVariants] = useState(3)
  const [selectedBulkLayouts, setSelectedBulkLayouts] = useState<string[]>(['featured', 'hero_left', 'hero_top', 'mosaic', 'grid_2x2'])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const layouts = DEFAULT_LAYOUTS

  const heroIndex = images.findIndex(img => img.isHero)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      isHero: false,
    }))
    setImages(prev => {
      const updated = [...prev, ...newImages]
      // Auto-set first image as hero if none set
      if (!updated.some(img => img.isHero) && updated.length > 0) {
        updated[0].isHero = true
      }
      return updated
    })
    setResultUrl(null)
  }, [])

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      if (filtered.length > 0 && !filtered.some(img => img.isHero)) {
        filtered[0].isHero = true
      }
      return filtered
    })
    setResultUrl(null)
  }

  const setHero = (id: string) => {
    setImages(prev => prev.map(img => ({ ...img, isHero: img.id === id })))
    setResultUrl(null)
  }

  // Drag and drop reorder
  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedId && draggedId !== id) {
      setDragOverId(id)
    }
  }

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDragOverId(null)
      setDraggedId(null)
      return
    }
    setImages(prev => {
      const fromIdx = prev.findIndex(img => img.id === draggedId)
      const toIdx = prev.findIndex(img => img.id === targetId)
      if (fromIdx < 0 || toIdx < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    setDragOverId(null)
    setDraggedId(null)
    setResultUrl(null)
  }

  const handleGenerate = useCallback(async () => {
    if (images.length < 2 || loading) return
    setLoading(true)
    setResultUrl(null)

    const formData = new FormData()
    // Reorder: hero first, then rest
    const hi = images.findIndex(img => img.isHero)
    const ordered = hi >= 0
      ? [images[hi], ...images.filter((_, i) => i !== hi)]
      : images
    ordered.forEach(img => formData.append('files', img.file))

    try {
      const res = await axios.post<{ url: string }>(
        `/tools/collage?layout=${selectedLayout}&fmt=${format}&hero_index=0&gap=${gap}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setResultUrl(res.data.url)
    } catch (err) {
      console.error('Collage failed:', err)
    } finally {
      setLoading(false)
    }
  }, [images, selectedLayout, format, gap, loading])


  const handleBulkGenerate = async () => {
    if (images.length < 2 || bulkLoading) return
    setBulkLoading(true)
    setBulkResults([])

    const hi = images.findIndex(img => img.isHero)
    const baseOrdered = hi >= 0
      ? [images[hi], ...images.filter((_, i) => i !== hi)]
      : images

    const results: { layout: string; url: string }[] = []

    for (const layout of selectedBulkLayouts) {
      for (let v = 0; v < bulkVariants; v++) {
        // Shuffle images for each variant (keep hero first for v=0)
        let ordered = [...baseOrdered]
        if (v > 0) {
          // Shuffle non-hero images
          const hero = ordered[0]
          const rest = ordered.slice(1)
          for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[rest[i], rest[j]] = [rest[j], rest[i]]
          }
          ordered = [hero, ...rest]
        }

        const formData = new FormData()
        ordered.forEach(img => formData.append('files', img.file))

        try {
          const res = await axios.post<{ url: string }>(
            `/tools/collage?layout=${layout}&fmt=${format}&hero_index=0&gap=${gap}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          )
          const layoutLabel = DEFAULT_LAYOUTS.find(l => l.id === layout)?.label || layout
          results.push({ layout: `${layoutLabel} #${v + 1}`, url: res.data.url })
          setBulkResults([...results])
        } catch (err) {
          console.error(`Bulk collage failed (${layout} #${v + 1}):`, err)
        }
      }
    }

    setBulkLoading(false)
  }

  const toggleBulkLayout = (id: string) => {
    setSelectedBulkLayouts(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
  }

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collage Maker</h1>
          <p className="text-gray-400 text-sm mt-1">
            Upload images, choose a layout, and select your hero image.
          </p>
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <button onClick={() => setMode('single')}
            className={clsx('px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
              mode === 'single' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
            Single
          </button>
          <button onClick={() => setMode('bulk')}
            className={clsx('px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
              mode === 'bulk' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
            Bulk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Images</label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropZone}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">Drop images here or click to upload</p>
              <p className="text-xs text-gray-600 mt-1">PNG, JPG, WebP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Image list with reorder + hero selection */}
          {images.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Order & Hero
                <span className="text-xs text-gray-500 ml-2 font-normal">Drag to reorder, star to set hero</span>
              </label>
              <div className="space-y-1.5">
                {images.map((img) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(img.id)}
                    onDragOver={(e) => handleDragOver(e, img.id)}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={() => handleDrop(img.id)}
                    className={clsx(
                      'flex items-center gap-2 p-1.5 rounded-lg border transition-all',
                      dragOverId === img.id
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : img.isHero
                          ? 'border-brand-500/30 bg-brand-500/5'
                          : 'border-white/[0.06] bg-white/[0.02]',
                    )}
                  >
                    <GripVertical size={14} className="text-gray-600 cursor-grab flex-shrink-0" />
                    <img
                      src={img.preview}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <span className="text-xs text-gray-400 truncate flex-1">
                      {img.file.name}
                    </span>
                    <button
                      onClick={() => setHero(img.id)}
                      className={clsx(
                        'p-1 rounded transition-colors',
                        img.isHero
                          ? 'text-brand-400'
                          : 'text-gray-600 hover:text-brand-400',
                      )}
                      title="Set as hero"
                    >
                      <Star size={14} fill={img.isHero ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'single' ? (
            <>
              {/* Layout picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Layout</label>
                <div className="grid grid-cols-3 gap-2">
                  {layouts.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLayout(l.id)}
                      className={clsx(
                        'relative aspect-square rounded-xl border-2 p-2.5 transition-all',
                        selectedLayout === l.id
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-white/[0.08] bg-white/[0.02] text-gray-600 hover:border-white/[0.15] hover:text-gray-400',
                      )}
                      title={l.description}
                    >
                      {LAYOUT_PREVIEWS[l.id] || <LayoutGrid size={16} />}
                      <span className="absolute bottom-1 left-0 right-0 text-[9px] text-center font-medium">
                        {l.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                <div className="flex gap-2">
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={clsx('flex-1 py-2 text-sm rounded-lg border transition-colors',
                        format === f ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gap: <span className="text-brand-500 font-bold">{gap}px</span>
                </label>
                <input type="range" min={0} max={20} value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>

              {/* Generate */}
              <button onClick={handleGenerate} disabled={images.length < 2 || loading}
                className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                  images.length >= 2 && !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                {loading ? <><Loader2 size={17} className="animate-spin" /> Creating collage...</> : <><LayoutGrid size={17} /> Create Collage</>}
              </button>
            </>
          ) : (
            <>
              {/* Bulk: Layout multi-select */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Layouts to generate
                  <span className="text-xs text-gray-500 ml-2 font-normal">{selectedBulkLayouts.length} selected</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {layouts.filter(l => l.id !== 'auto').map(l => (
                    <button key={l.id} onClick={() => toggleBulkLayout(l.id)}
                      className={clsx('relative aspect-square rounded-xl border-2 p-2 transition-all',
                        selectedBulkLayouts.includes(l.id)
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-white/[0.06] bg-white/[0.02] text-gray-600 hover:border-white/[0.12]')}>
                      {LAYOUT_PREVIEWS[l.id] || <LayoutGrid size={14} />}
                      <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-center font-medium">{l.label}</span>
                      {selectedBulkLayouts.includes(l.id) && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variants per layout */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Variants per layout: <span className="text-brand-500 font-bold">{bulkVariants}</span>
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    = {selectedBulkLayouts.length * bulkVariants} total collages
                  </span>
                </label>
                <input type="range" min={1} max={5} value={bulkVariants} onChange={e => setBulkVariants(Number(e.target.value))} className="w-full accent-brand-500" />
                <p className="text-[10px] text-gray-600 mt-1">Each variant shuffles the image order differently</p>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                <div className="flex gap-2">
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={clsx('flex-1 py-2 text-sm rounded-lg border transition-colors',
                        format === f ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gap: <span className="text-brand-500 font-bold">{gap}px</span>
                </label>
                <input type="range" min={0} max={20} value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>

              {/* Bulk Generate */}
              <button onClick={handleBulkGenerate}
                disabled={images.length < 2 || bulkLoading || selectedBulkLayouts.length === 0}
                className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                  images.length >= 2 && !bulkLoading && selectedBulkLayouts.length > 0
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                {bulkLoading
                  ? <><Loader2 size={17} className="animate-spin" /> Generating {bulkResults.length}/{selectedBulkLayouts.length * bulkVariants}...</>
                  : <><LayoutGrid size={17} /> Generate {selectedBulkLayouts.length * bulkVariants} Collages</>}
              </button>
            </>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2">
          {(() => {
            // Build ordered images list: hero first
            const hi = images.findIndex(img => img.isHero)
            const ordered = hi >= 0
              ? [images[hi], ...images.filter((_, i) => i !== hi)]
              : images

            // Determine active layout for preview
            const activeLayout = selectedLayout === 'auto'
              ? (format === '1:1'
                  ? (images.length >= 4 ? 'grid_2x2' : 'featured')
                  : (images.length >= 3 ? 'strip_3' : 'hero_top'))
              : selectedLayout

            const aspectClass = format === '9:16' ? 'aspect-[9/16]' : format === '16:9' ? 'aspect-video' : 'aspect-square'
            const gapPx = `${gap}px`

            if (resultUrl) return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-300">Result</h2>
                  <div className="flex gap-2">
                    <a href={resultUrl} download="collage.png" className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors">
                      <Download size={15} /> Download
                    </a>
                    <button onClick={() => setResultUrl(null)} className="p-2 text-gray-500 hover:text-gray-300 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                  <img src={resultUrl} alt="Collage result" className="w-full h-auto" />
                </div>
              </div>
            )

            if (images.length === 0) return (
              <div className="flex flex-col items-center justify-center h-96 text-gray-600 text-sm rounded-2xl border border-dashed border-white/[0.06]">
                <LayoutGrid size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Upload images to get started</p>
                <p className="text-xs text-gray-700 mt-1">At least 2 images needed</p>
              </div>
            )

            // Live layout preview with real images
            const Cell = ({ idx, className: cls }: { idx: number; className?: string }) => {
              const img = ordered[idx]
              if (!img) return <div className={clsx('bg-white/[0.04] rounded-sm', cls)} />
              return (
                <div
                  className={clsx('relative overflow-hidden rounded-sm cursor-pointer group', cls)}
                  onClick={() => setHero(img.id)}
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  {img.isHero && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-600/90 text-white text-[9px] font-bold">
                      <Star size={8} fill="currentColor" /> HERO
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )
            }

            const previewContent = (() => {
              switch (activeLayout) {
                case 'grid_2x2':
                  return (
                    <div className={clsx('grid grid-cols-2 grid-rows-2 w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} /><Cell idx={1} /><Cell idx={2} /><Cell idx={3} />
                    </div>
                  )
                case 'strip_3':
                  return (
                    <div className={clsx('flex flex-col w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} className="flex-1" />
                      <Cell idx={1} className="flex-1" />
                      <Cell idx={2} className="flex-1" />
                    </div>
                  )
                case 'featured':
                  return (
                    <div className={clsx('flex flex-col w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} className="flex-[3]" />
                      <div className="flex flex-[2]" style={{ gap: gapPx }}>
                        <Cell idx={1} className="flex-1" />
                        <Cell idx={2} className="flex-1" />
                      </div>
                    </div>
                  )
                case 'hero_center':
                  return (
                    <div className={clsx('relative w-full', aspectClass)}>
                      <div className="absolute inset-[12%] z-10"><Cell idx={0} className="w-full h-full" /></div>
                      <div className="absolute top-0 left-0 w-[11%] h-[11%]"><Cell idx={1} className="w-full h-full" /></div>
                      <div className="absolute top-0 right-0 w-[11%] h-[11%]"><Cell idx={2} className="w-full h-full" /></div>
                      <div className="absolute bottom-0 left-0 w-[11%] h-[11%]"><Cell idx={3} className="w-full h-full" /></div>
                      <div className="absolute bottom-0 right-0 w-[11%] h-[11%]"><Cell idx={4} className="w-full h-full" /></div>
                    </div>
                  )
                case 'hero_left':
                  return (
                    <div className={clsx('flex w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} className="flex-[3]" />
                      <div className="flex flex-col flex-[2]" style={{ gap: gapPx }}>
                        <Cell idx={1} className="flex-1" />
                        <Cell idx={2} className="flex-1" />
                        <Cell idx={3} className="flex-1" />
                      </div>
                    </div>
                  )
                case 'hero_top':
                  return (
                    <div className={clsx('flex flex-col w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} className="flex-[3]" />
                      <div className="flex flex-1" style={{ gap: gapPx }}>
                        <Cell idx={1} className="flex-1" />
                        <Cell idx={2} className="flex-1" />
                        <Cell idx={3} className="flex-1" />
                      </div>
                    </div>
                  )
                case 'mosaic':
                  return (
                    <div className={clsx('flex w-full', aspectClass)} style={{ gap: gapPx }}>
                      <Cell idx={0} className="flex-[3]" />
                      <div className="flex flex-col flex-[2]" style={{ gap: gapPx }}>
                        <Cell idx={1} className="flex-[3]" />
                        <div className="flex flex-[2]" style={{ gap: gapPx }}>
                          <Cell idx={2} className="flex-1" />
                          <Cell idx={3} className="flex-1" />
                        </div>
                      </div>
                    </div>
                  )
                case 'filmstrip':
                  return (
                    <div className={clsx('flex w-full', aspectClass)} style={{ gap: gapPx }}>
                      {ordered.slice(0, 5).map((_, i) => <Cell key={i} idx={i} className="flex-1" />)}
                    </div>
                  )
                default:
                  return (
                    <div className={clsx('grid grid-cols-2 gap-2 w-full', aspectClass)}>
                      {ordered.map((_, i) => <Cell key={i} idx={i} />)}
                    </div>
                  )
              }
            })()

            return (
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-gray-300">Preview — {layouts.find(l => l.id === selectedLayout)?.label || selectedLayout}</h2>
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black p-1">
                  {previewContent}
                </div>
                <p className="text-[11px] text-gray-600 text-center">Click any image to set as Hero</p>
              </div>
            )
          })()}

          {/* Bulk results grid */}
          {mode === 'bulk' && bulkResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-300">
                  Bulk Results — {bulkResults.length} collage{bulkResults.length !== 1 ? 's' : ''}
                </h2>
                <button onClick={() => setBulkResults([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {bulkResults.map((r, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={r.url} alt={r.layout} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <span className="text-xs text-white font-medium bg-black/40 px-2 py-1 rounded">{r.layout}</span>
                      <a href={r.url} download={`collage_${r.layout.replace(/\s+/g, '_').toLowerCase()}.png`}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                        <Download size={16} className="text-white" />
                      </a>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] text-gray-300">
                      {r.layout}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
