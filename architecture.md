# Architecture — Tracker Studio

Google Maps rank tracker permettant de suivre le positionnement d'entreprises sur des mots-clés, pour plusieurs villes, de façon automatisée.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  React 19 + Tailwind CSS + Drag & Drop + Supabase client    │
│                      localhost:3000                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST
                           │ POST /api/scan
                           │ POST /api/scan/stop
┌──────────────────────────▼──────────────────────────────────┐
│                      BACKEND (FastAPI)                       │
│         Python + Playwright + Supabase client                │
│                      localhost:8000                          │
└──────┬──────────────────────────────────────┬───────────────┘
       │                                      │
       │ SELECT / INSERT                      │ GET /search
┌──────▼──────────┐                 ┌─────────▼──────────────┐
│  Supabase (DB)  │                 │  OpenStreetMap (Geo)   │
│  PostgreSQL     │                 │  Nominatim API         │
└─────────────────┘                 └────────────────────────┘
       ↑
       │ Browser Automation (Playwright → Chromium)
┌──────┴──────────────────────────────────────────────────────┐
│                  Google Maps (target)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Structure du projet

```
webver/
├── frontend/                   # Next.js 16 — interface utilisateur
│   ├── app/
│   │   ├── layout.tsx          # Layout racine
│   │   └── page.tsx            # Page principale (client component)
│   └── src/
│       ├── components/
│       │   ├── features/
│       │   │   ├── DragBoard.tsx        # Orchestrateur drag & drop
│       │   │   ├── GroupCreator.tsx     # Création de groupes
│       │   │   ├── BatchPlanner.tsx     # Planification de batchs
│       │   │   ├── LibraryColumn.tsx    # Bibliothèque de groupes
│       │   │   └── TargetColumn.tsx     # Colonnes cibles (villes / mots-clés)
│       │   ├── layout/
│       │   │   ├── Header.tsx           # Bouton start/stop + titre
│       │   │   └── StatusBar.tsx        # Statut en temps réel
│       │   └── ui/
│       │       ├── DraggableItem.tsx
│       │       ├── ActionCard.tsx
│       │       └── StrictModeDroppable.tsx
│       ├── context/
│       │   └── TrackerContext.tsx       # State global (React Context)
│       ├── hooks/
│       │   └── useScan.ts               # Déclenchement du scan
│       ├── services/
│       │   ├── api.client.ts            # Appels backend
│       │   ├── group.service.ts         # CRUD groupes → Supabase
│       │   └── batch.service.ts         # Sauvegarde batchs → Supabase
│       ├── lib/
│       │   └── supabase.ts              # Client Supabase (singleton)
│       └── types/
│           ├── index.ts                 # Interfaces TypeScript
│           └── supabase.ts              # Types générés automatiquement
│
└── backend/                    # FastAPI — moteur de scraping
    ├── main.py                  # Routes API + config CORS
    ├── config.py                # Variables d'environnement
    ├── engine/
    │   ├── scraper.py           # Scraper Playwright (Google Maps)
    │   └── scan_engine.py       # Orchestrateur multi-villes / mots-clés
    └── services/
        ├── database.py          # Client Supabase + résolution d'entités
        └── geo.py               # Géocodage (OpenStreetMap)
```

---

## Frontend

### Stack
- **Framework** : Next.js 16.2 / React 19
- **Langage** : TypeScript 5
- **Style** : Tailwind CSS 4
- **Drag & Drop** : `@hello-pangea/dnd`
- **Base de données** : `@supabase/supabase-js` (accès direct depuis le frontend pour la gestion des groupes)

### State management

State global via React Context (`TrackerContext`) — pas de Redux ni Zustand.

| Propriété | Type | Rôle |
|---|---|---|
| `locations` | `ListItem[]` | Villes sélectionnées pour le scan |
| `keywords` | `ListItem[]` | Mots-clés sélectionnés |
| `availableLocGroups` | `Group[]` | Groupes de villes en bibliothèque |
| `availableKwGroups` | `Group[]` | Groupes de mots-clés en bibliothèque |
| `status` | `string` | Message de statut affiché |
| `loading` | `boolean` | Scan en cours |

### Hiérarchie des composants

```
page.tsx
└── TrackerProvider
    ├── Header              → Bouton LANCER / ANNULER LE SCAN
    ├── StatusBar           → Affichage statut + dot animé
    └── DragBoard           → DragDropContext principal
        ├── GroupCreator    → Formulaire création de groupe
        ├── BatchPlanner    → Formulaire planification
        ├── LibraryColumn   → Groupes disponibles (drag source)
        ├── TargetColumn    → Villes cibles (drop zone)
        └── TargetColumn    → Mots-clés cibles (drop zone)
```

### Drag & Drop

Quatre zones droppables :

| ID | Contenu | Accepte |
|---|---|---|
| `available-locations` | Groupes de villes | — (source uniquement) |
| `available-keywords` | Groupes de mots-clés | — (source uniquement) |
| `locations` | Villes sélectionnées | items `location` |
| `keywords` | Mots-clés sélectionnés | items `keyword` |

Une vérification de type empêche de déposer un mot-clé dans une colonne de villes et vice versa.

