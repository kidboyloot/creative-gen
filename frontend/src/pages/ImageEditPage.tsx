import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Paintbrush, Eraser as EraserIcon, Upload, Download, Loader2, RotateCcw,
  Sun, Contrast, Sparkles, Palette, Maximize, Undo2, Image as ImageIcon,
  RefreshCw, ZoomIn, ZoomOut, Scissors
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

type Tool = 'brush' | 'eraser'
type Tab = 'inpaint' | 'bg-remove' | 'enhance' | 'resize'

export default function ImageEditPage() {
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('inpaint')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Inpaint
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(30)
  const [prompt, setPrompt] = useState('')
  const [isPainting, setIsPainting] = useState(false)

  // Enhance
  const [brightness, setBrightness] = useState(1.0)
  const [contrast, setContrast] = useState(1.0)
  const [sharpness, setSharpness] = useState(1.0)
  const [saturation, setSaturation] = useState(1.0)

  // Resize
  const [resizeW, setResizeW] = useState(1080)
  const [resizeH, setResizeH] = useState(1080)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const updateCredits = useAuthStore(s => s.updateCredits)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResultUrl(null)
    setError('')
    const url = URL.createObjectURL(f)
    setImageUrl(url)

    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      setupCanvas(img)
    }
    img.src = url
  }, [])

  const setupCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return

    // Scale to fit container while keeping aspect ratio
    const maxW = 700
    const maxH = 500
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)

    canvas.width = w
    canvas.height = h
    maskCanvas.width = w
    maskCanvas.height = h

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    const maskCtx = maskCanvas.getContext('2d')!
    maskCtx.clearRect(0, 0, w, h)
  }

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')!
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
  }

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting) return
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')!
    const { x, y } = getPos(e)

    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 100, 50, 0.5)'
    ctx.fill()
  }

  // Get mask as white-on-black image for the API
  const getMaskBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const maskCanvas = maskCanvasRef.current!
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = imgRef.current?.width || maskCanvas.width
      tempCanvas.height = imgRef.current?.height || maskCanvas.height
      const ctx = tempCanvas.getContext('2d')!

      // Black background
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      // Draw mask areas as white
      const maskCtx = maskCanvas.getContext('2d')!
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

      const scaleX = tempCanvas.width / maskCanvas.width
      const scaleY = tempCanvas.height / maskCanvas.height

      ctx.fillStyle = '#ffffff'
      for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
          const idx = (y * maskCanvas.width + x) * 4
          if (maskData.data[idx + 3] > 0) {
            ctx.fillRect(
              Math.round(x * scaleX),
              Math.round(y * scaleY),
              Math.ceil(scaleX),
              Math.ceil(scaleY)
            )
          }
        }
      }

      tempCanvas.toBlob(blob => resolve(blob!), 'image/png')
    })
  }

  const handleInpaint = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    try {
      const maskBlob = await getMaskBlob()
      const formData = new FormData()
      formData.append('image', file)
      formData.append('mask', maskBlob, 'mask.png')
      formData.append('prompt', prompt)

      const res = await axios.post<{ url: string }>('/image-edit/inpaint', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultUrl(res.data.url)
      axios.get('/auth/me').then(r => updateCredits(r.data.credits)).catch(() => {})
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Inpainting failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBg = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await axios.post<{ url: string }>('/image-edit/remove-bg', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultUrl(res.data.url)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'BG removal failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEnhance = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('brightness', brightness.toString())
      formData.append('contrast', contrast.toString())
      formData.append('sharpness', sharpness.toString())
      formData.append('saturation', saturation.toString())
      const res = await axios.post<{ url: string }>('/image-edit/enhance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultUrl(res.data.url)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Enhancement failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResize = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('width', resizeW.toString())
      formData.append('height', resizeH.toString())
      const res = await axios.post<{ url: string }>('/image-edit/resize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultUrl(res.data.url)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Resize failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setImageUrl(null)
    setResultUrl(null)
    setError('')
    setPrompt('')
    clearMask()
  }

  const TABS: { id: Tab; label: string; icon: typeof Paintbrush; desc: string }[] = [
    { id: 'inpaint', label: 'AI Inpaint', icon: Paintbrush, desc: 'Paint & describe changes' },
    { id: 'bg-remove', label: 'Remove BG', icon: Scissors, desc: 'One-click background removal' },
    { id: 'enhance', label: 'Enhance', icon: Sun, desc: 'Brightness, contrast, sharpness' },
    { id: 'resize', label: 'Resize', icon: Maximize, desc: 'Resize to any dimension' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Editor</h1>
        <p className="text-gray-400 text-sm mt-1">AI inpainting, background removal, enhancement, and resize.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setResultUrl(null); setError('') }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === t.id
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.05]',
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {!imageUrl ? (
        /* Upload area */
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-2xl p-16 text-center cursor-pointer transition-colors"
        >
          <ImageIcon size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-300">Drop your image here</p>
          <p className="text-sm text-gray-500 mt-2">PNG, JPG, WebP</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="space-y-4">
            {activeTab === 'inpaint' && (
              <>
                {/* Tool selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tool</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setTool('brush')}
                      className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors',
                        tool === 'brush' ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500')}
                    >
                      <Paintbrush size={13} /> Brush
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors',
                        tool === 'eraser' ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500')}
                    >
                      <EraserIcon size={13} /> Eraser
                    </button>
                  </div>
                </div>

                {/* Brush size */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Brush: <span className="text-brand-500">{brushSize}px</span>
                  </label>
                  <input type="range" min={5} max={100} value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-full accent-brand-500" />
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Describe changes</label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={3}
                    placeholder="e.g. Replace with a tropical beach background..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={clearMask}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-xs transition-colors">
                    <Undo2 size={13} /> Clear mask
                  </button>
                </div>

                <button onClick={handleInpaint} disabled={loading}
                  className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                    !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                  {loading ? <><Loader2 size={17} className="animate-spin" /> Inpainting...</> : <><Sparkles size={17} /> Apply Inpaint</>}
                </button>
              </>
            )}

            {activeTab === 'bg-remove' && (
              <>
                <p className="text-sm text-gray-400">One-click AI background removal. Runs locally — free, no API costs.</p>
                <button onClick={handleRemoveBg} disabled={loading}
                  className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                    !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                  {loading ? <><Loader2 size={17} className="animate-spin" /> Removing...</> : <><Scissors size={17} /> Remove Background</>}
                </button>
              </>
            )}

            {activeTab === 'enhance' && (
              <>
                {[
                  { label: 'Brightness', value: brightness, set: setBrightness, icon: Sun },
                  { label: 'Contrast', value: contrast, set: setContrast, icon: Contrast },
                  { label: 'Sharpness', value: sharpness, set: setSharpness, icon: Sparkles },
                  { label: 'Saturation', value: saturation, set: setSaturation, icon: Palette },
                ].map(s => (
                  <div key={s.label}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                      <s.icon size={13} className="text-brand-400" />
                      {s.label}: <span className="text-brand-500">{s.value.toFixed(1)}</span>
                    </label>
                    <input type="range" min={0.2} max={2.0} step={0.1} value={s.value}
                      onChange={e => s.set(Number(e.target.value))}
                      className="w-full accent-brand-500" />
                  </div>
                ))}
                <button onClick={handleEnhance} disabled={loading}
                  className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                    !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                  {loading ? <><Loader2 size={17} className="animate-spin" /> Enhancing...</> : <><Sun size={17} /> Apply Enhancement</>}
                </button>
              </>
            )}

            {activeTab === 'resize' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Width</label>
                    <input type="number" value={resizeW} onChange={e => setResizeW(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Height</label>
                    <input type="number" value={resizeH} onChange={e => setResizeH(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { l: 'IG Feed', w: 1080, h: 1080 },
                    { l: 'IG Story', w: 1080, h: 1920 },
                    { l: 'FB Ad', w: 1200, h: 628 },
                    { l: 'Shopify', w: 2048, h: 2048 },
                    { l: 'TikTok', w: 1080, h: 1920 },
                  ].map(p => (
                    <button key={p.l} onClick={() => { setResizeW(p.w); setResizeH(p.h) }}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-white/[0.06] text-gray-500 hover:text-white hover:border-white/[0.15] transition-colors">
                      {p.l}
                    </button>
                  ))}
                </div>
                <button onClick={handleResize} disabled={loading}
                  className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                    !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
                  {loading ? <><Loader2 size={17} className="animate-spin" /> Resizing...</> : <><Maximize size={17} /> Resize Image</>}
                </button>
              </>
            )}

            {/* New image button */}
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-xs transition-colors">
              <RefreshCw size={13} /> New image
            </button>
          </div>

          {/* Right: Canvas / Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300">
                {resultUrl ? 'Result' : activeTab === 'inpaint' ? 'Paint areas to edit' : 'Original'}
              </h2>
              {resultUrl && (
                <a href={resultUrl} download="edited.png"
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors">
                  <Download size={15} /> Download
                </a>
              )}
            </div>

            {resultUrl ? (
              <div className="rounded-2xl overflow-hidden border border-white/[0.08]"
                style={{
                  backgroundImage: 'repeating-conic-gradient(#1a1a24 0% 25%, #22222e 0% 50%)',
                  backgroundSize: '20px 20px',
                }}>
                <img src={resultUrl} alt="Result" className="w-full h-auto max-h-[600px] object-contain" />
              </div>
            ) : (
              <div ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black inline-block">
                {/* Base image canvas */}
                <canvas ref={canvasRef} className="block" />

                {/* Mask overlay canvas */}
                {activeTab === 'inpaint' && (
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute top-0 left-0 cursor-crosshair"
                    style={{ mixBlendMode: 'normal' }}
                    onMouseDown={e => { setIsPainting(true); paint(e) }}
                    onMouseMove={paint}
                    onMouseUp={() => setIsPainting(false)}
                    onMouseLeave={() => setIsPainting(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
