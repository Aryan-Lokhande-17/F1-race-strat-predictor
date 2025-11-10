import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLookupDrivers,
  fetchTracks,
  predictRaceResult,
  optimizeStrategy,
  type LookupDriver,
} from "../api/race";

type GridRow = {
  driverId?: number;
  constructorId?: number;
  grid_position: number;
};

export default function RacePredictor() {
  // lookups
  const { data: tracks } = useQuery({ queryKey: ["tracks"], queryFn: fetchTracks });
  const { data: lookup } = useQuery({
    queryKey: ["lookup-drivers"],
    queryFn: fetchLookupDrivers,
  });

  const [track, setTrack] = useState<string>("");
 const [rows, setRows] = useState<GridRow[]>(
  Array.from({ length: 20 }, (_, i) => ({
    grid_position: i + 1,
  }))
);
  const [result, setResult] = useState<any>(null);
  const [bestStrat, setBestStrat] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // quick index by driverId+constructorId for name display
  const labelByKey = useMemo(() => {
  const m = new Map<string, string>();
  (lookup ?? []).forEach((d: LookupDriver) => {
    const key = `${d.driverId}-${d.constructorId}`;
    m.set(key, `${d.forename} ${d.surname} (${d.team_name})`);
  });
  return m;
}, [lookup]);


  const handleChange = (i: number, val: string) => {
    if (!lookup) return;
    const [driverId, constructorId] = val.split("|").map(Number);
    const next = rows.slice();
    next[i].driverId = driverId;
    next[i].constructorId = constructorId;
    setRows(next);
  };

  const selectable = (lookup ?? []).map((d) => ({
  value: `${d.driverId}|${d.constructorId}`,
  label: `${d.forename} ${d.surname} (${d.team_name})`,
}));

  const canRun =
    track &&
    rows.every((r) => r.driverId && r.constructorId && r.grid_position > 0);

  const runPrediction = async () => {
    if (!canRun) return;
    setLoading(true);
    try {
      // raceId/circuitId are placeholders for now (not used heavily by model)
      const payload = {
        raceId: 9999,
        circuitId: 1,
        drivers: rows.map((r) => ({
          driverId: r.driverId!,
          constructorId: r.constructorId!,
          grid_position: r.grid_position,
        })),
      };
      const res = await predictRaceResult(payload);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert("Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const runOptimize = async () => {
    if (!canRun) return;
    setLoading(true);
    try {
      const payload = {
        track,
        drivers: rows.map((r) => ({
          driverId: r.driverId!,
          constructorId: r.constructorId!,
          grid_position: r.grid_position,
        })),
      };
      const res = await optimizeStrategy(payload);
      setBestStrat(res);
    } catch (e) {
      console.error(e);
      alert("Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <div className="text-xl font-semibold">Race Predictor</div>
        <div className="grid md:grid-cols-3 gap-3 pt-3">
          <div>
            <label className="text-xs opacity-70">Track</label>
            <select
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
            >
              <option value="">Select track…</option>
              {(tracks ?? []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Grid Setup</div>
          <div className="grid gap-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-16 text-sm opacity-80">P{i + 1}</div>
                <select
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded p-2"
                  value={
                    r.driverId && r.constructorId
                      ? `${r.driverId}|${r.constructorId}`
                      : ""
                  }
                  onChange={(e) => handleChange(i, e.target.value)}
                >
                  <option value="">Select driver/team…</option>
                  {selectable.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="w-28 bg-neutral-900 border border-neutral-800 rounded p-2"
                  value={r.grid_position}
                  onChange={(e) => {
                    const next = rows.slice();
                    next[i].grid_position = Number(e.target.value || 1);
                    setRows(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="btn-primary"
              disabled={!canRun || loading}
              onClick={runPrediction}
            >
              {loading ? "Running…" : "Predict Finishing Order"}
            </button>
            <button
              className="btn-secondary"
              disabled={!canRun || loading || !track}
              onClick={runOptimize}
            >
              Optimize Tyre Strategy (Phase-2)
            </button>
          </div>
        </div>
      </div>

      {/* Prediction Table */}
      {result?.predicted_order && (
        <div className="card p-4">
          <div className="text-lg font-semibold mb-2">Predicted Results</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-1 pr-4">Pos</th>
                  <th className="py-1 pr-4">Driver</th>
                  <th className="py-1 pr-4">Team</th>
                  <th className="py-1 pr-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {result.predicted_order.map((r: any) => {
                  const key = `${r.driverId}-${r.constructorId}`;
                  const [name, team] = (labelByKey.get(key) ?? "— (—)").split(" (");
                  return (
                    <tr key={key} className="border-t border-neutral-800">
                      <td className="py-1 pr-4">{r.predicted_position}</td>
                      <td className="py-1 pr-4">{name}</td>
                      <td className="py-1 pr-4">{team?.replace(")", "")}</td>
                      <td className="py-1 pr-4">{r.predicted_finish.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategy block */}
      {bestStrat?.best && (
        <div className="card p-4">
          <div className="text-lg font-semibold mb-2">Suggested Strategy (Best)</div>
          <div className="text-sm">
            <div>Track: <span className="opacity-80">{track}</span></div>
            <div>Total time: <span className="opacity-80">
              {bestStrat.best.total_race_time.toFixed(3)} s
            </span></div>
            <div className="mt-1">
              {bestStrat.best.strategy.map((s: [string, number], i: number) => (
                <div key={i}>Stint {i + 1}: {s[0]} × {s[1]} laps</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
