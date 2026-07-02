"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"
import { dailyTrend, classCompare } from "@/lib/data"

const tooltipStyle = {
  background: "hsl(222 26% 8%)",
  border: "1px solid hsl(220 16% 17%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(210 20% 92%)",
}

const classColors = ["hsl(196 90% 54%)", "hsl(264 70% 64%)", "hsl(96 60% 50%)", "hsl(42 92% 58%)"]

export function TrendCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border/70 bg-card/70 p-4">
        <h3 className="text-sm font-semibold">날짜별 전체 커밋 추이</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">이번 주 · KST 기준</p>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(220 16% 25%)" }} />
              <Line
                type="monotone"
                dataKey="commits"
                name="커밋 수"
                stroke="hsl(196 90% 54%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(196 90% 54%)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/70 p-4">
        <h3 className="text-sm font-semibold">분반별 커밋 수 비교</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">전체 기간 누적</p>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classCompare} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
              <Bar dataKey="commits" name="커밋 수" radius={[6, 6, 0, 0]}>
                {classCompare.map((_, i) => (
                  <Cell key={i} fill={classColors[i % classColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
