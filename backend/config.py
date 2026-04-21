import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Variables SUPABASE_URL ou SUPABASE_KEY manquantes dans .env")

TARGET_RESULTS = int(os.getenv("TARGET_RESULTS", "20"))
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
