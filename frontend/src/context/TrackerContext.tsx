import React, { createContext, useContext, useState, useEffect } from 'react'
import { ListItem } from '@/types'
import { supabase } from '@/lib/supabase'
import { useScan } from '@/hooks/useScan'

interface TrackerContextType {
  locations: ListItem[]
  keywords: ListItem[]
  availableLocGroups: ListItem[]
  availableKwGroups: ListItem[]
  status: string
  loading: boolean
  currentJobId: string | null
  setLocations: React.Dispatch<React.SetStateAction<ListItem[]>>
  setKeywords: React.Dispatch<React.SetStateAction<ListItem[]>>
  setAvailableLocGroups: React.Dispatch<React.SetStateAction<ListItem[]>>
  setAvailableKwGroups: React.Dispatch<React.SetStateAction<ListItem[]>>
  setStatus: (msg: string) => void
  refreshLibrary: () => Promise<void>
  addManualItem: (type: 'location' | 'keyword', val: string) => void
  handleScanAction: (action: 'start' | 'stop') => Promise<void>
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined)

export const TrackerProvider = ({ children }: { children: React.ReactNode }) => {
  const [locations, setLocations] = useState<ListItem[]>([])
  const [keywords, setKeywords] = useState<ListItem[]>([])
  const [availableLocGroups, setAvailableLocGroups] = useState<ListItem[]>([])
  const [availableKwGroups, setAvailableKwGroups] = useState<ListItem[]>([])
  const [status, setStatus] = useState('Prêt.')

  const { loading, currentJobId, handleScanAction: scan } = useScan(setStatus)

  const refreshLibrary = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_items(value)')
      .order('name', { ascending: true })

    if (data) {
      const format = (type: string): ListItem[] =>
        data.filter(g => g.type === type).map(g => ({
          id: `group:${g.slug}`,
          content: (type === 'location' ? '📍 ' : '🔑 ') + g.name,
          type: type as 'location' | 'keyword',
          items: g.group_items?.map((i: { value: string }) => i.value) || []
        }))
      setAvailableLocGroups(format('location'))
      setAvailableKwGroups(format('keyword'))
    }
  }

  useEffect(() => { refreshLibrary() }, [])

  const addManualItem = (type: 'location' | 'keyword', val: string) => {
    if (!val.trim()) return
    const newItem: ListItem = { id: val.trim(), content: val.trim(), type }
    type === 'location' ? setLocations(p => [...p, newItem]) : setKeywords(p => [...p, newItem])
  }

  const handleScanAction = (action: 'start' | 'stop') =>
    scan(action, locations, keywords)

  return (
    <TrackerContext.Provider value={{
      locations, keywords, availableLocGroups, availableKwGroups,
      status, loading, currentJobId,
      setLocations, setKeywords, setAvailableLocGroups, setAvailableKwGroups,
      setStatus, refreshLibrary, addManualItem, handleScanAction
    }}>
      {children}
    </TrackerContext.Provider>
  )
}

export const useTracker = () => {
  const context = useContext(TrackerContext)
  if (!context) throw new Error('useTracker must be used within TrackerProvider')
  return context
}
