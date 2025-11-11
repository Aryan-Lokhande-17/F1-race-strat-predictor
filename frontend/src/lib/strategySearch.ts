// frontend/src/lib/strategySearch.ts
import { predictStrategy } from "../api/strategy";

export type Stint = [compound: "SOFT" | "MEDIUM" | "HARD", laps: number];

export type BaseParams = {
  track: string;
  base_lap_time: number;
  pit_loss: number;
  driverId?: number;
  constructorId?: number;
  circuitId?: number;
};

type SimResult = {
  total_race_time: number;
  lap_times: number[];
};

// Integer-split helper
function randomSplit(total: number, parts: number): number[] {
  let cuts = new Set<number>();
  while (cuts.size < parts - 1) cuts.add(Math.floor(Math.random() * total));
  const sorted = [...cuts].sort((a, b) => a - b);
  const segments = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) segments.push(sorted[i] - sorted[i - 1]);
  segments.push(total - sorted[sorted.length - 1]);
  return segments;
}

const COMPOUNDS: Array<"SOFT" | "MEDIUM" | "HARD"> = ["SOFT", "MEDIUM", "HARD"];

// ---------- MAIN SEARCH ----------
export async function findBestStrategy(
  base: BaseParams,
  raceLaps = 57
): Promise<{ strategy: Stint[]; time: number } | null> {
  const candidates: Stint[][] = [];

  // Generate 100 random strategies of 2–4 stints
  for (let k = 2; k <= 4; k++) {
    for (let _ = 0; _ < 25; _++) {
      const laps = randomSplit(raceLaps, k).map(Math.abs);
      const compounds = Array.from({ length: k }, () => COMPOUNDS[Math.floor(Math.random() * 3)]);
      candidates.push(compounds.map((c, i) => [c, laps[i]]));
    }
  }

  let best: { strategy: Stint[]; time: number } | null = null;

  for (const strategy of candidates) {
    try {
      const res: SimResult = await predictStrategy({
        track: base.track,
        strategy,
        base_lap_time: base.base_lap_time,
        pit_loss: base.pit_loss,
        driverId: base.driverId,
        constructorId: base.constructorId,
        circuitId: base.circuitId,
      });

      if (best === null || res.total_race_time < best.time) {
        best = { strategy, time: res.total_race_time };
      }
    } catch (err) {
      // skip failed attempts
    }
  }

  return best;
}
