import { useState } from "react";
import { predictStrategy } from "../api/strategy";
import StrategyChart from "../components/StrategyChart";
import { findBestStrategy } from "../lib/strategySearch";
import type { Stint } from "../lib/strategySearch";


const TYRE_COLORS: Record<string, string> = {
  SOFT: "bg-red-600",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-gray-300 text-black",
};

export default function StrategySimulator() {
  const [strategy, setStrategy] = useState<Stint[]>([
    ["MEDIUM", 12],
    ["HARD", 28],
    ["SOFT", 10],
  ]);

  const [result, setResult] = useState<any>(null);
  const [bestFound, setBestFound] = useState<{ strategy: Stint[]; time: number } | null>(null);

  const runSim = async () => {
    const payload = {
      track: "Bahrain",
      strategy,
      base_lap_time: 96.4,
      pit_loss: 21.5,
      driverId: 830,
      constructorId: 131,
      circuitId: 1,
    };

    try {
      const data = await predictStrategy(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Strategy simulation failed");
    }
  };

  const suggestBest = async () => {
    const base = {
      track: "Bahrain",
      base_lap_time: 96.4,
      pit_loss: 21.5,
      driverId: 830,
      constructorId: 131,
      circuitId: 1,
    };

    const best = await findBestStrategy(base);
    if (!best) return alert("⚠ No valid strategy found");

    setStrategy(best.strategy);     // ✅ Apply best strategy to UI
    setBestFound(best);            // ✅ Show modal UI
  };

  const updateStint = (i: number, laps: number) => {
    setStrategy(prev => prev.map((s, idx) => (idx === i ? [s[0], Number(laps)] : s)));
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Tyre Strategy Simulator</h1>

      {/* Strategy Inputs */}
      <div className="space-y-3 mb-4">
        {strategy.map(([compound, laps], i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded ${TYRE_COLORS[compound]}`}>
              {compound}
            </div>

            <input
              type="number"
              min={1}
              className="bg-neutral-800 p-2 rounded w-24"
              value={laps}
              onChange={(e) => updateStint(i, Number(e.target.value))}
            />

            <span className="opacity-60 text-sm">laps</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={runSim}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          Run Strategy Simulation
        </button>

        <button
          onClick={suggestBest}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 font-semibold rounded"
        >
          Suggest Best Strategy
        </button>
      </div>

      {/* Simulation Output */}
      {result && (
        <>
          <p className="text-xl mt-6">
            <strong>Total Race Time:</strong> {result.total_race_time}s
          </p>
          <StrategyChart lapTimes={result.lap_times} />
        </>
      )}

      {/* ✅ Modal UI */}
      {bestFound && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-neutral-900 p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4">🔥 Best Strategy Found</h2>

            <ul className="mb-4 space-y-2">
              {bestFound.strategy.map(([compound, laps], i) => (
                <li key={i} className="text-lg">
                  • <span className="font-semibold">{compound}</span> — {laps} laps
                </li>
              ))}
            </ul>

            <p className="text-md mb-4">
              <strong>Estimated Race Time:</strong> {bestFound.time.toFixed(3)}s
            </p>

            <button
              onClick={() => setBestFound(null)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
