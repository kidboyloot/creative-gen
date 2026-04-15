import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

import TextNode from './nodes/TextNode'
import UploadNode from './nodes/UploadNode'
import ImageGeneratorNode from './nodes/ImageGeneratorNode'
import ImageUpscalerNode from './nodes/ImageUpscalerNode'
import OutputNode from './nodes/OutputNode'
import ListNode from './nodes/ListNode'
import AssistantNode from './nodes/AssistantNode'
import NodePalette from './NodePalette'
import Toolbar from './Toolbar'
import { useSpacesStore } from '../../store/spacesStore'

const nodeTypes = {
  textNode: TextNode,
  uploadNode: UploadNode,
  imageGeneratorNode: ImageGeneratorNode,
  imageUpscalerNode: ImageUpscalerNode,
  outputNode: OutputNode,
  listNode: ListNode,
  assistantNode: AssistantNode,
}

export default function SpacesCanvas({ onShowTemplates }: { onShowTemplates: () => void }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useSpacesStore()

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#ff9800', strokeWidth: 1.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.06)"
        />

        <Controls
          className="!bg-[#0e0e14] !border-white/[0.08] !rounded-xl !overflow-hidden"
          showInteractive={false}
        />

        <MiniMap
          style={{ background: '#0b0b10', border: '1px solid rgba(255,255,255,0.06)' }}
          nodeColor="#ff9800"
          maskColor="rgba(0,0,0,0.5)"
          className="!rounded-xl !overflow-hidden"
        />

        {/* Floating Toolbar */}
        <Toolbar onShowTemplates={onShowTemplates} />

        {/* Left palette panel */}
        <Panel position="top-left" className="!m-0 !p-0">
          <div className="mt-4 ml-4 w-52 bg-[#0e0e14]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-card overflow-y-auto max-h-[calc(100vh-120px)]">
            <NodePalette />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
