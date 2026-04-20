import asyncio
import logging
from datetime import datetime
from playwright.async_api import async_playwright
import playwright_stealth
from config import TARGET_RESULTS, HEADLESS

logger = logging.getLogger(__name__)

async def create_localized_session(playwright_instance, city: str, coords: dict):
    logger.info(f"[SESSION] Ouverture navigateur pour : {city.upper()}")
    logger.debug(f"[SESSION] Coordonnées : {coords['latitude']}, {coords['longitude']}")

    browser = await playwright_instance.chromium.launch(headless=HEADLESS)
    context = await browser.new_context(
        viewport={'width': 1280, 'height': 900},
        permissions=["geolocation"],
        geolocation=coords,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."
    )
    page = await context.new_page()
    await asyncio.sleep(0.5)

    try:
        playwright_stealth.stealth(page)
    except Exception as e:
        logger.debug(f"[STEALTH] Non appliqué : {e}")

    return browser, page


async def handle_cookies(page):
    logger.info("[COOKIES] Vérification du bandeau cookies...")
    await page.goto("https://www.google.com/maps?hl=fr", wait_until="domcontentloaded")
    await asyncio.sleep(2)

    selectors = ["Tout accepter", "Accepter", "Accept all", "J'accepte", "Tout autoriser"]
    for text in selectors:
        btn = page.get_by_role("button", name=text, exact=False)
        try:
            if await btn.is_visible(timeout=2000):
                await btn.click()
                logger.info("[COOKIES] Acceptés.")
                return True
        except Exception as e:
            logger.debug(f"[COOKIES] Bouton '{text}' non trouvé : {e}")

    logger.info("[COOKIES] Aucun bandeau détecté.")
    return False


async def scrape_keyword(page, kw: str, loc: str, coords: dict, heure_ref: str, should_abort: asyncio.Event):
    if should_abort.is_set():
        return []

    logger.info(f"[SCAN] '{kw}' @ {loc}")
    url = f"https://www.google.com/maps/search/{kw}/@{coords['latitude']},{coords['longitude']},13z?hl=fr"
    results = []

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

        try:
            await page.wait_for_selector('input#searchboxinput', timeout=5000)
            await page.keyboard.press("Enter")
        except Exception as e:
            logger.debug(f"[SCAN] Pas de searchbox pour '{kw}' : {e}")

        try:
            await page.wait_for_selector('div.qBF1Pd, a.hfpxzc', timeout=15000)
        except Exception:
            logger.warning(f"[SCAN] Aucun résultat visible pour '{kw}'.")
            return []

        pane = await page.query_selector('div[role="feed"]')
        previous_count = 0
        stuck_counter = 0
        max_stuck = 3

        while True:
            if should_abort.is_set():
                break

            elements = await page.query_selector_all('div.qBF1Pd')
            current_count = len(elements)

            if current_count >= TARGET_RESULTS:
                break

            if current_count == previous_count:
                stuck_counter += 1
                if stuck_counter >= max_stuck:
                    logger.info(f"[SCAN] Fin de liste pour '{kw}' ({current_count} résultats).")
                    break
            else:
                stuck_counter = 0

            previous_count = current_count

            if pane:
                await pane.evaluate('el => el.scrollTop = el.scrollHeight')
            else:
                await page.mouse.wheel(0, 3000)

            await asyncio.sleep(2)

        elements = await page.query_selector_all('div.qBF1Pd')
        for rank, el in enumerate(elements[:TARGET_RESULTS]):
            name = await el.inner_text()
            if name.strip():
                results.append({
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "heure": heure_ref,
                    "ville": loc,
                    "keyword": kw,
                    "nom": name.strip(),
                    "position": rank + 1
                })

        logger.info(f"[SCAN] {len(results)} résultats extraits pour '{kw}'.")

    except Exception as e:
        logger.error(f"[SCAN] Erreur sur '{kw}' : {e}", exc_info=True)

    return results
