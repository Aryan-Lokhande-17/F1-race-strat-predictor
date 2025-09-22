import { NextResponse } from "next/server"

export async function GET() {
  try {
    const drivers2024 = [
      {
        id: "1",
        name: "Max Verstappen",
        team: "Red Bull Racing",
        number: 1,
        nationality: "Dutch",
        abbreviation: "VER",
      },
      {
        id: "11",
        name: "Sergio Pérez",
        team: "Red Bull Racing",
        number: 11,
        nationality: "Mexican",
        abbreviation: "PER",
      },
      { id: "44", name: "Lewis Hamilton", team: "Mercedes", number: 44, nationality: "British", abbreviation: "HAM" },
      { id: "63", name: "George Russell", team: "Mercedes", number: 63, nationality: "British", abbreviation: "RUS" },
      {
        id: "16",
        name: "Charles Leclerc",
        team: "Ferrari",
        number: 16,
        nationality: "Monégasque",
        abbreviation: "LEC",
      },
      { id: "55", name: "Carlos Sainz Jr.", team: "Ferrari", number: 55, nationality: "Spanish", abbreviation: "SAI" },
      { id: "4", name: "Lando Norris", team: "McLaren", number: 4, nationality: "British", abbreviation: "NOR" },
      { id: "81", name: "Oscar Piastri", team: "McLaren", number: 81, nationality: "Australian", abbreviation: "PIA" },
      {
        id: "14",
        name: "Fernando Alonso",
        team: "Aston Martin",
        number: 14,
        nationality: "Spanish",
        abbreviation: "ALO",
      },
      {
        id: "18",
        name: "Lance Stroll",
        team: "Aston Martin",
        number: 18,
        nationality: "Canadian",
        abbreviation: "STR",
      },
      { id: "10", name: "Pierre Gasly", team: "Alpine", number: 10, nationality: "French", abbreviation: "GAS" },
      { id: "31", name: "Esteban Ocon", team: "Alpine", number: 31, nationality: "French", abbreviation: "OCO" },
      { id: "23", name: "Alexander Albon", team: "Williams", number: 23, nationality: "Thai", abbreviation: "ALB" },
      { id: "2", name: "Logan Sargeant", team: "Williams", number: 2, nationality: "American", abbreviation: "SAR" },
      {
        id: "77",
        name: "Valtteri Bottas",
        team: "Alfa Romeo",
        number: 77,
        nationality: "Finnish",
        abbreviation: "BOT",
      },
      { id: "24", name: "Zhou Guanyu", team: "Alfa Romeo", number: 24, nationality: "Chinese", abbreviation: "ZHO" },
      { id: "20", name: "Kevin Magnussen", team: "Haas", number: 20, nationality: "Danish", abbreviation: "MAG" },
      { id: "27", name: "Nico Hülkenberg", team: "Haas", number: 27, nationality: "German", abbreviation: "HUL" },
      { id: "22", name: "Yuki Tsunoda", team: "AlphaTauri", number: 22, nationality: "Japanese", abbreviation: "TSU" },
      { id: "21", name: "Nyck de Vries", team: "AlphaTauri", number: 21, nationality: "Dutch", abbreviation: "DEV" },
    ]

    console.log(`[v0] Returning ${drivers2024.length} drivers for 2024 season`)
    return NextResponse.json(drivers2024)
  } catch (error) {
    console.error("Error in drivers API:", error)
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 })
  }
}
