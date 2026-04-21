'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ServerCog } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { Ranking, ScanJob } from '@/types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const POSITION_COLOR = (pos: number | null) => {
  if (!pos) return 'text-gray-400'
  if (pos <= 3)  return 'text-green-600 font-black'
  if (pos <= 10) return 'text-blue-600 font-bold'
  return 'text-gray-600'
}

export default function JobResultsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<ScanJob | null>(null)
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return

    Promise.all([
      supabase.from('scan_jobs').select('*, scraper_batches(name)').eq('id', jobId).single(),
      supabase.from('rankings').select('*').eq('job_id', jobId).order('position', { ascending: true }),
    ]).then(([jobRes, rankRes]) => {
      setJob(jobRes.data as ScanJob)
      setRankings((rankRes.data as Ranking[]) ?? [])
      setLoading(false)
    })
  }, [jobId])

  const batchName = job?.scraper_batches?.name ?? 'Scan manuel'

  return (
    <AuthGuard>
      <main className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen font-sans text-gray-900">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/history" className="p-2 rounded-xl hover:bg-gray-200 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <ServerCog className="text-blue-600 w-7 h-7" />
            <h1 className="text-2xl font-black">{batchName}</h1>
          </div>
        </div>

        {job && (
          <p className="text-sm text-gray-400 mb-8 ml-14">
            Lancé le {formatDate(job.created_at)} · {rankings.length} résultat{rankings.length > 1 ? 's' : ''}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full bg-blue-600 animate-pulse" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-bold">Aucun résultat pour ce scan.</p>
            {job?.status === 'failed' && (
              <p className="text-sm text-red-400 mt-2">{job.error}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Entreprise</th>
                  <th className="px-5 py-3 text-left">Ville</th>
                  <th className="px-5 py-3 text-left">Mot-clé</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Heure</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-gray-50/40'
                    }`}
                  >
                    <td className={`px-5 py-3 tabular-nums ${POSITION_COLOR(r.position)}`}>
                      {r.position ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {r.nom ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r.ville ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{r.keyword ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{r.date ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{r.heure ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AuthGuard>
  )
}
