import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ShopifyConnection {
  id: string
  shop_domain: string
  shop_name?: string | null
  currency: string
  locales: string[]
  auth_mode?: 'static' | 'oauth_cc'
  created_at: string
}

export interface PreviewVariant {
  id: string
  title: string
  price: string
  compare_at_price?: string | null
  sku?: string
  barcode?: string
  option1?: string | null
  option2?: string | null
  option3?: string | null
}

export interface PreviewOption {
  name: string
  position?: number | null
  values: string[]
}

export interface PreviewProduct {
  id: string
  title: string
  handle: string
  featured_image: string
  price: string
  currency: string
  variant_count: number
  description: string
  tags: string[]
  images: { id: string; src: string; alt: string }[]
  variants: PreviewVariant[]
  options: PreviewOption[]
}

export interface ImagePromptSlot {
  item_id: string
  prompt: string
  model: string
  style: string
}

export interface SavedPromptPreset {
  id: string
  label: string
  prompt: string
  model: string
  style: string
  created_at: string
}

export type FlowStep =
  | 'connect'
  | 'collection'
  | 'gallery'
  | 'progress'
  | 'review'
  | 'pushing'
  | 'success'

export interface ReviewOverride {
  title?: string
  description?: string
  tags?: string[]
  price?: string
  currency?: string
  selectedImageIds?: string[]
}

interface MultiProductState {
  step: FlowStep
  setStep: (s: FlowStep) => void

  connections: ShopifyConnection[]
  activeConnectionId: string | null
  setConnections: (rows: ShopifyConnection[]) => void
  setActiveConnectionId: (id: string | null) => void

  collectionUrl: string
  setCollectionUrl: (u: string) => void

  previewProducts: PreviewProduct[]
  setPreviewProducts: (p: PreviewProduct[]) => void
  selectedProductIds: string[]
  toggleSelectProduct: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void

  targetLocales: string[]
  setTargetLocales: (l: string[]) => void
  toggleLocale: (code: string) => void
  translationEngine: 'google' | 'llm'
  setTranslationEngine: (e: 'google' | 'llm') => void
  generateImages: boolean
  setGenerateImages: (b: boolean) => void

  imageGenSlots: ImagePromptSlot[]
  setImageGenSlots: (slots: ImagePromptSlot[]) => void
  updateSlot: (index: number, patch: Partial<ImagePromptSlot>) => void
  addSlot: (slot: ImagePromptSlot) => void
  removeSlot: (index: number) => void

  savedPresets: SavedPromptPreset[]
  addPreset: (p: Omit<SavedPromptPreset, 'id' | 'created_at'>) => void
  removePreset: (id: string) => void

  activeJobId: string | null
  setActiveJobId: (id: string | null) => void

  reviewOverrides: Record<string, ReviewOverride>
  setOverride: (variantId: string, patch: ReviewOverride) => void
  clearOverrides: () => void

  pushResults: { variant_id: string; ok: boolean; draft_url?: string; title?: string; locale?: string; error?: string }[]
  setPushResults: (r: MultiProductState['pushResults']) => void

  reset: () => void
}

const PRESET_KEY = 'multiProductCopy.presets.v1'

function loadPresets(): SavedPromptPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistPresets(list: SavedPromptPreset[]) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list))
  } catch {}
}

export const useMultiProductStore = create<MultiProductState>()(
  persist(
    (set, get) => ({
  step: 'connect',
  setStep: (step) => set({ step }),

  connections: [],
  activeConnectionId: null,
  setConnections: (connections) =>
    set((s) => {
      const safe = Array.isArray(connections) ? connections : []
      return {
        connections: safe,
        activeConnectionId:
          s.activeConnectionId && safe.some((c) => c.id === s.activeConnectionId)
            ? s.activeConnectionId
            : safe[0]?.id ?? null,
      }
    }),
  setActiveConnectionId: (activeConnectionId) => set({ activeConnectionId }),

  collectionUrl: '',
  setCollectionUrl: (collectionUrl) => set({ collectionUrl }),

  previewProducts: [],
  setPreviewProducts: (previewProducts) =>
    set({ previewProducts: Array.isArray(previewProducts) ? previewProducts : [], selectedProductIds: [] }),
  selectedProductIds: [],
  toggleSelectProduct: (id) =>
    set((s) => ({
      selectedProductIds: s.selectedProductIds.includes(id)
        ? s.selectedProductIds.filter((x) => x !== id)
        : [...s.selectedProductIds, id],
    })),
  selectAll: (ids) => set({ selectedProductIds: ids }),
  clearSelection: () => set({ selectedProductIds: [] }),

  targetLocales: ['en'],
  setTargetLocales: (targetLocales) => set({ targetLocales }),
  toggleLocale: (code) =>
    set((s) => ({
      targetLocales: s.targetLocales.includes(code)
        ? s.targetLocales.filter((x) => x !== code)
        : [...s.targetLocales, code],
    })),
  translationEngine: 'google',
  setTranslationEngine: (translationEngine) => set({ translationEngine }),
  generateImages: true,
  setGenerateImages: (generateImages) => set({ generateImages }),

  imageGenSlots: [],
  setImageGenSlots: (imageGenSlots) => set({ imageGenSlots }),
  updateSlot: (index, patch) =>
    set((s) => {
      const next = [...s.imageGenSlots]
      if (next[index]) next[index] = { ...next[index], ...patch }
      return { imageGenSlots: next }
    }),
  addSlot: (slot) => set((s) => ({ imageGenSlots: [...s.imageGenSlots, slot] })),
  removeSlot: (index) =>
    set((s) => ({ imageGenSlots: s.imageGenSlots.filter((_, i) => i !== index) })),

  savedPresets: loadPresets(),
  addPreset: (p) => {
    const entry: SavedPromptPreset = {
      ...p,
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    }
    const next = [entry, ...get().savedPresets].slice(0, 30)
    persistPresets(next)
    set({ savedPresets: next })
  },
  removePreset: (id) => {
    const next = get().savedPresets.filter((p) => p.id !== id)
    persistPresets(next)
    set({ savedPresets: next })
  },

  activeJobId: null,
  setActiveJobId: (activeJobId) => set({ activeJobId }),

  reviewOverrides: {},
  setOverride: (variantId, patch) =>
    set((s) => ({
      reviewOverrides: {
        ...s.reviewOverrides,
        [variantId]: { ...(s.reviewOverrides[variantId] || {}), ...patch },
      },
    })),
  clearOverrides: () => set({ reviewOverrides: {} }),

  pushResults: [],
  setPushResults: (pushResults) => set({ pushResults }),

  reset: () =>
    set({
      step: 'connect',
      collectionUrl: '',
      previewProducts: [],
      selectedProductIds: [],
      targetLocales: ['en'],
      translationEngine: 'google',
      generateImages: true,
      imageGenSlots: [],
      activeJobId: null,
      reviewOverrides: {},
      pushResults: [],
    }),
  }),
    {
      name: 'multi-product-copy',
      storage: createJSONStorage(() => localStorage),
      // Only persist small preference-like state. Connections come from the
      // backend on mount, and ephemeral job state should not outlive a reload.
      partialize: (s) => ({
        activeConnectionId: s.activeConnectionId,
        collectionUrl: s.collectionUrl,
        targetLocales: s.targetLocales,
        translationEngine: s.translationEngine,
        generateImages: s.generateImages,
        savedPresets: s.savedPresets,
      }),
    },
  ),
)
