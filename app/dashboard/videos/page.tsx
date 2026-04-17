import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { VideosTable } from "@/components/dashboard/videos-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Opt out of caching - always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

function VideosSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[200px]" />
              <Skeleton className="h-10 w-[150px]" />
              <Skeleton className="h-10 w-[150px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function VideosContent() {
  const supabase = await createClient();

  const { data: videos, error, status, statusText } = await supabase
    .from("videos")
    .select("*");

  console.log("Videos query result:", { videos, error, status, statusText, count: videos?.length });

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-destructive text-center">
              Error loading videos: {error.message}
            </p>
            <p className="text-muted-foreground text-center text-sm mt-2">
              Code: {error.code} | Status: {status}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              No videos found in the database.
            </p>
            <p className="text-muted-foreground text-center text-sm mt-2">
              Status: {status} {statusText}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <VideosTable videos={videos} />
    </div>
  );
}

export default function VideosPage() {
  return (
    <>
      <Header
        title="Videos"
        description="View and analyze all your video content"
      />
      <Suspense fallback={<VideosSkeleton />}>
        <VideosContent />
      </Suspense>
    </>
  );
}

