import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.database import db_service
from engine.scan_engine import ScanEngine

app = FastAPI()
scan_engine = ScanEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    locations: list[str]
    keywords: list[str]

@app.post("/api/scan")
async def trigger_scan(payload: ScanRequest):
    if scan_engine.is_running:
        raise HTTPException(status_code=409, detail="Un scan est déjà en cours.")

    final_locs = db_service.resolve_entities(payload.locations)
    final_kws = db_service.resolve_entities(payload.keywords)

    print(f"🎯 Matrice : {len(final_locs)} villes x {len(final_kws)} mots-clés")

    result = await scan_engine.run(final_locs, final_kws)
    return result

@app.post("/api/scan/stop")
async def stop_scan():
    scan_engine.abort()
    print("🛑 Arrêt demandé.")
    return {"status": "stopping", "message": "Le bot s'arrêtera au prochain mot-clé."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S"
)
