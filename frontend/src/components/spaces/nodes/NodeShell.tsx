import { ReactNode } from 'react'
import clsx from 'clsx'
import { Loader2, CheckCircle2, XCircle, LucideIcon } from 'lucide-react'
import { NodeStatus } from '../../../store/spacesStore'

interface Props {
  title: string
  icon: LucideIcon
  status: NodeStatus
  errorMsg?: string
  children: ReactNode
  minWidth?: number
  accentColor?: string
}

const STATUS_ICONS = {
  loading: <Loader2 size={12} className="animate-spin text-brand-400" />,
  done: <CheckCircle2 size={12} className="text-green-400" />,
  error: <XCircle size={12} className="text-red-400" />,
  idle: null,
}

export default function NodeShell({
  title, icon: Icon, status, errorMsg, children, minWidth = 260, accentColor = 'text-brand-400'
}: Props) {
  return (
    <div
      style={{ minWidth }}
      className={clsx(
        'rounded-2xl border bg-[#0e0e14] shadow-card',
        status === 'error' ? 'border-red-500/40' : 'border-white/[0.08]',
        status === 'loading' && 'border-brand-500/30',
        status === 'done' && 'border-green-500/20',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <Icon size={14} className={accentColor} />
        <span className="text-[12px] font-semibold text-gray-300 flex-1 uppercase tracking-wider">{title}</span>
        {STATUS_ICONS[status]}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {children}
      </div>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1.5">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}
