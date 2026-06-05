"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface MetricData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string;
}

interface PerformanceChartProps {
  data: MetricData[];
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  likes: {
    label: "Likes",
    color: "hsl(var(--chart-2))",
  },
  comments: {
    label: "Comments",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function metricDateYMD(dateStr: string) {
  return dateStr.slice(0, 10);
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  // Aggregate data by date
  const aggregatedData = data.reduce(
    (acc, item) => {
      const day = metricDateYMD(item.date);
      const existing = acc.find((d) => d.date === day);
      if (existing) {
        existing.views += item.views;
        existing.likes += item.likes;
        existing.comments += item.comments;
      } else {
        acc.push({
          date: day,
          views: item.views,
          likes: item.likes,
          comments: item.comments,
        });
      }
      return acc;
    },
    [] as { date: string; views: number; likes: number; comments: number }[]
  );

  // Sort by date
  aggregatedData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={aggregatedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                className="text-xs"
              />
              <YAxis
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
                }
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="views"
                stackId="1"
                stroke="var(--color-views)"
                fill="var(--color-views)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="likes"
                stackId="2"
                stroke="var(--color-likes)"
                fill="var(--color-likes)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="comments"
                stackId="3"
                stroke="var(--color-comments)"
                fill="var(--color-comments)"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

