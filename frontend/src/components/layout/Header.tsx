'use client'
import { Play, ServerCog, Database, X, History, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useTracker } from '@/context/TrackerContext'
import { useAuth } from '@/context/AuthContext'

export const Header = () => {
  const { loading, handleScanAction } = useTracker()
  const { user, signOut } = useAuth()

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
      <div>
        <h1 className="text-4xl font-black flex items-center gap-3 text-gray-900">
          <ServerCog className="text-blue-600 w-10 h-10" />Tracker Studio
        </h1>
        <p className="text-gray-500 flex items-center gap-2 mt-1 text-sm">
          <Database size={14} />
          {user?.email ?? 'Supabase Live Data'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/history"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all"
        >
          <History size={16} /> Historique
        </Link>

        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-500 hover:text-red-500 hover:border-red-200 transition-all"
          title="Déconnexion"
        >
          <LogOut size={16} />
        </button>

        <button
          onClick={() => handleScanAction(loading ? 'stop' : 'start')}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${
            loading ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {loading
            ? <><X size={20} /> ANNULER</>
            : <><Play size={18} fill="currentColor" /> LANCER LE SCAN</>
          }
        </button>
      </div>
    </header>
  )
}
