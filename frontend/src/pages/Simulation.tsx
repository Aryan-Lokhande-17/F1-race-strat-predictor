import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeetingsByYear, getRaceSessionForMeeting, getDriversByMeeting, getPositionsByMeeting, getLaps } from '../lib/openf1-extra'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({length: CURRENT_YEAR - 2017}, (_,i)=> CURRENT_YEAR - i)

export default function Simulation(){
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const meetings = useQuery({
    queryKey: ['sim-meetings', year],
    queryFn: async () => (await getMeetingsByYear(year)).data ?? [],
  })
  const defaultMeeting = useMemo(()=> meetings.data?.[meetings.data.length-1]?.meeting_key, [meetings.data])
  const [meetingKey, setMeetingKey] = useState<number | null>(null)
  const activeMeeting = meetingKey ?? defaultMeeting ?? null

  const raceSession = useQuery({
    queryKey: ['sim-race-session', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getRaceSessionForMeeting(activeMeeting!)).data,
  })

  const drivers = useQuery({
    queryKey: ['sim-drivers', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getDriversByMeeting(activeMeeting!)).data ?? [],
  })

  const positions = useQuery({
    queryKey: ['positions', raceSession.data?.meeting_key, raceSession.data?.session_key],
    enabled: !!raceSession.data?.meeting_key && !!raceSession.data?.session_key,
    queryFn: async ()=> {
      const all = (await getPositionsByMeeting(raceSession.data!.meeting_key)).data ?? []
      return all.filter(p=> p.session_key === raceSession.data!.session_key)
    },
  })

  const lapsRaw = useQuery({
    queryKey: ['laps', raceSession.data?.session_key],
    enabled: !!raceSession.data?.session_key,
    queryFn: async ()=> (await getLaps(raceSession.data!.session_key)).data ?? [],
  })

  const [selected, setSelected] = useState<number[]>([])

  const laps = useMemo(()=>{
    const pos = (positions.data ?? []).slice()
    const lapsData = lapsRaw.data ?? []
    if (lapsData.length===0) return [] as any[]

    // Build global lap start times (min date_start across drivers per lap)
    const lapStartMap = new Map<number, number>()
    for(const l of lapsData){
      const ts = Date.parse(l.date_start)
      const cur = lapStartMap.get(l.lap_number)
      if (cur==null || ts < cur) lapStartMap.set(l.lap_number, ts)
    }
    const lapNumbers = Array.from(lapStartMap.entries()).sort((a,b)=> a[0]-b[0]).map(([lap])=> lap)

    // Per-driver positions sorted by date and pointer index
    const byDriver = new Map<number, {items:{ts:number; pos:number}[], idx:number, current:number|null}>()
    for(const p of pos){
      const dn = p.driver_number
      if(!byDriver.has(dn)) byDriver.set(dn, { items: [], idx: 0, current: null })
      byDriver.get(dn)!.items.push({ ts: Date.parse(p.date), pos: p.position })
    }
    for(const v of byDriver.values()) v.items.sort((a,b)=> a.ts-b.ts)

    const data:any[] = []
    for (const lap of lapNumbers){
      const lapTs = lapStartMap.get(lap)!
      const row:any = { lap }
      for(const d of (drivers.data ?? [])){
        const dn = d.driver_number
        const state = byDriver.get(dn)
        if (state){
          // advance pointer to last item with ts <= lapTs
          while(state.idx < state.items.length && state.items[state.idx].ts <= lapTs){
            state.current = state.items[state.idx].pos
            state.idx++
          }
          if (state.current!=null) row[dn] = state.current
        }
      }
      data.push(row)
    }
    return data
  }, [positions.data, lapsRaw.data, drivers.data])

  const top3AtEnd = useMemo(()=>{
    const arr:any[] = positions.data ?? []
    // Build latest position record per driver by date
    const latest = new Map<number, any>()
    for(const p of arr){
      const prev = latest.get(p.driver_number)
      if(!prev || Date.parse(p.date) > Date.parse(prev.date)) latest.set(p.driver_number, p)
    }
    const sorted = Array.from(latest.values()).sort((a,b)=> a.position - b.position)
    return sorted.slice(0,3)
  }, [positions.data])

  // Auto-select top 3 drivers when data loads and nothing is selected
  useEffect(()=>{
    if (selected.length===0 && top3AtEnd.length>0){
      setSelected(top3AtEnd.map(e=> e.driver_number))
      return
    }
    // Fallback: if none of the selected have data, pick the first 3 drivers that have position data
    const withData = driverNumbersWithData(positions.data)
    const selectedWithData = selected.filter(n=> withData.has(n))
    if (withData.size>0 && selectedWithData.length===0){
      setSelected(Array.from(withData).slice(0,3) as number[])
      return
    }
    // Final fallback: ensure selected have actual chart series in built laps data
    const withSeries = driverNumbersWithSeries(laps)
    const selectedWithSeries = selected.filter(n=> withSeries.has(n))
    if (withSeries.size>0 && selectedWithSeries.length===0){
      setSelected(Array.from(withSeries).slice(0,3) as number[])
    }
  }, [top3AtEnd, selected.length, positions.data, laps])

  function toggle(num:number){
    setSelected(prev=> prev.includes(num) ? prev.filter(x=>x!==num) : [...prev, num])
  }

  const [hoverLap, setHoverLap] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-70">Season</label>
          <select className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1" value={year} onChange={e=>{ setYear(Number(e.target.value)); setMeetingKey(null); setSelected([]) }}>
            {YEARS.map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-70">Race</label>
          <select className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1" value={activeMeeting ?? ''} onChange={e=> { setMeetingKey(Number(e.target.value)); setSelected([]) }}>
            {meetings.isLoading && <option>Loading…</option>}
            {!meetings.isLoading && meetings.data?.map(m=> (
              <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs opacity-70 mr-2">Lap {hoverLap ?? (laps.length || '—')}</div>
          {top3AtEnd.length>0 && (
            <div className="flex items-center gap-2 text-xs">
              {top3AtLap(laps, hoverLap).map((dn: number, i: number)=> (
                <span key={i} className="px-2 py-1 rounded text-white" style={{ backgroundColor: teamColorForDriver(drivers.data, dn) || '#444' }}>{i+1}st {badgeLabel(drivers.data, dn)}</span>
              ))}
            </div>
          )}
        </div>
        {(!positions.data || positions.data.length===0) && (
          <div className="text-sm mb-2 opacity-70">No position data available for this session. Try another race/season.</div>
        )}
        <div className="h-[360px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={laps} margin={{ left: 12, right: 12, top: 8, bottom: 8 }} onMouseMove={(e:any)=>{ if(e && typeof e.activeLabel==='number') setHoverLap(e.activeLabel); }} onMouseLeave={()=> setHoverLap(null)}>
              <CartesianGrid strokeDasharray="4 4" stroke="#2a2a2a" />
              <XAxis dataKey="lap" stroke="#888" />
              <YAxis reversed domain={[1, 20]} allowDecimals={false} stroke="#888" />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #222' }} />
              {typeof hoverLap==='number' && hoverLap>0 && (
                <ReferenceLine x={hoverLap} stroke="#666" strokeDasharray="3 3" />
              )}
              {selected.filter(num=> hasDataFor(num, laps)).map((num, idx)=> (
                <Line key={num} type="monotone" dataKey={String(num)} stroke={teamColorForDriver(drivers.data, num) || palette(idx)} dot={false} activeDot={{ r: 3 }} strokeWidth={2.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {/* right-edge finishing order badges */}
          {laps && laps.length>0 && (
            <div className="absolute right-2 top-4 flex flex-col items-end gap-1 text-xs">
              {topNAtLap(laps, null, 6).map((dn:number, i:number)=> (
                <div key={dn} className="inline-flex items-center gap-2">
                  <span className="opacity-60">{i+1}</span>
                  <span className="px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: teamColorForDriver(drivers.data, dn) || '#444' }}>{badgeLabel(drivers.data, dn)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={()=> setSelected(Array.from(driverNumbersWithData(positions.data)).slice(0,10) as number[])} className="px-3 py-1 rounded border border-neutral-800 bg-neutral-900">Select Top 10</button>
          <button onClick={()=> setSelected(Array.from(driverNumbersWithData(positions.data)) as number[])} className="px-3 py-1 rounded border border-neutral-800 bg-neutral-900">Select All (with data)</button>
          <button onClick={()=> setSelected([])} className="px-3 py-1 rounded border border-neutral-800 bg-neutral-900">Clear</button>
          {sortByNumberAsc(dedupeDrivers(drivers.data)).map(d=> (
            <button
              key={d.driver_number}
              onClick={()=> toggle(d.driver_number)}
              title={`${d.driver_number} ${code3(d.full_name)}`}
              className={`px-3 py-1 rounded-full border ${selected.includes(d.driver_number) ? 'text-white border-white/0' : 'bg-neutral-900 text-white border-neutral-800'}`}
              style={ selected.includes(d.driver_number) ? { backgroundColor: teamColorForDriver(drivers.data, d.driver_number) || '#E10600' } : undefined }
            >
              {d.driver_number} {code3(d.full_name)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function palette(i:number){
  const colors = ['#1e90ff', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#06b6d4', '#e11d48', '#fde047']
  return colors[i % colors.length]
}

function code3(full?: string){
  if(!full) return 'DRI'
  const parts = full.trim().split(/\s+/)
  const last = parts[parts.length-1] || full
  return last.substring(0,3).toUpperCase()
}

function dedupeDrivers(list: any[] = []){
  const map = new Map<number, any>()
  for(const d of list){
    if(!map.has(d.driver_number)) map.set(d.driver_number, d)
  }
  return Array.from(map.values())
}

function sortByNumberAsc(list: any[] = []){
  return [...list].sort((a,b)=> a.driver_number - b.driver_number)
}

function hasDataFor(num:number, laps:any[]){
  return laps.some(row => row[String(num)] != null)
}

function driverNumbersWithData(pos:any[]|undefined){
  const set = new Set<number>()
  for(const p of (pos ?? [])){
    if (p && typeof p.driver_number === 'number') set.add(p.driver_number)
  }
  return set
}

function badgeLabel(drivers:any[]|undefined, num?:number){
  if(!num) return ''
  const d = (drivers ?? []).find(x=> x.driver_number===num)
  return `${num} ${code3(d?.full_name)}`
}

function driverNumbersWithSeries(rows:any[]){
  const set = new Set<number>()
  for(const row of rows){
    for(const key of Object.keys(row)){
      if(key==='lap') continue
      const num = Number(key)
      if(!Number.isNaN(num) && row[key] != null) set.add(num)
    }
  }
  return set
}

function top3AtLap(rows:any[], lap:number|null){
  if(!rows || rows.length===0) return [] as number[]
  const target = typeof lap==='number' ? rows.find(r=> r.lap===lap) : rows[rows.length-1]
  if(!target) return [] as number[]
  const entries: Array<{dn:number; pos:number}> = []
  for(const key of Object.keys(target)){
    if(key==='lap') continue
    const dn = Number(key)
    const pos = Number((target as any)[key])
    if(Number.isFinite(dn) && Number.isFinite(pos)) entries.push({ dn, pos })
  }
  entries.sort((a,b)=> a.pos-b.pos)
  return entries.slice(0,3).map(e=> e.dn)
}

function topNAtLap(rows:any[], lap:number|null, n:number){
  if(!rows || rows.length===0) return [] as number[]
  const target = typeof lap==='number' ? rows.find(r=> r.lap===lap) : rows[rows.length-1]
  if(!target) return [] as number[]
  const entries: Array<{dn:number; pos:number}> = []
  for(const key of Object.keys(target)){
    if(key==='lap') continue
    const dn = Number(key)
    const pos = Number((target as any)[key])
    if(Number.isFinite(dn) && Number.isFinite(pos)) entries.push({ dn, pos })
  }
  entries.sort((a,b)=> a.pos-b.pos)
  return entries.slice(0,n).map(e=> e.dn)
}

// Team color map (approx broadcast-style)
const TEAM_COLORS: Record<string,string> = {
  'red bull': '#3671C6',
  'rb': '#143C8C', // Visa Cash App RB
  'mclaren': '#FF8700',
  'ferrari': '#DC0000',
  'mercedes': '#00D2BE',
  'aston martin': '#006F62',
  'alpine': '#0090FF',
  'williams': '#005AFF',
  'haas': '#B6BABD',
  'sauber': '#00E701', // Stake/Kick Sauber
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
