import { Node, Edge } from 'reactflow'
import { Wand2, ZoomIn, List, ArrowRight } from 'lucide-react'
import { useSpacesStore } from '../../store/spacesStore'

interface Template {
  id: string
  title: string
  description: string
  tags: string[]
  icon: typeof Wand2
  nodes: Node[]
  edges: Edge[]
}

const TEMPLATES: Template[] = [
  {
    id: 'text-generate-output',
    title: 'Text → Generate → Output',
    description: 'Write a prompt, generate an image with AI, see the result.',
    tags: ['Basic', 'Images'],
    icon: Wand2,
    nodes: [
      { id: 'n1', type: 'textNode', position: { x: 60, y: 150 }, data: { text: 'A vibrant summer sale campaign banner', status: 'idle' } },
      { id: 'n2', type: 'uploadNode', position: { x: 60, y: 320 }, data: { imageId: null, imageUrl: null, status: 'idle' } },
      { id: 'n3', type: 'imageGeneratorNode', position: { x: 380, y: 200 }, data: { prompt: '', model: 'flux-dev', format: '1:1', status: 'idle' } },
      { id: 'n4', type: 'outputNode', position: { x: 720, y: 220 }, data: { content: null, contentType: null, status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n3', targetHandle: 'prompt', animated: true },
      { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n3', targetHandle: 'image', animated: true },
      { id: 'e3', source: 'n3', sourceHandle: 'output', target: 'n4', targetHandle: 'input', animated: true },
    ],
  },
  {
    id: 'upload-upscale-output',
    title: 'Upload → Upscale → Output',
    description: 'Import an image and upscale it to 4× resolution.',
    tags: ['Upscale', 'Quick'],
    icon: ZoomIn,
    nodes: [
      { id: 'n1', type: 'uploadNode', position: { x: 60, y: 200 }, data: { imageId: null, imageUrl: null, status: 'idle' } },
      { id: 'n2', type: 'imageUpscalerNode', position: { x: 380, y: 200 }, data: { inputUrl: null, outputImageUrl: null, status: 'idle' } },
      { id: 'n3', type: 'outputNode', position: { x: 700, y: 200 }, data: { content: null, contentType: null, status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n2', targetHandle: 'image', animated: true },
      { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n3', targetHandle: 'input', animated: true },
    ],
  },
  {
    id: 'full-pipeline',
    title: 'Full Pipeline',
    description: 'Improve prompt with AI assistant, generate, upscale, export.',
    tags: ['Advanced', 'AI'],
    icon: List,
    nodes: [
      { id: 'n1', type: 'textNode', position: { x: 40, y: 120 }, data: { text: 'Fashion model in a modern studio', status: 'idle' } },
      { id: 'n2', type: 'assistantNode', position: { x: 360, y: 80 }, data: { inputText: '', outputText: '', status: 'idle' } },
      { id: 'n3', type: 'uploadNode', position: { x: 40, y: 320 }, data: { imageId: null, imageUrl: null, status: 'idle' } },
      { id: 'n4', type: 'imageGeneratorNode', position: { x: 700, y: 180 }, data: { prompt: '', model: 'flux-dev', format: '1:1', status: 'idle' } },
      { id: 'n5', type: 'imageUpscalerNode', position: { x: 1020, y: 180 }, data: { inputUrl: null, outputImageUrl: null, status: 'idle' } },
      { id: 'n6', type: 'outputNode', position: { x: 1300, y: 180 }, data: { content: null, contentType: null, status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n2', targetHandle: 'input', animated: true },
      { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n4', targetHandle: 'prompt', animated: true },
      { id: 'e3', source: 'n3', sourceHandle: 'output', target: 'n4', targetHandle: 'image', animated: true },
      { id: 'e4', source: 'n4', sourceHandle: 'output', target: 'n5', targetHandle: 'image', animated: true },
      { id: 'e5', source: 'n5', sourceHandle: 'output', target: 'n6', targetHandle: 'input', animated: true },
    ],
  },
]

export default function TemplateGrid({ onSelect }: { onSelect: () => void }) {
  const loadTemplate = useSpacesStore(s => s.loadTemplate)

  function handleSelect(t: Template) {
    loadTemplate(t.nodes, t.edges)
    onSelect()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-studio-app-bg custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full px-6 py-12">
        {/* Hero */}
        <div className="flex flex-col items-center mb-12 animate-fade-in-up">
          <div className="mb-8 relative group">
            <div className="studio-hero-glow" />
            <div className="studio-hero-icon">
              <div className="studio-hero-inner">
                <Wand2 size={32} />
              </div>
              <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">⚡</div>
            </div>
          </div>
          <h1 className="studio-hero-title">Workflow Studio</h1>
          <p className="text-studio-secondary text-sm font-medium tracking-wide opacity-60 text-center max-w-xl">
            Node-based canvas — connect nodes to build AI pipelines
          </p>
        </div>

        {/* Start blank */}
        <button
          onClick={onSelect}
          className="w-full flex items-center justify-between px-6 py-5 mb-8 rounded-2xl border border-dashed border-white/10 hover:border-[#d9ff00]/40 hover:bg-[#d9ff00]/5 text-studio-secondary hover:text-white transition-all duration-200 group animate-fade-in-up"
          style={{ animationDelay: '0.15s' }}
        >
          <span className="text-sm font-bold uppercase tracking-widest">Start with blank canvas</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-[#d9ff00]" />
        </button>

        <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Templates</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className="bg-studio-card-bg border border-white/10 p-5 text-left rounded-2xl group flex flex-col gap-3 hover:border-[#d9ff00]/40 hover:bg-studio-card-bg-2 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d9ff00]/10 border border-[#d9ff00]/20 flex items-center justify-center">
                <t.icon size={18} className="text-[#d9ff00]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-[#d9ff00] transition-colors">{t.title}</p>
                <p className="text-[12px] text-studio-secondary mt-1 leading-relaxed">{t.description}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {t.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-studio-muted uppercase tracking-wider font-bold">{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
