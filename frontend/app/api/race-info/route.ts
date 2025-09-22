import { NextResponse } from "next/server"

export async function GET() {
  try {
    const currentDate = new Date()
    const currentRaceInfo = {
      track_name: "Las Vegas Grand Prix",
      location: "Las Vegas",
      country: "United States",
      round_number: 22,
      total_rounds: 24,
      race_date: "2024-11-23",
      track_info: {
        track_length: 6.201,
        lap_count: 50,
        turn_count: 17,
        sectors: 3,
      },
    }

    console.log("[v0] Returning race info for", currentRaceInfo.track_name)
    return NextResponse.json(currentRaceInfo)
  } catch (error) {
    console.error("Error in race info API:", error)
    return NextResponse.json({ error: "Failed to fetch race info" }, { status: 500 })
  }
}
