"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Trophy } from "lucide-react"
import { raceDataEvents } from "./historical-data"

interface RaceInfo {
  season?: string
  round?: string
  raceName?: string
  circuitName?: string
  location?: string
  date?: string
  time?: string
  track_name?: string
  country?: string
  round_number?: number
  total_rounds?: number
  race_date?: string
}

export function RaceHeader() {
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentRace = async () => {
      try {
        console.log("[v0] Fetching current race info...")
        const response = await fetch("/api/current-race")
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Current race info received:", data)
          setRaceInfo(data)
        } else {
          // Fallback to old API if current race API fails
          const fallbackResponse = await fetch("/api/race-info")
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            setRaceInfo(fallbackData)
          }
        }
      } catch (error) {
        console.error("Error fetching race info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentRace()
  }, [])

  useEffect(() => {
    const handleRaceDataUpdate = async (year: string, round: string) => {
      try {
        console.log(`[v0] Updating race header for ${year} round ${round}`)
        const response = await fetch(`/api/race-data?year=${year}&round=${round}`)

        if (response.ok) {
          const data = await response.json()

          const updatedRaceInfo: RaceInfo = {
            season: data.race.season,
            round: data.race.round,
            raceName: data.race.raceName,
            circuitName: data.race.circuitName,
            location: data.race.location,
            date: data.race.date,
            time: data.race.time,
          }

          console.log(`[v0] Race header updated: ${updatedRaceInfo.raceName}`)
          setRaceInfo(updatedRaceInfo)
        } else {
          console.error("[v0] Failed to load race info for header:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error loading race info for header:", error)
      }
    }

    raceDataEvents.subscribe(handleRaceDataUpdate)
    return () => raceDataEvents.unsubscribe(handleRaceDataUpdate)
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!raceInfo) {
    return null
  }

  const displayName = raceInfo.raceName || raceInfo.track_name || "Formula 1 Grand Prix"
  const displayLocation = raceInfo.location || `${raceInfo.location}, ${raceInfo.country}` || "Unknown Location"
  const displayDate = raceInfo.date || raceInfo.race_date || new Date().toISOString().split("T")[0]
  const roundNumber = raceInfo.round || raceInfo.round_number?.toString() || "1"
  const totalRounds = raceInfo.total_rounds || 24 // Default to 24 for 2024 season

  return (
    <Card className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">{displayName}</h2>
              <Badge variant="outline" className="font-mono">
                Round {roundNumber}/{totalRounds}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{displayLocation}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(displayDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{roundNumber}</div>
            <div className="text-xs text-muted-foreground">of {totalRounds}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
