"use client";

import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart,
  Bookmark,
  Users,
  Eye,
  MessageCircle,
  DollarSign,
  FileText,
  Gauge,
} from "lucide-react";

interface StatsCardsProps {
  stats: {
    followers: number;
    likes: number;
    saves: number;
    views: number;
    comments: number;
    accounts: number;
    totalCost: number;
    totalPosts: number;
    cpm: number | null;
  } | null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return "$" + (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return "$" + (num / 1000).toFixed(1) + "K";
  }
  return "$" + num.toFixed(2);
}

/** CPM: always show dollars per 1k impressions with sensible precision */
function formatCpm(num: number): string {
  if (!Number.isFinite(num)) return "—";
  if (num >= 1000) return "$" + (num / 1000).toFixed(2) + "K";
  if (num >= 1) return "$" + num.toFixed(2);
  return "$" + num.toFixed(3);
}

type CardFormat = "number" | "currency" | "cpm";

interface StatCard {
  title: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  format: CardFormat;
  /** Used when format is number or currency */
  value?: number;
  /** Cost per 1k views when format is cpm */
  cpm?: number | null;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCard[] = [
    // Row 1
    {
      title: "Total Posts",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      format: "number",
    },
    {
      title: "Total Views",
      value: stats?.views ?? 0,
      icon: Eye,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      format: "number",
    },
    {
      title: "Total Likes",
      value: stats?.likes ?? 0,
      icon: Heart,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      format: "number",
    },
    {
      title: "Total Comments",
      value: stats?.comments ?? 0,
      icon: MessageCircle,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      format: "number",
    },
   
    // Row 2

    {
      title: "Total Accounts",
      value: stats?.accounts ?? 0,
      icon: Users,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      format: "number",
    },
    {
      title: "Total Followers",
      value: stats?.followers ?? 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      format: "number",
    },
    
    {
      title: "Total Saves",
      value: stats?.saves ?? 0,
      icon: Bookmark,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      format: "number",
    },
   
    {
      title: "Total Spend",
      value: stats?.totalCost ?? 0,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      format: "currency",
    },
    {
      title: "CPM (per 1k views)",
      cpm: stats?.cpm ?? null,
      icon: Gauge,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
      format: "cpm",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-md p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.format === "currency"
                ? formatCurrency(card.value ?? 0)
                : card.format === "cpm"
                  ? card.cpm == null
                    ? "—"
                    : formatCpm(card.cpm)
                  : formatNumber(card.value ?? 0)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
