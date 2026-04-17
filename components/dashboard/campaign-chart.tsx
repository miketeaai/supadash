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
  campaign: string;
  views: number;
  likes: number;
  cost: number | null;
}

interface CampaignChartProps {
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
} satisfies ChartConfig;

export function CampaignChart({ data }: CampaignChartProps) {
  // Aggregate by campaign
  const campaignData = data.reduce(
    (acc, item) => {
      const campaign = item.campaign || "No Campaign";
      if (!campaign || campaign.trim() === "") return acc;

      const existing = acc.find((c) => c.campaign === campaign);
      if (existing) {
        existing.views += item.views || 0;
        existing.likes += item.likes || 0;
        existing.cost += Number(item.cost) || 0;
      } else {
        acc.push({
          campaign,
          views: item.views || 0,
          likes: item.likes || 0,
          cost: Number(item.cost) || 0,
        });
      }
      return acc;
    },
    [] as { campaign: string; views: number; likes: number; cost: number }[]
  );

  // Sort by views and take top 8
  const topCampaigns = campaignData
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {topCampaigns.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No campaign data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCampaigns}
                margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="campaign"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="views"
                  fill="var(--color-views)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="likes"
                  fill="var(--color-likes)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

