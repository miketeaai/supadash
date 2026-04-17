"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, X } from "lucide-react";

interface CampaignData {
  campaign: string;
  views: number;
  posts: number;
  cost: number;
}

interface CampaignBreakdownProps {
  data: CampaignData[];
  selectedCampaign: string | null;
  onSelectCampaign: (campaign: string | null) => void;
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

export function CampaignBreakdown({
  data,
  selectedCampaign,
  onSelectCampaign,
}: CampaignBreakdownProps) {
  // Sort by views descending
  const sortedData = [...data].sort((a, b) => b.views - a.views);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Campaign Breakdown
        </CardTitle>
        {selectedCampaign && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectCampaign(null)}
            className="h-8 px-2 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No campaigns found
          </p>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-2">
              {sortedData.map((campaign) => (
                <button
                  key={campaign.campaign}
                  onClick={() =>
                    onSelectCampaign(
                      selectedCampaign === campaign.campaign
                        ? null
                        : campaign.campaign
                    )
                  }
                  className={`w-full text-left rounded-lg border p-3 transition-all hover:bg-accent ${
                    selectedCampaign === campaign.campaign
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium truncate max-w-[150px]">
                      {campaign.campaign}
                    </span>
                    {selectedCampaign === campaign.campaign && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatNumber(campaign.views)} views</span>
                    <span>{campaign.posts} posts</span>
                    {campaign.cost > 0 && (
                      <span>${campaign.cost.toFixed(0)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

