import requests

def get_gps(city: str) -> dict | None:
    """Récupère les coordonnées GPS d'une ville via OpenStreetMap."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
        response = requests.get(url, headers={'User-Agent': 'TrackerStudio_Bot'}).json()
        if response:
            return {"latitude": float(response[0]["lat"]), "longitude": float(response[0]["lon"])}
    except Exception as e:
        print(f"⚠️ Erreur GPS pour {city}: {e}")
    return None