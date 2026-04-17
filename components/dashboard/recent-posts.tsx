"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MessageCircle, Share2, Play } from "lucide-react";
import { PostEmbedModal } from "./post-embed-modal";

interface Post {
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

interface RecentPostsProps {
  posts: Post[];
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

const platformColors: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  instagram: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  youtube: "bg-red-500/10 text-red-500 border-red-500/20",
  twitter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  facebook: "bg-blue-600/10 text-blue-600 border-blue-600/20",
};

export function RecentPosts({ posts }: RecentPostsProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No posts found
              </p>
            ) : (
              posts.map((post, index) => (
                <div
                  key={post.post_id || `post-${index}`}
                  onClick={() => handlePostClick(post)}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          platformColors[post.platform?.toLowerCase()] ||
                          "bg-muted"
                        }
                      >
                        {post.platform || "Unknown"}
                      </Badge>
                      {post.campaign && (
                        <Badge variant="secondary" className="text-xs">
                          {post.campaign}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm truncate">
                      {post.caption || "No caption"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{formatNumber(post.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{formatNumber(post.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{formatNumber(post.comments)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-4 w-4" />
                      <span>{formatNumber(post.shares)}</span>
                    </div>
                    <Play className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <PostEmbedModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        postId={selectedPost?.post_id ?? null}
        link={selectedPost?.links ?? null}
      />
    </>
  );
}
