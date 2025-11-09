export default function Home(){
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-b from-red-900/20 via-transparent to-transparent p-10">
        <div className="max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-neutral-900/70 px-3 py-1 text-xs text-[color:var(--subtle)] border border-neutral-800">Powered by OpenF1</div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight"><span className="text-[color:var(--brand)]">Race</span> Strategy
            <br/>Prediction Hub</h1>
          <p className="mt-3 text-[color:var(--muted-text)]">Harness historical F1 data to explore race strategy, podium finishes, starting grids, and weather with clean visual analytics.</p>
          <div className="mt-6 flex gap-3">
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.25),transparent_60%)]" />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Everything You Need for <span className="text-[color:var(--brand)]">Race Analysis</span></h2>
        <p className="text-sm text-[color:var(--muted-text)]">Access predictions, visualizations, and insights in one place.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map(f=> (
            <a key={f.title} href={f.href} className="card p-4 group hover:shadow-md transition">
              <div className="mb-2 text-[color:var(--muted-text)] text-xs">{f.kicker}</div>
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">{f.title}</div>
                <div className="text-[color:var(--brand)] opacity-80 group-hover:opacity-100">→</div>
              </div>
              <div className="mt-2 text-sm text-[color:var(--muted-text)]">{f.desc}</div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Metric value="60+" label="Historical Races" />
        <Metric value="20+" label="Active Drivers" />
        <Metric value="5" label="Tyre Compounds" />
      </section>
    </div>
  )
}

function Metric({ value, label }:{ value:string; label:string }){
  return (
    <div className="card p-4 text-center">
      <div className="text-3xl font-bold text-[color:var(--brand)]">{value}</div>
      <div className="text-sm text-[color:var(--muted-text)]">{label}</div>
    </div>
  )
}

const FEATURES = [
  { title: 'Strategy Simulator', href: '/ml', kicker: 'AI', desc: 'Model-generated tyre strategies per driver (placeholder).'},
  { title: 'Podium Predictor', href: '/ml', kicker: 'AI', desc: 'Predict the top 3 finishers (placeholder).'},
  { title: 'Simulation', href: '/simulation', kicker: 'Grid', desc: 'View starting grid and race results.'},
  { title: 'Race Data Explorer', href: '/historical', kicker: 'Data', desc: 'Comprehensive historical racing data.'},
  { title: 'Weather Center', href: '/weather', kicker: 'Live', desc: 'Latest race weekend weather.'},
  { title: 'Tyre Wear Insights', href: '/historical', kicker: 'Analysis', desc: 'Visualize compound performance trends (placeholder).'},
]
