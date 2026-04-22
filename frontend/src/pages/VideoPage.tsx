import { useState } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Video, Loader2, Play, Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import UploadZone from '../components/UploadZone'
import ModelSelect from '../components/ModelSelect'
import Dropdown from '../components/ui/Dropdown'
import { useVideoStore } from '../store/videoStore'
import { useVideoStatus, VideoAsset } from '../hooks/useVideoStatus'

interface VideoModelOption {
  id: string
  label: string
  description: string
  supports_prompt: boolean
}

const RESOLUTIONS = ['480p', '720p'] as const
const ASPECT_RATIOS = ['auto', '9:16', '16:9', '1:1', '4:3', '3:4', '21:9']
const DURATIONS = ['auto', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']

export default function VideoPage() {
  const {
    imageId, imagePreview,
    prompt, model, resolution, duration, aspectRatio, generateAudio, count,
    setImageId, setPrompt, setModel, setResolution, setDuration, setAspectRatio,
    setGenerateAudio, setCount, setJobId, jobId,
  } = useVideoStore()

  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const { data: jobStatus } = useVideoStatus(jobId)
  const { data: models = [] } = useQuery<VideoModelOption[]>({
    queryKey: ['video-models'],
    queryFn: () => axios.get<VideoModelOption[]>('/video/models').then((r) => r.data),
  })

  const selectedModel = models.find((m) => m.id === model)
  const activeJobRunning = jobStatus?.status === 'running' || jobStatus?.status === 'pending'
  const canGenerate = !!imageId && !loading && !activeJobRunning

  async function handleGenerate() {
    if (!imageId) return
    setRequestError(null)
    setLoading(true)
    try {
      const res = await axios.post<{ job_id: string }>('/video/generate', {
        image_id: imageId,
        prompt,
        model,
        resolution,
        duration,
        aspect_ratio: aspectRatio,
        generate_audio: generateAudio,
        count,
      })
      setJobId(res.data.job_id)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Request failed'
      setRequestError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  const progress = jobStatus ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100) : 0
  const isRunning = loading || activeJobRunning

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Video Generator</h1>
        <p className="text-gray-400 text-sm mt-1">Animate a reference image into a short video clip.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: inputs */}
        <div className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reference Image</label>
            <UploadZone
              imagePreview={imagePreview}
              onUpload={setImageId}
              onClear={() => setImageId('', '')}
            />
          </div>

          {/* Prompt */}
          {(selectedModel?.supports_prompt ?? true) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Motion Prompt <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. smooth cinematic zoom out, slow motion waves…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none transition-colors"
              />
            </div>
          )}

          {/* Model */}
          <ModelSelect models={models} value={model} onChange={setModel} label="Video Model" />

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
            <div className="flex gap-2">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={clsx(
                    'flex-1 py-2 text-sm rounded-lg border transition-colors',
                    resolution === r
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAspectRatio(a)}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    aspectRatio === a
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.2]'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
            <Dropdown
              value={duration}
              onChange={setDuration}
              searchable={false}
              options={DURATIONS.map((d) => ({
                value: d,
                label: d === 'auto' ? 'Auto (model decides)' : `${d} seconds`,
              }))}
            />
          </div>

          {/* Audio toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Audio</label>
            <button
              onClick={() => setGenerateAudio(!generateAudio)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
                generateAudio
                  ? 'border-brand-500 bg-brand-600/10'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
              )}
            >
              {generateAudio
                ? <Volume2 size={18} className="text-brand-400 flex-shrink-0" />
                : <VolumeX size={18} className="text-gray-500 flex-shrink-0" />
              }
              <div>
                <p className="text-sm font-medium text-white">
                  {generateAudio ? 'Generate audio' : 'No audio'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {generateAudio
                    ? 'Effects, ambient sound & speech sync'
                    : 'Silent video output'}
                </p>
              </div>
              <div className={clsx(
                'ml-auto w-9 h-5 rounded-full transition-colors flex-shrink-0',
                generateAudio ? 'bg-brand-500' : 'bg-white/[0.1]'
              )}>
                <div className={clsx(
                  'w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform',
                  generateAudio ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </div>
            </button>
          </div>

          {/* Variants */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Variants: <span className="text-brand-500 font-bold">{count}</span>
            </label>
            <input
              type="range" min={1} max={10} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1</span><span>10</span>
            </div>
          </div>

          {requestError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-xs font-medium text-red-400 mb-0.5">Request failed</p>
              <p className="text-xs text-red-300/70 font-mono break-all">{requestError}</p>
            </div>
          )}

          {!imageId && (
            <p className="text-xs text-center text-gray-500">Upload a reference image to enable generation</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!imageId || isRunning}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              imageId && !isRunning
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <><Loader2 size={17} className="animate-spin" /> Generating…</>
            ) : (
              <><Video size={17} /> Generate {count} Video{count !== 1 ? 's' : ''}</>
            )}
          </button>

          {(jobStatus?.status === 'done' || jobStatus?.status === 'failed') && (
            <button
              onClick={() => { setJobId(null); setRequestError(null) }}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear & generate again
            </button>
          )}
        </div>

        {/* Right: progress + results */}
        <div className="space-y-4">
          {jobStatus && (
            <>
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-medium">{jobStatus.done} / {jobStatus.total} videos</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className={clsx('text-xs capitalize', {
                    'text-yellow-400': jobStatus.status === 'running' || jobStatus.status === 'pending',
                    'text-green-400': jobStatus.status === 'done',
                    'text-red-400': jobStatus.status === 'failed',
                  })}>
                    {jobStatus.status}
                  </span>
                  <span className="text-xs text-gray-500">{progress}%</span>
                </div>
              </div>

              {jobStatus.errors?.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-1">
                  <p className="text-xs font-medium text-red-400 mb-1">Generation errors</p>
                  {jobStatus.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300/70 font-mono break-all">{err}</p>
                  ))}
                </div>
              )}

              {jobStatus.assets.length > 0 && (
                <VideoGallery assets={jobStatus.assets} />
              )}
            </>
          )}

          {!jobStatus && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-sm">
              <Play size={40} className="mb-3 opacity-20" />
              <p>Your generated videos will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoGallery({ assets }: { assets: VideoAsset[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300">{assets.length} video{assets.length !== 1 ? 's' : ''} ready</p>
      <div className="grid grid-cols-1 gap-3">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white/[0.04] rounded-xl border border-white/[0.08] overflow-hidden">
            <video
              src={asset.url}
              controls
              className="w-full rounded-t-xl"
              style={{ maxHeight: 300 }}
            />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-gray-500">
                Variant {asset.variant} · {asset.format}
              </span>
              <a
                href={asset.url}
                download={`video_${asset.variant}.mp4`}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
