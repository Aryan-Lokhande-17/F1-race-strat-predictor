"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Trophy, Clock, RotateCcw, Zap } from "lucide-react"
import { raceDataEvents } from "./historical-data"

interface TrackInfo {
  track_name: string
  location: string
  country: string
  track_length: number | null
  lap_count: number | null
  turn_count: number | null
  sectors: number
  drs_zones?: number
  lap_record?: {
    time: string
    driver: string
    year: number
  }
  most_successful_driver: {
    name: string
    wins: number
    team: string
  } | null
}

export function TrackInfo() {
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrackInfo = async () => {
      try {
        console.log("[v0] Fetching track info...")
        const response = await fetch("/api/track-info")
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Track info received:", data)
          setTrackInfo(data)
        } else {
          console.error("[v0] Track info API error:", response.status)
        }
      } catch (error) {
        console.error("Error fetching track info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrackInfo()
  }, [])

  useEffect(() => {
    const handleRaceDataUpdate = async (year: string, round: string) => {
      setLoading(true)

      try {
        console.log(`[v0] Fetching track info for ${year} round ${round}`)
        const response = await fetch(`/api/race-data?year=${year}&round=${round}`)

        if (response.ok) {
          const data = await response.json()

          const raceTrackInfo: TrackInfo = {
            track_name: data.race.circuitName,
            location: data.race.location,
            country: data.race.location.split(", ")[1] || "Unknown",
            track_length: data.race.trackInfo.track_length,
            lap_count: data.race.trackInfo.lap_count,
            turn_count: data.race.trackInfo.turn_count,
            sectors: 3, // Default
            drs_zones: data.race.trackInfo.drs_zones,
            lap_record: data.race.trackInfo.lap_record,
            most_successful_driver: data.race.trackInfo.most_successful_driver,
          }

          console.log(`[v0] Updated track info for ${raceTrackInfo.track_name}`)
          setTrackInfo(raceTrackInfo)
        } else {
          console.error("[v0] Failed to load track info for race:", response.status)
          setTrackInfo(null)
        }
      } catch (error) {
        console.error("[v0] Error loading track info for race:", error)
        setTrackInfo(null)
      } finally {
        setLoading(false)
      }
    }

    raceDataEvents.subscribe(handleRaceDataUpdate)
    return () => raceDataEvents.unsubscribe(handleRaceDataUpdate)
  }, [])

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-400">Track Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!trackInfo) {
    return (
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-400">Track Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Track information not available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/50 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Track Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Track Name and Location */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">{trackInfo.track_name}</h3>
          <p className="text-gray-300">{trackInfo.location}</p>
        </div>

        {/* Track Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {trackInfo.track_length && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-400">Circuit Length:</span>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                  {trackInfo.track_length} km
                </Badge>
              </div>
            )}

            {trackInfo.lap_count && (
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-400">Race Laps:</span>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                  {trackInfo.lap_count}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {trackInfo.turn_count && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-400">Turns:</span>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                  {trackInfo.turn_count}
                </Badge>
              </div>
            )}

            {trackInfo.drs_zones && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">DRS Zones:</span>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                  {trackInfo.drs_zones}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {trackInfo.lap_record && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Lap Record</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white font-mono">{trackInfo.lap_record.time}</span>
              <span className="text-sm text-gray-400">
                by {trackInfo.lap_record.driver} ({trackInfo.lap_record.year})
              </span>
            </div>
          </div>
        )}

        {/* Most Successful Driver */}
        {trackInfo.most_successful_driver && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Most Successful Driver (This Track)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">{trackInfo.most_successful_driver.name}</span>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {trackInfo.most_successful_driver.wins} wins
              </Badge>
              <span className="text-sm text-gray-400">({trackInfo.most_successful_driver.team})</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
