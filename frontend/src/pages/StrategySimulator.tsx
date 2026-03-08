import { useState, useCallback } from "react";
import { predictStrategy } from "../api/strategy";
import StrategyChart from "../components/StrategyChart";
import Modal from "../components/Modal";
import { RACE_LAPS } from "../lib/raceLapCounts";

const TYRE_COLORS: Record<string, string> = {
  SOFT: "bg-red-600",
  MEDIUM: "bg-yellow-500 text-black",
  HARD: "bg-gray-300 text-black",
};

const AVAILABLE_COMPOUNDS = ["SOFT", "MEDIUM", "HARD"] as const;
type Compound = (typeof AVAILABLE_COMPOUNDS)[number];

const TRACKS = Object.keys(RACE_LAPS);

export default function StrategySimulator() {
  const [track, setTrack] = useState<string>(
    TRACKS.includes("Bahrain") ? "Bahrain" : TRACKS[0]
  );

  const [strategy, setStrategy] = useState<[Compound, number][]>([
    ["SOFT", 10],
    ["MEDIUM", 20],
    ["HARD", 27],
  ]);

  const [result, setResult] = useState<any>(null);
  const [bestFound, setBestFound] = useState<{
    strategy: [Compound, number][];
    time: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // 🏁 Run Simulation (predict_strategy)
  const runSim = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        track,
        strategy,
        base_lap_time: 96.4,
        pit_loss: 21.5,
        driverId: 830,
        constructorId: 131,
        circuitId: 1,
      };

      const data = await predictStrategy(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("❌ Strategy simulation failed.");
    } finally {
      setLoading(false);
    }
  }, [track, strategy]);

  // 🔥 Suggest Best Strategy (calls /suggest_strategy)
  const suggestBest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/suggest_strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          base_lap_time: 96.4,
          pit_loss: 21.5,
          driverId: 830,
          constructorId: 131,
          circuitId: 1,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert("⚠ " + data.error);
        return;
      }

      if (!data.best_strategy) {
        alert("⚠ No valid strategy found.");
        return;
      }

      setStrategy(data.best_strategy);
      setBestFound({
        strategy: data.best_strategy,
        time: data.predicted_time,
      });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch best strategy.");
    } finally {
      setLoading(false);
    }
  }, [track]);

  // 🧩 Update compound for stint
  const updateCompound = (i: number, compound: string) => {
    if (!AVAILABLE_COMPOUNDS.includes(compound as Compound)) return;
    setStrategy((prev) =>
      prev.map((s, idx) => (idx === i ? [compound as Compound, s[1]] : s))
    );
  };

  // 🧩 Update laps for stint
  const updateStint = (i: number, laps: number) => {
    setStrategy((prev) =>
      prev.map((s, idx) => (idx === i ? [s[0], Number(laps)] : s))
    );
  };

  // ➕ Add new stint
  const addStint = () => {
    setStrategy((prev) => [...prev, ["MEDIUM", 5]]);
  };

  // ❌ Remove stint
  const deleteStint = (i: number) => {
    setStrategy((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="p-8 text-[color:var(--text)] min-h-screen bg-[color:var(--card)]">
      <h1 className="text-3xl font-bold mb-6 text-red-600">
        🏎️ Tyre Strategy Simulator
      </h1>

      {/* Track Selector */}
      <div className="mb-6">
        <label className="block mb-2 text-sm text-slate-600">Select Track</label>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="field w-60"
        >
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-slate-500">
          Laps: {RACE_LAPS[track] ?? "—"}
        </p>
      </div>

      {/* Strategy Inputs */}
      <div className="space-y-3 mb-4">
        {strategy.map(([compound, laps], i) => (
          <div key={i} className="flex items-center gap-3">
            <select
              value={compound}
              onChange={(e) => updateCompound(i, e.target.value)}
              className={`px-4 py-2 rounded ${TYRE_COLORS[compound]}`}
            >
              {AVAILABLE_COMPOUNDS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={laps}
              onChange={(e) => updateStint(i, Number(e.target.value))}
              className="field w-24"
            />
            <span className="opacity-60 text-sm">laps</span>

            <button
              onClick={() => deleteStint(i)}
              className="ml-2 px-3 py-1 bg-[color:var(--muted)] hover:bg-slate-200 border border-[color:var(--line)] rounded text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        <div>
          <button
            onClick={addStint}
            className="px-3 py-1 bg-[color:var(--muted)] hover:bg-slate-200 border border-[color:var(--line)] rounded text-sm"
          >
            + Add Stint
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={runSim}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          {loading ? "Running..." : "Run Strategy Simulation"}
        </button>

        <button
          onClick={suggestBest}
          disabled={loading}
          className="px-4 py-2 bg-amber-300 hover:bg-amber-400 text-slate-900 font-semibold rounded"
        >
          {loading ? "Searching..." : "Suggest Best Strategy"}
        </button>
      </div>

      {/* Simulation Output */}
      {result && (
        <>
          <p className="text-xl mt-6">
            <strong>Total Race Time:</strong>{" "}
            <span className="text-amber-600">
              {result.total_race_time}s
            </span>
          </p>
          <StrategyChart lapTimes={result.lap_times} />
        </>
      )}

      {/* Modal for best strategy */}
      <Modal open={!!bestFound} onClose={() => setBestFound(null)}>
        <h2 className="text-2xl font-bold text-amber-600 mb-4">
          🔥 Best Strategy Found
        </h2>

        {bestFound?.strategy.map(([compound, laps], i) => (
          <p key={i} className="text-lg mb-1">
            <span className="font-semibold">{compound}</span> — {laps} laps
          </p>
        ))}

        <p className="mt-4 text-slate-600">
          Estimated Race Time:
          <span className="text-amber-600 font-semibold">
            {" "}
            {bestFound?.time?.toFixed(3)}s
          </span>
        </p>
      </Modal>
    </div>
  );
}
