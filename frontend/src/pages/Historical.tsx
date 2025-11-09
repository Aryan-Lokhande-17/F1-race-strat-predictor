import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeetingsByYear, getRaceSessionForMeeting, getStartingGrid, getSessionResults, getStints, getDriversByMeeting, getQualifyingSessionForMeeting } from '../lib/openf1-extra'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({length: CURRENT_YEAR - 2017}, (_,i)=> CURRENT_YEAR - i)

export default function Historical(){
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const meetings = useQuery({
    queryKey: ['meetings', year],
    queryFn: async () => (await getMeetingsByYear(year)).data ?? [],
  })

  const defaultMeeting = useMemo(()=> meetings.data?.[meetings.data.length-1]?.meeting_key, [meetings.data])
  const [meetingKey, setMeetingKey] = useState<number | null>(null)

  const activeMeeting = meetingKey ?? defaultMeeting ?? null

  const raceSession = useQuery({
    queryKey: ['race-session', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getRaceSessionForMeeting(activeMeeting!)).data,
  })

  const drivers = useQuery({
    queryKey: ['drivers', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getDriversByMeeting(activeMeeting!)).data ?? [],
  })

  const grid = useQuery({
    queryKey: ['grid', raceSession.data?.session_key],
    enabled: !!raceSession.data?.session_key,
    queryFn: async ()=> (await getStartingGrid(raceSession.data!.session_key)).data ?? [],
  })

  const qualSession = useQuery({
    queryKey: ['qual-session', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getQualifyingSessionForMeeting(activeMeeting!)).data,
  })

  const qualGrid = useQuery({
    queryKey: ['qual-grid', qualSession.data?.session_key],
    enabled: !!qualSession.data?.session_key,
    queryFn: async ()=> (await getStartingGrid(qualSession.data!.session_key)).data ?? [],
  })

  const results = useQuery({
    queryKey: ['results', raceSession.data?.session_key],
    enabled: !!raceSession.data?.session_key,
    queryFn: async ()=> (await getSessionResults(raceSession.data!.session_key)).data ?? [],
  })

  const stints = useQuery({
    queryKey: ['stints', raceSession.data?.session_key],
    enabled: !!raceSession.data?.session_key,
    queryFn: async ()=> (await getStints(raceSession.data!.session_key)).data ?? [],
  })

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-70">Season</label>
          <select className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1" value={year} onChange={e=>{ setYear(Number(e.target.value)); setMeetingKey(null); }}>
            {YEARS.map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-70">Race</label>
          <select className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1" value={activeMeeting ?? ''} onChange={e=> setMeetingKey(Number(e.target.value))}>
            {meetings.isLoading && <option>Loading…</option>}
            {!meetings.isLoading && meetings.data?.map(m=> (
              <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_name}</option>
            ))}
          </select>
        </div>
      </div>

      {raceSession.isLoading && <div className="card p-4">Loading race session…</div>}
      {raceSession.data && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="font-semibold mb-3">Starting Grid</div>
            {(grid.isLoading || qualGrid.isLoading) && <div className="text-sm opacity-70">Loading starting grid…</div>}
            {!(grid.isLoading || qualGrid.isLoading) && (!((grid.data && grid.data.length>0) || (qualGrid.data && qualGrid.data.length>0))) && (
              <div className="text-sm opacity-70">No starting grid available for this race/qualifying session.</div>
            )}
            {(() => { const data = (grid.data && grid.data.length>0) ? grid.data : (qualGrid.data || []); return data && data.length>0 ? (
            <div className="flex gap-6">
              <div className="flex-1 space-y-2">
                {data
                  .filter(x=> x.position % 2 === 1)
                  .sort((a,b)=> a.position-b.position)
                  .map(g=> (
                    <div key={`${g.position}-${g.driver_number}`} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2">
                      <div className="text-xs opacity-70">P{g.position}</div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs text-white" style={{ backgroundColor: teamColorForDriver(drivers.data, g.driver_number) || '#444' }}>{g.driver_number}</span>
                        <span className="font-mono">{code3FromDrivers(drivers.data, g.driver_number)}</span>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex-1 space-y-2">
                {data
                  .filter(x=> x.position % 2 === 0)
                  .sort((a,b)=> a.position-b.position)
                  .map(g=> (
                    <div key={`${g.position}-${g.driver_number}`} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2">
                      <div className="text-xs opacity-70">P{g.position}</div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs text-white" style={{ backgroundColor: teamColorForDriver(drivers.data, g.driver_number) || '#444' }}>{g.driver_number}</span>
                        <span className="font-mono">{code3FromDrivers(drivers.data, g.driver_number)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            ) : null })()}
            {(grid.data && grid.data.length===0 && qualGrid.data && qualGrid.data.length>0) && (
              <div className="mt-2 text-xs opacity-60">Using Qualifying results as grid.</div>
            )}
          </div>
          <div className="card p-4">
            <div className="font-semibold mb-2">Results</div>
            <ol className="text-sm space-y-1">
              {results.data?.map(r=> {
                const hasPos = typeof r.position === 'number' && r.position > 0
                const left = hasPos ? `P${r.position}` : (r.status || '—')
                const cls = hasPos && r.position <= 3 ? 'text-[color:var(--brand)]' : ''
                return (
                  <li key={r.driver_number} className={`flex justify-between ${cls}`}>
                    <span className="opacity-70">{left}</span>
                    <span className="font-mono">{driverLabel(drivers.data, r.driver_number)}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}

      {stints.data && stints.data.length>0 && (
        <div className="card p-4">
          <div className="font-semibold mb-3">Tyre Strategy</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="py-1 pr-4">Driver</th>
                  <th className="py-1">Stints</th>
                </tr>
              </thead>
              <tbody>
                {groupByDriver(stints.data).map(row=> (
                  <tr key={row.driver_number} className="border-t border-neutral-800">
                    <td className="py-2 pr-4 font-mono">{driverLabel(drivers.data, row.driver_number)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {row.stints.map(s=> (
                          <span key={s.stint_number} className={`px-2 py-1 rounded bg-neutral-900 border border-neutral-800`}>{s.compound} ({s.lap_start}-{s.lap_end})</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function driverLabel(drivers: any[] | undefined, num: number){
  const d = drivers?.find(d=> d.driver_number===num)
  return d ? `${d.broadcast_name ?? d.full_name ?? num}` : String(num)
}

function groupByDriver(stints: any[]){
  const map = new Map<number, any[]>()
  for (const s of stints){
    if (!map.has(s.driver_number)) map.set(s.driver_number, [])
    map.get(s.driver_number)!.push(s)
  }
  return Array.from(map.entries()).map(([driver_number, stints])=>({ driver_number, stints }))
}

function code3FromDrivers(drivers:any[]|undefined, num:number){
  const d = (drivers ?? []).find(x=> x.driver_number===num)
  const full = d?.full_name as string | undefined
  if(!full) return 'DRI'
  const parts = full.trim().split(/\s+/)
  const last = parts[parts.length-1] || full
  return last.substring(0,3).toUpperCase()
}

const TEAM_COLORS: Record<string,string> = {
  'red bull': '#3671C6',
  'rb': '#143C8C',
  'mclaren': '#FF8700',
  'ferrari': '#DC0000',
  'mercedes': '#00D2BE',
  'aston martin': '#006F62',
  'alpine': '#0090FF',
  'williams': '#005AFF',
  'haas': '#B6BABD',
  'sauber': '#00E701',
  'audi': '#9E0B0F',
}

function normalizeTeamName(name?: string){
  const s = (name || '').toLowerCase()
  if (s.includes('red bull')) return 'red bull'
  if (s.includes('visa') || s.includes('cash app') || s === 'rb' || s.includes('rb f1')) return 'rb'
  if (s.includes('mclaren')) return 'mclaren'
  if (s.includes('ferrari')) return 'ferrari'
  if (s.includes('mercedes')) return 'mercedes'
  if (s.includes('aston')) return 'aston martin'
  if (s.includes('alpine') || s.includes('renault')) return 'alpine'
  if (s.includes('williams')) return 'williams'
  if (s.includes('haas')) return 'haas'
  if (s.includes('sauber') || s.includes('stake') || s.includes('kick')) return 'sauber'
  if (s.includes('audi')) return 'audi'
  return s
}

function teamColorForDriver(drivers:any[]|undefined, dn:number){
  const d = (drivers ?? []).find(x=> x.driver_number===dn)
  const key = normalizeTeamName(d?.team_name)
  return TEAM_COLORS[key]
}
