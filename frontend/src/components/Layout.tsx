/* ▶ Substitui o teu: testessitesbonitos/creative-gen/frontend/src/components/Layout.tsx
   Mudanças vs. atual:
   - brand = violeta (cor de accent)
   - Sidebar mais escura (surface-800) e densa
   - Credits bar estilo redesign
   - User card simplificado
   - Top bar com Free Trial / Upgrade Plan chips
*/

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Search, Home, Users, Image, Video, Grid3X3, Lock,
  Clock, FolderOpen, ChevronDown, Zap, LogIn, LogOut, Workflow, LayoutGrid, Languages,
  Package, Megaphone, Palette, Coins, Plus, User, Mic, Lightbulb, Bot, Paintbrush, UserCircle, BookOpen, Gem,
  Crown, FileEdit, Sparkles, Copy
} from 'lucide-react'
import clsx from 'clsx'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

type Plan = 'free' | 'pro' | 'enterprise'
const PLAN_LEVEL: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 }

interface NavItem { to: string; label: string; icon: any; minPlan?: Plan; badge?: string }
interface NavSection { label: string; key: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    label: 'Creative Tools', key: 'creative', items: [
      { to: '/generate', label: 'Image Generator', icon: Image },
      { to: '/video', label: 'Video Generator', icon: Video },
      { to: '/collage', label: 'Collage Maker', icon: LayoutGrid },
      { to: '/image-edit', label: 'Image Editor', icon: Paintbrush, minPlan: 'pro', badge: 'PRO' },
      { to: '/avatar', label: 'AI Avatar', icon: UserCircle, minPlan: 'pro', badge: 'PRO' },
      { to: '/voice', label: 'Voice Generator', icon: Mic },
      { to: '/image-translator', label: 'Translator', icon: Languages },
    ]
  },
  {
    label: 'Ads & Marketing', key: 'ads', items: [
      { to: '/ad-library', label: 'Meta Ads Library', icon: BookOpen },
      { to: '/ad-genius', label: 'Ad Genius', icon: Lightbulb, minPlan: 'pro', badge: 'PRO' },
      { to: '/ad-creator', label: 'Ad Creator', icon: Megaphone, minPlan: 'enterprise', badge: 'ENT' },
      { to: '/mockups', label: 'Mockups', icon: Package, minPlan: 'enterprise', badge: 'ENT' },
    ]
  },
  {
    label: 'DTC / Ecommerce', key: 'dtc', items: [
      { to: '/multi-product-copy', label: 'Multi-Product Copy', icon: Copy },
      { to: '/jewellery', label: 'Jewellery Ads', icon: Gem, minPlan: 'pro', badge: 'PRO' },
      { to: '/chat', label: 'Chat Assistant', icon: Bot },
    ]
  },
  {
    label: 'Library', key: 'library', items: [
      { to: '/spaces', label: 'Spaces', icon: Workflow, minPlan: 'pro', badge: 'PRO' },
      { to: '/brand-kit', label: 'Brand Kit', icon: Palette, minPlan: 'enterprise', badge: 'ENT' },
      { to: '/history', label: 'History', icon: Clock },
      { to: '/projects', label: 'Projects', icon: FolderOpen },
    ]
  },
  {
    label: 'Features & SOPs', key: 'features', items: [
      { to: '/sop/claude-code', label: 'Claude Code + Shopify', icon: Zap },
      { to: '/sop/advertorial', label: 'AI Advertorial SOP', icon: FileEdit },
      { to: '/sop/toolkit', label: 'Toolkit Download', icon: Package },
      { to: '/sop/guides', label: 'How-to Guides', icon: BookOpen },
    ]
  },
]

