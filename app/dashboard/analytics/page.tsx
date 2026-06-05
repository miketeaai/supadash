import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { CampaignChart } from "@/components/dashboard/campaign-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Opt out of caching - always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  const supabase = await createClient();

  // Fetch metrics for the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: metrics } = await supabase
    .from("social_media_data")
    .select(
      "date, views, likes, comments, shares, saves, platform, campaign, cost"
    )
    .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PerformanceChart data={metrics || []} />
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={metrics || []} />
        <CampaignChart data={metrics || []} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <Header
        title="Analytics"
        description="Detailed performance metrics and trends"
      />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </>
  );
}
