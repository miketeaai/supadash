"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Heart, Bookmark, Video } from "lucide-react";

interface Account {
  id: number;
  username: string | null;
  followers: number;
  likes: number;
  saves: number;
  videos: number;
  tiktok_id: number | null;
  ig_id: string | null;
  character_type: string | null;
}

interface AccountsGridProps {
  accounts: Account[];
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

function getInitials(username: string | null): string {
  if (!username) return "?";
  return username
    .split(/[_\s]/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getPlatforms(account: Account): string[] {
  const platforms: string[] = [];
  if (account.tiktok_id) platforms.push("TikTok");
  if (account.ig_id) platforms.push("Instagram");
  return platforms;
}

export function AccountsGrid({ accounts }: AccountsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No accounts found</p>
          </CardContent>
        </Card>
      ) : (
        accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(account.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {account.username || "Unknown"}
                  </CardTitle>
                  <div className="flex gap-1 mt-1">
                    {getPlatforms(account).map((platform) => (
                      <Badge
                        key={platform}
                        variant="outline"
                        className="text-xs"
                      >
                        {platform}
                      </Badge>
                    ))}
                    {account.character_type && (
                      <Badge variant="secondary" className="text-xs">
                        {account.character_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-blue-500/10 p-2">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Followers</p>
                    <p className="font-semibold">
                      {formatNumber(account.followers)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-rose-500/10 p-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Likes</p>
                    <p className="font-semibold">
                      {formatNumber(account.likes)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-amber-500/10 p-2">
                    <Bookmark className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saves</p>
                    <p className="font-semibold">
                      {formatNumber(account.saves)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/10 p-2">
                    <Video className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Videos</p>
                    <p className="font-semibold">
                      {formatNumber(account.videos)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

