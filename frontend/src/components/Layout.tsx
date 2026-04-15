import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Search, Home, Users, Image, Video, Grid3X3, Lock,
  Clock, FolderOpen, ChevronRight, ChevronDown, Zap, LogIn, LogOut, Workflow, LayoutGrid, Languages,
  Package, Megaphone, Palette, Coins, Plus, User, Mic, Lightbulb, Bot, Paintbrush, UserCircle, BookOpen, Gem,
  Store, ShoppingBag, TrendingUp, Target, Layers, Crown, FileEdit
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'
import { useEffect } from 'react'
import axios from 'axios'

type Plan = 'free' | 'pro' | 'enterprise'

const PLAN_LEVEL: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 }

interface NavItem {
  to: string
  label: string
  icon: any
  minPlan?: Plan  // undefined = free (everyone)
  badge?: string
}

interface NavSection {
  label: string
  key: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Creative Tools',
    key: 'creative',
    items: [
      { to: '/generate', label: 'Image Generator', icon: Image },
      { to: '/video', label: 'Video Generator', icon: Video },
      { to: '/collage', label: 'Collage Maker', icon: LayoutGrid },
      { to: '/image-edit', label: 'Image Editor', icon: Paintbrush, minPlan: 'pro', badge: 'PRO' },
      { to: '/avatar', label: 'AI Avatar', icon: UserCircle, minPlan: 'pro', badge: 'PRO' },
      { to: '/voice', label: 'Voice Generator', icon: Mic },
      { to: '/image-translator', label: 'Translator', icon: Languages },
    ],
  },
  {
    label: 'Ads & Marketing',
    key: 'ads',
    items: [
      { to: '/ad-library', label: 'Meta Ads Library', icon: BookOpen },
      { to: '/ad-genius', label: 'Ad Genius', icon: Lightbulb, minPlan: 'pro', badge: 'PRO' },
      { to: '/ad-creator', label: 'Ad Creator', icon: Megaphone, minPlan: 'enterprise', badge: 'ENT' },
      { to: '/mockups', label: 'Mockups', icon: Package, minPlan: 'enterprise', badge: 'ENT' },
    ],
  },
  {
    label: 'DTC / Ecommerce',
    key: 'dtc',
    items: [
      { to: '/jewellery', label: 'Jewellery Ads', icon: Gem, minPlan: 'pro', badge: 'PRO' },
      { to: '/chat', label: 'Chat Assistant', icon: Bot },
    ],
  },
  {
    label: 'Library',
    key: 'library',
    items: [
      { to: '/spaces', label: 'Spaces', icon: Workflow, minPlan: 'pro', badge: 'PRO' },
      { to: '/brand-kit', label: 'Brand Kit', icon: Palette, minPlan: 'enterprise', badge: 'ENT' },
      { to: '/history', label: 'History', icon: Clock },
      { to: '/projects', label: 'Projects', icon: FolderOpen },
    ],
  },
  {
    label: 'Features & SOPs',
    key: 'features',
    items: [
      { to: '/sop/claude-code', label: 'Claude Code + Shopify', icon: Zap },
      { to: '/sop/advertorial', label: 'AI Advertorial SOP', icon: FileEdit },
      { to: '/sop/toolkit', label: 'Toolkit Download', icon: Package },
      { to: '/sop/guides', label: 'How-to Guides', icon: BookOpen },
    ],
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
  const { isAuthenticated, user, updateCredits, logout } = useAuthStore()

  // Collapsible sections — load from localStorage
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

  const updateUserFn = useAuthStore(s => s.updateUser)

  // Refresh credits + avatar on mount
  useEffect(() => {
    if (isAuthenticated) {
      axios.get('/auth/me').then(res => {
        updateCredits(res.data.credits)
      }).catch(() => {})
      axios.get('/profile').then(res => {
        if (res.data.avatar) updateUserFn({ avatar: res.data.avatar })
        if (res.data.name) updateUserFn({ name: res.data.name })
      }).catch(() => {})
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-700">
      {/* ── Sidebar ── */}
      <aside className="w-[230px] flex-shrink-0 flex flex-col bg-surface-800/80 backdrop-blur-xl border-r border-white/[0.04]">

        {/* Logo */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-white">CreativeGen</span>
          </div>
          <button className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all duration-200 hover:rotate-90">
            <Grid3X3 size={13} className="text-gray-500" />
          </button>
        </div>

        {/* Credits bar (when logged in) */}
        {isAuthenticated && user && (
          <div className="px-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-500/[0.06] to-transparent border border-brand-500/10 glow-border">
              <Coins size={14} className="text-brand-400" />
              <span className="text-sm font-bold text-white flex-1">{user.credits}</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">credits</span>
              <button
                onClick={() => {
                  axios.post('/auth/credits/add?amount=50').then(res => {
                    updateCredits(res.data.credits)
                  })
                }}
                className="w-5 h-5 rounded-md bg-brand-500/15 hover:bg-brand-500/30 flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Add credits"
              >
                <Plus size={10} className="text-brand-400" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable middle section */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Search */}
          <div className="px-3 mb-3">
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] text-gray-500 text-sm transition-all duration-150"
            >
              <Search size={14} />
              <span className="flex-1 text-left text-[13px]">Search</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-600 font-mono">⌘K</kbd>
            </button>
          </div>

          {/* Top links */}
          <nav className="px-3 space-y-0.5 mb-2">
            <button
              onClick={() => navigate('/')}
              className="nav-link w-full"
            >
              <Home size={16} />
              <span>Home</span>
            </button>
            {hasAccess(user?.plan, 'enterprise') ? (
              <NavLink
                to="/community"
                className={({ isActive }) => clsx('nav-link', isActive && 'active')}
              >
                <Users size={16} />
                <span className="flex-1">Community</span>
              </NavLink>
            ) : (
              <button
                onClick={() => navigate('/pricing')}
                className="nav-link w-full opacity-40 hover:opacity-70"
              >
                <Users size={16} />
                <span className="flex-1">Community</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">ENT</span>
                <Lock size={11} className="text-gray-600" />
              </button>
            )}
          </nav>

          <div className="mx-3 border-t border-white/[0.06] my-1" />

          {/* Collapsible nav sections */}
          {navSections.map(section => (
            <div key={section.key} className="px-3 mt-1">
              <button
                onClick={() => toggleSection(section.key)}
                className="flex items-center justify-between w-full px-2 py-1.5 group"
              >
                <span className="section-label">{section.label}</span>
                <ChevronDown
                  size={12}
                  className={clsx(
                    'text-gray-600 group-hover:text-gray-400 transition-transform duration-200',
                    collapsed[section.key] && '-rotate-90',
                  )}
                />
              </button>
              {!collapsed[section.key] && (
                <nav className="space-y-0.5 mt-0.5">
                  {section.items.map((item) => {
                    const locked = !hasAccess(user?.plan, item.minPlan)
                    if (locked) {
                      return (
                        <button
                          key={item.to}
                          onClick={() => navigate('/pricing')}
                          className="nav-link w-full opacity-40 hover:opacity-70 cursor-pointer"
                          title={`Requires ${item.minPlan} plan`}
                        >
                          <item.icon size={16} />
                          <span className="truncate flex-1">{item.label}</span>
                          <span className={clsx(
                            'text-[8px] font-bold px-1.5 py-0.5 rounded-full',
                            item.minPlan === 'enterprise'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-brand-500/20 text-brand-400',
                          )}>
                            {item.badge || 'PRO'}
                          </span>
                          <Lock size={11} className="text-gray-600" />
                        </button>
                      )
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          clsx('nav-link', isActive && 'active')
                        }
                      >
                        <item.icon size={16} />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <span className={clsx(
                            'text-[8px] font-bold px-1.5 py-0.5 rounded-full',
                            item.minPlan === 'enterprise'
                              ? 'bg-purple-500/15 text-purple-400/60'
                              : 'bg-brand-500/15 text-brand-400/60',
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </nav>
              )}
              {section.key !== 'library' && (
                <div className="mx-0 border-t border-white/[0.06] my-1" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom: User info or Sign in */}
        <div className="p-3 mt-auto">
          {isAuthenticated && user ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/edit-profile')}>
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    : <User size={14} className="text-brand-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                <button onClick={() => navigate('/edit-profile')}
                  className="text-[10px] text-gray-500 hover:text-brand-400 transition-colors flex-1 text-left">
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 transition-colors"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-900/5 border border-brand-500/15 p-3.5 text-left hover:border-brand-500/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <LogIn size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Sign in</p>
                  <p className="text-[11px] text-gray-500">Get 50 free credits</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {isAuthenticated && user && (
          <div className="flex items-center justify-end px-6 py-2.5 border-b border-white/[0.04] bg-surface-800/30 backdrop-blur-md flex-shrink-0">
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate('/community?tab=profile')}
            >
              {/* Credits text */}
              <div className="text-right mr-1">
                <p className="text-[11px] text-gray-500 leading-none">{user.plan} plan</p>
                <p className="text-xs font-semibold text-white leading-tight">{user.credits} credits</p>
              </div>

              {/* Avatar with circular progress ring */}
              <div className="relative w-9 h-9">
                {/* SVG ring — credit gauge */}
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  {/* Background ring */}
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                  {/* Progress ring */}
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min((user.credits / 100) * 97.4, 97.4)} 97.4`}
                    className={clsx(
                      'transition-all duration-700',
                      user.credits > 30 ? 'stroke-brand-500' :
                      user.credits > 10 ? 'stroke-amber-500' :
                      'stroke-red-500',
                    )}
                  />
                </svg>
                {/* Avatar center */}
                <div className="absolute inset-[3px] rounded-full bg-brand-500/20 flex items-center justify-center overflow-hidden">
                  {user.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    : <User size={14} className="text-brand-400" />
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-surface-700">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
