import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Users, Plus, LogIn, Copy, RefreshCw, ArrowRightLeft, Trash2, Crown, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface MemberInfo {
	user_id: string
	name: string
	email: string
	role: 'owner' | 'member'
	joined_at: string
}

interface TeamInfo {
	id: string
	name: string
	plan: string
	credits: number
	invite_code: string | null
	is_owner: boolean
	members: MemberInfo[]
}

export default function TeamPage() {
	const qc = useQueryClient()
	const me = useAuthStore((s) => s.user)
	const updateCredits = useAuthStore((s) => s.updateCredits)

	const { data: team, isLoading } = useQuery<TeamInfo | null>({
		queryKey: ['team', 'me'],
		queryFn: () => axios.get<TeamInfo | null>('/teams/me').then((r) => r.data),
	})

	const [creating, setCreating] = useState(false)
	const [joining, setJoining] = useState(false)
	const [name, setName] = useState('')
	const [inviteCode, setInviteCode] = useState('')
	const [transferAmount, setTransferAmount] = useState(50)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	function refreshAll() {
		qc.invalidateQueries({ queryKey: ['team', 'me'] })
		axios.get('/auth/me').then((r) => updateCredits(r.data.credits)).catch(() => {})
	}

	async function handleCreate() {
		if (!name.trim()) return
		setBusy(true)
		setError(null)
		try {
			await axios.post('/teams', { name: name.trim() })
			setCreating(false)
			setName('')
			refreshAll()
		} catch (e: any) {
			setError(e?.response?.data?.detail || 'Could not create team')
		} finally {
			setBusy(false)
		}
	}

	async function handleJoin() {
		if (!inviteCode.trim()) return
		setBusy(true)
		setError(null)
		try {
			await axios.post('/teams/join', { invite_code: inviteCode.trim() })
			setJoining(false)
			setInviteCode('')
			refreshAll()
		} catch (e: any) {
			setError(e?.response?.data?.detail || 'Could not join team')
		} finally {
			setBusy(false)
		}
	}

	async function handleLeave() {
		if (!confirm('Leave this team? Your account stays but you lose access to the shared credits.')) return
		setBusy(true)
		try {
			await axios.post('/teams/leave')
			refreshAll()
		} catch (e: any) {
			alert(e?.response?.data?.detail || 'Could not leave')
		} finally {
			setBusy(false)
		}
	}

	async function handleRotate() {
		setBusy(true)
		try {
			await axios.post('/teams/regenerate-invite')
			refreshAll()
		} finally {
			setBusy(false)
		}
	}

	async function handleRemove(memberId: string) {
		if (!confirm('Remove this member from the team?')) return
		setBusy(true)
		try {
			await axios.delete(`/teams/members/${memberId}`)
			refreshAll()
		} catch (e: any) {
			alert(e?.response?.data?.detail || 'Could not remove')
		} finally {
			setBusy(false)
		}
	}

	async function handleTransfer() {
		if (transferAmount <= 0) return
		setBusy(true)
		setError(null)
		try {
			await axios.post('/teams/transfer-credits', { amount: transferAmount })
			refreshAll()
		} catch (e: any) {
			setError(e?.response?.data?.detail || 'Transfer failed')
		} finally {
			setBusy(false)
		}
	}

	function copyInvite(code: string) {
		navigator.clipboard.writeText(code).catch(() => {})
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64 text-gray-500">
				<Loader2 size={20} className="animate-spin mr-2" /> Loading…
			</div>
		)
	}

	// — No team yet: show create + join cards —
	if (!team) {
		return (
			<div className="max-w-2xl mx-auto p-8 space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-white">Team</h1>
					<p className="text-sm text-gray-400 mt-1">
						Share a plan + credit pool with teammates. Everyone can use the platform at the same time.
					</p>
				</div>

				{!creating && !joining && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<button
							onClick={() => { setCreating(true); setError(null) }}
							className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-brand-500/60 text-left transition"
						>
							<Plus size={18} className="text-brand-400 mb-2" />
							<p className="text-sm font-semibold text-white">Create a team</p>
							<p className="text-xs text-gray-500 mt-1">You become the owner. Up to 3 members total.</p>
						</button>
						<button
							onClick={() => { setJoining(true); setError(null) }}
							className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-brand-500/60 text-left transition"
						>
							<LogIn size={18} className="text-brand-400 mb-2" />
							<p className="text-sm font-semibold text-white">Join with code</p>
							<p className="text-xs text-gray-500 mt-1">Paste the invite code from a teammate.</p>
						</button>
					</div>
				)}

				{creating && (
					<div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
						<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Team name</label>
						<input
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Acme Marketing"
							className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none"
						/>
						<div className="flex gap-2">
							<button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-gray-300">Cancel</button>
							<button onClick={handleCreate} disabled={busy || !name.trim()} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2">
								{busy && <Loader2 size={12} className="animate-spin" />}
								Create team
							</button>
						</div>
					</div>
				)}

				{joining && (
					<div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
						<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invite code</label>
						<input
							autoFocus
							value={inviteCode}
							onChange={(e) => setInviteCode(e.target.value)}
							placeholder="paste here"
							className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none font-mono"
						/>
						<div className="flex gap-2">
							<button onClick={() => setJoining(false)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-gray-300">Cancel</button>
							<button onClick={handleJoin} disabled={busy || !inviteCode.trim()} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2">
								{busy && <Loader2 size={12} className="animate-spin" />}
								Join
							</button>
						</div>
					</div>
				)}

				{error && (
					<div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">{error}</div>
				)}
			</div>
		)
	}

	// — Team exists: show team card —
	return (
		<div className="max-w-3xl mx-auto p-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-white">{team.name}</h1>
					<p className="text-sm text-gray-400 mt-1">
						<span className="capitalize">{team.plan}</span> plan · <span className="text-brand-400 font-semibold">{team.credits}</span> shared credits · {team.members.length} / 3 member{team.members.length === 1 ? '' : 's'}
					</p>
				</div>
				<button
					onClick={handleLeave}
					disabled={busy}
					className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium"
				>
					{team.is_owner && team.members.length === 1 ? 'Delete team' : 'Leave team'}
				</button>
			</div>

			{/* Invite code (owner only) */}
			{team.is_owner && team.invite_code && (
				<div className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 space-y-2">
					<div className="flex items-center gap-2">
						<p className="text-xs font-semibold text-brand-300 uppercase tracking-wider">Invite code</p>
						<button onClick={handleRotate} disabled={busy} title="Rotate" className="text-gray-500 hover:text-brand-400">
							<RefreshCw size={11} />
						</button>
					</div>
					<div className="flex items-center gap-2">
						<code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-sm text-white font-mono select-all">{team.invite_code}</code>
						<button
							onClick={() => copyInvite(team.invite_code!)}
							className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-300 flex items-center gap-1.5"
						>
							<Copy size={12} /> Copy
						</button>
					</div>
					<p className="text-[11px] text-gray-500">Anyone with this code can join your team and spend your shared credits. Rotate it if it leaks.</p>
				</div>
			)}

			{/* Transfer personal → team */}
			{me && (
				<div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
					<div className="flex items-center gap-2">
						<ArrowRightLeft size={13} className="text-brand-400" />
						<p className="text-sm font-semibold text-white">Transfer your personal credits → team</p>
					</div>
					<p className="text-xs text-gray-500">You currently have your own personal balance separate from the team's pool. Move some over.</p>
					<div className="flex items-center gap-2">
						<input
							type="number"
							min={1}
							value={transferAmount}
							onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)}
							className="w-32 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-brand-500/60 text-sm text-white outline-none"
						/>
						<button
							onClick={handleTransfer}
							disabled={busy || transferAmount <= 0}
							className="px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2"
						>
							{busy && <Loader2 size={12} className="animate-spin" />}
							Transfer
						</button>
					</div>
				</div>
			)}

			{/* Members */}
			<div className="space-y-2">
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</h3>
				{team.members.map((m) => (
					<div key={m.user_id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
						<div className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400">
							{m.role === 'owner' ? <Crown size={14} /> : <Users size={14} />}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold text-white truncate">{m.name} <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium ml-1">{m.role}</span></p>
							<p className="text-xs text-gray-500 break-all">{m.email}</p>
						</div>
						{team.is_owner && m.role !== 'owner' && (
							<button
								onClick={() => handleRemove(m.user_id)}
								disabled={busy}
								title="Remove"
								className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center"
							>
								<Trash2 size={12} />
							</button>
						)}
					</div>
				))}
			</div>

			{error && (
				<div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">{error}</div>
			)}
		</div>
	)
}

