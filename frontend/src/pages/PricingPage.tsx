import { useNavigate } from 'react-router-dom'
import { Check, X, Crown, Zap, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'
import axios from 'axios'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/forever',
    description: 'Get started with essential tools',
    credits: 50,
    color: 'from-gray-500/20 to-gray-600/10',
    border: 'border-white/[0.06]',
    btn: 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1]',
    features: [
      { label: 'Image Generator', included: true },
      { label: 'Video Generator', included: true },
      { label: 'Collage Maker', included: true },
      { label: 'Voice Generator (Free voices)', included: true },
      { label: 'Translator + Text Extractor', included: true },
      { label: 'Meta Ads Library', included: true },
      { label: 'History & Projects', included: true },
      { label: '50 credits (one-time)', included: true },
      { label: 'Image Editor (Inpaint)', included: false },
      { label: 'AI Avatar', included: false },
      { label: 'Ad Genius', included: false },
      { label: 'Jewellery Ads', included: false },
      { label: 'Spaces (Workflows)', included: false },
      { label: 'Ad Creator', included: false },
      { label: 'Mockups', included: false },
      { label: 'Brand Kit', included: false },
      { label: 'Community', included: false },
      { label: 'Chat Assistant', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€29',
    period: '/month',
    description: 'Everything you need to scale',
    credits: 500,
    popular: true,
    color: 'from-brand-500/20 to-brand-700/10',
    border: 'border-brand-500/30',
    btn: 'bg-brand-600 text-white hover:bg-brand-700 shadow-glow',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Image Editor (AI Inpaint)', included: true },
      { label: 'AI Avatar (Image + Video)', included: true },
      { label: 'Ad Genius (Competitor Intel)', included: true },
      { label: 'Jewellery Ads Studio', included: true },
      { label: 'Spaces (Visual Workflows)', included: true },
      { label: 'Voice Cloning (F5-TTS)', included: true },
      { label: 'HD Multilingual Voices', included: true },
      { label: '500 credits/month', included: true },
      { label: 'Priority generation queue', included: true },
      { label: 'All image models', included: true },
      { label: 'Ad Creator', included: false },
      { label: 'Mockups', included: false },
      { label: 'Brand Kit', included: false },
      { label: 'Community', included: false },
      { label: 'Chat Assistant', included: false },
      { label: 'API access', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '€99',
    period: '/month',
    description: 'For agencies & power users',
    credits: 5000,
    color: 'from-purple-500/20 to-purple-700/10',
    border: 'border-purple-500/30',
    btn: 'bg-purple-600 text-white hover:bg-purple-700',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Ad Creator', included: true },
      { label: 'Mockups Generator', included: true },
      { label: 'Brand Kit', included: true },
      { label: 'Community (Ranking, Chat, Profile)', included: true },
      { label: 'Chat Assistant (AI Strategist)', included: true },
      { label: '5,000 credits/month', included: true },
      { label: 'API access', included: true },
      { label: 'White-label exports', included: true },
      { label: 'Team members (up to 5)', included: true },
      { label: 'Priority support', included: true },
      { label: 'Bulk operations', included: true },
    ],
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const { user, updateCredits, updateUser } = useAuthStore()
  const currentPlan = user?.plan || 'free'

  const handleSelectPlan = async (planId: string) => {
    // In production: integrate Stripe checkout here
    // For now: simulate upgrade
    if (planId === currentPlan) return

    try {
      // Simulate plan change + credit top-up
      const credits = PLANS.find(p => p.id === planId)?.credits || 50
      await axios.post(`/auth/credits/add?amount=${credits}`)
      updateUser({ plan: planId })
      const me = await axios.get('/auth/me')
      updateCredits(me.data.credits)
      navigate('/')
    } catch {}
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Choose Your Plan</h1>
        <p className="text-gray-400 mt-2">Unlock premium tools and scale your ecommerce creatives.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          return (
            <div
              key={plan.id}
              className={clsx(
                'relative rounded-2xl border p-6 flex flex-col transition-all duration-300',
                plan.border,
                plan.popular ? 'scale-[1.02]' : '',
              )}
              style={{
                background: `linear-gradient(135deg, ${plan.color.split(' ')[0].replace('from-', '').replace('/20', '')}11, transparent)`,
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {plan.id === 'enterprise' && <Crown size={18} className="text-purple-400" />}
                  {plan.id === 'pro' && <Sparkles size={18} className="text-brand-400" />}
                  {plan.id === 'free' && <Zap size={18} className="text-gray-400" />}
                  <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
              </div>

              {/* Credits + estimates */}
              <div className="px-3 py-3 rounded-lg bg-white/[0.04] border border-white/[0.06] mb-4 space-y-2">
                <div>
                  <span className="text-sm font-bold text-white">{plan.credits.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">credits {plan.id === 'free' ? 'one-time' : '/month'}</span>
                </div>
                <div className="flex gap-3 text-[10px] text-gray-500">
                  <span>~{plan.credits} images</span>
                  <span className="text-gray-700">·</span>
                  <span>~{Math.floor(plan.credits / 3)} videos</span>
                  <span className="text-gray-700">·</span>
                  <span>1 img = 1cr · 1 vid = 3cr</span>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {f.included ? (
                      <Check size={13} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <X size={13} className="text-gray-700 flex-shrink-0" />
                    )}
                    <span className={clsx('text-xs', f.included ? 'text-gray-300' : 'text-gray-600')}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent}
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
                  isCurrent
                    ? 'bg-white/[0.04] text-gray-500 cursor-default'
                    : plan.btn,
                )}
              >
                {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Downgrade' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-[11px] text-gray-600">
        In production, this will integrate with Stripe for payments. Plans can be changed anytime.
      </p>
    </div>
  )
}
