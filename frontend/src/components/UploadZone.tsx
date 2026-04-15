import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { UploadCloud, X } from 'lucide-react'
import { useGenerateStore } from '../store/generateStore'

interface UploadZoneProps {
  imagePreview?: string | null
  onUpload?: (imageId: string, preview: string) => void
  onClear?: () => void
}

export default function UploadZone({ imagePreview: previewProp, onUpload, onClear }: UploadZoneProps) {
  // Fall back to generate store if no props provided (backwards compat)
  const store = useGenerateStore()
  const imagePreview = previewProp !== undefined ? previewProp : store.imagePreview
  const handleUpload = onUpload ?? store.setImageId
  const handleClear = onClear ?? (() => store.setImageId('', ''))

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const form = new FormData()
    form.append('file', file)
    const res = await axios.post<{ image_id: string }>('/upload', form)
    handleUpload(res.data.image_id, preview)
  }, [handleUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  })

  if (imagePreview) {
    return (
      <div className="relative w-full aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border border-gray-700">
        <img src={imagePreview} alt="Reference" className="w-full h-full object-cover" />
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 bg-gray-900/80 rounded-full p-1 hover:bg-red-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`
        flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-500 bg-brand-600/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}
      `}
    >
      <input {...getInputProps()} />
      <UploadCloud size={40} className="text-gray-500" />
      <p className="text-sm text-gray-400 text-center">
        {isDragActive ? 'Drop your image here' : 'Drag & drop a reference image, or click to browse'}
      </p>
      <span className="text-xs text-gray-600">PNG, JPG, WebP</span>
    </div>
  )
}
