"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PlatformData {
  platform: string;
  views: number;
  likes: number;
}

interface PlatformBreakdownProps {
  data: PlatformData[];
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "hsl(var(--chart-1))",
  instagram: "hsl(var(--chart-2))",
  youtube: "hsl(var(--chart-3))",
  twitter: "hsl(var(--chart-4))",
  facebook: "hsl(var(--chart-5))",
  default: "hsl(var(--muted))",
};

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  // Aggregate views by platform
  const platformTotals = data.reduce(
    (acc, item) => {
      const platform = item.platform?.toLowerCase() || "other";
      const existing = acc.find((p) => p.platform === platform);
      if (existing) {
        existing.views += item.views;
      } else {
        acc.push({ platform, views: item.views });
      }
      return acc;
    },
    [] as { platform: string; views: number }[]
  );

  // Sort by views descending
  platformTotals.sort((a, b) => b.views - a.views);

  const chartConfig = platformTotals.reduce((acc, item) => {
    acc[item.platform] = {
      label: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
      color: PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.default,
    };
    return acc;
  }, {} as ChartConfig);

  const totalViews = platformTotals.reduce((sum, p) => sum + p.views, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={platformTotals}
                dataKey="views"
                nameKey="platform"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {platformTotals.map((entry) => (
                  <Cell
                    key={entry.platform}
                    fill={
                      PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.default
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {platformTotals.slice(0, 4).map((item) => (
            <div
              key={item.platform}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.default,
                  }}
                />
                <span className="capitalize">{item.platform}</span>
              </div>
              <span className="text-muted-foreground">
                {totalViews > 0
                  ? ((item.views / totalViews) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

