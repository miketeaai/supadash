"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Same range as the "Last N days" preset buttons (local calendar days). */
export function getLastNDaysRange(days: number): { from: string; to: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { from: formatLocalYMD(start), to: formatLocalYMD(end) };
}

export function DashboardDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);

  useEffect(() => {
    setFrom(urlFrom);
    setTo(urlTo);
  }, [urlFrom, urlTo]);

  const pushRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("range");
      if (nextFrom) params.set("from", nextFrom);
      else params.delete("from");
      if (nextTo) params.set("to", nextTo);
      else params.delete("to");
      const q = params.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const apply = useCallback(() => {
    let a = from.trim();
    let b = to.trim();
    if (a && b && a > b) {
      const t = a;
      a = b;
      b = t;
    }
    pushRange(a, b);
  }, [from, to, pushRange]);

  const clear = useCallback(() => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.set("range", "all");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const preset = useCallback(
    (days: number) => {
      const { from: a, to: b } = getLastNDaysRange(days);
      setFrom(a);
      setTo(b);
      pushRange(a, b);
    },
    [pushRange]
  );

  useEffect(() => {
    if (urlFrom || urlTo) return;
    if (searchParams.get("range") === "all") return;
    const { from: nextFrom, to: nextTo } = getLastNDaysRange(30);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams, urlFrom, urlTo]);

  const rangeAll = searchParams.get("range") === "all";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-1 flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date-from">From</Label>
          <Input
            id="date-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date-to">To</Label>
          <Input
            id="date-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button type="button" onClick={apply}>
          Apply
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => preset(7)}
        >
          Last 7 days
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => preset(30)}
        >
          Last 30 days
        </Button>
        <Button
          type="button"
          variant={rangeAll ? "secondary" : "outline"}
          size="sm"
          onClick={clear}
        >
          All time
        </Button>
      </div>
    </div>
  );
}
