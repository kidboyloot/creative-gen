import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

interface Option {
  id: string
  label: string
}

interface NodeSelectProps {
  options: Option[]
  value: string
  onChange: (id: string) => void
}

export default function NodeSelect({ options, value, onChange }: NodeSelectProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const selected = options.find(o => o.id === value) ?? options[0]

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    // Close on outside click
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    // Close on scroll/zoom (ReactFlow canvas interactions)
    function handleScroll() { setOpen(false) }

    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          updatePos()
          setOpen(v => !v)
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:border-white/[0.15] transition-colors text-left"
      >
        <span className="flex-1 text-[12px] text-gray-200 truncate">
          {selected?.label ?? 'Select model'}
        </span>
        <ChevronDown
          size={12}
          className={clsx('text-gray-500 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="rounded-xl border border-white/[0.1] bg-[#1a1a24] shadow-2xl overflow-hidden"
        >
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(o.id)
                setOpen(false)
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors text-[12px]',
                o.id === value
                  ? 'bg-brand-600/15 text-white'
                  : 'hover:bg-white/[0.05] text-gray-300'
              )}
            >
              <span className="flex-1 truncate">{o.label}</span>
              {o.id === value && <Check size={12} className="text-brand-400 flex-shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
