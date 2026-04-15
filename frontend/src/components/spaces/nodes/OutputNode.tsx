import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Download, MonitorDown } from 'lucide-react'
import NodeShell from './NodeShell'

export default memo(function OutputNode({ data }: NodeProps) {
  return (
    <NodeShell title="Output" icon={MonitorDown} status={data.status || 'idle'} accentColor="text-green-400" minWidth={240}>
      <Handle type="target" position={Position.Left} id="input"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-[#0e0e14]" />

      {data.contentType === 'image' && data.content ? (
        <div className="space-y-2">
          <img src={data.content} alt="output" className="w-full rounded-xl object-cover" style={{ maxHeight: 180 }} />
          <a
            href={data.content}
            download="output.png"
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-400 text-[12px] font-medium transition-colors"
          >
            <Download size={13} /> Download
          </a>
        </div>
      ) : data.contentType === 'text' && data.content ? (
        <div className="bg-white/[0.04] rounded-xl p-3 text-[12px] text-gray-300 leading-relaxed">
          {data.content}
        </div>
      ) : (
        <p className="text-[12px] text-gray-600 text-center py-6">
          Connect a node to see output
        </p>
      )}
    </NodeShell>
  )
})
