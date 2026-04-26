import { useRef, useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'

/**
 * 4-column scroll-wheel selector for cinema settings.
 * Each column is an independent vertical scroll list where the centered
 * item is the active value. Items above/below are scaled down + blurred.
 *
 * Original interaction pattern from Open-Generative-AI Cinema Studio.
 * This is a fresh React/TS implementation — same UX, original code.
 */

interface ColumnProps {
  title: string
  items: string[]
  value: string
  onChange: (value: string) => void
  /** Some items (focal length) display as text rather than image */
  renderTextual?: boolean
}

const ITEM_HEIGHT = 100
const VIEWPORT_HEIGHT = 320

function WheelColumn({ title, items, value, onChange, renderTextual }: ColumnProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.indexOf(value)))

  // Recompute centered item on scroll
  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const center = list.scrollTop + list.clientHeight / 2
    const idx = Math.max(0, Math.min(items.length - 1, Math.round((center - list.clientHeight / 2) / ITEM_HEIGHT)))
    if (idx !== activeIndex) {
      setActiveIndex(idx)
      const next = items[idx]
      if (next !== value) onChange(next)
    }
  }, [items, activeIndex, value, onChange])

  // Center the initial value
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const idx = Math.max(0, items.indexOf(value))
    list.scrollTop = idx * ITEM_HEIGHT
    setActiveIndex(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drag-to-scroll
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let isDown = false
    let startY = 0
    let startScroll = 0
    function onDown(e: MouseEvent) {
      isDown = true
      startY = e.pageY
      startScroll = list!.scrollTop
      e.preventDefault()
    }
    function onMove(e: MouseEvent) {
      if (!isDown) return
      list!.scrollTop = startScroll - (e.pageY - startY) * 1.5
    }
    function onUp() { isDown = false }
    list.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      list.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function clickItem(idx: number) {
    const list = listRef.current
    if (!list) return
    list.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col items-center w-[140px] md:w-[160px] shrink-0 snap-center">
      <div className="mb-3 text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{title}</div>
      <div
        className="relative overflow-hidden w-full bg-[#1a1a1a]/80 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-xl"
        style={{ height: VIEWPORT_HEIGHT }}
      >
        {/* gradient masks top/bottom */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent z-20 pointer-events-none rounded-t-[2rem]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent z-20 pointer-events-none rounded-b-[2rem]" />
        {/* center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-[80px] bg-[#d9ff00]/5 blur-xl rounded-full pointer-events-none z-0" />

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide relative z-10 cursor-pointer select-none"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {/* top spacer to allow first item to center */}
          <div style={{ height: VIEWPORT_HEIGHT / 2 - ITEM_HEIGHT / 2 }} />
          {items.map((item, idx) => {
            const isActive = idx === activeIndex
            return (
              <div
                key={item}
                onClick={() => clickItem(idx)}
                style={{ scrollSnapAlign: 'center', height: ITEM_HEIGHT }}
                className={clsx(
                  'flex flex-col items-center justify-center gap-3 transition-all duration-500 ease-out p-2',
                  isActive
                    ? 'opacity-100 scale-100 blur-0 z-30'
                    : 'opacity-30 scale-75 blur-[1px]'
                )}
              >
                <div className={clsx(
                  'w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 shadow-inner',
                  isActive
                    ? 'border-[#d9ff00]/50 shadow-studio-glow-sm scale-110 bg-white/5'
                    : 'border-white/10 bg-white/5'
                )}>
                  {renderTextual
                    ? <span className={clsx('text-lg font-bold', isActive ? 'text-[#d9ff00]' : 'text-white/50')}>{item}</span>
                    : <div className={clsx('w-3 h-3 rounded-full', isActive ? 'bg-[#d9ff00]' : 'bg-white/20')} />
                  }
                </div>
                <span className={clsx(
                  'text-[9px] md:text-[10px] font-bold uppercase text-center leading-tight max-w-full truncate px-1 tracking-wider',
                  isActive ? 'text-[#d9ff00]' : 'text-white'
                )}>{item}</span>
              </div>
            )
          })}
          <div style={{ height: VIEWPORT_HEIGHT / 2 - ITEM_HEIGHT / 2 }} />
        </div>
      </div>
    </div>
  )
}

export interface CameraWheelValue {
  camera: string
  lens: string
  focal: number
  aperture: string
}

interface CameraWheelProps {
  cameras: string[]
  lenses: string[]
  focals: number[]
  apertures: string[]
  value: CameraWheelValue
  onChange: (next: CameraWheelValue) => void
}

export default function CameraWheel({ cameras, lenses, focals, apertures, value, onChange }: CameraWheelProps) {
  const focalsAsString = focals.map(String)
  return (
    <div className="w-full flex justify-start md:justify-center gap-3 md:gap-6 py-4 md:py-8 overflow-x-auto scrollbar-hide snap-x px-4 md:px-0">
      <WheelColumn
        title="Camera"
        items={cameras}
        value={value.camera}
        onChange={(v) => onChange({ ...value, camera: v })}
      />
      <WheelColumn
        title="Lens"
        items={lenses}
        value={value.lens}
        onChange={(v) => onChange({ ...value, lens: v })}
      />
      <WheelColumn
        title="Focal Length"
        items={focalsAsString}
        value={String(value.focal)}
        onChange={(v) => onChange({ ...value, focal: parseInt(v) })}
        renderTextual
      />
      <WheelColumn
        title="Aperture"
        items={apertures}
        value={value.aperture}
        onChange={(v) => onChange({ ...value, aperture: v })}
      />
    </div>
  )
}
