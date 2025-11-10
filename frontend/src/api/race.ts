export type DriverEntry = {
  driverId: number;
  constructorId: number;
  grid_position: number;
};

export type LookupDriver = {
  driverId: number;
  constructorId: number;
  code: string;
  forename: string;
  surname: string;
  team_name: string;
  driverRef: string;
};

const BASE = "http://127.0.0.1:8000";

export async function fetchLookupDrivers(): Promise<LookupDriver[]> {
  const r = await fetch(`${BASE}/lookup/drivers`);
  if (!r.ok) throw new Error("Failed to load driver lookup");
  return r.json();
}

export async function fetchTracks(): Promise<string[]> {
  const r = await fetch(`${BASE}/tracks`);
  if (!r.ok) throw new Error("Failed to load tracks");
  const j = await r.json();
  return j.tracks ?? [];
}

export async function predictRaceResult(payload: {
  raceId: number;
  circuitId: number;
  drivers: DriverEntry[];
}) {
  const r = await fetch(`${BASE}/predict_race_result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function optimizeStrategy(payload: {
  track: string;
  drivers: DriverEntry[];
}) {
  const r = await fetch(`${BASE}/optimize_strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
