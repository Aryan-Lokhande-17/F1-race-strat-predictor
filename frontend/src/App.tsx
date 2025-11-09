import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import Historical from './pages/Historical'
import WeatherPage from './pages/Weather'
import SimulationPage from './pages/Simulation'
import TrackInfoPage from './pages/TrackInfo'
import HomePage from './pages/Home'
import StrategySimulator from "./pages/StrategySimulator";


const qc = new QueryClient()

function Nav() {
  const { pathname } = useLocation()
  const tabs = [
    { path: '/historical', label: 'Race Data' },
    { path: '/simulation', label: 'Simulation' },
    { path: '/track-info', label: 'Track Info' },
    { path: '/weather', label: 'Weather' },
    { path: '/ml', label: 'ML Predictions' },
  ]
  return (
    <header className="border-b border-neutral-800 sticky top-0 z-10 bg-[color:var(--bg)]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
        <Link to="/" className="text-xl font-semibold hover:opacity-90 transition"><span className="text-[color:var(--brand)]"></span>F1 Dashboard</Link>
        <nav className="flex items-center gap-2 flex-wrap">
          {tabs.map(t => (
            <Link key={t.path} to={t.path} className={`px-3 py-1.5 rounded-md text-sm ${pathname===t.path? 'bg-[color:var(--brand)] text-white' : 'hover:bg-neutral-900 text-[color:var(--subtle)]'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <Nav />
      <main className="mx-auto max-w-7xl p-4">
        {children}
      </main>
    </div>
  )
}

function Simulation() { return <SimulationPage /> }
function ML() { return <StrategySimulator /> }

export default function App(){
  return (
    <QueryClientProvider client={qc}>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/historical" element={<Historical />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/track-info" element={<TrackInfoPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/ml" element={<ML />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </QueryClientProvider>
  )
}
