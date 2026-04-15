import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BrandState {
  name: string
  logo: string | null       // data URL of logo
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fonts: { heading: string; body: string }
  tagline: string
  setName: (name: string) => void
  setLogo: (logo: string | null) => void
  setPrimaryColor: (c: string) => void
  setSecondaryColor: (c: string) => void
  setAccentColor: (c: string) => void
  setFonts: (fonts: { heading: string; body: string }) => void
  setTagline: (tagline: string) => void
  reset: () => void
}

const defaults = {
  name: '',
  logo: null,
  primaryColor: '#ff9800',
  secondaryColor: '#1a1a2e',
  accentColor: '#ffffff',
  fonts: { heading: 'Inter', body: 'Inter' },
  tagline: '',
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      ...defaults,
      setName: (name) => set({ name }),
      setLogo: (logo) => set({ logo }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setSecondaryColor: (secondaryColor) => set({ secondaryColor }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setFonts: (fonts) => set({ fonts }),
      setTagline: (tagline) => set({ tagline }),
      reset: () => set(defaults),
    }),
    { name: 'brand-kit' }
  )
)
