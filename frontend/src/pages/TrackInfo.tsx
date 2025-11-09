import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeetingsByYear, getRaceSessionForMeeting, getSessionResults } from '../lib/openf1-extra'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({length: CURRENT_YEAR - 2017}, (_,i)=> CURRENT_YEAR - i)

export default function TrackInfo(){
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const meetings = useQuery({
    queryKey: ['ti-meetings', year],
    queryFn: async () => (await getMeetingsByYear(year)).data ?? [],
  })

  const defaultMeeting = useMemo(()=> meetings.data?.[meetings.data.length-1]?.meeting_key, [meetings.data])
  const [meetingKey, setMeetingKey] = useState<number | null>(null)
  const activeMeeting = meetingKey ?? defaultMeeting ?? null

  const raceSession = useQuery({
    queryKey: ['ti-race-session', activeMeeting],
    enabled: !!activeMeeting,
    queryFn: async ()=> (await getRaceSessionForMeeting(activeMeeting!)).data,
  })

  // Most successful driver at this circuit (wins since 2018)
  const mostSuccessful = useQuery({
    queryKey: ['ti-most-success', raceSession.data?.circuit_key],
    enabled: !!raceSession.data?.circuit_key,
    queryFn: async ()=> {
      // Find all Race sessions at this circuit (recent years to limit requests)
      const res = await fetch(`https://api.openf1.org/v1/sessions?circuit_key=${raceSession.data!.circuit_key}&session_name=Race&year%3E%3D2018`, { headers: { accept: 'application/json' } })
      const sessions: any[] = await res.json()
      const keys = sessions.map(s=> s.session_key)
      const chunks: number[][] = []
      for(let i=0;i<keys.length;i+=10) chunks.push(keys.slice(i,i+10))
      const wins = new Map<number, number>()
      for(const chunk of chunks){
        const results = await Promise.all(chunk.map(async sk => (await getSessionResults(sk)).data ?? []))
        for(const arr of results){
          const winner = arr.find(r=> r.position===1)
          if(winner){ wins.set(winner.driver_number, (wins.get(winner.driver_number)||0)+1) }
        }
      }
      const sorted = Array.from(wins.entries()).sort((a,b)=> b[1]-a[1])
      const top = sorted[0]
      if(!top) return null
      const dn = top[0]
      // Fetch a name for this driver_number
      const dres = await fetch(`https://api.openf1.org/v1/drivers?driver_number=${dn}`, { headers: { accept: 'application/json' } })
      const darr: any[] = await dres.json()
      const name = (darr[0]?.broadcast_name) || (darr[0]?.full_name) || String(dn)
      return { driver_number: dn, name, wins: top[1] as number }
    },
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

      <TrackInfoPanel raceSession={raceSession.data} loading={raceSession.isLoading} />

      <div className="card p-4">
        <div className="font-semibold mb-2">Most Successful Driver (since 2018)</div>
        {mostSuccessful.isLoading ? (
          <div className="text-sm opacity-70">Computing…</div>
        ) : mostSuccessful.data ? (
          <div className="text-sm flex items-center justify-between">
            <span className="font-mono">{mostSuccessful.data.name}</span>
            <span>{mostSuccessful.data.wins} wins</span>
          </div>
        ) : (
          <div className="text-sm opacity-70">N/A</div>
        )}
      </div>
    </div>
  )
}

function TrackInfoPanel({ raceSession, loading }:{ raceSession:any, loading:boolean }){
  const wikidata = useQuery({
    queryKey: ['wikidata-circuit', raceSession?.circuit_short_name, raceSession?.location],
    enabled: !!raceSession,
    queryFn: async () => {
      const terms = Array.from(new Set([
        `${raceSession.circuit_short_name}`,
        `${raceSession.circuit_short_name} circuit`,
        `${raceSession.circuit_short_name} ${raceSession.location}`,
        `${raceSession.location} circuit`,
      ])).filter(Boolean)

      async function search(term:string){
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&format=json&origin=*`
        const r = await fetch(url)
        return (await r.json()) as { search: Array<{ id:string; label:string; description?:string }> }
      }

      async function fetchProps(qid:string){
        const sparql = `SELECT ?length ?corners ?inst WHERE { wd:${qid} wdt:P31 ?inst. OPTIONAL { wd:${qid} wdt:P2043 ?length. } OPTIONAL { wd:${qid} wdt:P1090 ?corners. } }`
        const spurl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
        const resp = await fetch(spurl, { headers: { 'Accept': 'application/sparql-results+json' } })
        const data = await resp.json()
        const rows = data?.results?.bindings ?? []
        if (rows.length===0) return null
        // prefer items whose instance-of is a circuit or race track
        const preferred = rows.find((r:any)=>{
          const inst = (r.inst?.value||'').toLowerCase()
          return inst.includes('Q16917'.toLowerCase()) // motor racing circuit
            || inst.includes('Q209675'.toLowerCase()) // race track
        }) || rows[0]
        const lengthRaw = preferred?.length?.value
        const cornersRaw = preferred?.corners?.value
        let length_km: number | null = null
        if (lengthRaw!=null){
          const n = Number(lengthRaw)
          if (Number.isFinite(n)) length_km = n > 30 ? n/1000 : n
        }
        const corners = cornersRaw!=null && Number.isFinite(Number(cornersRaw)) ? Number(cornersRaw) : null
        return { length_km, corners }
      }

      const candidates:string[] = []
      for (const t of terms){
        const sr = await search(t)
        for (const s of (sr.search||[])){
          const desc = (s.description||'').toLowerCase()
          if (desc.includes('circuit') || desc.includes('race track') || desc.includes('grand prix')){
            candidates.push(s.id)
          }
        }
        if (candidates.length>=6) break
      }
      const unique = Array.from(new Set(candidates))
      for (const qid of unique){
        const props = await fetchProps(qid)
        if (props && (props.length_km!=null || props.corners!=null)) return props
      }
      return null
    }
  })

  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Track Info</div>
      {loading || wikidata.isLoading ? (
        <div>Loading…</div>
      ) : raceSession ? (
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Stat label="Circuit" value={raceSession.circuit_short_name} />
          <Stat label="Location" value={raceSession.location} />
          <Stat label="Track Length" value={typeof wikidata.data?.length_km === 'number' ? `${wikidata.data.length_km.toFixed(3)} km` : 'N/A'} />
          <Stat label="Corners" value={typeof wikidata.data?.corners === 'number' ? String(wikidata.data.corners) : 'N/A'} />
        </div>
      ) : (
        <div>No race session found.</div>
      )}
      {!loading && !wikidata.isLoading && raceSession && !wikidata.data && (
        <div className="mt-2 text-xs opacity-60">No Wikidata match or properties found for this circuit. Showing N/A.</div>
      )}
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
