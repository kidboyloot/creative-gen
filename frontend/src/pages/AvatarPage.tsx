import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  UserCircle, Upload, Loader2, Download, Play, Pause, Video,
  Sparkles, Mic, Camera, RefreshCw, Volume2, Image as ImageIcon
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'
import Dropdown from '../components/ui/Dropdown'

interface Presets {
  ages: string[]
  genders: string[]
  styles: { id: string; label: string }[]
  settings: { id: string; label: string }[]
  interactions: { id: string; label: string }[]
  voices: { id: string; name: string; lang: string; gender: string }[]
}

type Method = 'generate' | 'photo'

export default function AvatarPage() {
  const [method, setMethod] = useState<Method>('generate')

  // Config
  const [age, setAge] = useState('Adult (30s)')
  const [gender, setGender] = useState('Female')
  const [style, setStyle] = useState('professional')
  const [setting, setSetting] = useState('studio')
  const [interaction, setInteraction] = useState('talking')
  const [customDesc, setCustomDesc] = useState('')

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoImageId, setPhotoImageId] = useState<string | null>(null)

  // Product image
  const [productFile, setProductFile] = useState<File | null>(null)
  const [productPreview, setProductPreview] = useState<string | null>(null)
  const [productImageId, setProductImageId] = useState<string | null>(null)
  const [productName, setProductName] = useState('')

  // Voice
  const [script, setScript] = useState('')
  const [voiceId, setVoiceId] = useState('en-US-AriaNeural')
  const [voiceRate, setVoiceRate] = useState('+0%')
  const [generateVideo, setGenerateVideo] = useState(true)

  // Results
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const productInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const updateCredits = useAuthStore(s => s.updateCredits)

  const { data: presets } = useQuery<Presets>({
    queryKey: ['avatar-presets'],
    queryFn: () => axios.get<Presets>('/avatar/presets').then(r => r.data),
    staleTime: Infinity,
  })

  // Poll job status
  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/avatar/status/${jobId}`)
        setStep(res.data.step)
        if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url)
        if (res.data.voice_url) setVoiceUrl(res.data.voice_url)
        if (res.data.video_url) setVideoUrl(res.data.video_url)
        if (res.data.status === 'done' || res.data.status === 'failed') {
          setLoading(false)
          clearInterval(interval)
          if (res.data.status === 'failed') setError(res.data.step)
          axios.get('/auth/me').then(r => updateCredits(r.data.credits)).catch(() => {})
        }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId])

  const handlePhotoUpload = async (f: File) => {
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
    const formData = new FormData()
    formData.append('file', f)
    const res = await axios.post<{ image_id: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setPhotoImageId(res.data.image_id)
  }

  const handleProductUpload = async (f: File) => {
    setProductFile(f)
    setProductPreview(URL.createObjectURL(f))
    const formData = new FormData()
    formData.append('file', f)
    const res = await axios.post<{ image_id: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setProductImageId(res.data.image_id)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setAvatarUrl(null)
    setVoiceUrl(null)
    setVideoUrl(null)

    try {
      const productContext = productImageId && productName
        ? `, holding a ${productName} product, showcasing the product prominently`
        : productImageId
          ? ', holding and showcasing a product'
          : ''

      const res = await axios.post<{ job_id: string }>('/avatar/generate', {
        age,
        gender,
        style,
        setting,
        interaction,
        custom_description: customDesc + productContext,
        script,
        voice_id: voiceId,
        voice_rate: voiceRate,
        model: 'flux-dev',
        video_model: 'seedance-2',
        generate_video: generateVideo,
        photo_image_id: method === 'photo' ? photoImageId : null,
        product_image_id: productImageId,
        product_name: productName,
      })
      setJobId(res.data.job_id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Generation failed')
      setLoading(false)
    }
  }

  const canGenerate = method === 'generate' || (method === 'photo' && photoImageId)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Avatar</h1>
        <p className="text-gray-400 text-sm mt-1">
          Create AI spokesperson videos for product demos and UGC-style ads.
        </p>
      </div>

      {/* Method toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        <button
          onClick={() => setMethod('generate')}
          className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
            method === 'generate' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}
        >
          <Sparkles size={14} /> Generate from Config
        </button>
        <button
          onClick={() => setMethod('photo')}
          className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
            method === 'photo' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}
        >
          <Camera size={14} /> From Your Photo
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Config */}
        <div className="lg:col-span-1 space-y-4">
          {method === 'photo' ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Photo</label>
              {photoPreview ? (
                <div className="relative group">
                  <img src={photoPreview} alt="Photo" className="w-full rounded-xl border border-white/[0.08]" />
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoImageId(null) }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <RefreshCw size={14} />
                  </button>
                </div>
              ) : (
                <div onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-white/[0.1] hover:border-brand-500/40 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <Camera size={24} className="mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400">Upload your face photo</p>
                  <p className="text-[11px] text-gray-600 mt-1">Clear front-facing portrait works best</p>
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </div>
          ) : (
            <>
              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Age</label>
                  <Dropdown
                    value={age}
                    onChange={setAge}
                    searchable={false}
                    options={(presets?.ages || []).map((a) => ({ value: a, label: a }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Gender</label>
                  <Dropdown
                    value={gender}
                    onChange={setGender}
                    searchable={false}
                    options={(presets?.genders || []).map((g) => ({ value: g, label: g }))}
                  />
                </div>
              </div>
            </>
          )}

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {presets?.styles.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={clsx('py-1.5 text-[11px] rounded-lg border transition-colors',
                    style === s.id ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Setting</label>
            <div className="grid grid-cols-3 gap-1.5">
              {presets?.settings.map(s => (
                <button key={s.id} onClick={() => setSetting(s.id)}
                  className={clsx('py-1.5 text-[11px] rounded-lg border transition-colors',
                    setting === s.id ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interaction */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Interaction Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              {presets?.interactions.map(i => (
                <button key={i.id} onClick={() => setInteraction(i.id)}
                  className={clsx('py-1.5 text-[11px] rounded-lg border transition-colors',
                    interaction === i.id ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500 hover:text-gray-300')}>
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Product Image <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            {productPreview ? (
              <div className="flex items-center gap-3">
                <img src={productPreview} alt="Product" className="w-14 h-14 rounded-lg object-cover border border-white/[0.08]" />
                <div className="flex-1">
                  <input value={productName} onChange={e => setProductName(e.target.value)}
                    placeholder="Product name..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50" />
                </div>
                <button onClick={() => { setProductFile(null); setProductPreview(null); setProductImageId(null); setProductName('') }}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                  <RefreshCw size={12} />
                </button>
              </div>
            ) : (
              <div onClick={() => productInputRef.current?.click()}
                className="border border-dashed border-white/[0.08] hover:border-brand-500/30 rounded-xl p-3 text-center cursor-pointer transition-colors">
                <Upload size={16} className="mx-auto text-gray-600 mb-1" />
                <p className="text-[11px] text-gray-500">Add product for avatar to showcase</p>
              </div>
            )}
            <input ref={productInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleProductUpload(e.target.files[0])} />
          </div>

          {/* Custom description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Extra Details <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            <input value={customDesc} onChange={e => setCustomDesc(e.target.value)}
              placeholder="e.g. wearing glasses, holding a coffee mug..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50" />
          </div>

          {/* Script + Voice */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Mic size={13} className="inline mr-1 text-brand-400" />
              Script <span className="text-xs text-gray-500 font-normal">(AI voice)</span>
            </label>
            <textarea value={script} onChange={e => setScript(e.target.value)}
              rows={3} placeholder="What should your avatar say? Leave empty for no voice."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none" />
          </div>

          {script.trim() && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Voice</label>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {presets?.voices.map(v => (
                  <button key={v.id} onClick={() => setVoiceId(v.id)}
                    className={clsx('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] text-left transition-colors',
                      voiceId === v.id ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.04] text-gray-500')}>
                    <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold',
                      v.gender === 'Female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400')}>
                      {v.gender[0]}
                    </span>
                    <span className="truncate">{v.name}</span>
                    <span className="text-[9px] text-gray-600 ml-auto">{v.lang}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Video size={14} className="text-brand-400" />
              <span className="text-sm text-gray-300">Generate video</span>
            </div>
            <button onClick={() => setGenerateVideo(v => !v)}
              className={clsx('w-10 h-5 rounded-full transition-colors relative',
                generateVideo ? 'bg-brand-600' : 'bg-white/[0.1]')}>
              <div className={clsx('w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
                generateVideo ? 'left-5' : 'left-0.5')} />
            </button>
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={!canGenerate || loading}
            className={clsx('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              canGenerate && !loading ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500 cursor-not-allowed')}>
            {loading ? <><Loader2 size={17} className="animate-spin" /> {step || 'Generating...'}</> : <><UserCircle size={17} /> Create Avatar</>}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {loading && !avatarUrl && (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Loader2 size={40} className="animate-spin mb-4 text-brand-500" />
              <p className="font-medium capitalize">{step || 'Starting pipeline...'}</p>
              <p className="text-xs text-gray-600 mt-1">This may take a minute</p>
            </div>
          )}

          {(avatarUrl || videoUrl) && (
            <div className="space-y-6">
              {/* Video result */}
              {videoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Video size={14} className="text-brand-400" /> Avatar Video
                    </h2>
                    <a href={videoUrl} download="avatar_video.mp4"
                      className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors">
                      <Download size={15} /> Download
                    </a>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                    <video src={videoUrl} controls className="w-full max-h-[500px]" />
                  </div>
                </div>
              )}

              {/* Avatar image */}
              {avatarUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <ImageIcon size={14} className="text-purple-400" /> Avatar Image
                    </h2>
                    <a href={avatarUrl} download="avatar.png"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-xs rounded-lg transition-colors">
                      <Download size={13} /> PNG
                    </a>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
                    <img src={avatarUrl} alt="Avatar" className="w-full max-h-[400px] object-contain" />
                  </div>
                </div>
              )}

              {/* Voice */}
              {voiceUrl && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Volume2 size={14} className="text-green-400" /> Voice Audio
                  </h2>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <button onClick={() => {
                      if (!audioRef.current) return
                      isPlaying ? audioRef.current.pause() : audioRef.current.play()
                      setIsPlaying(!isPlaying)
                    }} className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition-colors flex-shrink-0">
                      {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                    </button>
                    <audio ref={audioRef} src={voiceUrl} controls className="flex-1"
                      onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />
                    <a href={voiceUrl} download="avatar_voice.mp3"
                      className="p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-gray-400 transition-colors flex-shrink-0">
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <Loader2 size={13} className="animate-spin text-brand-400" />
                  <span className="text-xs text-brand-300 capitalize">{step}...</span>
                </div>
              )}
            </div>
          )}

          {!loading && !avatarUrl && !videoUrl && (
            <div className="flex flex-col items-center justify-center h-80 text-gray-600 text-sm rounded-2xl border border-dashed border-white/[0.06]">
              <UserCircle size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Your AI avatar will appear here</p>
              <p className="text-xs text-gray-700 mt-1">Configure and click Create Avatar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
