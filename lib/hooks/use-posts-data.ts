"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: number;
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string | null;
  caption: string | null;
  campaign: string;
  cost: number | null;
  links: string;
  type: string;
}

interface PostFilters {
  platform?: string;
  startDate?: string;
  endDate?: string;
  campaign?: string;
  limit?: number;
}

interface UsePostsDataResult {
  posts: Post[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePostsData(filters?: PostFilters): UsePostsDataResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("social_media_posts")
        .select("*")
        .order("date", { ascending: false });

      if (filters?.platform) {
        query = query.ilike("platform", filters.platform);
      }

      if (filters?.startDate) {
        query = query.gte("date", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("date", filters.endDate);
      }

      if (filters?.campaign) {
        query = query.ilike("campaign", `%${filters.campaign}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setPosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch posts"));
    } finally {
      setIsLoading(false);
    }
  }, [filters?.platform, filters?.startDate, filters?.endDate, filters?.campaign, filters?.limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch: fetchPosts };
}

