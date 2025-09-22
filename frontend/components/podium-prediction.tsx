"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Loader2 } from "lucide-react"
import { raceDataEvents } from "./historical-data"

interface PodiumDriver {
  position: number
  name: string
  team: string
  confidence?: number
  points: number
  time?: string
  status?: string
}

interface RaceData {
  race: {
    season: string
    round: string
    raceName: string
    circuitName: string
    location: string
    date: string
  }
  results: any[]
}

const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />
    default:
      return null
  }
}

const getTeamColor = (team: string) => {
  const teamColors: Record<string, string> = {
    "Red Bull Racing": "bg-blue-600",
    Mercedes: "bg-teal-500",
    Ferrari: "bg-red-600",
    McLaren: "bg-orange-500",
    "Alpine F1 Team": "bg-pink-500",
    "Aston Martin": "bg-green-600",
    Williams: "bg-blue-400",
    "Alfa Romeo": "bg-red-800",
    "Haas F1 Team": "bg-gray-600",
    AlphaTauri: "bg-blue-800",
    "Kick Sauber": "bg-green-500",
    "RB F1 Team": "bg-blue-700",
  }
  return teamColors[team] || "bg-gray-500"
}

export function PodiumPrediction() {
  const [podiumData, setPodiumData] = useState<PodiumDriver[]>([])
  const [loading, setLoading] = useState(false)
  const [raceInfo, setRaceInfo] = useState<any>(null)
  const [isHistoricalData, setIsHistoricalData] = useState(false)

  useEffect(() => {
    const loadCurrentRace = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/current-race")
        if (response.ok) {
          const currentRace = await response.json()
          console.log("[v0] Current race loaded:", currentRace.raceName)

          if (currentRace.isCompleted) {
            // Load actual race results for completed races
            await loadRaceData(currentRace.season, currentRace.round)
          } else {
            // Show prediction for upcoming races
            setRaceInfo(currentRace)
            setPodiumData([
              { position: 1, name: "Max Verstappen", team: "Red Bull Racing", confidence: 87, points: 25 },
              { position: 2, name: "Lando Norris", team: "McLaren", confidence: 72, points: 18 },
              { position: 3, name: "Charles Leclerc", team: "Ferrari", confidence: 68, points: 15 },
            ])
            setIsHistoricalData(false)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading current race:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentRace()
  }, [])

  useEffect(() => {
    const handleRaceDataUpdate = async (year: string, round: string) => {
      await loadRaceData(year, round)
    }

    raceDataEvents.subscribe(handleRaceDataUpdate)
    return () => raceDataEvents.unsubscribe(handleRaceDataUpdate)
  }, [])

  const loadRaceData = async (year: string, round: string) => {
    setLoading(true)
    try {
      console.log(`[v0] Loading race data for ${year} round ${round}`)
      const response = await fetch(`/api/race-data?year=${year}&round=${round}`)

      if (response.ok) {
        const data: RaceData = await response.json()
        console.log(`[v0] Race data loaded: ${data.race.raceName}`)

        setRaceInfo(data.race)

        const podium = data.results.slice(0, 3).map((result, index) => ({
          position: Number.parseInt(result.position),
          name: `${result.driver.givenName} ${result.driver.familyName}`,
          team: result.constructor.name,
          points: Number.parseInt(result.points),
          time: result.time,
          status: result.status,
        }))

        setPodiumData(podium)
        setIsHistoricalData(true)
      } else {
        console.error("[v0] Failed to load race data:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error loading race data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-6 w-6 text-primary" />
            {isHistoricalData ? "Race Results" : "Podium Prediction"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading race data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-6 w-6 text-primary" />
          {isHistoricalData ? "Race Results" : "Podium Prediction"}
          {raceInfo && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {raceInfo.raceName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podiumData.map((driver) => (
            <div
              key={driver.position}
              className="relative p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getPositionIcon(driver.position)}
                  <span className="text-lg font-bold">P{driver.position}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {isHistoricalData ? driver.time || driver.status : `${driver.confidence}% confidence`}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{driver.name}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getTeamColor(driver.team)}`} />
                  <span className="text-sm text-muted-foreground">{driver.team}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Points</span>
                  <span className="font-bold text-primary">{driver.points}</span>
                </div>
              </div>

              {!isHistoricalData && driver.confidence && (
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${driver.confidence}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
