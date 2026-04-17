"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserStats {
  followers: number;
  likes: number;
  saves: number;
  videos: number;
}

interface UseUserStatsResult {
  stats: UserStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserStats(userId?: number): UseUserStatsResult {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("users")
        .select("followers, likes, saves, videos");

      if (userId) {
        query = query.eq("id", userId);
      }

      const { data, error: fetchError } = await query.limit(1).single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch stats"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  return { stats, isLoading, error, refetch: fetchStats };
}

