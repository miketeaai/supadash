"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface MetricData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string | null;
  campaign: string;
  cost: number | null;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface AggregatedMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalCost: number;
  averageEngagementRate: number;
}

interface UseAnalyticsResult {
  data: MetricData[];
  aggregated: AggregatedMetrics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAnalytics(dateRange?: DateRange): UseAnalyticsResult {
  const [data, setData] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("social_media_posts")
        .select("date, views, likes, comments, shares, saves, platform, campaign, cost")
        .order("date", { ascending: true });

      if (dateRange?.startDate) {
        query = query.gte("date", dateRange.startDate);
      }

      if (dateRange?.endDate) {
        query = query.lte("date", dateRange.endDate);
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setData(fetchedData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch analytics"));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange?.startDate, dateRange?.endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate aggregated metrics
  const aggregated = useMemo<AggregatedMetrics>(() => {
    const totals = data.reduce(
      (acc, item) => {
        acc.totalViews += item.views || 0;
        acc.totalLikes += item.likes || 0;
        acc.totalComments += item.comments || 0;
        acc.totalShares += item.shares || 0;
        acc.totalSaves += item.saves || 0;
        acc.totalCost += Number(item.cost) || 0;
        return acc;
      },
      {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        totalCost: 0,
      }
    );

    // Engagement rate = (likes + comments + shares + saves) / views * 100
    const totalEngagement =
      totals.totalLikes +
      totals.totalComments +
      totals.totalShares +
      totals.totalSaves;
    const averageEngagementRate =
      totals.totalViews > 0
        ? (totalEngagement / totals.totalViews) * 100
        : 0;

    return {
      ...totals,
      averageEngagementRate,
    };
  }, [data]);

  return { data, aggregated, isLoading, error, refetch: fetchAnalytics };
}

