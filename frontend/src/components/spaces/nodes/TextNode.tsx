import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Type } from 'lucide-react'
import NodeShell from './NodeShell'
import { useSpacesStore } from '../../../store/spacesStore'

export default memo(function TextNode({ id, data }: NodeProps) {
  const updateNodeData = useSpacesStore(s => s.updateNodeData)

  return (
    <NodeShell title="Text" icon={Type} status={data.status || 'idle'}>
      <textarea
        value={data.text || ''}
        onChange={e => updateNodeData(id, { text: e.target.value })}
        placeholder="Write a prompt or note…"
        rows={4}
        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-[#0e0e14]"
      />
    </NodeShell>
  )
})
