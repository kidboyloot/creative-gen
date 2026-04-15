import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { useQuery } from '@tanstack/react-query'
import { Wand2 } from 'lucide-react'
import axios from 'axios'
import NodeShell from './NodeShell'
import NodeSelect from './NodeSelect'
import { useSpacesStore } from '../../../store/spacesStore'

interface ModelOption { id: string; label: string }

const FORMATS = ['1:1', '9:16']

export default memo(function ImageGeneratorNode({ id, data }: NodeProps) {
  const updateNodeData = useSpacesStore(s => s.updateNodeData)

  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models'],
    queryFn: () => axios.get<ModelOption[]>('/generate/models').then(r => r.data),
    staleTime: Infinity,
  })

  return (
    <NodeShell title="Image Generator" icon={Wand2} status={data.status || 'idle'} minWidth={280}>
      {/* Inputs */}
      <Handle type="target" position={Position.Left} id="image"
        style={{ top: '40%' }}
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-[#0e0e14]" />
      <Handle type="target" position={Position.Left} id="prompt"
        style={{ top: '65%' }}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-[#0e0e14]" />

      {/* Model picker */}
      <NodeSelect
        options={models}
        value={data.model || 'flux-dev'}
        onChange={(model) => updateNodeData(id, { model })}
      />

      {/* Format pills */}
      <div className="flex gap-1.5">
        {FORMATS.map(f => (
          <button
            key={f}
            onClick={() => updateNodeData(id, { format: f })}
            className={`flex-1 py-1.5 text-[11px] rounded-lg border transition-colors
              ${(data.format || '1:1') === f
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                : 'bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-gray-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <textarea
        value={data.prompt || ''}
        onChange={e => updateNodeData(id, { prompt: e.target.value })}
        placeholder="Prompt (or connect Text node)…"
        rows={3}
        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none"
      />

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
        <span>← image ref</span>
        <span>← prompt</span>
      </div>

      {/* Result */}
      {data.outputImageUrl && (
        <img src={data.outputImageUrl} alt="output" className="w-full rounded-xl mt-1 object-cover" style={{ maxHeight: 140 }} />
      )}

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-[#0e0e14]" />
    </NodeShell>
  )
})
