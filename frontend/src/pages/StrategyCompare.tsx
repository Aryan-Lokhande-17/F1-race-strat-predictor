// frontend/src/pages/StrategyCompare.tsx
import { useState } from "react";
import { predictStrategy } from "../api/strategy";
import StrategyCompareChart from "../components/StrategyCompareChart";

type StrategySimResult = {
  total_race_time: number;
  lap_times: number[];
};

const TYRE_OPTIONS = ["SOFT", "MEDIUM", "HARD"];

export default function StrategyCompare() {
  const [A, setA] = useState<[string, number][]>([
    ["MEDIUM", 12],
    ["HARD", 28],
    ["SOFT", 10],
  ]);

  const [B, setB] = useState<[string, number][]>([
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

  const StrategyEditor = ({
    label,
    strat,
    setStrat,
  }: {
    label: string;
    strat: [string, number][];
    setStrat: (s: [string, number][]) => void;
  }) => (
    <div className="p-4 border border-neutral-800 rounded-lg">
      <h2 className="font-semibold mb-2">{label}</h2>

      {strat.map(([compound, laps], i) => (
        <div key={i} className="flex items-center gap-3 mb-2">
          <select
            className="bg-neutral-800 p-2 rounded"
            value={compound}
            onChange={(e) => {
              const next = [...strat];
              next[i][0] = e.target.value;
              setStrat(next as any);
            }}
          >
            {TYRE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            className="bg-neutral-800 p-2 rounded w-20"
            value={laps}
            onChange={(e) => {
              const next = [...strat];
              next[i][1] = Number(e.target.value);
              setStrat(next as any);
            }}
          />

          <button
            className="text-red-500 hover:text-red-400"
            onClick={() => setStrat(strat.filter((_, x) => x !== i) as any)}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        className="mt-2 px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
        onClick={() => setStrat([...strat, ["SOFT", 10]] as any)}
      >
        + Add Stint
      </button>
    </div>
  );

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Compare 2 Race Strategies</h1>

      {/* Editing UI */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <StrategyEditor label="Strategy A" strat={A} setStrat={setA} />
        <StrategyEditor label="Strategy B" strat={B} setStrat={setB} />
      </div>

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
            strategyA={A}
            strategyB={B}
          />
        </>
      )}
    </div>
  );
}
