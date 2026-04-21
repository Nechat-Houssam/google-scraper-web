# Architecture — Tracker Studio

Google Maps rank tracker multi-utilisateur permettant de suivre le positionnement d'entreprises sur des mots-clés, pour plusieurs villes, de façon automatisée et planifiée.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js — Vercel)                     │
│  React 19 + Tailwind + Supabase Auth + job polling          │
│              https://ton-app.vercel.app                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST
                           │ POST /api/scan
                           │ GET  /api/jobs/{job_id}
                           │ POST /api/scan/stop
┌──────────────────────────▼──────────────────────────────────┐
│           NGINX (reverse proxy — port 80)                    │
│              http://178.104.244.100                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              BACKEND (FastAPI — Hetzner CX23)                │
│  Python + Playwright + worker_loop + scheduler_loop         │
│                      port 8000                               │
└──────┬──────────────────────────────────────┬───────────────┘
       │                                      │
       │ SELECT / INSERT (service_role)        │ GET /search
┌──────▼──────────┐                 ┌─────────▼──────────────┐
│  Supabase (DB)  │                 │  OpenStreetMap (Geo)   │
│  PostgreSQL+RLS │                 │  Nominatim API         │
└─────────────────┘                 └────────────────────────┘
       ↑
       │ Browser Automation (Playwright → Chromium headless)
┌──────┴──────────────────────────────────────────────────────┐
│                  Google Maps (target)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Infrastructure de déploiement

| Composant | Service | Coût |
|---|---|---|
| Frontend | Vercel (free tier) | 0 €/mois |
| Backend + Nginx | Hetzner CX23 (Ubuntu 24.04) | ~6 €/mois |
| Base de données | Supabase (free tier) | 0 €/mois |
| SSL | Non configuré (HTTP simple sur IP) | — |

Orchestration via **Docker Compose** : `backend` + `nginx` (pas de certbot sans domaine custom).

```
webver/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf          # reverse proxy HTTP → backend:8000
├── backend/
│   ├── Dockerfile           # FROM playwright/python:v1.52.0-jammy
│   └── .env                 # SUPABASE_KEY service_role + HEADLESS=true
└── setup.sh                 # script installation Docker sur VPS
```

---

## Structure du projet

```
webver/
├── frontend/                   # Next.js — interface utilisateur
│   ├── app/
│   │   ├── layout.tsx          # Wrappé avec AuthProvider
│   │   ├── page.tsx            # Wrappé avec AuthGuard + TrackerProvider
│   │   ├── login/
│   │   │   └── page.tsx        # Formulaire connexion / inscription
│   │   └── history/
│   │       ├── page.tsx        # Liste des scan_jobs (statut + date)
│   │       └── [jobId]/
│   │           └── page.tsx    # Tableau des rankings d'un job
│   └── src/
│       ├── components/
│       │   ├── features/
│       │   │   ├── DragBoard.tsx
│       │   │   ├── GroupCreator.tsx
│       │   │   ├── BatchPlanner.tsx
│       │   │   ├── LibraryColumn.tsx
│       │   │   └── TargetColumn.tsx
│       │   ├── layout/
│       │   │   ├── Header.tsx           # Start/Stop + History + Logout
│       │   │   ├── StatusBar.tsx
│       │   │   └── AuthGuard.tsx        # Redirection si non connecté
│       │   └── ui/
│       ├── context/
│       │   ├── TrackerContext.tsx       # State global + currentJobId
│       │   └── AuthContext.tsx          # Session Supabase Auth
│       ├── hooks/
│       │   └── useScan.ts               # Lance scan + pollJob() toutes les 3s
│       ├── services/
│       │   ├── api.client.ts            # startScan / stopScan / getJob
│       │   ├── group.service.ts
│       │   └── batch.service.ts
│       ├── lib/
│       │   └── supabase.ts
│       └── types/
│           └── index.ts                 # Group, Ranking, ScanJob
│
└── backend/                    # FastAPI — moteur de scraping
    ├── main.py                  # worker_loop + scheduler_loop + routes
    ├── config.py                # .env → SUPABASE_*, TARGET_RESULTS, FRONTEND_URL
    ├── requirements.txt
    ├── Dockerfile
    ├── engine/
    │   ├── scraper.py
    │   └── scan_engine.py       # run(locations, keywords, user_id, batch_id, job_id)
    └── services/
        ├── database.py          # job queue + scheduler + save_rankings
        └── geo.py
```

---

## Authentification & multi-utilisateur

