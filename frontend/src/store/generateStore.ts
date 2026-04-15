import { create } from 'zustand'

interface GenerateState {
  imageId: string | null
  imagePreview: string | null
  prompts: string[]
  formats: string[]
  types: string[]
  count: number
  model: string
  jobId: string | null
  setImageId: (id: string, preview: string) => void
  setPrompt: (index: number, value: string) => void
  addPrompt: () => void
  removePrompt: (index: number) => void
  toggleFormat: (f: string) => void
  toggleType: (t: string) => void
  setCount: (n: number) => void
  setModel: (m: string) => void
  setJobId: (id: string | null) => void
  reset: () => void
}

export const useGenerateStore = create<GenerateState>((set) => ({
  imageId: null,
  imagePreview: null,
  prompts: [''],
  formats: ['1:1', '9:16'],
  types: ['image'],
  count: 10,
  model: 'flux-dev',
  jobId: null,

  setImageId: (id, preview) => set({ imageId: id, imagePreview: preview }),

  setPrompt: (index, value) =>
    set((s) => {
      const next = [...s.prompts]
      next[index] = value
      return { prompts: next }
    }),

  addPrompt: () =>
    set((s) => ({ prompts: [...s.prompts, ''] })),

  removePrompt: (index) =>
    set((s) => ({
      prompts: s.prompts.length > 1 ? s.prompts.filter((_, i) => i !== index) : s.prompts,
    })),

  toggleFormat: (f) =>
    set((s) => ({
      formats: s.formats.includes(f)
        ? s.formats.filter((x) => x !== f)
        : [...s.formats, f],
    })),

  toggleType: (t) =>
    set((s) => ({
      types: s.types.includes(t)
        ? s.types.filter((x) => x !== t)
        : [...s.types, t],
    })),

  setCount: (count) => set({ count }),
  setModel: (model) => set({ model }),
  setJobId: (jobId) => set({ jobId }),
  reset: () => set({ jobId: null }),
}))
