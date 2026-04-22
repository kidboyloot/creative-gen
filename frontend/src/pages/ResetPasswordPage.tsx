import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Zap, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
	const [params] = useSearchParams()
	const navigate = useNavigate()
	const token = useMemo(() => params.get('token') || '', [params])

	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [show, setShow] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [done, setDone] = useState(false)

	const tokenMissing = !token.trim()
	const mismatch = confirm.length > 0 && password !== confirm
	const tooShort = password.length > 0 && password.length < 6
	const canSubmit = !tokenMissing && password.length >= 6 && password === confirm

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit) return
		setError('')
		setLoading(true)
		try {
			await axios.post('/auth/reset-password', { token, new_password: password })
			setDone(true)
			setTimeout(() => navigate('/login'), 1500)
		} catch (err: any) {
			setError(err?.response?.data?.detail || 'Reset failed. The link may have expired — request a new one.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-700 px-4">
			<div className="w-full max-w-sm space-y-8">
				<div className="flex flex-col items-center">
					<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4">
						<Zap size={22} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-white">Choose a new password</h1>
					<p className="text-sm text-gray-500 mt-1 text-center">
						{done ? 'Password updated! Redirecting to sign in…' : 'At least 6 characters.'}
					</p>
				</div>

				{done ? (
					<div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
						<CheckCircle2 size={16} /> Password updated successfully.
					</div>
				) : tokenMissing ? (
					<div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
						This link is missing a reset token. Ask for a new one on the forgot-password page.
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
							<div className="relative">
								<input
									type={show ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="at least 6 characters"
									autoFocus
									className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
								/>
								<button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
									{show ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{tooShort && <p className="text-[11px] text-amber-400 mt-1">At least 6 characters.</p>}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm</label>
							<input
								type={show ? 'text' : 'password'}
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								placeholder="re-enter the same password"
								className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
							/>
							{mismatch && <p className="text-[11px] text-amber-400 mt-1">Passwords don't match.</p>}
						</div>

						<button
							type="submit"
							disabled={!canSubmit || loading}
							className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-2"
						>
							{loading ? <><Loader2 size={16} className="animate-spin" /> Resetting…</> : 'Reset password'}
						</button>
					</form>
				)}

				<p className="text-center text-sm text-gray-500">
					<Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Back to sign in</Link>
				</p>
			</div>
		</div>
	)
}
