"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, Clock, Zap } from "lucide-react"

const strategyData = [
  { strategy: "One-Stop", probability: 45, avgPosition: 3.2, fuelSaving: 15 },
  { strategy: "Two-Stop", probability: 35, avgPosition: 2.8, fuelSaving: 8 },
  { strategy: "Three-Stop", probability: 20, avgPosition: 4.1, fuelSaving: 5 },
]

const lapTimeData = [
  { lap: 1, predicted: 78.2, optimal: 77.8 },
  { lap: 10, predicted: 79.1, optimal: 78.5 },
  { lap: 20, predicted: 80.3, optimal: 79.2 },
  { lap: 30, predicted: 81.2, optimal: 80.1 },
  { lap: 40, predicted: 82.1, optimal: 80.8 },
  { lap: 50, predicted: 83.2, optimal: 81.5 },
  { lap: 60, predicted: 84.1, optimal: 82.3 },
]

const tireCompounds = [
  { compound: "Soft", color: "bg-red-500", optimalLaps: "8-12", degradation: "High" },
  { compound: "Medium", color: "bg-yellow-500", optimalLaps: "15-25", degradation: "Medium" },
  { compound: "Hard", color: "bg-gray-300", optimalLaps: "25-35", degradation: "Low" },
]

export function StrategyVisualization() {
  return (
    <div className="space-y-6">
      {/* Strategy Probability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Race Strategy Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategyData.map((strategy) => (
              <div key={strategy.strategy} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{strategy.strategy}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{strategy.probability}%</Badge>
                    <Badge variant="outline">Avg P{strategy.avgPosition}</Badge>
                  </div>
                </div>
                <Progress value={strategy.probability} className="h-2" />
                <div className="text-xs text-muted-foreground">Fuel saving: {strategy.fuelSaving}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lap Time Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Lap Time Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lapTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="lap" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Predicted"
                />
                <Line
                  type="monotone"
                  dataKey="optimal"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Optimal"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tire Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Tire Compound Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tireCompounds.map((tire) => (
              <div key={tire.compound} className="p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full ${tire.color}`} />
                  <span className="font-semibold">{tire.compound}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Optimal Laps</span>
                    <span>{tire.optimalLaps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Degradation</span>
                    <Badge
                      variant={
                        tire.degradation === "High"
                          ? "destructive"
                          : tire.degradation === "Medium"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {tire.degradation}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
