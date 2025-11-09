export async function predictStrategy(
  strategy: [string, number][],
  baseLapTime: number,
  pitLoss: number,
  trackEnv: Record<string, number> | null = null
) {
  const response = await fetch("http://127.0.0.1:8000/predict_strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategy,
      base_lap_time: baseLapTime,
      pit_loss: pitLoss,
      track_env: trackEnv
    })
  });

  return await response.json();
}
