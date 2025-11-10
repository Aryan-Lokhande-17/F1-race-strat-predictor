import { useState } from "react";
import { predictStrategy } from "../api/strategy";
import StrategyChart from "../components/StrategyChart";

const TYRE_COLORS: Record<string, string> = {
  SOFT: "bg-red-600",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-gray-300 text-black",
};

export default function StrategySimulator() {
  const [strategy, setStrategy] = useState<[string, number][]>([
    ["MEDIUM", 12],
    ["HARD", 28],
    ["SOFT", 10],
  ]);

  const [result, setResult] = useState<any>(null);

  const runSim = async () => {
    console.log("Button clicked ✅");
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
      console.log("✅ API Response:", data);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Strategy simulation failed");
    }
  };

  const updateStint = (i: number, laps: number) => {
    setStrategy(prev =>
      prev.map((s, idx) => (idx === i ? [s[0], Number(laps)] : s))
    );
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Tyre Strategy Simulator</h1>

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

      <button
        onClick={runSim}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
      >
        Run Strategy Simulation
      </button>

      {result && (
        <>
          <p className="text-xl mt-6">
            <strong>Total Race Time:</strong> {result.total_race_time}s
          </p>

          <StrategyChart lapTimes={result.lap_times} />
        </>
      )}
    </div>
  );
}
