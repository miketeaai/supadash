"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

interface PostsTableProps {
  posts: Post[];
}

type SortField = "date" | "views" | "likes" | "comments" | "shares";
type SortOrder = "asc" | "desc";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

const platformColors: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  instagram: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  youtube: "bg-red-500/10 text-red-500 border-red-500/20",
  twitter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  facebook: "bg-blue-600/10 text-blue-600 border-blue-600/20",
};

export function PostsTable({ posts }: PostsTableProps) {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Get unique platforms
  const platforms = useMemo(() => {
    const uniquePlatforms = new Set<string>();
    posts.forEach((post) => {
      if (post.platform) {
        uniquePlatforms.add(post.platform.toLowerCase());
      }
    });
    return Array.from(uniquePlatforms);
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter(
        (post) => post.platform?.toLowerCase() === platformFilter
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.caption?.toLowerCase().includes(query) ||
          post.campaign?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case "views":
          aVal = a.views;
          bVal = b.views;
          break;
        case "likes":
          aVal = a.likes;
          bVal = b.likes;
          break;
        case "comments":
          aVal = a.comments;
          bVal = b.comments;
          break;
        case "shares":
          aVal = a.shares;
          bVal = b.shares;
          break;
        default:
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [posts, platformFilter, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Posts</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[200px]"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("date")}
                    className="-ml-3"
                  >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="max-w-[200px]">Caption</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("views")}
                    className="-ml-3"
                  >
                    Views
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("likes")}
                    className="-ml-3"
                  >
                    Likes
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("comments")}
                    className="-ml-3"
                  >
                    Comments
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("shares")}
                    className="-ml-3"
                  >
                    Shares
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Campaign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No posts found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          platformColors[post.platform?.toLowerCase() || ""] ||
                          "bg-muted"
                        }
                      >
                        {post.platform || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {post.caption || "—"}
                    </TableCell>
                    <TableCell>{formatNumber(post.views)}</TableCell>
                    <TableCell>{formatNumber(post.likes)}</TableCell>
                    <TableCell>{formatNumber(post.comments)}</TableCell>
                    <TableCell>{formatNumber(post.shares)}</TableCell>
                    <TableCell>
                      {post.campaign ? (
                        <Badge variant="secondary">{post.campaign}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

