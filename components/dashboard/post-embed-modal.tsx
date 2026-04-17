"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PostEmbedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | number | null;
  link: string | null;
}

interface OEmbedResponse {
  html: string;
  title?: string;
  author_name?: string;
}

export function PostEmbedModal({
  open,
  onOpenChange,
  postId,
  link,
}: PostEmbedModalProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !link) {
      setEmbedHtml(null);
      return;
    }

    const fetchEmbed = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch embed");
        }

        const data: OEmbedResponse = await response.json();
        setEmbedHtml(data.html);
      } catch (err) {
        setError("Could not load embed");
        console.error("oEmbed error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmbed();
  }, [open, link]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] h-[90vh] overflow-y-auto p-4 flex flex-col">
        <DialogTitle className="sr-only">TikTok Post</DialogTitle>
        <div className="flex justify-center h-full flex-1">
          {loading && (
            <p className="text-muted-foreground py-8">Loading...</p>
          )}
          {error && (
            <p className="text-muted-foreground py-8">{error}</p>
          )}
          {embedHtml && (
            <div className="h-full w-full [&>blockquote]:h-full [&>blockquote]:max-h-none" dangerouslySetInnerHTML={{ __html: embedHtml }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
