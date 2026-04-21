'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServerCog } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error)
        setLoading(false)
      } else {
        router.replace('/')
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
        setLoading(false)
      } else {
        setSuccess('Compte créé. Vérifiez votre email pour confirmer.')
        setLoading(false)
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <ServerCog className="text-blue-600 w-8 h-8" />
          <h1 className="text-2xl font-black text-gray-900">Tracker Studio</h1>
        </div>

        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="vous@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </main>
  )
}
