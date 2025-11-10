import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function StrategyChart({ lapTimes }: { lapTimes: number[] }) {
  if (!lapTimes || lapTimes.length === 0) return null;

  const base = lapTimes[0];
  const data = lapTimes.map((t, i) => ({
    lap: i + 1,
    delta: Number((t - base).toFixed(3)),
  }));

  return (
    <div className="mt-6 bg-neutral-900 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Tyre Degradation Curve (Δ Pace)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="lap" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip
            contentStyle={{
              background: "#111",
              border: "1px solid #333",
              color: "white",
            }}
          />
          <Line type="monotone" dataKey="delta" stroke="#ff4747" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
