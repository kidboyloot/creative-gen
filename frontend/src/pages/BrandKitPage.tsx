import { useRef } from 'react'
import { Palette, Upload, RotateCcw, Save, Check } from 'lucide-react'
import { useBrandStore } from '../store/brandStore'

const FONT_OPTIONS = [
  'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Playfair Display',
  'Oswald', 'Raleway', 'Lato', 'Merriweather', 'Space Grotesk',
]

export default function BrandKitPage() {
  const brand = useBrandStore()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogo = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => brand.setLogo(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brand Kit</h1>
          <p className="text-gray-400 text-sm mt-1">
            Save your brand identity — auto-applied across Ad Creator and Mockups.
          </p>
        </div>
        <button
          onClick={brand.reset}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/[0.05] rounded-lg transition-colors"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Preview card */}
      <div
        className="rounded-2xl p-8 border border-white/[0.08] relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brand.secondaryColor} 0%, ${brand.primaryColor}22 100%)`,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          {brand.logo ? (
            <img src={brand.logo} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: brand.primaryColor }}>
              <Palette size={24} className="text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{brand.name || 'Your Brand'}</h2>
            <p className="text-sm text-gray-400">{brand.tagline || 'Your tagline here'}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {[brand.primaryColor, brand.secondaryColor, brand.accentColor].map((c, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-lg border border-white/20"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Brand Name</label>
          <input
            value={brand.name}
            onChange={e => brand.setName(e.target.value)}
            placeholder="My Brand"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
          <input
            value={brand.tagline}
            onChange={e => brand.setTagline(e.target.value)}
            placeholder="Quality products, fast delivery"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
          {brand.logo ? (
            <div className="flex items-center gap-3">
              <img src={brand.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/[0.05] border border-white/[0.08]" />
              <button
                onClick={() => brand.setLogo(null)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.1] hover:border-brand-500/40 text-sm text-gray-400 transition-colors"
            >
              <Upload size={16} /> Upload logo
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleLogo(e.target.files[0])}
          />
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Brand Colors</label>
          <div className="flex gap-4">
            {[
              { label: 'Primary', value: brand.primaryColor, set: brand.setPrimaryColor },
              { label: 'Secondary', value: brand.secondaryColor, set: brand.setSecondaryColor },
              { label: 'Accent', value: brand.accentColor, set: brand.setAccentColor },
            ].map(c => (
              <div key={c.label} className="flex flex-col items-center gap-1.5">
                <input
                  type="color"
                  value={c.value}
                  onChange={e => c.set(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-white/[0.1] cursor-pointer bg-transparent"
                />
                <span className="text-[10px] text-gray-500">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Heading Font</label>
          <select
            value={brand.fonts.heading}
            onChange={e => brand.setFonts({ ...brand.fonts, heading: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50"
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Body Font</label>
          <select
            value={brand.fonts.body}
            onChange={e => brand.setFonts({ ...brand.fonts, body: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50"
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <Check size={16} className="text-green-400" />
        <p className="text-sm text-green-300">
          Brand kit auto-saves and will be applied to Ad Creator and Mockup Generator.
        </p>
      </div>
    </div>
  )
}
