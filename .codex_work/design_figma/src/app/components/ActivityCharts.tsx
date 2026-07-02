import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { weeklyTotals, dailyActivity } from "../data/mockData";

type ChartMode = "weekly-class" | "daily";

const classColors = {
  c1: "#22D3EE",  // cyan (primary)
  c2: "#8B5CF6",  // violet
  c3: "#84CC16",  // lime/green
  c4: "#FACC15",  // yellow
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="text-foreground font-semibold">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export function ActivityCharts() {
  const [mode, setMode] = useState<ChartMode>("weekly-class");

  return (
    <Card className="rounded-xl gap-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle className="text-sm font-semibold">활동 추이</CardTitle>
          <p className="text-muted-foreground text-[11px] mt-0.5">GitHub 활동 시간은 KST로 변환되어 표시됩니다.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-0.5">
          {[
            { id: "weekly-class" as ChartMode, label: "분반별 주차" },
            { id: "daily" as ChartMode, label: "날짜별" },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={mode === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode(tab.id)}
              className="text-xs h-7 px-3"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "weekly-class" ? (
              <BarChart data={weeklyTotals.slice(0, 2)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>}
                />
                <Bar dataKey="c1" name="1분반" fill={classColors.c1} radius={[2, 2, 0, 0]} opacity={0.8} />
                <Bar dataKey="c2" name="2분반" fill={classColors.c2} radius={[2, 2, 0, 0]} opacity={0.8} />
                <Bar dataKey="c3" name="3분반" fill={classColors.c3} radius={[2, 2, 0, 0]} opacity={0.8} />
                <Bar dataKey="c4" name="4분반" fill={classColors.c4} radius={[2, 2, 0, 0]} opacity={0.8} />
              </BarChart>
            ) : (
              <LineChart data={dailyActivity} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="commits"
                  name="일별 커밋"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
