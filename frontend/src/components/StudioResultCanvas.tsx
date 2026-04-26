import { useState, ReactNode } from 'react'
import { Download, X, Maximize2, RotateCw } from 'lucide-react'
import clsx from 'clsx'

function InfoBlock({ label, children, compact }: { label: string; children: ReactNode; compact?: boolean }) {
  return (
    <div className={clsx(compact ? 'space-y-1' : 'space-y-2')}>
      <div className="text-[9px] font-black text-[#52525b] uppercase tracking-widest">{label}</div>
      {children}
    </div>
  )
}

export interface ResultAsset {
  id: string
  url: string
  type?: 'image' | 'video' | string
  format?: string
  variant?: number
  // Metadata shown in the preview side panel
  prompt?: string
  model?: string
  user?: string
  createdAt?: string | Date
}

interface StudioResultCanvasProps {
  assets: ResultAsset[]
  /** Called when user wants to dismiss the strip and go back to clean state */
  onClose: () => void
  /** Called when user wants to regenerate the same prompt (optional) */
  onRegenerate?: () => void
}

/**
 * Horizontal filmstrip of generated variants — Higgsfield-style.
 * Each asset takes ~60vh height, width auto from aspect ratio.
 * Click an asset to open it large (lightbox).
 */
export default function StudioResultCanvas({ assets, onClose, onRegenerate }: StudioResultCanvasProps) {
  const [lightbox, setLightbox] = useState<ResultAsset | null>(null)

  if (assets.length === 0) return null

  return (
    <>
      <div className="w-full max-w-[1600px] mx-auto animate-fade-in-up">
        {/* Header strip with controls */}
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-widest">
            {assets.length} variant{assets.length !== 1 ? 's' : ''} ready
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                <RotateCw size={12} /> Regenerate
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-wider transition-all"
              title="Clear results"
            >
              <X size={12} /> Clear
            </button>
          </div>
        </div>

        {/* Filmstrip — horizontal scrollable row */}
        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3 snap-x snap-mandatory">
          {assets.map((a) => {
            const isVideo = a.type === 'video' || /\.mp4($|\?)/.test(a.url)
            return (
              <div
                key={a.id}
                onClick={() => setLightbox(a)}
                className="relative shrink-0 snap-start group cursor-zoom-in rounded-2xl overflow-hidden border border-white/10 bg-[#141414] transition-all hover:border-[#d9ff00]/50"
                style={{ height: '60vh' }}
              >
                {isVideo ? (
                  <video
                    src={a.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-auto block object-contain"
                  />
                ) : (
                  <img
                    src={a.url}
                    alt=""
                    className="h-full w-auto block object-contain"
                  />
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* top-right actions */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightbox(a) }}
                      className="w-8 h-8 rounded-lg bg-black/60 hover:bg-[#d9ff00] hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-colors"
                      title="View large"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <a
                      onClick={(e) => e.stopPropagation()}
                      href={a.url}
                      download={`creative_${a.variant || a.id}.${isVideo ? 'mp4' : 'png'}`}
                      className="w-8 h-8 rounded-lg bg-black/60 hover:bg-[#d9ff00] hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </div>

                  {/* bottom-left meta */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {a.format && (
                      <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                        {a.format}
                      </span>
                    )}
                    {a.variant && (
                      <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                        #{a.variant}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox — preview with side info panel */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-stretch animate-fade-in-up"
        >
          {/* Asset display (left side) */}
          <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
              className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all z-10"
            >
              <X size={18} />
            </button>

            {(() => {
              const isVideo = lightbox.type === 'video' || /\.mp4($|\?)/.test(lightbox.url)
              return isVideo ? (
                <video
                  src={lightbox.url}
                  controls
                  autoPlay
                  className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={lightbox.url}
                  className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain"
                  onClick={(e) => e.stopPropagation()}
                  alt=""
                />
              )
            })()}
          </div>

          {/* Info side panel (right) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0a0a0a] border-l border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/5">
              <div className="text-[10px] font-black text-[#52525b] uppercase tracking-widest mb-2">Generation</div>
              <h2 className="text-lg font-black text-white tracking-tight">Asset Details</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              {/* Prompt */}
              {lightbox.prompt && (
                <InfoBlock label="Prompt">
                  <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{lightbox.prompt}</p>
                </InfoBlock>
              )}

              {/* Model */}
              {lightbox.model && (
                <InfoBlock label="Model">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#d9ff00] rounded-md flex items-center justify-center">
                      <span className="text-[9px] font-black text-black">G</span>
                    </div>
                    <span className="text-sm font-bold text-white">{lightbox.model}</span>
                  </div>
                </InfoBlock>
              )}

              {/* User */}
              {lightbox.user && (
                <InfoBlock label="User">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#d9ff00]/20 border border-[#d9ff00]/40 flex items-center justify-center">
                      <span className="text-[10px] font-black text-[#d9ff00]">{lightbox.user[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-white">{lightbox.user}</span>
                  </div>
                </InfoBlock>
              )}

              {/* Format / variant */}
              <div className="grid grid-cols-2 gap-3">
                {lightbox.format && (
                  <InfoBlock label="Format" compact>
                    <span className="text-sm font-bold text-white">{lightbox.format}</span>
                  </InfoBlock>
                )}
                {lightbox.variant !== undefined && (
                  <InfoBlock label="Variant" compact>
                    <span className="text-sm font-bold text-white">#{lightbox.variant}</span>
                  </InfoBlock>
                )}
              </div>

              {/* Timestamp */}
              {lightbox.createdAt && (
                <InfoBlock label="Created" compact>
                  <span className="text-xs text-white/70">{new Date(lightbox.createdAt).toLocaleString()}</span>
                </InfoBlock>
              )}
            </div>

            {/* Actions footer */}
            <div className="p-6 border-t border-white/5 flex gap-2">
              <a
                href={lightbox.url}
                download={`creative_${lightbox.variant || lightbox.id}.${lightbox.type === 'video' ? 'mp4' : 'png'}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d9ff00] hover:bg-white text-black text-xs font-black uppercase tracking-wide transition-all"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lightbox.prompt || '') }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wide transition-all"
                title="Copy prompt"
              >
                Copy Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
