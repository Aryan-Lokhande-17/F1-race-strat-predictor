import { useQuery } from '@tanstack/react-query'
import { getLatestRaceSession, getLatestWeather } from '../lib/openf1'

export default function Weather(){
  const latest = useQuery({
    queryKey: ['latest-session'],
    queryFn: async () => (await getLatestRaceSession()).data,
  })

  const weather = useQuery({
    queryKey: ['latest-weather', latest.data?.meeting_key],
    enabled: !!latest.data?.meeting_key,
    queryFn: async () => (await getLatestWeather(latest.data!.meeting_key)).data,
  })

  if (latest.isLoading) return <div className="card p-4">Loading latest race…</div>
  if (!latest.data) return <div className="card p-4">No race sessions found.</div>

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <div className="text-lg font-semibold">Latest Weather — {latest.data.country_name} GP</div>
        <div className="text-sm text-[color:var(--subtle)]">{new Date(weather.data?.date ?? latest.data.date_start).toUTCString()}</div>
        {weather.isLoading ? (
          <div className="pt-3">Loading weather…</div>
        ) : weather.data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-sm">
            <Stat label="Air Temp" value={`${weather.data.air_temperature.toFixed(1)}°C`} />
            <Stat label="Track Temp" value={`${weather.data.track_temperature.toFixed(1)}°C`} />
            <Stat label="Humidity" value={`${weather.data.humidity}%`} />
            <Stat label="Pressure" value={`${weather.data.pressure.toFixed(1)} hPa`} />
            <Stat label="Wind" value={`${weather.data.wind_speed.toFixed(1)} m/s @ ${weather.data.wind_direction}°`} />
            <Stat label="Rainfall" value={weather.data.rainfall ? 'Yes' : 'No'} />
          </div>
        ) : (
          <div className="pt-3">No weather data found.</div>
        )}
      </div>
    </div>
  )
}

function Stat({label, value}:{label:string; value:string}){
  return (
    <div className="bg-[color:var(--card)] border border-neutral-800 rounded-md p-3">
      <div className="uppercase text-[10px] tracking-wide opacity-60">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  )
}
