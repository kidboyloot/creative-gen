import { useCallback } from 'react'
import { Type, UploadCloud, Wand2, ZoomIn, MonitorDown, List, Bot } from 'lucide-react'
import { useSpacesStore } from '../../store/spacesStore'
import { Node } from 'reactflow'

interface NodeDef {
  type: string
  label: string
  description: string
  icon: typeof Type
  color: string
  defaultData: Record<string, unknown>
}

const NODE_DEFS: NodeDef[] = [
  {
    type: 'textNode', label: 'Text', description: 'Write a prompt or note',
    icon: Type, color: 'text-gray-300',
    defaultData: { text: '', status: 'idle' },
  },
  {
    type: 'uploadNode', label: 'Upload Image', description: 'Import a reference image',
    icon: UploadCloud, color: 'text-blue-400',
    defaultData: { imageId: null, imageUrl: null, status: 'idle' },
  },
  {
    type: 'imageGeneratorNode', label: 'Image Generator', description: 'Generate variants with AI',
    icon: Wand2, color: 'text-brand-400',
    defaultData: { prompt: '', model: 'flux-dev', format: '1:1', status: 'idle' },
  },
  {
    type: 'imageUpscalerNode', label: 'Image Upscaler', description: 'Upscale image 4×',
    icon: ZoomIn, color: 'text-purple-400',
    defaultData: { inputUrl: null, outputImageUrl: null, status: 'idle' },
  },
  {
    type: 'outputNode', label: 'Output', description: 'View & download result',
    icon: MonitorDown, color: 'text-green-400',
    defaultData: { content: null, contentType: null, status: 'idle' },
  },
  {
    type: 'listNode', label: 'Prompt List', description: 'Batch list of prompts',
    icon: List, color: 'text-yellow-400',
    defaultData: { items: [''], status: 'idle' },
  },
  {
    type: 'assistantNode', label: 'Assistant', description: 'AI expands your prompt',
    icon: Bot, color: 'text-pink-400',
    defaultData: { inputText: '', outputText: '', status: 'idle' },
  },
]

let nodeCounter = 100

export default function NodePalette() {
  const addNode = useSpacesStore(s => s.addNode)

  const onAdd = useCallback((def: NodeDef) => {
    const id = `node_${++nodeCounter}_${Date.now()}`
    const node: Node = {
      id,
      type: def.type,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { ...def.defaultData, label: def.label },
    }
    addNode(node)
  }, [addNode])

  return (
    <div className="flex flex-col gap-1 py-2">
      <p className="section-label px-3 mb-1">Add Node</p>
      {NODE_DEFS.map(def => (
        <button
          key={def.type}
          onClick={() => onAdd(def)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left group"
        >
          <def.icon size={15} className={def.color} />
          <div>
            <p className="text-[12px] font-medium text-gray-300 group-hover:text-white transition-colors">{def.label}</p>
            <p className="text-[10px] text-gray-600">{def.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
