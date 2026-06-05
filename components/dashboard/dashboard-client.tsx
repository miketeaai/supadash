"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { CampaignBreakdown } from "@/components/dashboard/campaign-breakdown";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import {
  DashboardDateFilter,
  getLastNDaysRange,
} from "@/components/dashboard/dashboard-date-filter";

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
  recentPosts: PostData[];
}

function metricDateYMD(dateStr: string) {
  return dateStr.slice(0, 10);
}

function inDateRange(dateStr: string, from: string, to: string) {
  const d = metricDateYMD(dateStr);
  return d >= from && d <= to;
}

export function DashboardClient({
  allUsers,
  allMetrics,
  recentPosts,
}: DashboardClientProps) {
  const searchParams = useSearchParams();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const rangeAll = searchParams.get("range") === "all";
  const urlFrom = searchParams.get("from")?.trim() ?? "";
  const urlTo = searchParams.get("to")?.trim() ?? "";
  const fallback30 = getLastNDaysRange(30);
  const rangeFrom = rangeAll ? "" : urlFrom || fallback30.from;
  const rangeTo = rangeAll ? "" : urlTo || fallback30.to;

  const dateFilteredMetrics = useMemo(() => {
    if (rangeAll) return allMetrics;
    return allMetrics.filter((m) => inDateRange(m.date, rangeFrom, rangeTo));
  }, [allMetrics, rangeAll, rangeFrom, rangeTo]);

  const filteredMetrics = useMemo(() => {
    if (!selectedCampaign) return dateFilteredMetrics;
    return dateFilteredMetrics.filter((m) => m.campaign === selectedCampaign);
  }, [dateFilteredMetrics, selectedCampaign]);

  const filteredPlatformData = useMemo(() => {
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
  }, [filteredMetrics]);

  const filteredRecentPosts = useMemo(() => {
    let posts = recentPosts;
    if (!rangeAll) {
      posts = posts.filter((p) => inDateRange(p.date, rangeFrom, rangeTo));
    }
    if (selectedCampaign) {
      posts = posts.filter((p) => p.campaign === selectedCampaign);
    }
    return posts.slice(0, 10);
  }, [recentPosts, rangeAll, rangeFrom, rangeTo, selectedCampaign]);

  const campaignData = useMemo(() => {
    const campaignMap = new Map<
      string,
      { views: number; posts: number; cost: number }
    >();
    dateFilteredMetrics.forEach((m) => {
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
  }, [dateFilteredMetrics]);

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
  }, [allUsers, filteredMetrics]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardDateFilter />
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
