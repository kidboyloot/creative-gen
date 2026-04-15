import { Play, Save, FolderOpen, Trash2, Loader2, LayoutTemplate } from 'lucide-react'
import clsx from 'clsx'
import { useSpacesStore } from '../../store/spacesStore'

export default function Toolbar({ onShowTemplates }: { onShowTemplates: () => void }) {
  const { isRunning, runWorkflow, saveWorkflow, loadWorkflow, clearCanvas } = useSpacesStore()

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#0e0e14]/90 backdrop-blur-xl border border-white/[0.08] shadow-card">
      {/* Run */}
      <button
        onClick={runWorkflow}
        disabled={isRunning}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200',
          isRunning
            ? 'bg-brand-500/20 text-brand-400 cursor-not-allowed'
            : 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow-sm'
        )}
      >
        {isRunning
          ? <><Loader2 size={14} className="animate-spin" /> Running…</>
          : <><Play size={14} /> Run Workflow</>}
      </button>

      <div className="w-px h-6 bg-white/[0.08]" />

      {/* Templates */}
      <button
        onClick={onShowTemplates}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <LayoutTemplate size={14} /> Templates
      </button>

      {/* Save */}
      <button
        onClick={() => { saveWorkflow(); }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Save size={14} /> Save
      </button>

      {/* Load */}
      <button
        onClick={() => loadWorkflow()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <FolderOpen size={14} /> Load
      </button>

      <div className="w-px h-6 bg-white/[0.08]" />

      {/* Clear */}
      <button
        onClick={clearCanvas}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={14} /> Clear
      </button>
    </div>
  )
}
