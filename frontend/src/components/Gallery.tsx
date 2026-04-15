import { useState } from 'react'
import { Download, Image, Video, LayoutGrid } from 'lucide-react'
import clsx from 'clsx'
import type { Asset } from '../hooks/useJobStatus'

const TYPE_ICONS = {
  image: Image,
  video: Video,
  collage: LayoutGrid,
}

const TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  collage: 'Collage',
}

interface Props {
  assets: Asset[]
  jobId: string
}

export default function Gallery({ assets, jobId }: Props) {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterFormat, setFilterFormat] = useState<string>('all')

  const filtered = assets.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false
    if (filterFormat !== 'all' && a.format !== filterFormat) return false
    return true
  })

  const types = ['all', ...Array.from(new Set(assets.map((a) => a.type)))]
  const formats = ['all', ...Array.from(new Set(assets.map((a) => a.format)))]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={clsx(
                'px-3 py-1 text-xs rounded-full transition-colors',
                filterType === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {t === 'all' ? 'All types' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setFilterFormat(f)}
              className={clsx(
                'px-3 py-1 text-xs rounded-full transition-colors',
                filterFormat === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {f === 'all' ? 'All formats' : f}
            </button>
          ))}
        </div>

        <a
          href={`/download/${jobId}`}
          download
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors"
        >
          <Download size={15} />
          Download all ZIP
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((asset) => {
          const Icon = TYPE_ICONS[asset.type] ?? Image
          return (
            <div
              key={asset.id}
              className="group relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800"
            >
              {asset.type === 'video' ? (
                <video
                  src={asset.url}
                  className="w-full aspect-square object-cover"
                  muted
                  loop
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
              ) : (
                <img
                  src={asset.url}
                  alt={`Variant ${asset.variant}`}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                <span className="flex items-center gap-1 text-xs text-white">
                  <Icon size={13} />
                  {asset.format}
                </span>
                <a
                  href={asset.url}
                  download
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Download size={14} className="text-white" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-10">No assets match the current filters.</p>
      )}
    </div>
  )
}
