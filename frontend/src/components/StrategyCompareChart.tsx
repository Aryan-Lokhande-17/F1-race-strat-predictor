// frontend/src/components/StrategyCompareChart.tsx
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type Stint = [string, number];

// Colors for compounds
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "rgba(255, 80, 80, 0.95)",
  MEDIUM: "rgba(255, 215, 0, 0.95)",
  HARD: "rgba(200, 200, 200, 0.95)",
};

// Row format to allow dynamic stint-key columns
type Row = {
  lap: number;
  delta: number | null;
  [key: string]: number | null;
};

// ✅ Improved Δ pace per stint
function stintBasedDelta(laps: number[], strategy: [string, number][]) {
  const deltas: (number | null)[] = Array(laps.length).fill(null);
  let lapIndex = 0;

  for (const [, stintLaps] of strategy) {
    if (lapIndex >= laps.length) break;
    const baseline = laps[lapIndex];

    for (let i = 0; i < stintLaps && lapIndex < laps.length; i++, lapIndex++) {
      deltas[lapIndex] = laps[lapIndex] - baseline;
    }
  }
  return deltas;
}

// Build final chart-ready dataset
function buildData(
  lapTimesA: number[],
  lapTimesB: number[],
  strategyA: Stint[],
  strategyB: Stint[]
) {
  const a = stintBasedDelta(lapTimesA, strategyA);
  const b = stintBasedDelta(lapTimesB, strategyB);

  const n = Math.max(a.length, b.length);
  const keysA = strategyA.map((_, i) => `A${i}`);
  const keysB = strategyB.map((_, i) => `B${i}`);

  const data: Row[] = Array.from({ length: n }, (_, i) => {
    const row: Row = { lap: i + 1, delta: null };
    [...keysA, ...keysB].forEach((k) => (row[k] = null));
    return row;
  });

  let idxA = 0;
  strategyA.forEach(([, len], sIdx) => {
    for (let k = 0; k < len && idxA < n; k++, idxA++) {
      data[idxA][`A${sIdx}`] = a[idxA];
    }
  });

  let idxB = 0;
  strategyB.forEach(([, len], sIdx) => {
    for (let k = 0; k < len && idxB < n; k++, idxB++) {
      data[idxB][`B${sIdx}`] = b[idxB];
    }
  });

  // Δ pace line
  for (let i = 0; i < n; i++) {
    data[i].delta = (a[i] !== null && b[i] !== null) ? (b[i]! - a[i]!) : null;
  }

  return data;
}

export default function StrategyCompareChart({
  lapTimesA,
  lapTimesB,
  strategyA,
  strategyB,
}: {
  lapTimesA: number[];
  lapTimesB: number[];
  strategyA: Stint[];
  strategyB: Stint[];
}) {
  const data = buildData(lapTimesA, lapTimesB, strategyA, strategyB);

  return (
    <div className="card p-4 mt-4">
      <div className="text-lg font-semibold mb-2">
        Strategy Comparison Pace Curve (Δ Pace)
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data} margin={{ top: 15, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="lap" />
          <YAxis />
          <Tooltip />
          <Legend />

          {strategyA.map(([compound], i) => (
            <Line
              key={`A${i}`}
              type="monotone"
              dataKey={`A${i}`}
              name={`Strategy A — ${compound}`}
              stroke={COMPOUND_COLORS[compound.toUpperCase()] || "#7db3ff"}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}

          {strategyB.map(([compound], i) => (
            <Line
              key={`B${i}`}
              type="monotone"
              dataKey={`B${i}`}
              name={`Strategy B — ${compound}`}
              stroke={COMPOUND_COLORS[compound.toUpperCase()] || "#ff8a8a"}
              strokeWidth={2}
              strokeOpacity={0.9}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}

          <Line
            type="monotone"
            dataKey="delta"
            name="Δ (B - A)"
            stroke="gold"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
