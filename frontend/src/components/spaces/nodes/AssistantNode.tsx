import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Bot, Sparkles } from 'lucide-react'
import NodeShell from './NodeShell'
import { useSpacesStore } from '../../../store/spacesStore'

export default memo(function AssistantNode({ id, data }: NodeProps) {
  const updateNodeData = useSpacesStore(s => s.updateNodeData)

  return (
    <NodeShell title="Assistant" icon={Bot} status={data.status || 'idle'} accentColor="text-pink-400" minWidth={260}>
      <Handle type="target" position={Position.Left} id="input"
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-[#0e0e14]" />

      <textarea
        value={data.inputText || ''}
        onChange={e => updateNodeData(id, { inputText: e.target.value })}
        placeholder="Write your basic prompt here…"
        rows={3}
        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
      />

      {data.outputText && (
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-pink-400 font-semibold uppercase tracking-wider">
            <Sparkles size={10} /> Enhanced
          </div>
          <p className="text-[12px] text-gray-200 leading-relaxed">{data.outputText}</p>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-[#0e0e14]" />
    </NodeShell>
  )
})
