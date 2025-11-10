// frontend/src/pages/StrategyCompare.tsx
import { useState } from "react";
import { predictStrategy } from "../api/strategy";
import StrategyCompareChart from "../components/StrategyCompareChart";

type StrategySimResult = {
  total_race_time: number;
  lap_times: number[];
};

export default function StrategyCompare() {
  const [A] = useState<[string, number][]>([
    ["MEDIUM", 12],
    ["HARD", 28],
    ["SOFT", 10],
  ]);

  const [B] = useState<[string, number][]>([
    ["SOFT", 10],
    ["MEDIUM", 32],
    ["HARD", 15],
  ]);

  const [result, setResult] = useState<{ A: StrategySimResult; B: StrategySimResult } | null>(null);

  const runCompare = async () => {
    const base = {
      track: "Bahrain",
      base_lap_time: 96.4,
      pit_loss: 21.5,
      driverId: 830,
      constructorId: 131,
      circuitId: 1,
    };

    const resA = await predictStrategy({ ...base, strategy: A });
    const resB = await predictStrategy({ ...base, strategy: B });

    setResult({ A: resA, B: resB });
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Compare 2 Race Strategies</h1>

      <button
        onClick={runCompare}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Run Comparison
      </button>

      {result && (
        <>
          <p className="text-xl mt-6">
            Strategy A: {result.A.total_race_time}s <br />
            Strategy B: {result.B.total_race_time}s <br />
            <strong>
              Δ = {(result.B.total_race_time - result.A.total_race_time).toFixed(3)}s
            </strong>
          </p>

          <StrategyCompareChart
            lapTimesA={result.A.lap_times}
            lapTimesB={result.B.lap_times}
          />
        </>
      )}
    </div>
  );
}
