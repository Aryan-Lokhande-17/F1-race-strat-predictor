import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLookupDrivers,
  fetchTracks,
  predictWinner,
  optimizeStrategy,
  type LookupDriver,
} from "../api/race";

type GridRow = {
  driverId?: number;
  constructorId?: number;
  grid_position: number;
};

type PredictedRow = {
  forename: string;
  surname: string;
  team_name: string;
  grid_position: number;
  predicted_performance: number;
};

export default function RacePredictor() {
  const { data: tracks } = useQuery<{ tracks: string[] }>({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
  });

  const { data: lookup } = useQuery<LookupDriver[]>({
    queryKey: ["lookup-drivers"],
    queryFn: fetchLookupDrivers,
  });

  const [track, setTrack] = useState<string>("");
  const [rows, setRows] = useState<GridRow[]>(
    Array.from({ length: 20 }, (_, i) => ({ grid_position: i + 1 }))
  );
  const [result, setResult] = useState<any>(null);
  const [bestStrat, setBestStrat] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectable = (lookup ?? []).map((d: LookupDriver) => ({
    value: `${d.driverId}|${d.constructorId}`,
    label: `${d.forename} ${d.surname} (${d.team_name})`,
  }));

  const canRun =
    !!track &&
    rows.every((r) => r.driverId && r.constructorId && r.grid_position > 0);

  const runPrediction = async () => {
    if (!canRun) return;
    setLoading(true);
    try {
      const payload = {
        track,
        drivers: rows.map((r) => ({
          driverId: r.driverId!,
          constructorId: r.constructorId!,
          circuitId: 1,
          grid_position: r.grid_position,
        })),
      };
      const res = await predictWinner(payload);
      if (res.error) throw new Error(res.error);
      setResult(res);
      setBestStrat(null); // clear old results
    } catch (err) {
      console.error(err);
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
      setResult(null); // clear old results
    } catch (err) {
      console.error(err);
      alert("Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <div className="text-xl font-semibold mb-3">
          🏎️ Race Winner Predictor
        </div>

        {/* === Track Selection === */}
        <div className="grid md:grid-cols-3 gap-3 pt-3">
          <div>
            <label className="text-xs opacity-70">Track</label>
            <select
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
            >
              <option value="">Select track…</option>
              {(tracks?.tracks ?? []).map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* === Grid Setup === */}
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
                  onChange={(e) => {
                    const [driverId, constructorId] = e.target.value
                      .split("|")
                      .map(Number);
                    const next = [...rows];
                    next[i].driverId = driverId;
                    next[i].constructorId = constructorId;
                    setRows(next);
                  }}
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
                    const next = [...rows];
                    next[i].grid_position = Number(e.target.value || 1);
                    setRows(next);
                  }}
                />
              </div>
            ))}
          </div>

          {/* === Buttons === */}
          <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <button
              className="btn-primary"
              disabled={!canRun || loading}
              onClick={runPrediction}
            >
              {loading ? "Predicting…" : "🏁 Predict Race Winner"}
            </button>

            <button
              className="btn-secondary"
              disabled={!canRun || loading || !track}
              onClick={runOptimize}
            >
              🔧 Optimize Tyre Strategy (Phase-2)
            </button>
          </div>
        </div>
      </div>

      {/* === 🏆 Race Winner Results === */}
      {result?.predicted_order && (
        <div className="card p-4 border border-yellow-600">
          <div className="text-lg font-semibold mb-2">
            🏁 Predicted Race Results — {track}
          </div>

          {result?.winner && (
            <div className="mb-3 text-yellow-400 font-medium text-lg">
              🏆 Winner: {result.winner.forename} {result.winner.surname} —{" "}
              {result.winner.team_name}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70 border-b border-neutral-700">
                <tr>
                  <th className="py-1 pr-4">Pos</th>
                  <th className="py-1 pr-4">Driver</th>
                  <th className="py-1 pr-4">Team</th>
                  <th className="py-1 pr-4">Grid</th>
                  <th className="py-1 pr-4">Performance</th>
                </tr>
              </thead>
              <tbody>
                {result.predicted_order.map((r: PredictedRow, i: number) => (
                  <tr key={i} className="border-t border-neutral-800">
                    <td className="py-1 pr-4">{i + 1}</td>
                    <td className="py-1 pr-4">
                      {r.forename} {r.surname}
                    </td>
                    <td className="py-1 pr-4 text-gray-400">{r.team_name}</td>
                    <td className="py-1 pr-4">{r.grid_position}</td>
                    <td className="py-1 pr-4">
                      {r.predicted_performance?.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ⚙️ Best Strategy === */}
      {bestStrat?.best_strategy && (
        <div className="card p-4 border border-blue-600">
          <div className="text-lg font-semibold mb-2">
            🔧 Suggested Strategy (Best)
          </div>
          <div className="text-sm">
            <div>
              Track: <span className="opacity-80">{track}</span>
            </div>
            <div>
              Total time:{" "}
              <span className="opacity-80">
                {bestStrat.predicted_time?.toFixed(3)} s
              </span>
            </div>
            <div className="mt-1">
              {bestStrat.best_strategy.map(
                (s: [string, number], i: number) => (
                  <div key={i}>
                    Stint {i + 1}: {s[0]} × {s[1]} laps
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
