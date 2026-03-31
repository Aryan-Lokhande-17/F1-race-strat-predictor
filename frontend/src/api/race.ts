export const API_BASE = "http://127.0.0.1:8000";

export async function fetchTracks(): Promise<{ tracks: string[] }> {
  const res = await fetch(`${API_BASE}/tracks`);
  if (!res.ok) throw new Error("Failed to fetch tracks");
  return await res.json();
}

export async function optimizeStrategy(payload: {
  track: string;
  compounds?: string[];
  base_lap_time?: number;
  pit_loss?: number;
}) {
  const res = await fetch(`${API_BASE}/optimize_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function predictStrategy(payload: {
  track: string;
  strategy: [string, number][];
  base_lap_time?: number;
  pit_loss?: number;
  track_env?: Record<string, number>;
}) {
  const res = await fetch(`${API_BASE}/predict_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}
