import { useNavigate } from 'react-router-dom'
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

type Plan = 'free' | 'pro' | 'enterprise'
const PLAN_LEVEL: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 }

interface Props {
  minPlan: Plan
  children: React.ReactNode
}

export default function PlanGate({ minPlan, children }: Props) {
  // Bypass for demo
  return <>{children}</>

  const navigate = useNavigate()
  const userPlan = (useAuthStore(s => s.user?.plan) || 'free') as Plan
  const level = PLAN_LEVEL[userPlan] ?? 0
  const required = PLAN_LEVEL[minPlan] ?? 0

  if (level >= required) return <>{children}</>

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
          <Lock size={32} className="text-brand-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            {minPlan === 'enterprise' ? 'Enterprise' : 'Pro'} Feature
          </h2>
          <p className="text-sm text-gray-400">
            This tool requires the <span className="font-semibold text-brand-400 capitalize">{minPlan}</span> plan.
            Upgrade to unlock all premium tools and take your creatives to the next level.
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all shadow-glow"
        >
          {minPlan === 'enterprise' ? <Crown size={16} /> : <Sparkles size={16} />}
          Upgrade to {minPlan.charAt(0).toUpperCase() + minPlan.slice(1)}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
