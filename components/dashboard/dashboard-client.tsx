"use client";

import { useState, useMemo } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { CampaignBreakdown } from "@/components/dashboard/campaign-breakdown";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import { Badge } from "@/components/ui/badge";

interface MetricData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string;
  campaign: string;
  cost: number | null;
}

interface UserData {
  followers: number;
  likes: number;
  saves: number;
  videos: number;
}

interface PostData {
  post_id: string | number | null;
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  platform: string;
  caption: string | null;
  campaign: string | null;
  links: string | null;
}

interface DashboardClientProps {
  allUsers: UserData[];
  allMetrics: MetricData[];
  platformData: { platform: string; views: number; likes: number }[];
  recentPosts: PostData[];
}

export function DashboardClient({
  allUsers,
  allMetrics,
  platformData,
  recentPosts,
}: DashboardClientProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  // Filter metrics by selected campaign
  const filteredMetrics = useMemo(() => {
    if (!selectedCampaign) return allMetrics;
    return allMetrics.filter((m) => m.campaign === selectedCampaign);
  }, [allMetrics, selectedCampaign]);

  // Filter platform data by campaign
  const filteredPlatformData = useMemo(() => {
    if (!selectedCampaign) return platformData;
    // Recalculate platform breakdown from filtered metrics
    const platformMap = new Map<string, { views: number; likes: number }>();
    filteredMetrics.forEach((m) => {
      const existing = platformMap.get(m.platform) || { views: 0, likes: 0 };
      platformMap.set(m.platform, {
        views: existing.views + (Number(m.views) || 0),
        likes: existing.likes + (Number(m.likes) || 0),
      });
    });
    return Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      ...data,
    }));
  }, [filteredMetrics, platformData, selectedCampaign]);

  // Filter recent posts by campaign
  const filteredRecentPosts = useMemo(() => {
    if (!selectedCampaign) return recentPosts;
    return recentPosts.filter((p) => p.campaign === selectedCampaign);
  }, [recentPosts, selectedCampaign]);

  // Aggregate campaign data for breakdown
  const campaignData = useMemo(() => {
    const campaignMap = new Map<
      string,
      { views: number; posts: number; cost: number }
    >();
    allMetrics.forEach((m) => {
      if (m.campaign && m.campaign.trim() !== "") {
        const existing = campaignMap.get(m.campaign) || {
          views: 0,
          posts: 0,
          cost: 0,
        };
        campaignMap.set(m.campaign, {
          views: existing.views + m.views,
          posts: existing.posts + 1,
          cost: existing.cost + (Number(m.cost) || 0),
        });
      }
    });
    return Array.from(campaignMap.entries()).map(([campaign, data]) => ({
      campaign,
      ...data,
    }));
  }, [allMetrics]);

  // Calculate aggregated stats (filtered)
  const aggregatedStats = useMemo(() => {
    const userStats = allUsers.reduce(
      (acc, user) => ({
        followers: acc.followers + (user.followers || 0),
        likes: acc.likes + (user.likes || 0),
        saves: acc.saves + (user.saves || 0),
        videos: acc.videos + (user.videos || 0),
      }),
      { followers: 0, likes: 0, saves: 0, videos: 0 }
    );

    const postStats = filteredMetrics.reduce(
      (acc, post) => ({
        views: acc.views + (Number(post.views) || 0),
        likes: acc.likes + (Number(post.likes) || 0),
        comments: acc.comments + (Number(post.comments) || 0),
        saves: acc.saves + (Number(post.saves) || 0),
        totalCost: acc.totalCost + (Number(post.cost) || 0),
      }),
      { views: 0, likes: 0, comments: 0, saves: 0, totalCost: 0 }
    );

    const cpm =
      postStats.views > 0
        ? (postStats.totalCost / postStats.views) * 1000
        : null;

    return {
      followers: userStats.followers,
      likes: postStats.likes,
      videos: userStats.videos,
      views: postStats.views,
      comments: postStats.comments,
      saves: postStats.saves,
      totalCost: postStats.totalCost,
      cpm,
      accounts: allUsers.length,
      totalPosts: filteredMetrics.length,
    };
  }, [allUsers, filteredMetrics, selectedCampaign]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <StatsCards stats={aggregatedStats} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart data={filteredMetrics} />
        </div>
        <div>
          <CampaignBreakdown
            data={campaignData}
            selectedCampaign={selectedCampaign}
            onSelectCampaign={setSelectedCampaign}
          />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentPosts posts={filteredRecentPosts} />
        </div>
        <div>
          <PlatformBreakdown data={filteredPlatformData} />
        </div>
      </div>
    </div>
  );
}

