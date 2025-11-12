import { predictStrategy } from "../api/strategy";
import { TRACK_TYRE_LIMITS, DEFAULT_LIMITS } from "./tyreLimits";
import { RACE_LAPS, DEFAULT_RACE_LAPS } from "./raceLapCounts";

export type Stint = [compound: "SOFT" | "MEDIUM" | "HARD", laps: number];

type BaseParams = {
  track: string;
  base_lap_time: number;
  pit_loss: number;
  driverId?: number;        // <- optional number
  constructorId?: number;   // <- optional number
  circuitId?: number;       // <- optional number
};

type SimResult = {
  total_race_time: number;
  lap_times: number[];
};


export async function findBestStrategy(base: BaseParams): Promise<{ strategy: Stint[]; time: number } | null> {
  const raceLaps = RACE_LAPS[base.track] ?? DEFAULT_RACE_LAPS;
  const MAX_STINT_BY_COMPOUND =
    TRACK_TYRE_LIMITS[base.track] ?? DEFAULT_LIMITS;

  const strategies: Stint[][] = [];
  const compounds: Array<"SOFT" | "MEDIUM" | "HARD"> = ["SOFT", "MEDIUM", "HARD"];

  // Generate 2–4 stint strategies
  for (let stints = 2; stints <= 4; stints++) {
    function dfs(i: number, remaining: number, current: number[]) {
      if (i === stints - 1) {
        current.push(remaining);
        strategies.push(
          current.map((laps, idx) => [compounds[idx] ?? "MEDIUM", laps]) as Stint[]
        );
        current.pop();
        return;
      }
      for (let laps = 7; laps <= remaining - 7 * (stints - i - 1); laps++) {
        dfs(i + 1, remaining - laps, [...current, laps]);
      }
    }
    dfs(0, raceLaps, []);
  }

  // Filter illegal/impossible strategies
  const filtered = strategies.filter((strategy) => {
    const compoundsUsed = new Set(strategy.map((s) => s[0]));
    if (compoundsUsed.size < 2) return false; // FIA rule: ≥2 compounds
    return strategy.every(([compound, laps]) => laps <= MAX_STINT_BY_COMPOUND[compound]);
  });

  if (!filtered.length) return null;

  let best: { strategy: Stint[]; time: number } | null = null;

  for (const strategy of filtered) {
    try {
      // Build payload conditionally so optional numeric fields are only included when defined
      const payload: {
        track: string;
        strategy: Stint[];
        base_lap_time: number;
        pit_loss: number;
        driverId?: number;
        constructorId?: number;
        circuitId?: number;
      } = {
        track: base.track,
        strategy,
        base_lap_time: base.base_lap_time,
        pit_loss: base.pit_loss,
      };
      if (base.driverId !== undefined) payload.driverId = base.driverId;
      if (base.constructorId !== undefined) payload.constructorId = base.constructorId;
      if (base.circuitId !== undefined) payload.circuitId = base.circuitId;

      const res: SimResult = await predictStrategy(payload);

      if (!best || res.total_race_time < best.time) {
        best = { strategy, time: res.total_race_time };
      }
    } catch {
      // swallow and continue
    }
  }

  return best;
}
