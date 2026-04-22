import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Zap, Loader2, Copy, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [submitted, setSubmitted] = useState(false)
	const [resetUrl, setResetUrl] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!email.trim()) return
		setError('')
		setLoading(true)
		try {
			const res = await axios.post('/auth/forgot-password', { email: email.trim() })
			setSubmitted(true)
			// Until SMTP is wired up, the API returns the reset URL directly so
			// an admin can pass it along by hand. When email is set up, this
			// field disappears from the response and the user just sees the
			// "check your inbox" message.
			setResetUrl(res.data?.reset_url || null)
		} catch (err: any) {
			setError(err?.response?.data?.detail || 'Could not send reset link. Try again.')
		} finally {
			setLoading(false)
		}
	}

	function copyUrl() {
		if (!resetUrl) return
		navigator.clipboard.writeText(resetUrl).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		})
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-700 px-4">
			<div className="w-full max-w-sm space-y-8">
				<div className="flex flex-col items-center">
					<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4">
						<Zap size={22} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-white">Reset your password</h1>
					<p className="text-sm text-gray-500 mt-1 text-center">
						{submitted ? 'Check your inbox — a reset link is on its way.' : "Enter your email and we'll send you a reset link."}
					</p>
				</div>

				{!submitted ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
						)}
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								autoFocus
								className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
							/>
						</div>
						<button
							type="submit"
							disabled={!email.trim() || loading}
							className="w-full py-3 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-2"
						>
							{loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send reset link'}
						</button>
					</form>
				) : (
					<div className="space-y-4">
						<div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2">
							<CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
							<span>If that email exists, a reset link was issued. It expires in 60 minutes.</span>
						</div>

						{resetUrl && (
							<div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2">
								<p className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider">Dev mode — reset link returned inline</p>
								<p className="text-[11px] text-gray-500">SMTP isn't wired up yet, so the reset URL comes back in the response. Copy and open it:</p>
								<div className="flex items-center gap-2">
									<code className="flex-1 px-2 py-1.5 rounded bg-black/30 text-[11px] text-white font-mono truncate">{resetUrl}</code>
									<button onClick={copyUrl} className="px-2.5 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-gray-300 flex items-center gap-1">
										<Copy size={11} /> {copied ? 'Copied' : 'Copy'}
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				<p className="text-center text-sm text-gray-500">
					<Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Back to sign in</Link>
				</p>
			</div>
		</div>
	)
}
