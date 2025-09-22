"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Search } from "lucide-react"

interface Race {
  round_number: number
  event_name: string
  location: string
  country: string
  date: string
}

interface RaceDataContextType {
  updateRaceData: (year: string, round: string) => void
}

// Create a simple event system for component communication
const raceDataEvents = {
  listeners: [] as ((year: string, round: string) => void)[],
  subscribe: (callback: (year: string, round: string) => void) => {
    raceDataEvents.listeners.push(callback)
  },
  unsubscribe: (callback: (year: string, round: string) => void) => {
    raceDataEvents.listeners = raceDataEvents.listeners.filter((l) => l !== callback)
  },
  emit: (year: string, round: string) => {
    raceDataEvents.listeners.forEach((callback) => callback(year, round))
  },
}

export function HistoricalData() {
  const [selectedYear, setSelectedYear] = useState<string>("2024")
  const [selectedRace, setSelectedRace] = useState<string>("")
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(false)

  // Generate year options (2018 onwards when FastF1 data is more reliable)
  const yearOptions = Array.from({ length: new Date().getFullYear() - 2017 }, (_, i) =>
    (new Date().getFullYear() - i).toString(),
  )

  const fetchRaces = async (year: string) => {
    setLoading(true)
    try {
      console.log(`[v0] Fetching races for year ${year}`)
      const response = await fetch(`/api/historical-races?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`[v0] Received ${data.length} races for ${year}`)
        setRaces(data)

        if (year === "2024" && data.length > 0) {
          // Find the latest completed race or the next upcoming one
          const currentDate = new Date()
          let latestRace = data[data.length - 1] // Default to last race

          for (let i = data.length - 1; i >= 0; i--) {
            const raceDate = new Date(data[i].date)
            if (raceDate <= currentDate) {
              latestRace = data[i]
              break
            }
          }

          setSelectedRace(latestRace.round_number.toString())
        } else {
          setSelectedRace("") // Reset race selection when year changes
        }
      } else {
        console.error(`[v0] Historical races API error:`, response.status)
      }
    } catch (error) {
      console.error("Error fetching races:", error)
      setRaces([])
    } finally {
      setLoading(false)
    }
  }

  const handleLoadCurrentRace = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading current race data...")
      const response = await fetch("/api/current-race")
      if (response.ok) {
        const currentRace = await response.json()
        console.log("[v0] Current race loaded:", currentRace.raceName)

        // Update the UI to show current race
        setSelectedYear(currentRace.season)
        setSelectedRace(currentRace.round)

        // Fetch races for current year if needed
        if (currentRace.season !== selectedYear) {
          await fetchRaces(currentRace.season)
        }

        // Emit race data event
        raceDataEvents.emit(currentRace.season, currentRace.round)
      }
    } catch (error) {
      console.error("[v0] Error loading current race:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRaces(selectedYear)
  }, [selectedYear])

  useEffect(() => {
    window.addEventListener("loadCurrentRace", handleLoadCurrentRace)
    return () => window.removeEventListener("loadCurrentRace", handleLoadCurrentRace)
  }, [selectedYear])

  const handleFetchData = () => {
    if (selectedRace) {
      console.log(`[v0] Loading race data for ${selectedYear} - Round ${selectedRace}`)
      raceDataEvents.emit(selectedYear, selectedRace)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historical Race Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Year Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Select Year</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year} className="text-white hover:bg-gray-700">
                  {year} Season
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Race Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Select Grand Prix</label>
          <Select value={selectedRace} onValueChange={setSelectedRace} disabled={loading || races.length === 0}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder={loading ? "Loading races..." : "Select Grand Prix"} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {races.map((race) => (
                <SelectItem
                  key={race.round_number}
                  value={race.round_number.toString()}
                  className="text-white hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Round {race.round_number}:</span>
                    <span>{race.event_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Race Info */}
        {selectedRace && races.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            {(() => {
              const race = races.find((r) => r.round_number.toString() === selectedRace)
              return race ? (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">
                      {race.location}, {race.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">{race.date}</span>
                  </div>
                </>
              ) : null
            })()}
          </div>
        )}

        {/* Fetch Button */}
        <Button
          onClick={handleFetchData}
          disabled={!selectedRace || loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Search className="h-4 w-4 mr-2" />
          Load Race Data
        </Button>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-sm text-gray-400 mt-2">Loading races...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { raceDataEvents }
