import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Sparkles, Image, Video, Eraser, Package, Megaphone, LayoutGrid,
  TrendingUp, Coins, Clock, ArrowRight, Zap, Crown
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

interface Job {
  id: string
  prompt: string
  model: string
  formats: string[]
  types: string[]
  count: number
  status: string
  done: number
  total: number
  created_at: string
  thumbnails: string[]
}

interface CreditData {
  credits: number
  plan: string
  transactions: {
    id: string
    amount: number
    balance_after: number
    description: string
    created_at: string
  }[]
}

const QUICK_ACTIONS = [
  { to: '/generate', label: 'Generate Images', icon: Image, color: 'from-orange-500 to-amber-600' },
  { to: '/video', label: 'Create Video', icon: Video, color: 'from-purple-500 to-violet-600' },
  { to: '/bg-remover', label: 'Remove BG', icon: Eraser, color: 'from-emerald-500 to-green-600' },
  { to: '/mockups', label: 'Mockups', icon: Package, color: 'from-blue-500 to-cyan-600' },
  { to: '/ad-creator', label: 'Ad Creator', icon: Megaphone, color: 'from-pink-500 to-rose-600' },
  { to: '/collage', label: 'Collage', icon: LayoutGrid, color: 'from-indigo-500 to-blue-600' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['history-home'],
    queryFn: () => axios.get<Job[]>('/history?limit=8').then(r => r.data),
    staleTime: 30_000,
  })

  const { data: creditData } = useQuery<CreditData>({
    queryKey: ['credits-home'],
    queryFn: () => axios.get<CreditData>('/auth/credits').then(r => r.data),
    staleTime: 30_000,
  })

  const recentJobs = jobs.filter(j => j.status === 'done').slice(0, 6)
  const totalGenerated = jobs.reduce((sum, j) => sum + j.done, 0)
  const creditsSpent = creditData?.transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Hero greeting */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500/10 via-brand-900/5 to-transparent border border-white/[0.06] p-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">
            {greeting}, {user?.name?.split(' ')[0] || 'Creator'} <span className="inline-block animate-pulse">✨</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">What will you create today?</p>
        </div>
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-brand-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Credits</span>
          </div>
          <p className="text-2xl font-bold text-white">{creditData?.credits ?? user?.credits ?? 0}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{creditData?.plan ?? user?.plan ?? 'free'} plan</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Spent</span>
          </div>
          <p className="text-2xl font-bold text-white">{creditsSpent}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">credits used</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Image size={14} className="text-purple-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Generated</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalGenerated}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">total assets</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Jobs</span>
          </div>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">generation runs</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all hover:bg-white/[0.04]"
            >
              <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', color)}>
                <Icon size={18} className="text-white" />
              </div>
              <span className="text-[11px] text-gray-400 group-hover:text-white font-medium transition-colors text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent generations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Generations</h2>
          {jobs.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-400 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          )}
        </div>

        {recentJobs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {recentJobs.map(job => (
              <div
                key={job.id}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all cursor-pointer"
                onClick={() => navigate('/history')}
              >
                {/* Thumbnail grid */}
                <div className="aspect-video bg-white/[0.02] relative overflow-hidden">
                  {job.thumbnails.length > 0 ? (
                    <div className={clsx(
                      'w-full h-full grid gap-0.5',
                      job.thumbnails.length === 1 && 'grid-cols-1',
                      job.thumbnails.length === 2 && 'grid-cols-2',
                      job.thumbnails.length >= 3 && 'grid-cols-2 grid-rows-2',
                    )}>
                      {job.thumbnails.slice(0, 4).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className={clsx(
                            'w-full h-full object-cover',
                            job.thumbnails.length === 3 && i === 0 && 'row-span-2',
                          )}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles size={24} className="text-gray-700" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white font-medium bg-white/20 px-3 py-1.5 rounded-full">
                      View details
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-gray-300 font-medium truncate">{job.prompt || 'Untitled generation'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-500">{job.model}</span>
                    <span className="text-[10px] text-gray-700">·</span>
                    <span className="text-[10px] text-gray-500">{job.done} assets</span>
                    <span className="text-[10px] text-gray-700">·</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.06]">
            <Sparkles size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="text-sm text-gray-500 font-medium">No generations yet</p>
            <p className="text-xs text-gray-600 mt-1">Start creating and your recent work will appear here</p>
            <button
              onClick={() => navigate('/generate')}
              className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Zap size={14} /> Start generating
            </button>
          </div>
        )}
      </div>

      {/* Credit transactions */}
      {creditData && creditData.transactions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Credit Activity</h2>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            {creditData.transactions.slice(0, 8).map((tx, i) => (
              <div
                key={tx.id}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-white/[0.04]',
                )}
              >
                <div className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                  tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10',
                )}>
                  {tx.amount > 0
                    ? <Coins size={13} className="text-green-400" />
                    : <TrendingUp size={13} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{tx.description}</p>
                  <p className="text-[10px] text-gray-600">
                    {new Date(tx.created_at).toLocaleDateString()} · {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={clsx(
                    'text-sm font-semibold',
                    tx.amount > 0 ? 'text-green-400' : 'text-red-400',
                  )}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-[10px] text-gray-600">{tx.balance_after} left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA (for free users) */}
      {user?.plan === 'free' && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-blue-500/10 border border-brand-500/15 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Crown size={22} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Upgrade to Pro</p>
            <p className="text-xs text-gray-400 mt-0.5">Get unlimited generations, priority processing, and all premium models.</p>
          </div>
          <button className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0">
            Upgrade
          </button>
        </div>
      )}
    </div>
  )
}
