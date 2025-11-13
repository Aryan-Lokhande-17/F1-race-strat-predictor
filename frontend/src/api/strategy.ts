// frontend/src/api/strategy.ts
export interface StrategyPayload {
  track: string;
  strategy: [string, number][];
  base_lap_time?: number;
  pit_loss?: number;
  track_env?: Record<string, number>;
  driverId?: number;
  constructorId?: number;
  circuitId?: number;
}

export async function predictWinner(payload: any) {
  const res = await fetch("http://127.0.0.1:8000/predict_winner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to predict winner");
  return res.json();
}

export async function predictStrategy(payload: StrategyPayload) {
  const res = await fetch("http://127.0.0.1:8000/predict_strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Backend error:", await res.text());
    throw new Error("Strategy prediction failed");
  }

  return res.json();
}
