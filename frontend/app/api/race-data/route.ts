import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year") || "2024"
  const round = searchParams.get("round")

  try {
    console.log(`[v0] Fetching race data for ${year} round ${round}`)

    if (!round) {
      return NextResponse.json({ error: "Round parameter is required" }, { status: 400 })
    }

    // Try alternative Ergast API endpoint first, then fallback to original
    const baseUrls = ["https://api.jolpi.ca/ergast/f1", "https://ergast.com/api/f1"]

    let raceData = null
    let qualifyingData = null
    let raceInfoData = null

    for (const baseUrl of baseUrls) {
      try {
        console.log(`[v0] Trying API base: ${baseUrl}`)

        // Fetch race results
        const raceResponse = await fetch(`${baseUrl}/${year}/${round}/results.json`, {
          headers: { "User-Agent": "F1-Dashboard/1.0" },
        })

        if (raceResponse.ok) {
          const raceText = await raceResponse.text()
          raceData = JSON.parse(raceText)

          // Fetch qualifying results
          const qualifyingResponse = await fetch(`${baseUrl}/${year}/${round}/qualifying.json`, {
            headers: { "User-Agent": "F1-Dashboard/1.0" },
          })

          if (qualifyingResponse.ok) {
            const qualifyingText = await qualifyingResponse.text()
            qualifyingData = JSON.parse(qualifyingText)
          }

          // Fetch race info
          const raceInfoResponse = await fetch(`${baseUrl}/${year}/${round}.json`, {
            headers: { "User-Agent": "F1-Dashboard/1.0" },
          })

          if (raceInfoResponse.ok) {
            const raceInfoText = await raceInfoResponse.text()
            raceInfoData = JSON.parse(raceInfoText)
          }

          console.log(`[v0] Successfully fetched data from ${baseUrl}`)
          break
        }
      } catch (error) {
        console.log(`[v0] Failed to fetch from ${baseUrl}:`, error)
      }
    }

    // If all APIs fail, return mock data
    if (!raceData || !raceInfoData) {
      console.log("[v0] All API endpoints failed, using fallback data")
      return NextResponse.json({
        race: {
          season: year,
          round: round,
          raceName: `Round ${round}`,
          circuitName: "Circuit Not Available",
          circuitId: "unknown",
          location: "Location Not Available",
          date: "TBD",
          time: "TBD",
          trackInfo: {
            track_length: null,
            lap_count: null,
            turn_count: null,
            drs_zones: null,
            lap_record: null,
            most_successful_driver: null,
          },
        },
        results: [],
        qualifying: [],
      })
    }

    // Set default values for missing data
    if (!qualifyingData) {
      qualifyingData = { MRData: { RaceTable: { Races: [{ QualifyingResults: [] }] } } }
    }

    const race = raceInfoData.MRData?.RaceTable?.Races?.[0]
    const results = raceData.MRData?.RaceTable?.Races?.[0]?.Results || []
    const qualifying = qualifyingData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || []

    const getTrackInfo = (circuitId: string) => {
      const trackData: { [key: string]: any } = {
        silverstone: {
          track_length: 5.891,
          lap_count: 52,
          turn_count: 18,
          drs_zones: 2,
          lap_record: { time: "1:27.097", driver: "Lewis Hamilton", year: 2020 },
          most_successful_driver: { name: "Lewis Hamilton", wins: 8, team: "Mercedes" },
        },
        vegas: {
          track_length: 6.201,
          lap_count: 50,
          turn_count: 17,
          drs_zones: 3,
          lap_record: { time: "1:35.490", driver: "Oscar Piastri", year: 2023 },
          most_successful_driver: { name: "Max Verstappen", wins: 1, team: "Red Bull Racing" },
        },
        monaco: {
          track_length: 3.337,
          lap_count: 78,
          turn_count: 19,
          drs_zones: 1,
          lap_record: { time: "1:12.909", driver: "Lewis Hamilton", year: 2021 },
          most_successful_driver: { name: "Ayrton Senna", wins: 6, team: "McLaren" },
        },
        spa: {
          track_length: 7.004,
          lap_count: 44,
          turn_count: 20,
          drs_zones: 2,
          lap_record: { time: "1:46.286", driver: "Valtteri Bottas", year: 2018 },
          most_successful_driver: { name: "Michael Schumacher", wins: 6, team: "Ferrari" },
        },
        yas_marina: {
          track_length: 5.281,
          lap_count: 58,
          turn_count: 16,
          drs_zones: 2,
          lap_record: { time: "1:26.103", driver: "Max Verstappen", year: 2021 },
          most_successful_driver: { name: "Lewis Hamilton", wins: 5, team: "Mercedes" },
        },
      }

      return (
        trackData[circuitId] || {
          track_length: null,
          lap_count: null,
          turn_count: null,
          drs_zones: null,
          lap_record: null,
          most_successful_driver: null,
        }
      )
    }

    const circuitId = race?.Circuit?.circuitId || ""
    const trackInfo = getTrackInfo(circuitId)

    const response = {
      race: {
        season: race?.season || year,
        round: race?.round || round,
        raceName: race?.raceName || `Round ${round}`,
        circuitName: race?.Circuit?.circuitName || "Unknown Circuit",
        circuitId: race?.Circuit?.circuitId || "",
        location: race?.Circuit?.Location
          ? `${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`
          : "Unknown Location",
        date: race?.date || "TBD",
        time: race?.time || "TBD",
        trackInfo: {
          track_length: trackInfo.track_length,
          lap_count: trackInfo.lap_count,
          turn_count: trackInfo.turn_count,
          drs_zones: trackInfo.drs_zones,
          lap_record: trackInfo.lap_record,
          most_successful_driver: trackInfo.most_successful_driver,
        },
      },
      results: results.map((result: any) => ({
        position: result.position,
        driver: {
          driverId: result.Driver.driverId,
          code: result.Driver.code,
          givenName: result.Driver.givenName,
          familyName: result.Driver.familyName,
          permanentNumber: result.Driver.permanentNumber,
          nationality: result.Driver.nationality,
        },
        constructor: {
          constructorId: result.Constructor.constructorId,
          name: result.Constructor.name,
        },
        grid: result.grid,
        laps: result.laps,
        status: result.status,
        time: result.Time?.time || result.status,
        points: result.points,
      })),
      qualifying: qualifying.map((q: any) => ({
        position: q.position,
        driver: {
          driverId: q.Driver.driverId,
          code: q.Driver.code,
          givenName: q.Driver.givenName,
          familyName: q.Driver.familyName,
          permanentNumber: q.Driver.permanentNumber,
          nationality: q.Driver.nationality,
        },
        constructor: {
          constructorId: q.Constructor.constructorId,
          name: q.Constructor.name,
        },
        q1: q.Q1,
        q2: q.Q2,
        q3: q.Q3,
      })),
    }

    console.log(`[v0] Successfully fetched race data for ${year} round ${round}`)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching race data:", error)
    return NextResponse.json({ error: "Failed to fetch race data" }, { status: 500 })
  }
}
