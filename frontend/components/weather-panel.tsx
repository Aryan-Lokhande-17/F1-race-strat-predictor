"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, CloudRain, Sun, Wind, Thermometer, Droplets } from "lucide-react"

interface WeatherData {
  day: string
  date: string
  condition: string
  temperature: { high: number; low: number }
  humidity: number
  windSpeed: number
  rainChance: number
  icon: React.ReactNode
}

const weatherData: WeatherData[] = [
  {
    day: "Friday",
    date: "Practice Sessions",
    condition: "Partly Cloudy",
    temperature: { high: 24, low: 18 },
    humidity: 65,
    windSpeed: 12,
    rainChance: 20,
    icon: <Cloud className="h-6 w-6" />,
  },
  {
    day: "Saturday",
    date: "Qualifying",
    condition: "Light Rain",
    temperature: { high: 21, low: 16 },
    humidity: 85,
    windSpeed: 18,
    rainChance: 70,
    icon: <CloudRain className="h-6 w-6" />,
  },
  {
    day: "Sunday",
    date: "Race Day",
    condition: "Sunny",
    temperature: { high: 26, low: 19 },
    humidity: 55,
    windSpeed: 8,
    rainChance: 10,
    icon: <Sun className="h-6 w-6" />,
  },
]

const getConditionColor = (condition: string) => {
  if (condition.includes("Rain")) return "text-blue-500"
  if (condition.includes("Sunny")) return "text-yellow-500"
  if (condition.includes("Cloud")) return "text-gray-500"
  return "text-muted-foreground"
}

const getRainChanceColor = (chance: number) => {
  if (chance >= 70) return "bg-blue-600"
  if (chance >= 40) return "bg-yellow-600"
  return "bg-green-600"
}

export function WeatherPanel() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          Race Weekend Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weatherData.map((weather) => (
            <div key={weather.day} className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{weather.day}</h3>
                  <p className="text-sm text-muted-foreground">{weather.date}</p>
                </div>
                <div className={getConditionColor(weather.condition)}>{weather.icon}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{weather.condition}</span>
                  <Badge className={`${getRainChanceColor(weather.rainChance)} text-white`}>
                    {weather.rainChance}% rain
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {weather.temperature.high}°/{weather.temperature.low}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                    <span>{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span>{weather.windSpeed} km/h winds</span>
                  </div>
                </div>

                {/* Track condition indicator */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Track Impact</span>
                    <Badge
                      variant={
                        weather.rainChance > 50 ? "destructive" : weather.rainChance > 20 ? "secondary" : "outline"
                      }
                    >
                      {weather.rainChance > 50 ? "High" : weather.rainChance > 20 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weather summary */}
        <div className="mt-6 p-3 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Weekend Summary</h4>
          <p className="text-sm text-muted-foreground">
            Mixed conditions expected with potential rain during qualifying. Race day looks favorable with sunny
            conditions and low wind speeds. Teams should prepare wet weather setups for Saturday sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
