import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
  hideClose?: boolean
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  hideClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={clsx(
          'relative w-full rounded-2xl border border-white/[0.08] bg-surface-800 shadow-2xl overflow-hidden',
          SIZES[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="flex-1 min-w-0">
              {title && <h2 className="text-base font-semibold text-white leading-tight">{title}</h2>}
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white transition flex-shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
