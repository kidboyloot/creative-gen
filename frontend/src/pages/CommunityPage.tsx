import { useState, useRef, useEffect } from 'react'
import {
  Users, Trophy, MessageSquare, Image as ImageIcon, Send, Heart, MessageCircle,
  Crown, Medal, Award, Star, TrendingUp, BarChart3, HelpCircle, Palette,
  Lightbulb, ShoppingBag, Upload, X, ChevronDown, User, Clock, ThumbsUp,
  Flame, Zap
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

type Tab = 'feed' | 'ranking' | 'profile'

const TOPICS = [
  { id: 'all', label: 'All', icon: Flame },
  { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'creatives', label: 'Creatives', icon: Palette },
  { id: 'strategies', label: 'Strategies', icon: Lightbulb },
  { id: 'wins', label: 'Wins & Results', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: ShoppingBag },
]

interface Post {
  id: string
  author: string
  avatar: string
  rank: string
  topic: string
  content: string
  image?: string
  likes: number
  comments: number
  timestamp: string
  isLiked: boolean
}

interface RankUser {
  id: string
  name: string
  avatar: string
  rank: string
  points: number
  badge: string
  generations: number
  streak: number
}

// Mock community data
const MOCK_POSTS: Post[] = [
  { id: '1', author: 'Maria Silva', avatar: '👩‍💼', rank: 'Gold', topic: 'dashboards', content: 'Just hit 10K revenue on my Shopify store this month! Here\'s my dashboard 📊🔥', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop', likes: 47, comments: 12, timestamp: '2h ago', isLiked: false },
  { id: '2', author: 'João Costa', avatar: '🧑‍💻', rank: 'Diamond', topic: 'strategies', content: 'Best strategy for scaling jewellery ads in France: start with .fr/products keywords, low budget €10/day, let it run 7 days. If reach hits 50K, scale to €30. Works every time.', likes: 83, comments: 24, timestamp: '4h ago', isLiked: true },
  { id: '3', author: 'Ana Santos', avatar: '👩‍🎨', rank: 'Silver', topic: 'creatives', content: 'Created these variations using the Scenario Creator — beach sunset + romantic mood. Which one do you prefer? 1 or 2?', image: 'https://images.unsplash.com/photo-1515562141589-67f0d569b605?w=600&h=400&fit=crop', likes: 31, comments: 18, timestamp: '5h ago', isLiked: false },
  { id: '4', author: 'Pedro Almeida', avatar: '🧔', rank: 'Gold', topic: 'questions', content: 'Hey everyone, what\'s the best model for generating product photos with text overlay? I\'m trying to create ads for IG stories with headline text baked in.', likes: 12, comments: 8, timestamp: '6h ago', isLiked: false },
  { id: '5', author: 'Sofia Rodrigues', avatar: '👩‍🔬', rank: 'Platinum', topic: 'wins', content: '🚀 3.8x ROAS on our latest campaign using Ad Genius analysis! The competitor spy feature is insane — found a winning hook that we adapted for our brand.', likes: 92, comments: 31, timestamp: '8h ago', isLiked: true },
  { id: '6', author: 'Rui Ferreira', avatar: '🧑‍🎤', rank: 'Bronze', topic: 'dashboards', content: 'My Shopify analytics after implementing the strategies from this community. 200% growth in 3 months!', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop', likes: 56, comments: 15, timestamp: '12h ago', isLiked: false },
  { id: '7', author: 'Inês Martins', avatar: '👩‍💻', rank: 'Gold', topic: 'products', content: 'Just launched our new summer collection using CreativeGen\'s bulk collage feature. Generated 45 creatives in 10 minutes. Game changer!', likes: 38, comments: 9, timestamp: '1d ago', isLiked: false },
  { id: '8', author: 'Miguel Oliveira', avatar: '🧑‍🔧', rank: 'Silver', topic: 'questions', content: 'Anyone having success with video ads for watches? What models and prompts work best? My current CTR is 0.8% and I want to push it to 1.5%+', likes: 15, comments: 11, timestamp: '1d ago', isLiked: false },
]

const MOCK_RANKING: RankUser[] = [
  { id: '1', name: 'Sofia Rodrigues', avatar: '👩‍🔬', rank: 'Diamond', points: 12450, badge: '💎', generations: 2840, streak: 45 },
  { id: '2', name: 'João Costa', avatar: '🧑‍💻', rank: 'Diamond', points: 11200, badge: '💎', generations: 2210, streak: 38 },
  { id: '3', name: 'Maria Silva', avatar: '👩‍💼', rank: 'Platinum', points: 8900, badge: '🏆', generations: 1560, streak: 22 },
  { id: '4', name: 'Pedro Almeida', avatar: '🧔', rank: 'Gold', points: 6700, badge: '🥇', generations: 1120, streak: 15 },
  { id: '5', name: 'Inês Martins', avatar: '👩‍💻', rank: 'Gold', points: 5400, badge: '🥇', generations: 890, streak: 12 },
  { id: '6', name: 'Rui Ferreira', avatar: '🧑‍🎤', rank: 'Silver', points: 3200, badge: '🥈', generations: 540, streak: 8 },
  { id: '7', name: 'Ana Santos', avatar: '👩‍🎨', rank: 'Silver', points: 2800, badge: '🥈', generations: 420, streak: 6 },
  { id: '8', name: 'Miguel Oliveira', avatar: '🧑‍🔧', rank: 'Bronze', points: 1500, badge: '🥉', generations: 210, streak: 3 },
]

const RANK_COLORS: Record<string, string> = {
  Diamond: 'text-cyan-400',
  Platinum: 'text-purple-400',
  Gold: 'text-amber-400',
  Silver: 'text-gray-300',
  Bronze: 'text-orange-400',
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [activeTopic, setActiveTopic] = useState('all')
  const [posts, setPosts] = useState(MOCK_POSTS)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostTopic, setNewPostTopic] = useState('creatives')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore(s => s.user)

  const filteredPosts = activeTopic === 'all' ? posts : posts.filter(p => p.topic === activeTopic)

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ))
  }

  const handleNewPost = () => {
    if (!newPostContent.trim()) return
    const post: Post = {
      id: String(Date.now()),
      author: user?.name || 'You',
      avatar: '🧑‍💻',
      rank: 'Member',
      topic: newPostTopic,
      content: newPostContent,
      image: newPostImage || undefined,
      likes: 0,
      comments: 0,
      timestamp: 'Just now',
      isLiked: false,
    }
    setPosts(prev => [post, ...prev])
    setNewPostContent('')
    setNewPostImage(null)
    setShowNewPost(false)
  }

  const handleImageUpload = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => setNewPostImage(reader.result as string)
    reader.readAsDataURL(f)
  }

  const TABS = [
    { id: 'feed' as Tab, label: 'Feed', icon: MessageSquare },
    { id: 'ranking' as Tab, label: 'Ranking', icon: Trophy },
    { id: 'profile' as Tab, label: 'My Profile', icon: User },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-gray-400 text-sm mt-1">Share strategies, showcase results, and learn from top performers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">{MOCK_RANKING.length} online</span>
          </div>
          <button onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Send size={14} /> New Post
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === t.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Feed Tab ── */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Topics bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TOPICS.map(t => (
              <button key={t.id} onClick={() => setActiveTopic(t.id)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                  activeTopic === t.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white')}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* New post modal */}
          {showNewPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewPost(false)}>
              <div className="bg-[#161620] border border-white/[0.08] rounded-2xl p-6 max-w-lg w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">New Post</h2>
                  <button onClick={() => setShowNewPost(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
                </div>

                {/* Topic */}
                <div className="flex gap-1.5 flex-wrap">
                  {TOPICS.filter(t => t.id !== 'all').map(t => (
                    <button key={t.id} onClick={() => setNewPostTopic(t.id)}
                      className={clsx('px-2.5 py-1 rounded-lg text-[11px] border transition-colors',
                        newPostTopic === t.id ? 'border-brand-500/50 bg-brand-500/10 text-white' : 'border-white/[0.06] text-gray-500')}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                  rows={4} placeholder="Share a strategy, ask a question, show your results..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none" />

                {/* Image preview */}
                {newPostImage && (
                  <div className="relative">
                    <img src={newPostImage} alt="Upload" className="w-full max-h-48 object-cover rounded-xl" />
                    <button onClick={() => setNewPostImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white"><X size={14} /></button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-xs transition-colors">
                    <ImageIcon size={13} /> Add Photo
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />

                  <button onClick={handleNewPost} disabled={!newPostContent.trim()}
                    className={clsx('px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                      newPostContent.trim() ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500')}>
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <div key={post.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-colors">
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-lg">{post.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{post.author}</span>
                      <span className={clsx('text-[10px] font-bold', RANK_COLORS[post.rank] || 'text-gray-500')}>{post.rank}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600">{post.timestamp}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 capitalize">{post.topic}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-2">
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Image */}
                {post.image && (
                  <div className="px-4 pb-2">
                    <img src={post.image} alt="" className="w-full rounded-xl max-h-80 object-cover" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 px-4 py-3 border-t border-white/[0.04]">
                  <button onClick={() => toggleLike(post.id)}
                    className={clsx('flex items-center gap-1.5 text-xs transition-colors',
                      post.isLiked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400')}>
                    <Heart size={14} fill={post.isLiked ? 'currentColor' : 'none'} /> {post.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 transition-colors">
                    <MessageCircle size={14} /> {post.comments}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ranking Tab ── */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-3">
            {[MOCK_RANKING[1], MOCK_RANKING[0], MOCK_RANKING[2]].map((u, i) => {
              const place = i === 0 ? 2 : i === 1 ? 1 : 3
              const height = place === 1 ? 'h-36' : place === 2 ? 'h-28' : 'h-24'
              return (
                <div key={u.id} className="flex flex-col items-center">
                  <div className="text-3xl mb-2">{u.avatar}</div>
                  <p className="text-sm font-bold text-white">{u.name}</p>
                  <p className={clsx('text-xs font-bold', RANK_COLORS[u.rank])}>{u.badge} {u.rank}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{u.points.toLocaleString()} pts</p>
                  <div className={clsx(
                    'w-full rounded-t-xl mt-3 flex items-end justify-center pb-2',
                    height,
                    place === 1 ? 'bg-gradient-to-t from-amber-500/20 to-amber-500/5 border-t-2 border-amber-500/50' :
                    place === 2 ? 'bg-gradient-to-t from-gray-500/20 to-gray-500/5 border-t-2 border-gray-400/50' :
                    'bg-gradient-to-t from-orange-500/20 to-orange-500/5 border-t-2 border-orange-500/50',
                  )}>
                    <span className={clsx('text-2xl font-black',
                      place === 1 ? 'text-amber-400' : place === 2 ? 'text-gray-300' : 'text-orange-400')}>
                      #{place}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full leaderboard */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="text-left px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-10">#</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Member</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Rank</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Points</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Generations</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Streak</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RANKING.map((u, i) => (
                  <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-400">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{u.avatar}</span>
                        <span className="text-sm font-medium text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className={clsx('px-4 py-3 text-right font-bold', RANK_COLORS[u.rank])}>
                      {u.badge} {u.rank}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{u.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{u.generations.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center gap-1 justify-end text-orange-400">
                        <Flame size={11} /> {u.streak}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rank info */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { rank: 'Bronze', range: '0-2K pts', color: 'text-orange-400', bg: 'bg-orange-500/10', badge: '🥉' },
              { rank: 'Silver', range: '2K-5K pts', color: 'text-gray-300', bg: 'bg-gray-500/10', badge: '🥈' },
              { rank: 'Gold', range: '5K-8K pts', color: 'text-amber-400', bg: 'bg-amber-500/10', badge: '🥇' },
              { rank: 'Platinum', range: '8K-10K pts', color: 'text-purple-400', bg: 'bg-purple-500/10', badge: '🏆' },
              { rank: 'Diamond', range: '10K+ pts', color: 'text-cyan-400', bg: 'bg-cyan-500/10', badge: '💎' },
            ].map(r => (
              <div key={r.rank} className={clsx('p-3 rounded-xl border border-white/[0.06] text-center', r.bg)}>
                <p className="text-lg">{r.badge}</p>
                <p className={clsx('text-xs font-bold mt-1', r.color)}>{r.rank}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{r.range}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile card */}
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 p-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-brand-500/20 flex items-center justify-center text-4xl">
                🧑‍💻
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{user?.name || 'Your Name'}</h2>
                <p className="text-sm text-gray-400">{user?.email || 'email@example.com'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">🥇 Gold</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-400">5,400 points</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="flex items-center gap-1 text-xs text-orange-400"><Flame size={11} /> 12 day streak</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Member since</p>
                <p className="text-sm text-white font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Generations', value: '890', icon: Zap, color: 'text-brand-400' },
              { label: 'Posts', value: '23', icon: MessageSquare, color: 'text-blue-400' },
              { label: 'Likes Given', value: '156', icon: Heart, color: 'text-pink-400' },
              { label: 'Streak', value: '12d', icon: Flame, color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <s.icon size={13} className={s.color} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Earned Badges</h3>
            <div className="flex gap-3 flex-wrap">
              {[
                { emoji: '🚀', label: 'Early Adopter', desc: 'Joined in the first month' },
                { emoji: '🎨', label: 'Creative Master', desc: '100+ generations' },
                { emoji: '💬', label: 'Community Star', desc: '10+ posts' },
                { emoji: '🔥', label: 'On Fire', desc: '7-day streak' },
                { emoji: '🏆', label: 'Top Performer', desc: 'Reached Gold rank' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-xl">{b.emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{b.label}</p>
                    <p className="text-[10px] text-gray-500">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {[
                { action: 'Generated 4 jewellery ads', time: '2h ago', icon: Zap },
                { action: 'Liked a post in Strategies', time: '4h ago', icon: Heart },
                { action: 'Posted in Creatives', time: '1d ago', icon: MessageSquare },
                { action: 'Generated 8 collage variations', time: '1d ago', icon: Zap },
                { action: 'Reached Gold rank', time: '3d ago', icon: Trophy },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <a.icon size={13} className="text-gray-500" />
                  <span className="text-xs text-gray-300 flex-1">{a.action}</span>
                  <span className="text-[10px] text-gray-600">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
