from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

class DBService:
    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def resolve_entities(self, entities: list[str]) -> list[str]:
        """Traduit les 'group:slug' en vraies valeurs depuis Supabase."""
        final_list = []
        for item in entities:
            if item.startswith("group:"):
                slug = item.replace("group:", "")
                grp = self.client.table("groups").select("id").eq("slug", slug).execute()
                if grp.data:
                    items = self.client.table("group_items").select("value").eq("group_id", grp.data[0]['id']).execute()
                    final_list.extend([i['value'] for i in items.data])
            else:
                final_list.append(item)
        return final_list

    def save_rankings(self, data: list[dict]):
        """Insertion des résultats en base."""
        if not data: return False
        try:
            self.client.table("rankings").insert(data).execute()
            return True
        except Exception as e:
            print(f"❌ Erreur insertion Supabase : {e}")
            return False

db_service = DBService()