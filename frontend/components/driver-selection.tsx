"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Car, Loader2 } from "lucide-react"
import { raceDataEvents } from "./historical-data"

interface Driver {
  id: string
  name: string
  team: string
  number: number
  nationality: string
  abbreviation: string
}

interface RaceDriver {
  driverId: string
  code: string
  givenName: string
  familyName: string
  constructor: {
    constructorId: string
    name: string
  }
  grid?: number
  position?: number
}

const getTeamColor = (team: string) => {
  const teamColors: Record<string, string> = {
    "Red Bull Racing": "bg-blue-600",
    Mercedes: "bg-teal-500",
    Ferrari: "bg-red-600",
    McLaren: "bg-orange-500",
    "Aston Martin": "bg-green-600",
    "Alpine F1 Team": "bg-pink-500",
    Williams: "bg-blue-400",
    "Alfa Romeo": "bg-red-800",
    "Haas F1 Team": "bg-gray-600",
    AlphaTauri: "bg-blue-800",
    "Kick Sauber": "bg-green-500",
    "RB F1 Team": "bg-blue-700",
  }
  return teamColors[team] || "bg-gray-500"
}

export function DriverSelection() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [raceSpecific, setRaceSpecific] = useState(false)

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        console.log("[v0] Fetching default drivers...")
        const response = await fetch("/api/drivers")
        if (response.ok) {
          const data = await response.json()
          console.log(`[v0] Received ${data.length} drivers`)
          setDrivers(data)
          setRaceSpecific(false)
        } else {
          console.error("[v0] Drivers API error:", response.status)
        }
      } catch (error) {
        console.error("Error fetching drivers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDrivers()
  }, [])

  useEffect(() => {
    const handleLoadCurrentRace = async () => {
      setLoading(true)
      try {
        console.log("[v0] Loading current race data...")
        const response = await fetch("/api/current-race")
        if (response.ok) {
          const currentRace = await response.json()
          console.log("[v0] Current race loaded:", currentRace.raceName)
          // Emit race data event to load current race
          raceDataEvents.emit(currentRace.season, currentRace.round)
        }
      } catch (error) {
        console.error("[v0] Error loading current race:", error)
      } finally {
        setLoading(false)
      }
    }

    window.addEventListener("loadCurrentRace", handleLoadCurrentRace)
    return () => window.removeEventListener("loadCurrentRace", handleLoadCurrentRace)
  }, [])

  useEffect(() => {
    const handleRaceDataUpdate = async (year: string, round: string) => {
      setLoading(true)
      setSelectedDriver("")

      try {
        console.log(`[v0] Fetching drivers for ${year} round ${round}`)
        const response = await fetch(`/api/race-data?year=${year}&round=${round}`)

        if (response.ok) {
          const data = await response.json()

          const raceDrivers: Driver[] = data.results.map((result: any) => ({
            id: result.driver.driverId,
            name: `${result.driver.givenName} ${result.driver.familyName}`,
            team: result.constructor.name,
            number: result.driver.permanentNumber
              ? Number.parseInt(result.driver.permanentNumber)
              : Number.parseInt(result.position),
            nationality: result.driver.nationality || "Unknown",
            abbreviation: result.driver.code,
          }))

          const qualifyingDrivers: Driver[] = data.qualifying
            .filter((q: any) => !raceDrivers.find((rd) => rd.id === q.driver.driverId))
            .map((q: any) => ({
              id: q.driver.driverId,
              name: `${q.driver.givenName} ${q.driver.familyName}`,
              team: q.constructor.name,
              number: q.driver.permanentNumber
                ? Number.parseInt(q.driver.permanentNumber)
                : Number.parseInt(q.position) + 100,
              nationality: q.driver.nationality || "Unknown",
              abbreviation: q.driver.code,
            }))

          const allRaceDrivers = [...raceDrivers, ...qualifyingDrivers]

          allRaceDrivers.sort((a, b) => a.number - b.number)

          console.log(
            `[v0] Loaded ${allRaceDrivers.length} drivers for race (${raceDrivers.length} finished, ${qualifyingDrivers.length} qualified only)`,
          )
          setDrivers(allRaceDrivers)
          setRaceSpecific(true)
        } else {
          console.error("[v0] Failed to load race drivers:", response.status)
          console.log("[v0] Keeping default drivers due to fetch failure")
        }
      } catch (error) {
        console.error("[v0] Error loading race drivers:", error)
        console.log("[v0] Keeping default drivers due to error")
      } finally {
        setLoading(false)
      }
    }

    raceDataEvents.subscribe(handleRaceDataUpdate)
    return () => raceDataEvents.unsubscribe(handleRaceDataUpdate)
  }, [])

  const selectedDriverData = drivers.find((driver) => driver.id === selectedDriver)

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Driver Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading drivers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Driver Analysis
          <Badge variant="secondary" className="ml-auto">
            {drivers.length} Drivers {raceSpecific && "(Race Specific)"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Driver</label>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a driver to analyze" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getTeamColor(driver.team)}`} />
                    <span className="font-mono text-sm">#{driver.number}</span>
                    <span>{driver.name}</span>
                    <span className="text-muted-foreground">({driver.abbreviation})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDriverData && (
          <div className="p-4 rounded-lg border bg-card/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getTeamColor(selectedDriverData.team)}`} />
                <div>
                  <h3 className="font-semibold text-lg">{selectedDriverData.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedDriverData.team}</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono">
                #{selectedDriverData.number}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nationality</span>
                <p className="font-semibold">{selectedDriverData.nationality}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Abbreviation</span>
                <p className="font-semibold text-primary">{selectedDriverData.abbreviation}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {raceSpecific
                  ? `Race performance data available for ${selectedDriverData.name}`
                  : `Strategy analysis available for ${selectedDriverData.name}`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
