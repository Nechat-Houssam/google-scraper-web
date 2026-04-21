from datetime import datetime, timedelta, timezone

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

class DBService:
    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Résolution d'entités ──────────────────────────────────────────────────

    def resolve_entities(self, entities: list[str]) -> list[str]:
        final_list = []
        for item in entities:
            if item.startswith("group:"):
                slug = item.replace("group:", "")
                grp = self.client.table("groups").select("id").eq("slug", slug).execute()
                if grp.data:
                    items = self.client.table("group_items").select("value").eq("group_id", grp.data[0]["id"]).execute()
                    final_list.extend([i["value"] for i in items.data])
            else:
                final_list.append(item)
        return final_list

    # ── Résultats ─────────────────────────────────────────────────────────────

    def save_rankings(self, data: list[dict], user_id: str = None, batch_id: str = None, job_id: str = None) -> bool:
        if not data:
            return False
        try:
            rows = []
            for r in data:
                row = dict(r)
                if user_id:
                    row["user_id"] = user_id
                if batch_id:
                    row["batch_id"] = batch_id
                if job_id:
                    row["job_id"] = job_id
                rows.append(row)
            self.client.table("rankings").insert(rows).execute()
            return True
        except Exception as e:
            print(f"❌ Erreur insertion rankings : {e}")
            return False

    # ── Queue de jobs ─────────────────────────────────────────────────────────

    def create_scan_job(self, user_id: str, payload: dict, batch_id: str = None) -> dict | None:
        try:
            job = self.client.table("scan_jobs").insert({
                "user_id": user_id,
                "batch_id": batch_id,
                "payload": payload,
                "status": "pending",
            }).execute()
            return job.data[0] if job.data else None
        except Exception as e:
            print(f"❌ Erreur création job : {e}")
            return None

    def claim_next_job(self) -> dict | None:
        try:
            jobs = (
                self.client.table("scan_jobs")
                .select("*")
                .eq("status", "pending")
                .order("created_at")
                .limit(1)
                .execute()
            )
            if not jobs.data:
                return None
            job = jobs.data[0]
            self.client.table("scan_jobs").update({
                "status": "running",
                "started_at": _now(),
            }).eq("id", job["id"]).execute()
            return job
        except Exception as e:
            print(f"❌ Erreur claim job : {e}")
            return None

    def finish_job(self, job_id: str, success: bool, error: str = None):
        try:
            self.client.table("scan_jobs").update({
                "status": "done" if success else "failed",
                "finished_at": _now(),
                "error": error,
            }).eq("id", job_id).execute()
        except Exception as e:
            print(f"❌ Erreur finish job : {e}")

    def get_job_status(self, job_id: str) -> dict | None:
        try:
            res = self.client.table("scan_jobs").select("*").eq("id", job_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            print(f"❌ Erreur get job : {e}")
            return None

    # ── Scheduler ─────────────────────────────────────────────────────────────

    def get_due_batches(self) -> list[dict]:
        try:
            now = _now()
            res = (
                self.client.table("scraper_batches")
                .select("*")
                .eq("is_active", True)
                .lte("next_run_at", now)
                .execute()
            )
            return res.data or []
        except Exception as e:
            print(f"❌ Erreur get due batches : {e}")
            return []

    def update_batch_next_run(self, batch_id: str, schedule_type: str):
        try:
            now = datetime.now(timezone.utc)
            if schedule_type == "daily":
                next_run = (now + timedelta(days=1)).isoformat()
                update = {"last_run_at": now.isoformat(), "next_run_at": next_run}
            elif schedule_type == "weekly":
                next_run = (now + timedelta(weeks=1)).isoformat()
                update = {"last_run_at": now.isoformat(), "next_run_at": next_run}
            else:
                # manual : on désactive après le premier lancement automatique
                update = {"last_run_at": now.isoformat(), "is_active": False}
            self.client.table("scraper_batches").update(update).eq("id", batch_id).execute()
        except Exception as e:
            print(f"❌ Erreur update batch schedule : {e}")

db_service = DBService()
