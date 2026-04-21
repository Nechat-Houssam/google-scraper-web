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

export interface ScraperBatch {
  id: string
  name: string
  config: {
    locationGroups: { id: string; content: string }[]
    keywordGroups:  { id: string; content: string }[]
  }
  schedule_type: 'daily' | 'weekly' | 'manual'
  is_active: boolean
  created_at: string
  last_run_at: string | null
  next_run_at: string | null
  user_id: string | null
}
