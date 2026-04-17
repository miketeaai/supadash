"use client";

import {
  Bar,
  BarChart,
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

interface EngagementChartProps {
  data: MetricData[];
}

const chartConfig = {
  likes: {
    label: "Likes",
    color: "hsl(var(--chart-1))",
  },
  comments: {
    label: "Comments",
    color: "hsl(var(--chart-2))",
  },
  shares: {
    label: "Shares",
    color: "hsl(var(--chart-3))",
  },
  saves: {
    label: "Saves",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function EngagementChart({ data }: EngagementChartProps) {
  // Aggregate engagement by platform
  const platformEngagement = data.reduce(
    (acc, item) => {
      const platform = item.platform?.toLowerCase() || "other";
      const existing = acc.find((p) => p.platform === platform);
      if (existing) {
        existing.likes += item.likes;
        existing.comments += item.comments;
        existing.shares += item.shares;
        existing.saves += item.saves;
      } else {
        acc.push({
          platform,
          likes: item.likes,
          comments: item.comments,
          shares: item.shares,
          saves: item.saves,
        });
      }
      return acc;
    },
    [] as {
      platform: string;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
    }[]
  );

  // Sort by total engagement
  platformEngagement.sort(
    (a, b) =>
      b.likes + b.comments + b.shares + b.saves -
      (a.likes + a.comments + a.shares + a.saves)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={platformEngagement}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
                }
              />
              <YAxis
                type="category"
                dataKey="platform"
                tickFormatter={(value) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="likes"
                stackId="a"
                fill="var(--color-likes)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="comments"
                stackId="a"
                fill="var(--color-comments)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="shares"
                stackId="a"
                fill="var(--color-shares)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="saves"
                stackId="a"
                fill="var(--color-saves)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

