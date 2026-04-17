import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { AccountsGrid } from "@/components/dashboard/accounts-grid";
import { RefreshAccountsButton } from "@/components/dashboard/refresh-accounts-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Opt out of caching - always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

function AccountsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div>
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function AccountsContent() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("users")
    .select("*")
    .order("followers", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex justify-end">
        <RefreshAccountsButton />
      </div>
      <AccountsGrid accounts={accounts || []} />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <>
      <Header
        title="Accounts"
        description="Manage your connected social media accounts"
      />
      <Suspense fallback={<AccountsSkeleton />}>
        <AccountsContent />
      </Suspense>
    </>
  );
}
