"use client"

import { useState, useEffect } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { useScanner } from '@/hooks/useScanner'
import { Header } from '@/components/layout/Header'
import { StatusBar } from '@/components/layout/StatusBar'
import { DragBoard } from '@/components/features/DragBoard'
// On garde tes imports utiles, mais on vire le DND ici
import { Play, ServerCog, Database, AlignLeft } from 'lucide-react'

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false)

  // Initialisation de ta logique métier via les hooks
  const { status, setStatus, loading, handleScanAction } = useScanner()
  const {
    availableLocGroups, setAvailableLocGroups,
    availableKwGroups, setAvailableKwGroups,
    locations, setLocations,
    keywords, setKeywords,
    addManualItem,
    removeItem
  } = useGroups(setStatus)

  // Sécurité indispensable pour Next.js (évite les erreurs d'hydratation)
  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return null

  return (
    <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Composant Header qui gère les boutons d'action */}
      <Header 
        loading={loading} 
        onScanAction={(action) => handleScanAction(action, locations, keywords)} 
      />

      {/* Barre de progression ou message d'état */}
      <StatusBar status={status} loading={loading} />
      
      {/* Nouveau plateau de jeu qui utilisera dnd-kit */}
      <DragBoard 
        availableLocGroups={availableLocGroups}
        setAvailableLocGroups={setAvailableLocGroups}
        availableKwGroups={availableKwGroups}
        setAvailableKwGroups={setAvailableKwGroups}
        locations={locations}
        setLocations={setLocations}
        keywords={keywords}
        setKeywords={setKeywords}
        addManualItem={addManualItem}
        removeItem={removeItem}
        setStatus={setStatus}
      />
    </main>
  )
}