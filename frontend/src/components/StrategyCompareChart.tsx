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

type Stint = [string, number];

// Compound Colors
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "rgba(255, 80, 80, 0.95)",
  MEDIUM: "rgba(255, 215, 0, 0.95)",
  HARD: "rgba(200, 200, 200, 0.95)",
};

// Allows dynamic keys: A0, A1, B0, B1, etc.
type Row = {
  lap: number;
  delta: number | null;
  [key: string]: number | null;
};


function stintBasedDelta(laps: number[], strategy: [string, number][]) {
  const deltas: (number | null)[] = Array(laps.length).fill(null);
  let lapIndex = 0;

  strategy.forEach(([, stintLaps]) => {
    if (lapIndex >= laps.length) return;

    const stintStartTime = laps[lapIndex]; // baseline at start of stint

    for (let i = 0; i < stintLaps && lapIndex < laps.length; i++, lapIndex++) {
      deltas[lapIndex] = laps[lapIndex] - stintStartTime;
    }
  });

  return deltas;
}


function buildData(
  lapTimesA: number[],
  lapTimesB: number[],
  strategyA: Stint[],
  strategyB: Stint[]
) {
  // ✅ Use improved Δ function
  const a = stintBasedDelta(lapTimesA, strategyA);
  const b = stintBasedDelta(lapTimesB, strategyB);

  const n = Math.max(a.length, b.length);
  const keysA = strategyA.map((_, i) => `A${i}`);
  const keysB = strategyB.map((_, i) => `B${i}`);

  const data: Row[] = Array.from({ length: n }, (_, i) => {
    const base: Row = { lap: i + 1, delta: null };
    keysA.forEach((k) => (base[k] = null));
    keysB.forEach((k) => (base[k] = null));
    return base;
  });

  // Fill A
  {
    let idx = 0;
    strategyA.forEach(([_compound, laps], sIdx) => {
      for (let k = 0; k < laps && idx < n; k++, idx++) {
        data[idx][`A${sIdx}`] = a[idx];
      }
    });
  }

  // Fill B
  {
    let idx = 0;
    strategyB.forEach(([_compound, laps], sIdx) => {
      for (let k = 0; k < laps && idx < n; k++, idx++) {
        data[idx][`B${sIdx}`] = b[idx];
      }
    });
  }

  for (let i = 0; i < n; i++) {
   if (a[i] != null && b[i] != null) {
  data[i].delta = (b[i] as number) - (a[i] as number);
} else {
  data[i].delta = null;
}
  }

  return { data, keysA, keysB };
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
  const { data, keysA, keysB } = buildData(lapTimesA, lapTimesB, strategyA, strategyB);

  return (
    <div className="card p-4 mt-4">
      <div className="text-lg font-semibold mb-2">
        Strategy Comparison Pace Curve (Δ Pace)
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="lap" />
          <YAxis />
          <Tooltip />
          <Legend />

          {/* Strategy A */}
          {strategyA.map(([compound], i) => (
            <Line
              key={`A${i}`}
              type="monotone"
              dataKey={`A${i}`}
              name={`Strategy A — ${compound}`}
              stroke={COMPOUND_COLORS[compound.toUpperCase()] || "#7db3ff"}
              dot={{ r: 2 }}
              strokeWidth={2}
              connectNulls
            />
          ))}

          {/* Strategy B */}
          {strategyB.map(([compound], i) => (
            <Line
              key={`B${i}`}
              type="monotone"
              dataKey={`B${i}`}
              name={`Strategy B — ${compound}`}
              stroke={COMPOUND_COLORS[compound.toUpperCase()] || "#ff8a8a"}
              dot={{ r: 2 }}
              strokeWidth={2}
              strokeOpacity={0.9}
              connectNulls
            />
          ))}

          {/* Δ (B - A) */}
          <Line
            type="monotone"
            dataKey="delta"
            name="Δ (B - A)"
            stroke="gold"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
