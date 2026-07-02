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
} from "recharts"

const tooltipStyle = {
  background: "hsl(222 26% 8%)",
  border: "1px solid hsl(220 16% 17%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(210 20% 92%)",
}

export function DailyLineChart({ data }: { data: { date: string; commits: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MemberBarChart({ data }: { data: { name: string; commits: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" horizontal={false} />
          <XAxis type="number" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(216 12% 58%)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
          <Bar dataKey="commits" name="커밋 수" fill="hsl(196 90% 54%)" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
