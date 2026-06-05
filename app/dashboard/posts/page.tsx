import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { PostsTable } from "@/components/dashboard/posts-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Opt out of caching - always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

function PostsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[200px]" />
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

async function PostsContent() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("social_media_data")
    .select("*")
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PostsTable posts={posts || []} />
    </div>
  );
}

export default function PostsPage() {
  return (
    <>
      <Header
        title="Posts"
        description="View and analyze all your social media posts"
      />
      <Suspense fallback={<PostsSkeleton />}>
        <PostsContent />
      </Suspense>
    </>
  );
}
