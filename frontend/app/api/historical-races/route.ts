import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || new Date().getFullYear().toString()

    const raceCalendar: Record<string, any[]> = {
      "2024": [
        {
          round_number: 1,
          event_name: "Bahrain Grand Prix",
          location: "Sakhir",
          country: "Bahrain",
          date: "2024-03-02",
        },
        {
          round_number: 2,
          event_name: "Saudi Arabian Grand Prix",
          location: "Jeddah",
          country: "Saudi Arabia",
          date: "2024-03-09",
        },
        {
          round_number: 3,
          event_name: "Australian Grand Prix",
          location: "Melbourne",
          country: "Australia",
          date: "2024-03-24",
        },
        {
          round_number: 4,
          event_name: "Japanese Grand Prix",
          location: "Suzuka",
          country: "Japan",
          date: "2024-04-07",
        },
        {
          round_number: 5,
          event_name: "Chinese Grand Prix",
          location: "Shanghai",
          country: "China",
          date: "2024-04-21",
        },
        {
          round_number: 6,
          event_name: "Miami Grand Prix",
          location: "Miami",
          country: "United States",
          date: "2024-05-05",
        },
        {
          round_number: 7,
          event_name: "Emilia Romagna Grand Prix",
          location: "Imola",
          country: "Italy",
          date: "2024-05-19",
        },
        { round_number: 8, event_name: "Monaco Grand Prix", location: "Monaco", country: "Monaco", date: "2024-05-26" },
        {
          round_number: 9,
          event_name: "Canadian Grand Prix",
          location: "Montreal",
          country: "Canada",
          date: "2024-06-09",
        },
        {
          round_number: 10,
          event_name: "Spanish Grand Prix",
          location: "Barcelona",
          country: "Spain",
          date: "2024-06-23",
        },
        {
          round_number: 11,
          event_name: "Austrian Grand Prix",
          location: "Spielberg",
          country: "Austria",
          date: "2024-06-30",
        },
        {
          round_number: 12,
          event_name: "British Grand Prix",
          location: "Silverstone",
          country: "United Kingdom",
          date: "2024-07-07",
        },
        {
          round_number: 13,
          event_name: "Hungarian Grand Prix",
          location: "Budapest",
          country: "Hungary",
          date: "2024-07-21",
        },
        {
          round_number: 14,
          event_name: "Belgian Grand Prix",
          location: "Spa-Francorchamps",
          country: "Belgium",
          date: "2024-07-28",
        },
        {
          round_number: 15,
          event_name: "Dutch Grand Prix",
          location: "Zandvoort",
          country: "Netherlands",
          date: "2024-08-25",
        },
        { round_number: 16, event_name: "Italian Grand Prix", location: "Monza", country: "Italy", date: "2024-09-01" },
        {
          round_number: 17,
          event_name: "Azerbaijan Grand Prix",
          location: "Baku",
          country: "Azerbaijan",
          date: "2024-09-15",
        },
        {
          round_number: 18,
          event_name: "Singapore Grand Prix",
          location: "Singapore",
          country: "Singapore",
          date: "2024-09-22",
        },
        {
          round_number: 19,
          event_name: "United States Grand Prix",
          location: "Austin",
          country: "United States",
          date: "2024-10-20",
        },
        {
          round_number: 20,
          event_name: "Mexican Grand Prix",
          location: "Mexico City",
          country: "Mexico",
          date: "2024-10-27",
        },
        {
          round_number: 21,
          event_name: "Brazilian Grand Prix",
          location: "São Paulo",
          country: "Brazil",
          date: "2024-11-03",
        },
        {
          round_number: 22,
          event_name: "Las Vegas Grand Prix",
          location: "Las Vegas",
          country: "United States",
          date: "2024-11-23",
        },
        { round_number: 23, event_name: "Qatar Grand Prix", location: "Lusail", country: "Qatar", date: "2024-12-01" },
        {
          round_number: 24,
          event_name: "Abu Dhabi Grand Prix",
          location: "Abu Dhabi",
          country: "United Arab Emirates",
          date: "2024-12-08",
        },
      ],
      "2023": [
        {
          round_number: 1,
          event_name: "Bahrain Grand Prix",
          location: "Sakhir",
          country: "Bahrain",
          date: "2023-03-05",
        },
        {
          round_number: 2,
          event_name: "Saudi Arabian Grand Prix",
          location: "Jeddah",
          country: "Saudi Arabia",
          date: "2023-03-19",
        },
        {
          round_number: 3,
          event_name: "Australian Grand Prix",
          location: "Melbourne",
          country: "Australia",
          date: "2023-04-02",
        },
        {
          round_number: 4,
          event_name: "Azerbaijan Grand Prix",
          location: "Baku",
          country: "Azerbaijan",
          date: "2023-04-30",
        },
        {
          round_number: 5,
          event_name: "Miami Grand Prix",
          location: "Miami",
          country: "United States",
          date: "2023-05-07",
        },
        { round_number: 6, event_name: "Monaco Grand Prix", location: "Monaco", country: "Monaco", date: "2023-05-28" },
        {
          round_number: 7,
          event_name: "Spanish Grand Prix",
          location: "Barcelona",
          country: "Spain",
          date: "2023-06-04",
        },
        {
          round_number: 8,
          event_name: "Canadian Grand Prix",
          location: "Montreal",
          country: "Canada",
          date: "2023-06-18",
        },
        {
          round_number: 9,
          event_name: "Austrian Grand Prix",
          location: "Spielberg",
          country: "Austria",
          date: "2023-07-02",
        },
        {
          round_number: 10,
          event_name: "British Grand Prix",
          location: "Silverstone",
          country: "United Kingdom",
          date: "2023-07-09",
        },
        {
          round_number: 11,
          event_name: "Hungarian Grand Prix",
          location: "Budapest",
          country: "Hungary",
          date: "2023-07-23",
        },
        {
          round_number: 12,
          event_name: "Belgian Grand Prix",
          location: "Spa-Francorchamps",
          country: "Belgium",
          date: "2023-07-30",
        },
        {
          round_number: 13,
          event_name: "Dutch Grand Prix",
          location: "Zandvoort",
          country: "Netherlands",
          date: "2023-08-27",
        },
        { round_number: 14, event_name: "Italian Grand Prix", location: "Monza", country: "Italy", date: "2023-09-03" },
        {
          round_number: 15,
          event_name: "Singapore Grand Prix",
          location: "Singapore",
          country: "Singapore",
          date: "2023-09-17",
        },
        {
          round_number: 16,
          event_name: "Japanese Grand Prix",
          location: "Suzuka",
          country: "Japan",
          date: "2023-09-24",
        },
        { round_number: 17, event_name: "Qatar Grand Prix", location: "Lusail", country: "Qatar", date: "2023-10-08" },
        {
          round_number: 18,
          event_name: "United States Grand Prix",
          location: "Austin",
          country: "United States",
          date: "2023-10-22",
        },
        {
          round_number: 19,
          event_name: "Mexican Grand Prix",
          location: "Mexico City",
          country: "Mexico",
          date: "2023-10-29",
        },
        {
          round_number: 20,
          event_name: "Brazilian Grand Prix",
          location: "São Paulo",
          country: "Brazil",
          date: "2023-11-05",
        },
        {
          round_number: 21,
          event_name: "Las Vegas Grand Prix",
          location: "Las Vegas",
          country: "United States",
          date: "2023-11-18",
        },
        {
          round_number: 22,
          event_name: "Abu Dhabi Grand Prix",
          location: "Abu Dhabi",
          country: "United Arab Emirates",
          date: "2023-11-26",
        },
      ],
    }

    const yearData = raceCalendar[year] || []
    console.log(`[v0] Returning ${yearData.length} races for year ${year}`)

    return NextResponse.json(yearData)
  } catch (error) {
    console.error("Error in historical races API:", error)
    return NextResponse.json({ error: "Failed to fetch races" }, { status: 500 })
  }
}
