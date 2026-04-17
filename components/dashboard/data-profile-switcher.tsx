"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Database } from "lucide-react";

import { setDashboardDataProfile } from "@/app/dashboard/data-profile-actions";
import type { DashboardDataProfileId } from "@/lib/dashboard-data-profile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataProfileSwitcherProps {
  currentProfile: DashboardDataProfileId;
  peakoAvailable: boolean;
}

const labels: Record<DashboardDataProfileId, string> = {
  default: "Primary",
  peako: "Peako",
};

export function DataProfileSwitcher({
  currentProfile,
  peakoAvailable,
}: DataProfileSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!peakoAvailable) {
    return null;
  }

  function select(profile: DashboardDataProfileId) {
    if (profile === currentProfile) return;
    startTransition(async () => {
      const result = await setDashboardDataProfile(profile);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 border-sidebar-border"
          disabled={pending}
          aria-label="Switch data profile"
        >
          <Database className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="gap-2"
          onClick={() => select("default")}
          disabled={pending}
        >
          {currentProfile === "default" ? (
            <Check className="size-4" />
          ) : (
            <span className="size-4" />
          )}
          <span className="flex-1">{labels.default}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onClick={() => select("peako")}
          disabled={pending}
        >
          {currentProfile === "peako" ? (
            <Check className="size-4" />
          ) : (
            <span className="size-4" />
          )}
          <span className="flex-1">{labels.peako}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
