import { memo, useCallback } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X } from 'lucide-react'
import axios from 'axios'
import NodeShell from './NodeShell'
import { useSpacesStore } from '../../../store/spacesStore'

export default memo(function UploadNode({ id, data }: NodeProps) {
  const updateNodeData = useSpacesStore(s => s.updateNodeData)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const form = new FormData()
    form.append('file', file)
    updateNodeData(id, { status: 'loading' })
    try {
      const res = await axios.post<{ image_id: string }>('/upload', form)
      updateNodeData(id, { imageId: res.data.image_id, imageUrl: preview, status: 'done' })
    } catch {
      updateNodeData(id, { status: 'error', errorMsg: 'Upload failed' })
    }
  }, [id, updateNodeData])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    noClick: !!data.imageUrl,
  })

  return (
    <NodeShell title="Upload Image" icon={UploadCloud} status={data.status || 'idle'} accentColor="text-blue-400">
      {data.imageUrl ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={data.imageUrl} alt="uploaded" className="w-full h-32 object-cover rounded-xl" />
          <button
            onClick={() => updateNodeData(id, { imageId: null, imageUrl: null, status: 'idle' })}
            className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full hover:bg-red-600/80 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center
            ${isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-white/[0.1] hover:border-white/[0.2]'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud size={22} className="text-gray-600" />
          <p className="text-[12px] text-gray-500">Drop image or click</p>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-[#0e0e14]"
      />
    </NodeShell>
  )
})
