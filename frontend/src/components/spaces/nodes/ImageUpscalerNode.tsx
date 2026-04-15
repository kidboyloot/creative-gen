import { memo } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { ZoomIn } from 'lucide-react'
import NodeShell from './NodeShell'

export default memo(function ImageUpscalerNode({ data }: NodeProps) {
  return (
    <NodeShell title="Image Upscaler" icon={ZoomIn} status={data.status || 'idle'} accentColor="text-purple-400">
      <Handle type="target" position={Position.Left} id="image"
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-[#0e0e14]" />

      <div className="flex flex-col items-center gap-2 py-3">
        {data.outputImageUrl ? (
          <img src={data.outputImageUrl} alt="upscaled" className="w-full rounded-xl object-cover" style={{ maxHeight: 140 }} />
        ) : data.inputUrl ? (
          <div className="relative">
            <img src={data.inputUrl} alt="input" className="w-full rounded-xl object-cover opacity-50" style={{ maxHeight: 140 }} />
            <p className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400">
              Will upscale on Run
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-gray-600 text-center py-4">
            Connect an image node<br />to upscale it 4×
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-[#0e0e14]" />
    </NodeShell>
  )
})
