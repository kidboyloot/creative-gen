import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  User, Camera, Loader2, Check, ArrowLeft, Trash2, Globe, MapPin, ShoppingBag, FileText
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [niche, setNiche] = useState('')
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile data
  useEffect(() => {
    axios.get('/profile').then(res => {
      setName(res.data.name || '')
      setBio(res.data.bio || '')
      setWebsite(res.data.website || '')
      setLocation(res.data.location || '')
      setNiche(res.data.niche || '')
      if (res.data.avatar) setAvatar(res.data.avatar)
    }).catch(() => {}).finally(() => setLoadingProfile(false))
  }, [])

  const handleAvatarUpload = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post<{ url: string }>('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatar(res.data.url)
      updateUser({ avatar: res.data.url })
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    await axios.delete('/profile/avatar')
    setAvatar(null)
    updateUser({ avatar: null })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await axios.put('/profile', { name, bio, website, location, niche })
      updateUser({ name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-gray-400 text-sm mt-0.5">Changes apply everywhere — sidebar, community, posts.</p>
        </div>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="relative group">
          {/* Avatar display */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/[0.05] border-2 border-white/[0.08] flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-gray-600" />
            )}
          </div>

          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading
              ? <Loader2 size={20} className="text-white animate-spin" />
              : <Camera size={20} className="text-white" />
            }
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
          />
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-white">{name || 'Your Name'}</p>
          <p className="text-xs text-gray-500">
            Supports <span className="text-brand-400">PNG, JPG, WebP</span> and <span className="text-purple-400">GIF</span> (animated avatars)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 text-xs font-medium hover:bg-brand-500/30 transition-colors"
            >
              <Camera size={12} /> {avatar ? 'Change' : 'Upload'}
            </button>
            {avatar && (
              <button
                onClick={handleDeleteAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
            <User size={14} className="text-brand-400" /> Display Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
            <FileText size={14} className="text-blue-400" /> Bio
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Tell the community about yourself..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 resize-none transition-colors"
          />
          <p className="text-[10px] text-gray-600 mt-1 text-right">{bio.length}/300</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
              <Globe size={14} className="text-green-400" /> Website
            </label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yourstore.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
              <MapPin size={14} className="text-red-400" /> Location
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Lisbon, Portugal"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
            <ShoppingBag size={14} className="text-purple-400" /> Niche / Industry
          </label>
          <input
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="e.g. Jewellery, Fashion, Fitness supplements..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
            !saving ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white/[0.04] text-gray-500',
          )}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check size={16} /> Saved!</>
          ) : (
            <>Save Changes</>
          )}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-xl text-sm text-gray-400 hover:text-white bg-white/[0.05] transition-colors"
        >
          Cancel
        </button>

        {saved && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check size={12} /> Profile updated everywhere
          </span>
        )}
      </div>
    </div>
  )
}
