import asyncio
from datetime import datetime

from services.geo import get_gps
from services.database import db_service
from engine.scraper import create_localized_session, handle_cookies, scrape_keyword

class ScanEngine:
    def __init__(self):
        self._abort_event = asyncio.Event()
        self.is_running = False

    def abort(self):
        self._abort_event.set()

    def reset(self):
        self._abort_event.clear()

    async def run(
        self,
        locations: list[str],
        keywords: list[str],
        user_id: str = None,
        batch_id: str = None,
        job_id: str = None,
    ) -> dict:
        self.reset()
        self.is_running = True
        all_results = []
        heure_ref = datetime.now().strftime("%H:%M:%S")

        print(f"\n🚀 SCAN DÉMARRÉ — {len(locations)} villes x {len(keywords)} mots-clés")
        if job_id:
            print(f"🔖 Job ID : {job_id}")

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                for loc in locations:
                    if self._abort_event.is_set():
                        print("🛑 Scan annulé.")
                        break

                    coords = get_gps(loc)
                    if not coords:
                        print(f"⚠️ Coordonnées introuvables pour : {loc}")
                        continue

                    browser, page = await create_localized_session(p, loc, coords)
                    await handle_cookies(page)

                    for kw in keywords:
                        if self._abort_event.is_set():
                            break
                        res = await scrape_keyword(page, kw, loc, coords, heure_ref, self._abort_event)
                        all_results.extend(res)
                        await asyncio.sleep(1)

                    await browser.close()

            if all_results and not self._abort_event.is_set():
                db_service.save_rankings(all_results, user_id=user_id, batch_id=batch_id, job_id=job_id)
                print(f"🎉 {len(all_results)} résultats enregistrés.")
                return {"status": "success", "message": f"{len(all_results)} résultats enregistrés."}

            if self._abort_event.is_set():
                return {"status": "cancelled", "message": "Scan annulé. Aucune donnée enregistrée."}

            return {"status": "empty", "message": "Aucun résultat trouvé."}

        finally:
            self.is_running = False
