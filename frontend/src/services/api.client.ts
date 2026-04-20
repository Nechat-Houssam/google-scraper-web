const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api";

export const apiClient = {
  async startScan(locations: { id: string }[], keywords: { id: string }[]) {
    const response = await fetch(`${API_BASE_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: locations.map(l => l.id),
        keywords: keywords.map(k => k.id)
      })
    });
    return response.json();
  },

  async stopScan() {
    const response = await fetch(`${API_BASE_URL}/scan/stop`, { method: "POST" });
    return response.json();
  }
};
