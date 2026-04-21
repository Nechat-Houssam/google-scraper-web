export interface ListItem {
  id: string
  content: string
  type: 'location' | 'keyword'
  items?: string[]
}

export interface ScanJob {
  id: string
  user_id: string
  batch_id: string | null
  status: 'pending' | 'running' | 'done' | 'failed'
  payload: { locations: string[]; keywords: string[] }
  created_at: string
  started_at: string | null
  finished_at: string | null
  error: string | null
  scraper_batches?: { name: string } | null
}

export interface Ranking {
  id: string
  date: string | null
  heure: string | null
  ville: string | null
  keyword: string | null
  nom: string | null
  position: number | null
  job_id: string | null
}
