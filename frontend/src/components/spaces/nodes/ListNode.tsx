import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { List, Plus, X } from 'lucide-react'
import NodeShell from './NodeShell'
import { useSpacesStore } from '../../../store/spacesStore'

export default memo(function ListNode({ id, data }: NodeProps) {
  const updateNodeData = useSpacesStore(s => s.updateNodeData)
  const items: string[] = data.items || ['']

  function update(index: number, value: string) {
    const next = [...items]
    next[index] = value
    updateNodeData(id, { items: next })
  }

  function add() {
    updateNodeData(id, { items: [...items, ''] })
  }

  function remove(index: number) {
    updateNodeData(id, { items: items.filter((_, i) => i !== index) })
  }

  return (
    <NodeShell title="Prompt List" icon={List} status={data.status || 'idle'} accentColor="text-yellow-400" minWidth={260}>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <span className="text-[10px] text-gray-600 w-4 text-right shrink-0">{i + 1}</span>
            <input
              value={item}
              onChange={e => update(i, e.target.value)}
              placeholder={`Prompt ${i + 1}…`}
              className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
            />
            <button onClick={() => remove(i)} className="p-1 hover:text-red-400 text-gray-600 transition-colors">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-brand-400 transition-colors mt-1"
      >
        <Plus size={13} /> Add prompt
      </button>

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-[#0e0e14]" />
    </NodeShell>
  )
})
