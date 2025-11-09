import { http } from './openf1'
import type { SessionDto } from './openf1'

export interface MeetingDto {
  country_name: string
  location: string
  meeting_key: number
  meeting_name: string
  year: number
}

export async function getMeetingsByYear(year: number){
  return http<MeetingDto[]>(`/meetings?year=${year}`)
}

export async function getRaceSessionForMeeting(meeting_key: number){
  const { data, error } = await http<SessionDto[]>(`/sessions?meeting_key=${meeting_key}&session_name=Race`)
  if (error) return { data: null as SessionDto | null, error }
  return { data: (data && data[0]) ?? null, error: null as string | null }
}

export async function getQualifyingSessionForMeeting(meeting_key: number){
  const { data, error } = await http<SessionDto[]>(`/sessions?meeting_key=${meeting_key}&session_name=Qualifying`)
  if (error) return { data: null as SessionDto | null, error }
  return { data: (data && data[0]) ?? null, error: null as string | null }
}

export interface StintDto {
  compound: string
  driver_number: number
  lap_end: number
  lap_start: number
  stint_number: number
  session_key: number
}
export async function getStints(session_key: number){
  const res = await http<StintDto[]>(`/stints?session_key=${session_key}`)
  if (res.data) res.data.sort((a,b)=> a.driver_number - b.driver_number || a.stint_number - b.stint_number)
  return res
}

export interface StartingGridDto {
  driver_number: number
  position: number
  session_key: number
}
export async function getStartingGrid(session_key: number){
  return http<StartingGridDto[]>(`/starting_grid?session_key=${session_key}`)
}

export interface SessionResultDto {
  driver_number: number
  position: number
  points: number | null
  status: string
  session_key: number
}
export async function getSessionResults(session_key: number){
  const res = await http<SessionResultDto[]>(`/session_result?session_key=${session_key}`)
  if (res.data) res.data.sort((a,b)=> a.position - b.position)
  return res
}

export interface DriverDto {
  broadcast_name: string
  driver_number: number
  full_name: string
  team_name?: string
  meeting_key?: number
}
export async function getDriversByMeeting(meeting_key: number){
  return http<DriverDto[]>(`/drivers?meeting_key=${meeting_key}`)
}

export interface PositionDto {
  date: string
  driver_number: number
  meeting_key: number
  position: number
  session_key: number
}
export async function getPositions(session_key: number){
  // Limit to the session; API returns all laps; we will aggregate client-side
  const res = await http<PositionDto[]>(`/position?session_key=${session_key}`)
  return res
}

export async function getPositionsByMeeting(meeting_key: number){
  // The position endpoint reliably supports meeting_key; we'll filter by session_key client-side
  return http<PositionDto[]>(`/position?meeting_key=${meeting_key}`)
}

export interface LapDto {
  driver_number: number
  lap_number: number
  date_start: string
  session_key: number
}
export async function getLaps(session_key: number){
  // We only need driver_number, lap_number, date_start for mapping
  return http<LapDto[]>(`/laps?session_key=${session_key}`)
}