- **Supabase Auth** — inscription / connexion email+password
- **RLS (Row Level Security)** activé sur toutes les tables : chaque utilisateur ne voit que ses données
- **Frontend** utilise la clé `anon` (RLS enforced automatiquement)
- **Backend** utilise la clé `service_role` (bypass RLS pour écriture des résultats)
- `AuthContext` expose `user`, `session`, `signIn`, `signUp`, `signOut`
- `AuthGuard` redirige vers `/login` si aucune session active

---

## Système de jobs (queue asynchrone)

Le backend ne lance plus les scans directement — tout passe par une queue DB.

```
POST /api/scan
    → crée un enregistrement scan_jobs (status: pending)
    → retourne { job_id }

worker_loop() — toutes les 10s
    → claim_next_job() : pending → running (atomique)
    → ScanEngine.run()
    → finish_job() : running → done | failed

scheduler_loop() — toutes les 60s
    → get_due_batches() : lit scraper_batches où next_run_at ≤ now
    → create_scan_job() pour chaque batch échu
    → update_batch_next_run() : calcule la prochaine échéance

GET /api/jobs/{job_id}
    → retourne { id, status, created_at, finished_at, error }
```

**Contrainte CX23** : un seul worker, un seul Chromium à la fois — les jobs s'exécutent séquentiellement.

---

## Frontend — flux de scan

```
1. Clic "LANCER" → useScan.ts → apiClient.startScan(locations, keywords, userId)
2. POST /api/scan → { job_id }
3. pollJob(job_id) toutes les 3s → GET /api/jobs/{job_id}
   - pending  → "⏳ En attente..."
   - running  → "🔄 Scan en cours..."
   - done     → "✅ Terminé"
   - failed   → "❌ Échec"
4. Résultats consultables via /history/{job_id}
```

---

## Base de données (Supabase PostgreSQL)

### Schéma complet

```sql
-- Groupes de villes / mots-clés
groups (id UUID PK, user_id UUID, name VARCHAR, slug VARCHAR UNIQUE, type 'location'|'keyword')
group_items (id UUID PK, group_id UUID FK, value VARCHAR)

-- Batchs planifiés
scraper_batches (
  id UUID PK, user_id UUID, name VARCHAR,
  config JSONB,                  -- { locationGroups: [{id}], keywordGroups: [{id}] }
  schedule_type 'daily'|'weekly'|'manual',
  is_active BOOLEAN,
  last_run_at TIMESTAMP, next_run_at TIMESTAMP
)

-- Queue de jobs
scan_jobs (
  id UUID PK, user_id UUID, batch_id UUID FK,
  status 'pending'|'running'|'done'|'failed',
  payload JSONB,                 -- { locations: [], keywords: [] }
  error TEXT,
  created_at TIMESTAMP, started_at TIMESTAMP, finished_at TIMESTAMP
)

-- Résultats de scraping
rankings (
  id UUID PK, user_id UUID, batch_id UUID FK, job_id UUID FK,
  date DATE, heure TIME,
  ville VARCHAR, keyword VARCHAR, nom VARCHAR, position INT
)
```

### RLS policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| groups | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| group_items | via group | via group | via group | via group |
| scraper_batches | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| scan_jobs | `user_id = auth.uid()` | service_role only | service_role only | — |
| rankings | `user_id = auth.uid()` | service_role only | — | — |

---

## Variables d'environnement

### Frontend (`.env.local` / Vercel)
```
NEXT_PUBLIC_API_URL=http://178.104.244.100
NEXT_PUBLIC_SUPABASE_URL=https://gkcahpnpkhljwfdpemzu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé anon>
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://gkcahpnpkhljwfdpemzu.supabase.co
SUPABASE_KEY=<clé service_role>
TARGET_RESULTS=20
HEADLESS=true
FRONTEND_URL=https://ton-app.vercel.app
```

---

## Lancer en développement local

```bash
# Backend
cd backend
pip install -r requirements.txt
playwright install chromium
python main.py          # → http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:3000
```

## Lancer en production (Hetzner)

```bash
ssh root@178.104.244.100
cd app
docker compose up -d --build
docker compose logs -f backend   # vérification
```

---

## Points d'amélioration futurs

| Sujet | Situation actuelle | Recommandation |
|---|---|---|
| SSL / HTTPS | HTTP sur IP brute | Ajouter un domaine + certbot Let's Encrypt |
| Paiement | Non implémenté | Stripe + table subscriptions |
| Temps réel | Polling toutes les 3s | WebSocket ou Supabase Realtime |
| Scaling | 1 worker séquentiel | Plusieurs workers si montée en charge |
| Internationalisation | UI en français | Externaliser les chaînes si multi-langue |
