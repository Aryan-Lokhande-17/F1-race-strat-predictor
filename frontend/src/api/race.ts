// frontend/src/api/race.ts
export const API_BASE = "http://127.0.0.1:8000"; // backend base URL

// === Fetch all tracks ===
export async function fetchTracks(): Promise<{ tracks: string[] }> {
  const res = await fetch(`${API_BASE}/tracks`);
  if (!res.ok) throw new Error("Failed to fetch tracks");
  return await res.json();
}

// === Fetch drivers & teams lookup ===
export async function fetchLookupDrivers() {
  const res = await fetch(`${API_BASE}/lookup/drivers`);
  if (!res.ok) throw new Error("Failed to fetch lookup drivers");
  return await res.json();
}

// === Predict race finishing order (calls /predict_winner) ===
export async function predictWinner(payload: {
  track: string;
  drivers: {
    driverId: number;
    constructorId: number;
    circuitId?: number;
    grid_position: number;
  }[];
}) {
  const res = await fetch(`${API_BASE}/predict_winner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// === Optimize tyre strategy (Phase-2) ===
export async function optimizeStrategy(payload: {
  track: string;
  drivers: {
    driverId: number;
    constructorId: number;
    grid_position: number;
  }[];
}) {
  const res = await fetch(`${API_BASE}/optimize_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// === Fetch strategy simulation (optional for StrategySimulator page) ===
export async function predictStrategy(payload: any) {
  const res = await fetch(`${API_BASE}/predict_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// === Shared Types ===
export type LookupDriver = {
  driverId: number;
  constructorId: number;
  code: string;
  forename: string;
  surname: string;
  team_name: string;
};