function hasAccess(userPlan: string | undefined, minPlan?: Plan): boolean {
  if (!minPlan) return true
  const level = PLAN_LEVEL[(userPlan as Plan) || 'free'] ?? 0
  const required = PLAN_LEVEL[minPlan] ?? 0
  return level >= required
}

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, updateCredits, logout, updateUser } = useAuthStore()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('sidebar-collapsed') || '{}') } catch { return {} }
  })
  const toggleSection = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('sidebar-collapsed', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    if (isAuthenticated) {
      axios.get('/auth/me').then(res => updateCredits(res.data.credits)).catch(() => { })
      axios.get('/profile').then(res => {
        if (res.data.avatar) updateUser({ avatar: res.data.avatar })
        if (res.data.name) updateUser({ name: res.data.name })
      }).catch(() => { })
    }
  }, [isAuthenticated])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-600">
      {/* ── Sidebar ── */}
      <aside className="w-[232px] flex-shrink-0 flex flex-col bg-surface-800 border-r border-white/[0.06]">

        {/* Logo */}
        <div className="px-3.5 pt-3.5 pb-2.5 flex items-center gap-2.5">
          <div
            onClick={() => navigate('/')}
            className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm cursor-pointer"
          >
            <Zap size={14} className="text-white" />
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => navigate('/')}>
            <div className="font-bold text-[14px] tracking-tight text-white leading-none">CreativeGen</div>
            <div className="text-[9px] text-gray-600 tracking-wider uppercase mt-0.5">v3.0</div>
          </div>
          <button className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition">
            <Grid3X3 size={12} className="text-gray-500" />
          </button>
        </div>

        {/* Credits bar */}
        {isAuthenticated && user && (
          <div className="px-2.5 pb-2.5">
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-[10px] bg-gradient-to-r from-brand-500/14 to-transparent border border-brand-500/30 text-brand-400">
              <Coins size={13} />
              <span className="text-[13px] font-bold flex-1 text-white">{user.credits}</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">credits</span>
              <button
                onClick={() => axios.post('/auth/credits/add?amount=50').then(r => updateCredits(r.data.credits))}
                className="w-[18px] h-[18px] rounded-md bg-brand-500/20 hover:bg-brand-500 hover:text-white flex items-center justify-center transition"
                title="Add credits"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Search */}
          <div className="px-2.5 pb-2.5">
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-gray-500 text-xs transition">
              <Search size={13} />
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-600 font-mono">⌘K</kbd>
            </button>
          </div>

          {/* Top links */}
          <nav className="px-2.5 space-y-0.5">
            <button onClick={() => navigate('/')} className="nav-link w-full">
              <Home size={15} /><span>Home</span>
            </button>
            {hasAccess(user?.plan, 'enterprise') ? (
              <NavLink to="/community" className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
                <Users size={15} /><span className="flex-1">Community</span>
              </NavLink>
            ) : (
              <button onClick={() => navigate('/pricing')} className="nav-link w-full opacity-45 hover:opacity-75">
                <Users size={15} />
                <span className="flex-1">Community</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">ENT</span>
                <Lock size={10} className="text-gray-600" />
              </button>
            )}
          </nav>

          <div className="mx-2.5 border-t border-white/[0.05] my-2" />

          {/* Sections */}
          {navSections.map((section, idx) => (
            <div key={section.key} className="px-2.5">
              <button onClick={() => toggleSection(section.key)} className="flex items-center justify-between w-full px-2 py-1.5 group">
                <span className="section-label">{section.label}</span>
                <ChevronDown
                  size={11}
                  className={clsx('text-gray-600 group-hover:text-gray-400 transition-transform', collapsed[section.key] && '-rotate-90')}
                />
              </button>
              {!collapsed[section.key] && (
                <nav className="space-y-0.5 mt-0.5">
                  {section.items.map(item => {
                    const locked = !hasAccess(user?.plan, item.minPlan)
                    if (locked) return (
                      <button key={item.to} onClick={() => navigate('/pricing')}
                        className="nav-link w-full opacity-45 hover:opacity-75"
                        title={`Requires ${item.minPlan} plan`}>
                        <item.icon size={15} />
                        <span className="truncate flex-1">{item.label}</span>
                        <span className={clsx('text-[8px] font-bold px-1.5 py-0.5 rounded-full',
                          item.minPlan === 'enterprise' ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-500/15 text-brand-400')}>
                          {item.badge || 'PRO'}
                        </span>
                        <Lock size={10} className="text-gray-600" />
                      </button>
                    )
                    return (
                      <NavLink key={item.to} to={item.to}
                        className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
                        <item.icon size={15} />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <span className={clsx('text-[8px] font-bold px-1.5 py-0.5 rounded-full',
                            item.minPlan === 'enterprise' ? 'bg-amber-500/15 text-amber-400/70' : 'bg-brand-500/15 text-brand-400/70')}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </nav>
              )}
              {idx < navSections.length - 1 && <div className="mx-0 border-t border-white/[0.05] my-2" />}
            </div>
          ))}
        </div>

        {/* Upgrade CTA */}
        {isAuthenticated && user?.plan === 'free' && (
          <div
            onClick={() => navigate('/pricing')}
            className="mx-2.5 mb-2 p-2.5 rounded-[10px] bg-gradient-to-br from-brand-500/14 to-transparent border border-brand-500/30 flex items-center gap-2.5 cursor-pointer hover:border-brand-500 hover:shadow-glow transition"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Crown size={13} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-white">Upgrade to Pro</div>
              <div className="text-[10px] text-gray-500">Unlock all features</div>
            </div>
          </div>
        )}

        {/* User / Sign in */}
        <div className="px-2.5 pb-3">
          {isAuthenticated && user ? (
            <div className="rounded-[10px] bg-white/[0.03] border border-white/[0.06] p-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                onClick={() => navigate('/edit-profile')}>
                {user.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : <User size={13} className="text-brand-400" />}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/edit-profile')}>
                <p className="text-[12px] font-semibold text-white truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition" title="Sign out">
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')}
              className="w-full rounded-[10px] bg-gradient-to-br from-brand-500/10 to-transparent border border-brand-500/20 p-2.5 text-left hover:border-brand-500/40 transition">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <LogIn size={13} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white">Sign in</p>
                  <p className="text-[10px] text-gray-500">Get 50 free credits</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] bg-surface-600 flex-shrink-0">
            <div className="flex-1" />

            {/* Notification chip */}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-gray-400 text-xs transition">
              <Image size={13} />
              <span className="px-1.5 bg-brand-500 text-white text-[10px] font-bold rounded-full">2</span>
            </button>

            {/* Free Trial */}
            <button className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold transition">
              Free Trial
            </button>

            {/* Upgrade */}
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold transition"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                boxShadow: '0 2px 10px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Crown size={13} /> Upgrade Plan
            </button>

            {/* Credit gauge */}
            <div className="relative w-9 h-9 ml-1 cursor-pointer" onClick={() => navigate('/community?tab=profile')}>
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${Math.min((user.credits / 100) * 97.4, 97.4)} 97.4`}
                  className={clsx('transition-all duration-700',
                    user.credits > 30 ? 'stroke-brand-500' : user.credits > 10 ? 'stroke-amber-500' : 'stroke-red-500')}
                />
              </svg>
              <div className="absolute inset-[3px] rounded-full bg-brand-500/20 flex items-center justify-center overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : <User size={13} className="text-brand-400" />}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-surface-600">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
