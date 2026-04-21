'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader, ServerCog } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { ScanJob } from '@/types'

const STATUS_CONFIG = {
  pending:  { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  running:  { label: 'En cours',   color: 'bg-blue-100 text-blue-700',    icon: Loader },
  done:     { label: 'Terminé',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  failed:   { label: 'Échoué',     color: 'bg-red-100 text-red-700',      icon: XCircle },
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<ScanJob[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase
      .from('scan_jobs')
      .select('*, scraper_batches(name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setJobs((data as ScanJob[]) ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <AuthGuard>
      <main className="p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen font-sans text-gray-900">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-200 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <ServerCog className="text-blue-600 w-7 h-7" />
            <h1 className="text-2xl font-black">Historique des scans</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full bg-blue-600 animate-pulse" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-bold">Aucun scan lancé.</p>
            <p className="text-sm mt-1">Configurez un scan depuis l&apos;interface principale.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending
              const Icon = cfg.icon
              const batchName = job.scraper_batches?.name ?? 'Scan manuel'
              const locs = job.payload?.locations?.length ?? 0
              const kws = job.payload?.keywords?.length ?? 0

              return (
                <button
                  key={job.id}
                  onClick={() => router.push(`/history/${job.id}`)}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="font-bold text-gray-900 truncate">{batchName}</span>
                    <span className="text-xs text-gray-400">
                      {locs} ville{locs > 1 ? 's' : ''} · {kws} mot{kws > 1 ? 's' : ''}-clé{kws > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(job.created_at)}</span>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${cfg.color}`}>
                    <Icon size={13} />
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </AuthGuard>
  )
}
