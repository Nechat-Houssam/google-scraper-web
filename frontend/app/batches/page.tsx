'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot, Play, Trash2, Hand, Clock, CalendarDays, ToggleLeft, ToggleRight, Plus, X } from 'lucide-react'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { batchService } from '@/services/batch.service'
import { groupService } from '@/services/group.service'
import { apiClient } from '@/services/api.client'
import { useAuth } from '@/context/AuthContext'
import { ScraperBatch, ListItem } from '@/types'

const SCHEDULE_OPTIONS = [
  { value: 'manual',  label: 'Manuel',       Icon: Hand,         bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700',   desc: 'Lancement à la demande' },
  { value: 'daily',   label: 'Quotidien',    Icon: Clock,        bg: 'bg-green-50',  border: 'border-green-400',  text: 'text-green-700',  desc: 'Tous les jours à 02h00' },
  { value: 'weekly',  label: 'Hebdomadaire', Icon: CalendarDays, bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', desc: 'Chaque lundi à 02h00' },
]

const BADGE = {
  manual:  { label: 'Manuel',       cls: 'bg-blue-100 text-blue-700' },
  daily:   { label: 'Quotidien',    cls: 'bg-green-100 text-green-700' },
  weekly:  { label: 'Hebdomadaire', cls: 'bg-violet-100 text-violet-700' },
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function BatchesPage() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<ScraperBatch[]>([])
  const [locGroups, setLocGroups] = useState<ListItem[]>([])
  const [kwGroups, setKwGroups] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [triggering, setTriggering] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [selectedLocs, setSelectedLocs] = useState<string[]>([])
  const [selectedKws, setSelectedKws] = useState<string[]>([])
  const [schedule, setSchedule] = useState('manual')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      batchService.getBatches(),
      groupService.getGroups('location'),
      groupService.getGroups('keyword'),
    ]).then(([b, lg, kg]) => {
      setBatches(b)
      setLocGroups(lg)
      setKwGroups(kg)
      setLoading(false)
    })
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const locs = locGroups.filter(g => selectedLocs.includes(g.id))
      const kws  = kwGroups.filter(g => selectedKws.includes(g.id))
      await batchService.saveBatch(name, locs, kws, schedule)
      const updated = await batchService.getBatches()
      setBatches(updated)
      setName(''); setSelectedLocs([]); setSelectedKws([]); setSchedule('manual')
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await batchService.deleteBatch(id)
    setBatches(b => b.filter(x => x.id !== id))
  }

  const handleToggle = async (batch: ScraperBatch) => {
    await batchService.toggleActive(batch.id, !batch.is_active)
    setBatches(b => b.map(x => x.id === batch.id ? { ...x, is_active: !x.is_active } : x))
  }

  const handleTrigger = async (batch: ScraperBatch) => {
    if (!user || triggering) return
    setTriggering(batch.id)
    try {
      const locs = (batch.config?.locationGroups ?? []).map(g => ({ id: g.id }))
      const kws  = (batch.config?.keywordGroups ?? []).map(g => ({ id: g.id }))
      await apiClient.startScan(locs, kws, user.id, batch.id)
    } finally { setTriggering(null) }
  }

  const toggle = (id: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  return (
    <AuthGuard>
      <main className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen font-sans text-gray-900">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-xl hover:bg-gray-200 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <Bot className="text-violet-600 w-7 h-7" />
              <h1 className="text-2xl font-black">Planification</h1>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg"
          >
            {showForm ? <><X size={16} /> Annuler</> : <><Plus size={16} /> Nouveau batch</>}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="font-black text-lg mb-5">Configurer un batch</h2>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 outline-none shadow-inner mb-5 font-medium"
              placeholder="Nom du batch..."
            />

            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fréquence</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {SCHEDULE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSchedule(opt.value)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    schedule === opt.value
                      ? `${opt.bg} ${opt.border} ${opt.text}`
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <opt.Icon size={20} className="mb-2" />
                  <p className="font-black text-sm">{opt.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Groupes de villes</p>
                <div className="flex flex-wrap gap-2">
                  {locGroups.length === 0 && <span className="text-xs text-gray-400">Aucun groupe</span>}
                  {locGroups.map(g => (
                    <button key={g.id} onClick={() => toggle(g.id, selectedLocs, setSelectedLocs)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedLocs.includes(g.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {g.content}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Groupes de mots-clés</p>
                <div className="flex flex-wrap gap-2">
                  {kwGroups.length === 0 && <span className="text-xs text-gray-400">Aucun groupe</span>}
                  {kwGroups.map(g => (
                    <button key={g.id} onClick={() => toggle(g.id, selectedKws, setSelectedKws)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedKws.includes(g.id) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {g.content}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || !name.trim() || (selectedLocs.length === 0 && selectedKws.length === 0)}
              className="w-full py-4 rounded-2xl bg-violet-600 text-white font-black text-base hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {saving ? 'Enregistrement...' : 'Créer le batch'}
            </button>
          </div>
        )}

        {/* Batches */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full bg-violet-600 animate-pulse" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Bot size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Aucun batch configuré.</p>
            <p className="text-sm mt-1">Créez votre premier batch pour planifier des scans automatiques.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map(batch => {
              const badge = BADGE[batch.schedule_type] ?? BADGE.manual
              const locs = batch.config?.locationGroups?.length ?? 0
              const kws  = batch.config?.keywordGroups?.length ?? 0

              return (
                <div key={batch.id} className={`bg-white border rounded-3xl p-5 shadow-sm transition-all ${batch.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 truncate">{batch.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {locs} groupe{locs > 1 ? 's' : ''} ville · {kws} groupe{kws > 1 ? 's' : ''} mot-clé
                      </p>
                    </div>
                    <span className={`ml-3 shrink-0 px-3 py-1 rounded-xl text-xs font-black ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-400 mb-4">
                    {batch.last_run_at && (
                      <span>Dernier : <span className="text-gray-600 font-medium">{formatDate(batch.last_run_at)}</span></span>
                    )}
                    {batch.schedule_type !== 'manual' && batch.next_run_at && (
                      <span>Prochain : <span className="text-violet-600 font-medium">{formatDate(batch.next_run_at)}</span></span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrigger(batch)}
                      disabled={triggering === batch.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      <Play size={12} fill="currentColor" />
                      {triggering === batch.id ? 'Envoi...' : 'Lancer'}
                    </button>

                    <button
                      onClick={() => handleToggle(batch)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 transition-all"
                    >
                      {batch.is_active
                        ? <><ToggleRight size={14} className="text-green-500" /> Actif</>
                        : <><ToggleLeft size={14} /> Inactif</>
                      }
                    </button>

                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="ml-auto p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </AuthGuard>
  )
}
