import { NextResponse } from "next/server"

export async function GET() {
  try {
    const trackInfo = {
      track_name: "Las Vegas Strip Circuit",
      location: "Las Vegas",
      country: "United States",
      track_length: 6.201,
      lap_count: 50,
      turn_count: 17,
      sectors: 3,
      drs_zones: 3,
      lap_record: {
        time: "1:35.490",
        driver: "Oscar Piastri",
        year: 2023,
      },
      most_successful_driver: {
        name: "Max Verstappen",
        wins: 1,
        team: "Red Bull Racing",
      },
      track_image: "/las-vegas-f1-circuit-layout-with-turn-numbers-and-.jpg",
    }

    console.log("[v0] Returning track info for", trackInfo.track_name)
    return NextResponse.json(trackInfo)
  } catch (error) {
    console.error("Error in track info API:", error)
    return NextResponse.json({ error: "Failed to fetch track info" }, { status: 500 })
  }
}
