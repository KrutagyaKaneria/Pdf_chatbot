import React, {useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from './AuthProvider'

export const SignupPage: React.FC = () => {
  const {signup} = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup(name, email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface-container-high/90 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-outline mb-3">DocChat SaaS</p>
          <h1 className="text-3xl font-headline italic text-white">Create your account</h1>
          <p className="text-sm text-on-surface-variant mt-2">Start your secure, isolated document workspace.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-on-surface-variant mb-2">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-white outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-on-surface-variant mb-2">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-white outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-on-surface-variant mb-2">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" type="password" className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-white outline-none focus:border-primary" />
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

          <button disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-on-surface-variant">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
