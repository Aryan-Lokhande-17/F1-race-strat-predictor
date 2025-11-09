import { useState } from "react";
import { predictStrategy } from "../api/strategy";

export default function StrategySimulator() {
  const [result, setResult] = useState<any>(null);

 const runSim = async () => {
  console.log("Button clicked ✅");
  const data = await predictStrategy(
    [["MEDIUM", 12], ["HARD", 28], ["SOFT", 10]],
    92.45,
    22.0
  );
  console.log("API Response:", data);
  setResult(data);
};


  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">F1 Race Strategy Simulator</h1>
      <button
        onClick={runSim}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
      >
        Run Strategy Simulation
      </button>

      {result && (
        <div className="mt-6">
          <p className="text-xl mb-2">
            <strong>Total Race Time:</strong> {result.total_race_time} sec
          </p>

          <p className="font-semibold mb-1">First 10 lap predictions:</p>
          <pre className="bg-gray-900 p-4 rounded-lg text-sm max-w-lg overflow-auto">
            {JSON.stringify(result.lap_times.slice(0, 10), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
