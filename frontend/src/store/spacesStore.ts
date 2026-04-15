import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, addEdge, Connection } from 'reactflow'
import axios from 'axios'

export type NodeStatus = 'idle' | 'loading' | 'done' | 'error'

export interface OutputData {
  type: 'text' | 'image' | 'textList'
  value?: string
  url?: string
  imageId?: string
  values?: string[]
}

interface SpacesState {
  nodes: Node[]
  edges: Edge[]
  isRunning: boolean
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setNodes: (nodes: Node[]) => void
  updateNodeData: (id: string, data: Record<string, unknown>) => void
  addNode: (node: Node) => void
  runWorkflow: () => Promise<void>
  saveWorkflow: (name?: string) => void
  loadWorkflow: (name?: string) => void
  clearCanvas: () => void
  loadTemplate: (nodes: Node[], edges: Edge[]) => void
}

// ---------- topology helpers ----------

function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const inDegree: Record<string, number> = {}
  const adj: Record<string, string[]> = {}
  for (const n of nodes) { inDegree[n.id] = 0; adj[n.id] = [] }
  for (const e of edges) { adj[e.source].push(e.target); inDegree[e.target]++ }
  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id)
  const result: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    result.push(id)
    for (const nb of adj[id]) { if (--inDegree[nb] === 0) queue.push(nb) }
  }
  return result
}

async function pollJob(jobId: string): Promise<{ url: string }> {
  for (;;) {
    const { data } = await axios.get(`/generate/status/${jobId}`)
    if (data.status === 'done') {
      const img = data.assets.find((a: { type: string }) => a.type === 'image')
      if (!img) throw new Error('No image in result')
      return { url: img.url }
    }
    if (data.status === 'failed') throw new Error('Generation failed')
    await new Promise(r => setTimeout(r, 2000))
  }
}

async function executeNode(
  node: Node,
  inputs: Record<string, OutputData>,
): Promise<OutputData | null> {
  const d = node.data as Record<string, unknown>

  switch (node.type) {
    case 'textNode':
      return { type: 'text', value: (d.text as string) || '' }

    case 'uploadNode':
      if (!d.imageId) throw new Error('No image uploaded in Upload Node')
      return { type: 'image', imageId: d.imageId as string, url: d.imageUrl as string }

    case 'listNode': {
      const items = (d.items as string[]) || []
      return { type: 'textList', values: items.filter(Boolean) }
    }

    case 'assistantNode': {
      const textIn = Object.values(inputs).find(i => i?.type === 'text')
      const prompt = textIn?.value || (d.inputText as string) || ''
      const { data } = await axios.post('/spaces/enhance', { prompt })
      return { type: 'text', value: data.enhanced }
    }

    case 'imageGeneratorNode': {
      const textIn = Object.values(inputs).find(i => i?.type === 'text')
      const imgIn = Object.values(inputs).find(i => i?.type === 'image')
      const prompt = textIn?.value || (d.prompt as string) || ''
      const imageId = imgIn?.imageId || (d.imageId as string)
      if (!imageId) throw new Error('Image Generator needs a reference image')
      const { data: genData } = await axios.post('/generate', {
        image_id: imageId,
        prompt,
        formats: [(d.format as string) || '1:1'],
        types: ['image'],
        count: 1,
        model: (d.model as string) || 'flux-dev',
      })
      const result = await pollJob(genData.job_id)
      return { type: 'image', url: result.url }
    }

    case 'imageUpscalerNode': {
      const imgIn = Object.values(inputs).find(i => i?.type === 'image')
      const url = imgIn?.url || (d.inputUrl as string)
      if (!url) throw new Error('Upscaler needs an input image')
      const { data } = await axios.post('/spaces/upscale', { image_url: url })
      return { type: 'image', url: data.url }
    }

    case 'outputNode': {
      const anyIn = Object.values(inputs)[0]
      return anyIn ?? null
    }

    default:
      return null
  }
}

// ---------- store ----------

export const useSpacesStore = create<SpacesState>((set, get) => ({
  nodes: [],
  edges: [],
  isRunning: false,

  onNodesChange: (changes) =>
    set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes) =>
    set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) =>
    set(s => ({ edges: addEdge({ ...connection, animated: true }, s.edges) })),

  setNodes: (nodes) => set({ nodes }),

  addNode: (node) => set(s => ({ nodes: [...s.nodes, node] })),

  updateNodeData: (id, data) =>
    set(s => ({
      nodes: s.nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  runWorkflow: async () => {
    const { nodes, edges, updateNodeData } = get()
    if (!nodes.length) return
    set({ isRunning: true })

    // Reset all statuses
    nodes.forEach(n => updateNodeData(n.id, { status: 'idle' }))

    const order = topologicalSort(nodes, edges)
    const outputs: Record<string, OutputData> = {}

    try {
      for (const nodeId of order) {
        const node = get().nodes.find(n => n.id === nodeId)
        if (!node) continue

        updateNodeData(nodeId, { status: 'loading' })

        // Gather inputs from connected sources
        const inputs: Record<string, OutputData> = {}
        for (const edge of edges) {
          if (edge.target === nodeId && outputs[edge.source]) {
            inputs[edge.sourceHandle || edge.source] = outputs[edge.source]
          }
        }

        try {
          const output = await executeNode(node, inputs)
          if (output) outputs[nodeId] = output

          // Push result back into node data for display
          if (output?.type === 'image') {
            updateNodeData(nodeId, { status: 'done', outputImageUrl: output.url, inputUrl: output.url, content: output.url, contentType: 'image' })
          } else if (output?.type === 'text') {
            updateNodeData(nodeId, { status: 'done', outputText: output.value, content: output.value, contentType: 'text' })
          } else {
            updateNodeData(nodeId, { status: 'done' })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error'
          updateNodeData(nodeId, { status: 'error', errorMsg: msg })
        }
      }
    } finally {
      set({ isRunning: false })
    }
  },

  saveWorkflow: (name = 'default') => {
    const { nodes, edges } = get()
    localStorage.setItem(`spaces_workflow_${name}`, JSON.stringify({ nodes, edges }))
  },

  loadWorkflow: (name = 'default') => {
    const raw = localStorage.getItem(`spaces_workflow_${name}`)
    if (!raw) return
    try {
      const { nodes, edges } = JSON.parse(raw)
      set({ nodes, edges })
    } catch { /* ignore */ }
  },

  clearCanvas: () => set({ nodes: [], edges: [] }),

  loadTemplate: (nodes, edges) => set({ nodes, edges }),
}))
