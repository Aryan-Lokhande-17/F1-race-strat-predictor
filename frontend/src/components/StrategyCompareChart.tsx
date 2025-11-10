import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  lapTimesA: number[];
  lapTimesB: number[];
};

export default function StrategyCompareChart({ lapTimesA, lapTimesB }: Props) {
  const maxLen = Math.max(lapTimesA.length, lapTimesB.length);

  const data = Array.from({ length: maxLen }).map((_, i) => ({
    lap: i + 1,
    A: lapTimesA[i] ?? null,
    B: lapTimesB[i] ?? null,
  }));

  return (
    <div className="mt-6 p-4 bg-neutral-900 rounded-lg">
      <h2 className="text-lg mb-2">Strategy Comparison Pace Curve</h2>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <XAxis dataKey="lap" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip />
          <Line type="monotone" dataKey="A" stroke="#ff4d4d" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="B" stroke="#4da6ff" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
