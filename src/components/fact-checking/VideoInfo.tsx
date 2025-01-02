import { MessageSquare } from "lucide-react";

type VideoInfoProps = {
  url: string;
  title?: string | null;
  transcriptStatus?: string | null;
};

export const VideoInfo = ({ url, title, transcriptStatus }: VideoInfoProps) => {
  if (!url) return null;

  return (
    <div className="mt-2 p-2 bg-muted rounded-md">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        <span>Video Transcript Status: {transcriptStatus}</span>
      </div>
      {title && <p className="mt-1 text-sm font-medium">{title}</p>}
    </div>
  );
};