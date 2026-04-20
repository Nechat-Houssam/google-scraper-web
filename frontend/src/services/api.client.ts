const API_BASE_URL = "http://localhost:8000/api";

export const apiClient = {
  async startScan(locations: any[], keywords: any[]) {
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