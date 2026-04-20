import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
# --- L'IMPORTATION MANQUANTE CI-DESSOUS ---
from playwright.async_api import async_playwright

# Importations de tes propres modules
from services.geo import get_gps
from services.database import db_service
from engine.scraper import create_localized_session, handle_cookies, scrape_keyword

app = FastAPI()
should_abort = asyncio.Event()

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
    print(f"\n🚀 NOUVELLE COMMANDE REÇUE : {payload}")
    should_abort.clear()
    
    final_locs = db_service.resolve_entities(payload.locations)
    final_kws = db_service.resolve_entities(payload.keywords)
    
    total_planned = len(final_locs) * len(final_kws)
    print(f"🎯 Matrice prête : {total_planned} recherches uniques programmées.")
    
    all_results = []
    heure_ref = datetime.now().strftime("%H:%M:%S")
    print(f"⏰ Heure de référence pour ce batch : {heure_ref}")

    async with async_playwright() as p:
        for loc in final_locs:
            if should_abort.is_set(): break
            coords = get_gps(loc)
            if not coords: continue
            
            browser, page = await create_localized_session(p, loc, coords)
            await handle_cookies(page)
            
            for kw in final_kws:
                res = await scrape_keyword(page, kw, loc, coords, heure_ref, should_abort)
                all_results.extend(res)
                await asyncio.sleep(1)
            
            await browser.close()

    if all_results and not should_abort.is_set():
        db_service.save_rankings(all_results)
        print(f"🎉 Résultat : {len(all_results)} recherches enregistrées en base.")
        return {"status": "success", "message": f"{len(all_results)} résultats enregistrés."}
    
    
@app.post("/api/scan/stop")
async def stop_scan():
    print("\n🛑 [SIGNAL] Requête d'arrêt reçue de l'utilisateur.")
    should_abort.set()
    return {"status": "stopping", "message": "Le bot s'arrêtera au prochain mot-clé."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)