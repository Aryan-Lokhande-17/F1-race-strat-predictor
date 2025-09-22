"use client"

import { PodiumPrediction } from "@/components/podium-prediction"
import { DriverSelection } from "@/components/driver-selection"
import { StrategyVisualization } from "@/components/strategy-visualization"
import { WeatherPanel } from "@/components/weather-panel"
import { RaceHeader } from "@/components/race-header"
import { TrackInfo } from "@/components/track-info"
import { HistoricalData } from "@/components/historical-data"
import { Flag, BarChart3 } from "lucide-react"

export default function F1Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flag className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">F1 Strategy Predictor</h1>
                <p className="text-sm text-muted-foreground">Advanced race analytics powered by FastF1 API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <button
                onClick={() => {
                  // Emit event to load current race data
                  const event = new CustomEvent("loadCurrentRace")
                  window.dispatchEvent(event)
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
              >
                Live Data
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <section>
          <RaceHeader />
        </section>

        {/* Podium Prediction - Always at top */}
        <section>
          <PodiumPrediction />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrackInfo />
          <HistoricalData />
        </section>

        {/* Driver Selection and Weather - Side by side */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DriverSelection />
          <WeatherPanel />
        </section>

        {/* Strategy Visualization - Full width analytical section */}
        <section>
          <StrategyVisualization />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 F1 Strategy Predictor - Powered by FastF1 API</p>
            <p>Real-time race analytics and predictions</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
