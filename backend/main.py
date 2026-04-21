import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import FRONTEND_URL
from services.database import db_service
from engine.scan_engine import ScanEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

scan_engine = ScanEngine()


# ── Worker : consomme la queue scan_jobs ──────────────────────────────────────

async def worker_loop():
    """Tourne en permanence, prend un job pending à la fois et l'exécute."""
    logging.info("[WORKER] Démarré.")
    while True:
        job = db_service.claim_next_job()
        if job:
            logging.info(f"[WORKER] Job {job['id']} pris en charge.")
            payload = job.get("payload", {})
            locations = db_service.resolve_entities(payload.get("locations", []))
            keywords  = db_service.resolve_entities(payload.get("keywords", []))
            try:
                await scan_engine.run(
                    locations,
                    keywords,
                    user_id=job.get("user_id"),
                    batch_id=job.get("batch_id"),
                    job_id=job["id"],
                )
                db_service.finish_job(job["id"], success=True)
                logging.info(f"[WORKER] Job {job['id']} terminé.")
            except Exception as e:
                db_service.finish_job(job["id"], success=False, error=str(e))
                logging.error(f"[WORKER] Job {job['id']} échoué : {e}")
        else:
            await asyncio.sleep(10)


# ── Scheduler : crée des jobs depuis scraper_batches ─────────────────────────

async def scheduler_loop():
    """Vérifie toutes les 60s les batchs planifiés arrivés à échéance."""
    logging.info("[SCHEDULER] Démarré.")
    while True:
        await asyncio.sleep(60)
        batches = db_service.get_due_batches()
        for batch in batches:
            config    = batch.get("config") or {}
            locations = [item["id"] for item in config.get("locationGroups", [])]
            keywords  = [item["id"] for item in config.get("keywordGroups", [])]
            job = db_service.create_scan_job(
                user_id=batch["user_id"],
                batch_id=batch["id"],
                payload={"locations": locations, "keywords": keywords},
            )
            if job:
                logging.info(f"[SCHEDULER] Job créé pour batch '{batch['name']}' → {job['id']}")
            db_service.update_batch_next_run(batch["id"], batch["schedule_type"])


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    asyncio.create_task(worker_loop())
    asyncio.create_task(scheduler_loop())
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modèles ───────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    locations: list[str]
    keywords:  list[str]
    user_id:   str
    batch_id:  str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/scan")
async def trigger_scan(payload: ScanRequest):
    """Crée un job dans la queue — le worker l'exécute dès qu'il est libre."""
    job = db_service.create_scan_job(
        user_id=payload.user_id,
        batch_id=payload.batch_id,
        payload={"locations": payload.locations, "keywords": payload.keywords},
    )
    if not job:
        raise HTTPException(status_code=500, detail="Impossible de créer le job.")
    return {"status": "queued", "job_id": job["id"], "message": "Scan mis en queue."}


@app.post("/api/scan/stop")
async def stop_scan():
    scan_engine.abort()
    logging.info("[API] Arrêt demandé.")
    return {"status": "stopping", "message": "Le bot s'arrêtera au prochain mot-clé."}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Retourne le statut d'un job (pending / running / done / failed)."""
    job = db_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable.")
    return job


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
