"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  title?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
}: VideoPlayerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{title || "Video"}</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full rounded-lg bg-black aspect-video"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex items-center justify-center aspect-video bg-muted rounded-lg">
              <p className="text-muted-foreground">No video available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