---

## Backend

### Stack
- **Framework** : FastAPI (async)
- **Scraping** : Playwright (Chromium headless/headed)
- **Anti-détection** : `playwright-stealth` + User-Agent spoofé
- **Géocodage** : OpenStreetMap Nominatim
- **Base de données** : Supabase Python SDK

### Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/scan` | Lance un scan |
| `POST` | `/api/scan/stop` | Annule le scan en cours |

**Body `/api/scan`** :
```json
{
  "locations": ["Paris", "group:ile-de-france"],
  "keywords": ["plombier", "group:services-maison"]
}
```

Les références `"group:slug"` sont résolues par `database.resolve_entities()` avant de lancer le scan.

### Moteur de scan (`scan_engine.py`)

```
ScanEngine.run(locations, keywords)
│
├── Pour chaque ville :
│   ├── get_gps(ville)                    → lat / lon via OpenStreetMap
│   ├── create_localized_session(lat, lon) → navigateur Chromium géolocalisé
│   ├── handle_cookies()                  → acceptation bandeau RGPD
│   │
│   └── Pour chaque mot-clé :
│       ├── scrape_keyword(page, keyword, lat, lon, ville)
│       │   ├── URL : maps.google.com/search/{keyword}/@{lat},{lon},13z
│       │   ├── Scroll incrémental pour charger jusqu'à 20 résultats
│       │   └── Extraction : nom, position, date, heure, ville, keyword
│       └── Accumulation dans all_results
│
└── db_service.save_rankings(all_results)  → INSERT INTO rankings
```

L'annulation est gérée via un `asyncio.Event` vérifié à chaque itération.

### Scraper (`scraper.py`)

**Géolocalisation simulée** : le navigateur est lancé avec les coordonnées GPS de la ville cible, simulant un utilisateur local — ce qui influence les résultats Google Maps.

**Extraction des résultats** :
- Conteneur : `div[role="feed"]`
- Éléments : `div.qBF1Pd`
- Arrêt : TARGET_RESULTS atteint (20) ou 3 scrolls consécutifs sans nouveaux résultats

---

## Base de données (Supabase PostgreSQL)

### Schéma

```
groups
  id          UUID PK
  name        VARCHAR
  slug        VARCHAR UNIQUE
  type        'location' | 'keyword'

group_items
  id          UUID PK
  group_id    UUID FK → groups.id
  value       VARCHAR

rankings
  id          UUID PK
  date        DATE
  heure       TIME
  ville       VARCHAR
  keyword     VARCHAR
  nom         VARCHAR      ← nom de l'entreprise
  position    INT          ← rang dans les résultats (1-20)

scraper_batches
  id              UUID PK
  name            VARCHAR
  config          JSONB     ← groupes de villes + mots-clés
  schedule_type   'daily' | 'weekly' | 'manual'
  is_active       BOOLEAN
  created_at      TIMESTAMP
  last_run_at     TIMESTAMP
  next_run_at     TIMESTAMP
```

### Accès

- **Frontend** → Supabase directement : `groups`, `group_items`, `scraper_batches` (clé publique anon)
- **Backend** → Supabase directement : résolution d'entités + insertion dans `rankings`

---

## Flux de données complet

```
1. Utilisateur configure un scan (drag & drop villes + mots-clés)
          ↓
2. Clic "LANCER LE SCAN" → Header.tsx → useScan.ts
          ↓
3. apiClient.startScan(locations, keywords)
   POST http://localhost:8000/api/scan
   { locations: ["Paris", "group:idf"], keywords: ["plombier"] }
          ↓
4. Backend : resolve_entities() → ["Paris", "Versailles", "Lyon", ...]
          ↓
5. ScanEngine.run() : pour chaque ville × mot-clé
   a. Géocodage OpenStreetMap
   b. Lancement Chromium avec geolocation spoofée
   c. Acceptation cookies Google
   d. Scraping Google Maps → positions 1-20
          ↓
6. save_rankings() → INSERT INTO rankings (Supabase)
          ↓
7. Réponse : { status: 'success', message: '... résultats enregistrés.' }
          ↓
8. Frontend : setStatus(message) → StatusBar affiche le résultat
```

---

## Variables d'environnement

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### Backend (`.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=sb_publishable_...
TARGET_RESULTS=20
HEADLESS=false
```

---

## Lancer le projet

```bash
# Backend
cd backend
pip install fastapi uvicorn playwright supabase python-dotenv requests playwright-stealth
playwright install chromium
python main.py          # → http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:3000
```

---

## Points d'amélioration identifiés

| Sujet | Situation actuelle | Recommandation |
|---|---|---|
| Authentification | Aucune | Implémenter Supabase Auth |
| Clé Supabase | Exposée côté frontend | Passer les opérations critiques côté backend |
| Mises à jour temps réel | Polling via retour API | WebSocket ou SSE pour le statut de scan |
| Scaling | Single server | Queue de jobs (Celery, ARQ) pour les scans longs |
| Planification | Sauvegardée mais non exécutée | Ajouter un scheduler (APScheduler, cron) |
| Internationalisation | UI en français en dur | Externaliser les chaînes si multi-langue |
