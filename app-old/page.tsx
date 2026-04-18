"use client"

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, X, Plus, Play, ServerCog, Database, AlignLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURATION & TYPES ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ListItem {
  id: string
  content: string
  type: 'location' | 'keyword'
}

export default function Home() {
  // --- ÉTATS ---
  const [isMounted, setIsMounted] = useState(false)
  
  // Bibliothèque séparée
  const [availableLocGroups, setAvailableLocGroups] = useState<ListItem[]>([])
  const [availableKwGroups, setAvailableKwGroups] = useState<ListItem[]>([])
  
  // Listes cibles
  const [locations, setLocations] = useState<ListItem[]>([])
  const [keywords, setKeywords] = useState<ListItem[]>([])
  
  // Inputs manuels
  const [manualLoc, setManualLoc] = useState('')
  const [manualKw, setManualKw] = useState('')
  

// 🚀 NOUVEAU : On remplace le texte brut par une liste de tags et un input
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'location' | 'keyword'>('location')
  const [newGroupTags, setNewGroupTags] = useState<string[]>([]) // Les boîtes cristallisées
  const [tagInput, setTagInput] = useState('') // Le texte en train d'être tapé

  // Statuts système
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("Connexion...")
  const [draggingType, setDraggingType] = useState<string | null>(null)

  // --- INITIALISATION ---
  useEffect(() => {
    setIsMounted(true)
    fetchInitialGroups()
  }, [])

  const fetchInitialGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      if (data) {
        const locGroups = data.filter(g => g.type === 'location').map(g => ({
          id: `group:${g.slug}`,
          content: `📍 ${g.name}`,
          type: 'location' as const
        }))
        
        const kwGroups = data.filter(g => g.type === 'keyword').map(g => ({
          id: `group:${g.slug}`,
          content: `🔑 ${g.name}`,
          type: 'keyword' as const
        }))

        setAvailableLocGroups(locGroups)
        setAvailableKwGroups(kwGroups)
        setStatus("Prêt.")
      }
    } catch (err) {
      setStatus("❌ Erreur Supabase")
    }
  }

