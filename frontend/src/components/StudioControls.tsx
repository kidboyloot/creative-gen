import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, X, Loader2, Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * Inline studio control button (icon + label + chevron) — visual only.
 * Click is handled by parent (StudioDropdown wraps it).
 */
interface StudioControlButtonProps {
  iconNode?: ReactNode
  label: string
  tooltip?: string
  active?: boolean
  onClick: () => void
  noChevron?: boolean
}

export function StudioControlButton({ iconNode, label, tooltip, active, onClick, noChevron }: StudioControlButtonProps) {
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all border whitespace-nowrap group cursor-pointer',
        active
          ? 'bg-[#d9ff00]/10 border-[#d9ff00]/40 text-[#d9ff00]'
          : 'bg-white/5 hover:bg-white/10 border-white/5 text-white hover:text-[#d9ff00]'
      )}
    >
      {iconNode}
      <span className="text-xs font-bold transition-colors">{label}</span>
      {!noChevron && (
        <ChevronDown
          size={10}
          strokeWidth={4}
          className="opacity-30 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  )
}

// ─────────────── Dropdown that opens above the trigger ───────────────

export interface StudioDropdownItem {
  id: string
  label: string
  description?: string
  iconNode?: ReactNode
}

interface StudioDropdownProps {
  /** Trigger props — dropdown renders the button itself for a clean click handler */
  triggerIcon?: ReactNode
  triggerLabel: string
  triggerTooltip?: string
  triggerActive?: boolean
  noChevron?: boolean
  items: StudioDropdownItem[]
  selectedId: string
  onSelect: (id: string) => void
  /** Where to anchor the menu relative to the trigger. Defaults to "above". */
  anchor?: 'above' | 'below'
  /** When true items render with the rich (label + description) layout. */
  rich?: boolean
  /** Optional menu width (default 220) */
  minWidth?: number
}

export function StudioDropdown({
  triggerIcon, triggerLabel, triggerTooltip, triggerActive, noChevron,
  items, selectedId, onSelect,
  anchor = 'above', rich, minWidth = 220,
}: StudioDropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)

  // Compute viewport coordinates from the trigger's bounding rect.
  // Use position:fixed + portal so the menu escapes any `overflow:hidden` ancestor.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - minWidth - 8))
    if (anchor === 'above') {
      setPos({ bottom: window.innerHeight - rect.top + 8, left })
    } else {
      setPos({ top: rect.bottom + 8, left })
    }
  }, [open, anchor, minWidth])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Esc closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const menu = open && pos ? (
    <div
      ref={menuRef}
      onWheel={(e) => e.stopPropagation()}
      className="bg-[#1a1a1a] border border-white/10 rounded-xl py-1 shadow-2xl flex flex-col animate-fade-in custom-scrollbar overflow-y-auto"
      style={{ position: 'fixed', minWidth, maxHeight: 360, zIndex: 1000, ...pos }}
    >
      {items.length === 0 && (
        <div className="px-3 py-3 text-[11px] text-[#52525b]">No options available</div>
      )}
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(item.id); setOpen(false) }}
          className={clsx(
            'flex items-start gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors',
            item.id === selectedId ? 'text-[#d9ff00]' : 'text-white'
          )}
        >
          {item.iconNode}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{item.label}</p>
            {rich && item.description && (
              <p className="text-[10px] text-[#52525b] mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
            )}
          </div>
          {item.id === selectedId && <Check size={13} className="text-[#d9ff00] flex-shrink-0 mt-0.5" />}
        </button>
      ))}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={triggerTooltip}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className={clsx(
          'flex items-center gap-1.5 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all border whitespace-nowrap group cursor-pointer',
          (triggerActive || open)
            ? 'bg-[#d9ff00]/10 border-[#d9ff00]/40 text-[#d9ff00]'
            : 'bg-white/5 hover:bg-white/10 border-white/5 text-white hover:text-[#d9ff00]'
        )}
      >
        {triggerIcon}
        <span className="text-xs font-bold">{triggerLabel}</span>
        {!noChevron && (
          <ChevronDown
            size={10}
            strokeWidth={4}
            className={clsx('transition-all', open ? 'opacity-100 rotate-180' : 'opacity-30 group-hover:opacity-100')}
          />
        )}
      </button>
      {menu && createPortal(menu, document.body)}
    </>
  )
}

// ─────────────── Model picker with G-logo ───────────────

export const ModelLogo = () => (
  <div className="w-5 h-5 bg-[#d9ff00] rounded-md flex items-center justify-center shadow-lg shadow-[#d9ff00]/20">
    <span className="text-[10px] font-black text-black">G</span>
  </div>
)

interface ModelOption {
  id: string
  label: string
  description: string
}

interface StudioModelDropdownProps {
  models: ModelOption[]
  value: string
  onChange: (id: string) => void
  tooltip?: string
}

export function StudioModelDropdown({ models, value, onChange, tooltip = 'Select AI model' }: StudioModelDropdownProps) {
  const selected = models.find(m => m.id === value)
  const items: StudioDropdownItem[] = models.map(m => ({
    id: m.id,
    label: m.label,
    description: m.description,
  }))
  return (
    <StudioDropdown
      triggerIcon={<ModelLogo />}
      triggerLabel={selected?.label || 'Model'}
      triggerTooltip={tooltip}
      items={items}
      selectedId={value}
      onSelect={onChange}
      rich
      minWidth={300}
    />
  )
}

// ─────────────── Generic option dropdown (e.g. aspect ratio, quality) ───────────────

interface StudioOptionDropdownProps {
  iconNode?: ReactNode
  options: readonly string[] | string[]
  value: string
  onChange: (v: string) => void
  tooltip?: string
}

export function StudioOptionDropdown({ iconNode, options, value, onChange, tooltip }: StudioOptionDropdownProps) {
  return (
    <StudioDropdown
      triggerIcon={iconNode}
      triggerLabel={value}
      triggerTooltip={tooltip}
      items={options.map(o => ({ id: o, label: o }))}
      selectedId={value}
      onSelect={onChange}
      minWidth={140}
    />
  )
}

// ─────────────── Small image upload thumbnail ───────────────

interface StudioImageThumbProps {
  imageUrl: string | null
  uploading?: boolean
  onUpload: (file: File) => void
  onClear: () => void
  size?: number
}

export function StudioImageThumb({ imageUrl, uploading, onUpload, onClear, size = 56 }: StudioImageThumbProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className="relative shrink-0 rounded-xl overflow-hidden border transition-all"
      style={{
        width: size,
        height: size,
        background: imageUrl ? 'transparent' : 'rgba(255,255,255,0.05)',
        borderColor: imageUrl ? 'rgba(217,255,0,0.4)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
      {imageUrl ? (
        <>
          <img src={imageUrl} className="w-full h-full object-cover" alt="" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
          >
            <X size={11} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-full flex items-center justify-center text-[#52525b] hover:text-[#d9ff00] hover:bg-white/10 transition-colors"
          title="Add reference image"
        >
          {uploading
            ? <Loader2 size={20} className="animate-spin text-[#d9ff00]" />
            : <ImageIcon size={20} />
          }
        </button>
      )}
    </div>
  )
}
