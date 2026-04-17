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
import { Search, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayerModal } from "./video-player-modal";

interface Video {
  id: string;
  character_id: string | null;
  filename: string | null;
  file_url: string | null;
  prompt: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
}

interface VideosTableProps {
  videos: Video[];
}

const tagColors = [
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "bg-rose-500/10 text-rose-500 border-rose-500/20",
  "bg-violet-500/10 text-violet-500 border-violet-500/20",
  "bg-lime-500/10 text-lime-500 border-lime-500/20",
  "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
];

function getTagColor(tag: string): string {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tagColors[hash % tagColors.length];
}

const characterNames: Record<string, string> = {
  "1": "Kim",
  "2": "Gem",
  "3": "Jen",
};

function getCharacterName(characterId: string | null): string {
  if (!characterId) return "Unknown";
  return characterNames[characterId] || characterId;
}

export function VideosTable({ videos }: VideosTableProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [characterFilter, setCharacterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);

  // Get unique tags (sorted alphabetically)
  const allTags = useMemo(() => {
    const uniqueTags = new Set<string>();
    videos.forEach((video) => {
      if (video.tags) {
        video.tags.forEach((tag) => uniqueTags.add(tag));
      }
    });
    return Array.from(uniqueTags).sort((a, b) => a.localeCompare(b));
  }, [videos]);

  // Get unique character IDs
  const allCharacters = useMemo(() => {
    const uniqueCharacters = new Set<string>();
    videos.forEach((video) => {
      if (video.character_id) {
        uniqueCharacters.add(video.character_id);
      }
    });
    return Array.from(uniqueCharacters).sort();
  }, [videos]);

  // Filter videos
  const filteredVideos = useMemo(() => {
    let filtered = [...videos];

    // Apply tag filter (video must have ANY of the selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((video) => {
        if (!video.tags) return false;
        return selectedTags.some((tag) => video.tags!.includes(tag));
      });
    }

    // Apply character filter
    if (characterFilter !== "all") {
      filtered = filtered.filter(
        (video) => video.character_id === characterFilter
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (video) =>
          video.filename?.toLowerCase().includes(query) ||
          video.prompt?.toLowerCase().includes(query) ||
          video.character_id?.toLowerCase().includes(query) ||
          getCharacterName(video.character_id).toLowerCase().includes(query) ||
          video.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [videos, selectedTags, characterFilter, searchQuery]);

  const addTag = (tag: string) => {
    setSelectedTags((prev) => [...prev, tag]);
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setCharacterFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedTags.length > 0 || characterFilter !== "all" || searchQuery !== "";

  // Sort tags alphabetically for display in cells
  const getSortedTags = (tags: string[] | null): string[] => {
    if (!tags || tags.length === 0) return [];
    return [...tags].sort((a, b) => a.localeCompare(b));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Videos ({filteredVideos.length})</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[200px]"
                />
              </div>
              <Select value={characterFilter} onValueChange={setCharacterFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Characters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Characters</SelectItem>
                  {allCharacters.map((character) => (
                    <SelectItem key={character} value={character}>
                      {getCharacterName(character)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          {/* Selected tags display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Filtering by:</span>
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-xs cursor-pointer gap-1 ${getTagColor(tag)}`}
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Character</TableHead>
              
                <TableHead>Tags</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="max-w-[300px]">Prompt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No videos found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVideos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      {video.character_id ? (
                        <Badge variant="secondary">{getCharacterName(video.character_id)}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  
                    <TableCell>
                      <div className="flex flex-row gap-1 max-w-[100px]">
                        {getSortedTags(video.tags).length > 0 ? (
                          getSortedTags(video.tags).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${getTagColor(tag)} ${selectedTags.includes(tag) ? "" : ""}`}
                              onClick={() => {
                                if (!selectedTags.includes(tag)) {
                                  addTag(tag);
                                }
                              }}
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {video.file_url ? (
                        <button
                          onClick={() => setSelectedVideo({
                            url: video.file_url!,
                            title: video.filename || video.prompt?.slice(0, 50) || "Video"
                          })}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {video.prompt || "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <VideoPlayerModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url || null}
        title={selectedVideo?.title}
      />
    </Card>
  );
}
