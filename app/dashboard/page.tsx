import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Opt out of caching - always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  // Fetch ALL user stats
  const { data: allUsers } = await supabase
    .from("users")
    .select("followers, likes, saves, videos");

  // Fetch ALL post metrics including campaign and cost
  const { data: allMetrics } = await supabase
    .from("social_media_data")
    .select("date, views, likes, comments, shares, saves, platform, campaign, cost")
    .order("date", { ascending: true });

  // Fetch platform breakdown from all posts
  const { data: platformData } = await supabase
    .from("social_media_data")
    .select("platform, views, likes");

  // Fetch recent posts (include campaign for filtering and links for embed)
  const { data: recentPosts } = await supabase
    .from("social_media_data")
    .select("post_id, date, views, likes, comments, shares, platform, caption, campaign, links")
    .order("date", { ascending: false })
    .limit(10);

  return (
    <DashboardClient
      allUsers={allUsers || []}
      allMetrics={allMetrics || []}
      platformData={platformData || []}
      recentPosts={recentPosts || []}
    />
  );
}

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Overview"
        description="Aggregated stats across all accounts and posts"
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
