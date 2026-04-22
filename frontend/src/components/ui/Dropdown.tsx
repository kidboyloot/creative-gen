import { useEffect, useRef, useState, useMemo } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import clsx from 'clsx'

export interface DropdownOption {
	value: string
	label: string
	hint?: string
}

interface Props {
	value: string
	onChange: (value: string) => void
	options: DropdownOption[]
	placeholder?: string
	searchable?: boolean
	className?: string
	disabled?: boolean
}

/**
 * Themed dropdown that matches the rest of the app (dark bg, subtle borders,
 * brand-colored accents). Behaves like a <select> but stylable:
 *
 * - Click to open, click outside to close
 * - Esc closes, ↑/↓ navigates, Enter selects
 * - Optional `searchable` filters the list by label/hint
 */
export default function Dropdown({
	value,
	onChange,
	options,
	placeholder = 'Select…',
	searchable = true,
	className,
	disabled = false,
}: Props) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [hover, setHover] = useState(0)
	const wrapRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLInputElement>(null)

	const selected = options.find((o) => o.value === value) || null

	const filtered = useMemo(() => {
		if (!query.trim()) return options
		const q = query.trim().toLowerCase()
		return options.filter(
			(o) => o.label.toLowerCase().includes(q) || (o.hint || '').toLowerCase().includes(q),
		)
	}, [options, query])

	// Clamp the keyboard hover cursor whenever the filtered list shrinks
	useEffect(() => {
		setHover((h) => Math.min(Math.max(0, h), Math.max(0, filtered.length - 1)))
	}, [filtered.length])

	// Close on outside click + esc
	useEffect(() => {
		if (!open) return
		function onDown(e: MouseEvent) {
			if (!wrapRef.current) return
			if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				setOpen(false)
			} else if (e.key === 'ArrowDown') {
				e.preventDefault()
				setHover((h) => Math.min(filtered.length - 1, h + 1))
			} else if (e.key === 'ArrowUp') {
				e.preventDefault()
				setHover((h) => Math.max(0, h - 1))
			} else if (e.key === 'Enter') {
				e.preventDefault()
				const opt = filtered[hover]
				if (opt) {
					onChange(opt.value)
					setOpen(false)
					setQuery('')
				}
			}
		}
		document.addEventListener('mousedown', onDown)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onDown)
			document.removeEventListener('keydown', onKey)
		}
	}, [open, filtered, hover, onChange])

	// Focus the search input when opening
	useEffect(() => {
		if (open && searchable) {
			setTimeout(() => searchRef.current?.focus(), 0)
		} else {
			setQuery('')
			setHover(0)
		}
	}, [open, searchable])

	return (
		<div ref={wrapRef} className={clsx('relative', className)}>
			<button
				type="button"
				onClick={() => !disabled && setOpen((o) => !o)}
				disabled={disabled}
				className={clsx(
					'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-left transition-colors outline-none',
					open ? 'border-brand-500/50' : 'border-white/[0.08] hover:border-white/[0.15]',
					disabled && 'opacity-50 cursor-not-allowed',
					!selected && 'text-gray-500',
					selected && 'text-white',
				)}
			>
				<span className="truncate">{selected ? selected.label : placeholder}</span>
				<ChevronDown
					size={14}
					className={clsx('text-gray-500 transition-transform flex-shrink-0', open && 'rotate-180 text-brand-400')}
				/>
			</button>

			{open && (
				<div
					className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/[0.1] bg-surface-700 shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden"
				>
					{searchable && (
						<div className="p-2 border-b border-white/[0.06]">
							<div className="relative">
								<Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
								<input
									ref={searchRef}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search…"
									className="w-full pl-7 pr-2 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
								/>
							</div>
						</div>
					)}

					<div className="max-h-56 overflow-y-auto py-1">
						{filtered.length === 0 ? (
							<div className="px-3 py-3 text-center text-xs text-gray-500">No matches</div>
						) : (
							filtered.map((opt, i) => {
								const active = opt.value === value
								const hovered = i === hover
								return (
									<button
										key={opt.value}
										type="button"
										onMouseEnter={() => setHover(i)}
										onClick={() => {
											onChange(opt.value)
											setOpen(false)
											setQuery('')
										}}
										className={clsx(
											'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left transition-colors',
											active ? 'text-brand-300' : 'text-gray-200',
											hovered && 'bg-white/[0.05]',
										)}
									>
										<div className="flex-1 min-w-0">
											<p className="truncate">{opt.label}</p>
											{opt.hint && <p className="text-[10px] text-gray-500 truncate">{opt.hint}</p>}
										</div>
										{active && <Check size={11} className="text-brand-400 flex-shrink-0" />}
									</button>
								)
							})
						)}
					</div>
				</div>
			)}
		</div>
	)
}
