import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

interface ModelOption {
  id: string
  label: string
  description: string
}

interface ModelSelectProps {
  models: ModelOption[]
  value: string
  onChange: (id: string) => void
  label?: string
}

export default function ModelSelect({ models, value, onChange, label = 'AI Model' }: ModelSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = models.find((m) => m.id === value) ?? models[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{selected?.label ?? '—'}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{selected?.description}</p>
        </div>
        <ChevronDown
          size={16}
          className={clsx('text-gray-500 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/[0.1] bg-surface-800 shadow-xl overflow-hidden">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false) }}
              className={clsx(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                m.id === value
                  ? 'bg-brand-600/15 text-white'
                  : 'hover:bg-white/[0.05] text-gray-200'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.description}</p>
              </div>
              {m.id === value && <Check size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
