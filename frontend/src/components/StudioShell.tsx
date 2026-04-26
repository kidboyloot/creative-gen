import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StudioShellProps {
  title: string
  subtitle?: string
  /** Any lucide-react icon */
  Icon: LucideIcon
  /** Optional emoji shown top-right of the hero icon */
  emoji?: string
  children: ReactNode
  /** When true, hero is compact (smaller, no big title) */
  compact?: boolean
}

/**
 * Visual shell that gives a page the Open-Generative-AI studio look:
 *   - black `#050505` background
 *   - centered hero with lime-glow icon + huge uppercase title + grey subtitle
 *   - everything fades in
 *
 * Wraps any page that wants the studio aesthetic. Used by:
 *   GeneratePage, VideoPage, ChatPage, SpacesPage (overlap pages)
 *   LipSyncPage, CinemaPage (new pages)
 */
export default function StudioShell({ title, subtitle, Icon, emoji, children, compact = false }: StudioShellProps) {
  return (
    <div className="w-full h-full flex flex-col items-center bg-studio-app-bg relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
      {/* Hero */}
      <div className={`flex flex-col items-center animate-fade-in-up transition-all duration-700 ${compact ? 'mb-6' : 'mb-10 md:mb-20'}`}>
        <div className={`relative group ${compact ? 'mb-4' : 'mb-10'}`}>
          <div className="studio-hero-glow" />
          <div className="studio-hero-icon">
            <div className="studio-hero-inner">
              <Icon size={32} />
            </div>
            {emoji && (
              <div className="absolute top-4 right-4 text-[#d9ff00] animate-pulse">{emoji}</div>
            )}
          </div>
        </div>
        {!compact && (
          <>
            <h1 className="studio-hero-title">{title}</h1>
            {subtitle && (
              <p className="text-studio-secondary text-sm font-medium tracking-wide opacity-60">{subtitle}</p>
            )}
          </>
        )}
        {compact && (
          <h1 className="text-lg font-black text-white tracking-widest uppercase">{title}</h1>
        )}
      </div>

      {children}
    </div>
  )
}