// --- CRÉATION DE GROUPE ---
  const createGroup = async () => {
    // 🚀 On vérifie le tableau newGroupTags au lieu du texte
    if (!newGroupName.trim() || newGroupTags.length === 0) {
      setStatus("❌ Il faut un nom ET au moins une valeur pour créer un groupe.")
      return
    }

    setStatus("⏳ Création du groupe et insertion des données...")

    const slug = newGroupName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newGroup = {
      name: newGroupName.trim(),
      type: newGroupType,
      slug: slug
    }

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([newGroup])
        .select()

      if (groupError) throw groupError

      if (groupData && groupData.length > 0) {
        const groupId = groupData[0].id

        // 🚀 On utilise directement notre tableau de boîtes
        const insertPayload = newGroupTags.map(val => ({
          group_id: groupId,
          value: val
        }))

        const { error: itemsError } = await supabase
          .from('group_items')
          .insert(insertPayload)

        if (itemsError) throw itemsError

        const formattedItem: ListItem = {
          id: `group:${groupData[0].slug}`,
          content: `${groupData[0].type === 'location' ? '📍' : '🔑'} ${groupData[0].name}`,
          type: groupData[0].type as 'location' | 'keyword',
          items: newGroupTags // 👈 On passe directement les tags ici pour l'affichage en gris !
        }

        if (newGroupType === 'location') {
          setAvailableLocGroups(prev => [...prev, formattedItem].sort((a, b) => a.content.localeCompare(b.content)))
        } else {
          setAvailableKwGroups(prev => [...prev, formattedItem].sort((a, b) => a.content.localeCompare(b.content)))
        }

        // On vide tout le formulaire
        setNewGroupName('')
        setNewGroupTags([]) // 👈 On vide les boîtes
        setTagInput('')
        setStatus(`✅ Groupe "${newGroupName}" créé avec ${newGroupTags.length} éléments.`)
      }
    } catch (err) {
      console.error(err)
      setStatus("❌ Erreur lors de la création du groupe et de ses éléments.")
    }
  }

  // --- GESTION DU DRAG & DROP ---
  const handleDragStart = (start: any) => {
    const allItems = [...availableLocGroups, ...availableKwGroups, ...locations, ...keywords]
    const draggedItem = allItems.find(i => i.id === start.draggableId)
    if (draggedItem) setDraggingType(draggedItem.type)
  }

  const handleDragEnd = (result: DropResult) => {
    setDraggingType(null)
    const { source, destination } = result
    if (!destination) return

    let item: ListItem | undefined
    if (source.droppableId === 'available-locations') {
      const copy = [...availableLocGroups]; [item] = copy.splice(source.index, 1); setAvailableLocGroups(copy)
    } else if (source.droppableId === 'available-keywords') {
      const copy = [...availableKwGroups]; [item] = copy.splice(source.index, 1); setAvailableKwGroups(copy)
    } else if (source.droppableId === 'locations') {
      const copy = [...locations]; [item] = copy.splice(source.index, 1); setLocations(copy)
    } else if (source.droppableId === 'keywords') {
      const copy = [...keywords]; [item] = copy.splice(source.index, 1); setKeywords(copy)
    }

    if (!item) return

    if (destination.droppableId === 'locations') {
      const copy = [...locations]; copy.splice(destination.index, 0, item); setLocations(copy)
    } else if (destination.droppableId === 'keywords') {
      const copy = [...keywords]; copy.splice(destination.index, 0, item); setKeywords(copy)
    }
  }

  // --- LOGIQUE D'AJOUT & SUPPRESSION MANUELLE ---
  const addManualItem = (type: 'location' | 'keyword') => {
    const val = type === 'location' ? manualLoc : manualKw
    if (!val.trim()) return

    const newItem: ListItem = { id: val.trim(), content: val.trim(), type }
    if (type === 'location') {
      setLocations([...locations, newItem]); setManualLoc('')
    } else {
      setKeywords([...keywords, newItem]); setManualKw('')
    }
  }

  const removeItem = (id: string, listType: 'locations' | 'keywords') => {
    const currentList = listType === 'locations' ? locations : keywords
    const setList = listType === 'locations' ? setLocations : setKeywords
    const item = currentList.find(i => i.id === id)

    if (item) {
      if (id.startsWith('group:')) {
        if (item.type === 'location') {
          setAvailableLocGroups(prev => [...prev, item])
        } else {
          setAvailableKwGroups(prev => [...prev, item])
        }
      }
      setList(prev => prev.filter(i => i.id !== id))
    }
  }

  // --- ACTIONS API (BOT PYTHON) ---
  const handleScanAction = async (action: 'start' | 'stop') => {
    if (action === 'start') {
      if (!locations.length || !keywords.length) return setStatus("❌ Sélection incomplète")
      setLoading(true)
      setStatus("🚀 Envoi au bot...")

      try {
        const res = await fetch("http://localhost:8000/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: locations.map(l => l.id), keywords: keywords.map(k => k.id) })
        })
        const data = await res.json()
        setStatus(res.ok ? `✅ ${data.message}` : "❌ Erreur Worker")
      } catch { setStatus("❌ Erreur de connexion") }
      finally { setLoading(false) }
    } else {
      try {
        await fetch("http://localhost:8000/api/scan/stop", { method: "POST" })
        setStatus("🛑 Arrêt demandé...")
      } catch { setStatus("❌ Erreur d'arrêt") }
    }
  }

  // --- SOUS-COMPOSANT DE RENDU DRAG & DROP ---
  const RenderDraggableItem = ({ item, index, color, onRemove }: { item: ListItem, index: number, color: string, onRemove?: () => void }) => (
    <Draggable key={item.id} draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border-2 p-4 rounded-xl shadow-sm mb-3 flex items-center justify-between transition-all ${color} ${snapshot.isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}`}
          >
            <div className="flex items-center gap-3">
              <GripVertical size={18} className="text-gray-300" />
              <span className="font-bold text-gray-700">{item.content}</span>
            </div>
            {onRemove && (
              <button onClick={onRemove} className="text-gray-300 hover:text-red-500"><X size={20} /></button>
            )}
          </div>
          {snapshot.isDragging && !onRemove && (
            <div className="bg-gray-100/50 p-4 rounded-xl border border-dashed border-gray-300 mb-3">
              <span className="font-semibold text-gray-400">{item.content}</span>
            </div>
          )}
        </>
      )}
    </Draggable>
  )

  // --- GESTION DU SYSTÈME DE TAGS ---
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault() // Empêche de recharger la page par erreur
        const val = tagInput.trim()
        if (val && !newGroupTags.includes(val)) {
          setNewGroupTags([...newGroupTags, val])
        }
        setTagInput('') // On vide l'input après avoir créé la boîte
      }
    }

    const handleTagPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const paste = e.clipboardData.getData('text')
      // On découpe la liste collée et on enlève les doublons
      const words = paste.split(/[\n,]+/).map(w => w.trim()).filter(w => w !== '')
      const uniqueWords = words.filter(w => !newGroupTags.includes(w))
      
      if (uniqueWords.length > 0) {
        setNewGroupTags([...newGroupTags, ...uniqueWords])
      }
    }

    const removeTag = (tagToRemove: string) => {
      setNewGroupTags(newGroupTags.filter(tag => tag !== tagToRemove))
    }

  if (!isMounted) return null

  return (
    <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans text-gray-900">
      
      {/* HEADER & CONTROLES */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3 text-gray-900"><ServerCog className="text-blue-600 w-10 h-10" />Tracker Studio</h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1"><Database size={16} /> Supabase Live Data</p>
        </div>
        
        <button 
          onClick={() => handleScanAction(loading ? 'stop' : 'start')}
          className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 ${loading ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {loading ? <><X size={24}/> ANNULER</> : <><Play fill="currentColor"/> LANCER LE SCAN</>}
        </button>
      </header>

      {/* BARRE DE STATUT */}
      <div className="bg-white border-l-4 border-blue-500 p-4 rounded-xl shadow-sm mb-10 font-mono text-sm flex items-center gap-4">
        <div className={`h-3 w-3 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-green-500'}`} />
        <span className="text-gray-500 italic">SYSTEM_STATUS:</span>
        <span className="font-bold text-gray-800">{status}</span>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* COLONNE 1 : BIBLIOTHÈQUE & CRÉATION */}
          <section className="flex flex-col gap-6">
            
            {/* 🚀 NOUVEAU FORMULAIRE DE CRÉATION DE GROUPE */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">🆕 Créer un Groupe</h2>
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <select 
                    value={newGroupType}
                    onChange={e => setNewGroupType(e.target.value as 'location' | 'keyword')}
                    className="w-1/3 bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="location">📍 Ville</option>
                    <option value="keyword">🔑 Mot-clé</option>
                  </select>
                  <input 
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="Nom du groupe..."
                    className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>


                <div className="flex flex-col gap-2">
                  
                  {/* Zone d'affichage des boîtes cristallisées */}
                  {newGroupTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100 max-h-32 overflow-y-auto">
                      {newGroupTags.map(tag => (
                        <div key={tag} className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-gray-700 animate-in fade-in zoom-in duration-200">
                          {tag}
                          <button 
                            onClick={() => removeTag(tag)} 
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* L'input qui gère la frappe et le collage */}
                  <input 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onPaste={handleTagPaste}
                    placeholder="Tapez un mot et appuyez sur Entrée..."
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                
                <button 
                  onClick={createGroup}
                  className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 font-bold"
                >
                  <Plus size={18} /> Enregistrer le groupe
                </button>
              </div>
            </div>

            <hr className="border-gray-200 mx-4" />

            {/* Boîte 1 : Groupes de Villes */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 px-2 flex items-center gap-2">📍 Groupes Villes</h2>
              <Droppable droppableId="available-locations" isDropDisabled={true}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl p-5 min-h-[200px]">
                    {availableLocGroups.map((item, index) => (
                      <RenderDraggableItem key={item.id} item={item} index={index} color="border-orange-100" />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Boîte 2 : Groupes de Mots-Clés */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-500 px-2 flex items-center gap-2">🔑 Groupes Mots-clés</h2>
              <Droppable droppableId="available-keywords" isDropDisabled={true}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-3xl p-5 min-h-[200px]">
                    {availableKwGroups.map((item, index) => (
                      <RenderDraggableItem key={item.id} item={item} index={index} color="border-blue-100" />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          </section>

          {/* COLONNE 2 : VILLES CIBLES */}
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-orange-600 px-2">🎯 Villes Cibles</h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm">
              <input 
                value={manualLoc} 
                onChange={e => setManualLoc(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && addManualItem('location')} 
                placeholder="Ajouter ville..." 
                className="flex-1 p-3 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400" 
              />
              <button onClick={() => addManualItem('location')} className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors"><Plus /></button>
            </div>
            <Droppable droppableId="locations" isDropDisabled={draggingType !== 'location'}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/50 border-2 border-orange-100 rounded-3xl p-5 min-h-[600px]">
                  {locations.map((item, index) => (
                    <RenderDraggableItem key={item.id} item={item} index={index} color="border-orange-200" onRemove={() => removeItem(item.id, 'locations')} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </section>

          {/* COLONNE 3 : MOTS-CLÉS CIBLES */}
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-blue-600 px-2">🎯 Mots-Clés Cibles</h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm">
              <input 
                value={manualKw} 
                onChange={e => setManualKw(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && addManualItem('keyword')} 
                placeholder="Ajouter mot..." 
                className="flex-1 p-3 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400" 
              />
              <button onClick={() => addManualItem('keyword')} className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors"><Plus /></button>
            </div>
            <Droppable droppableId="keywords" isDropDisabled={draggingType !== 'keyword'}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="bg-blue-50/50 border-2 border-blue-100 rounded-3xl p-5 min-h-[600px]">
                  {keywords.map((item, index) => (
                    <RenderDraggableItem key={item.id} item={item} index={index} color="border-blue-200" onRemove={() => removeItem(item.id, 'keywords')} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </section>

        </div>
      </DragDropContext>
    </main>
  )
}