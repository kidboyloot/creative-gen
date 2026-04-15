import { create } from 'zustand'

interface VideoState {
  imageId: string | null
  imagePreview: string | null
  prompt: string
  model: string
  resolution: '480p' | '720p'
  duration: string       // 'auto' | '4' … '15'
  aspectRatio: string    // 'auto' | '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9'
  generateAudio: boolean
  count: number
  jobId: string | null
  setImageId: (id: string, preview: string) => void
  setPrompt: (v: string) => void
  setModel: (m: string) => void
  setResolution: (r: '480p' | '720p') => void
  setDuration: (d: string) => void
  setAspectRatio: (a: string) => void
  setGenerateAudio: (v: boolean) => void
  setCount: (n: number) => void
  setJobId: (id: string | null) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  imageId: null,
  imagePreview: null,
  prompt: '',
  model: 'seedance-2',
  resolution: '720p',
  duration: 'auto',
  aspectRatio: '9:16',
  generateAudio: true,
  count: 1,
  jobId: null,

  setImageId: (id, preview) => set({ imageId: id, imagePreview: preview }),
  setPrompt: (prompt) => set({ prompt }),
  setModel: (model) => set({ model }),
  setResolution: (resolution) => set({ resolution }),
  setDuration: (duration) => set({ duration }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setGenerateAudio: (generateAudio) => set({ generateAudio }),
  setCount: (count) => set({ count }),
  setJobId: (jobId) => set({ jobId }),
}))
