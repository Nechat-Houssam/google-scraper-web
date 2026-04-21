import { useState } from 'react'
import { ListItem } from '@/types'
import { apiClient } from '@/services/api.client'
import { useAuth } from '@/context/AuthContext'

const POLL_INTERVAL = 3000

export const useScan = (setStatus: (msg: string) => void) => {
  const [loading, setLoading] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const { user } = useAuth()

  const pollJob = async (jobId: string): Promise<void> => {
    try {
      const job = await apiClient.getJob(jobId)

      if (job.status === 'pending') {
        setStatus('⏳ Job en attente dans la queue...')
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
        return pollJob(jobId)
      }
      if (job.status === 'running') {
        setStatus('🔄 Scan en cours...')
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
        return pollJob(jobId)
      }
      if (job.status === 'done') {
        setStatus('✅ Scan terminé avec succès.')
      } else if (job.status === 'failed') {
        setStatus(`❌ Scan échoué : ${job.error || 'erreur inconnue'}`)
      }
    } catch {
      setStatus('❌ Impossible de joindre le serveur.')
    } finally {
      setLoading(false)
      setCurrentJobId(null)
    }
  }

  const handleScanAction = async (
    action: 'start' | 'stop',
    locations: ListItem[],
    keywords: ListItem[]
  ) => {
    if (action === 'start') {
      if (!locations.length || !keywords.length) {
        setStatus('❌ Sélection incomplète')
        return
      }
      if (!user) {
        setStatus('❌ Non connecté.')
        return
      }
      setLoading(true)
      setStatus('🚀 Envoi au bot...')
      try {
        const data = await apiClient.startScan(locations, keywords, user.id)
        if (data.job_id) {
          setCurrentJobId(data.job_id)
          setStatus('⏳ Job créé — en attente du worker...')
          pollJob(data.job_id)
        } else {
          setStatus('❌ Erreur lors de la création du job.')
          setLoading(false)
        }
      } catch {
        setStatus('❌ Erreur de connexion au serveur.')
        setLoading(false)
      }
    } else {
      setStatus("🛑 Demande d'arrêt envoyée...")
      try {
        await apiClient.stopScan()
      } catch {
        setStatus('❌ Impossible de joindre le bot.')
      }
    }
  }

  return { loading, currentJobId, handleScanAction }
}
