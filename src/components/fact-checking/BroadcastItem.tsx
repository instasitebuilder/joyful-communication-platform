import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { BroadcastWithFactChecks } from "./types";
import { StatusIcon } from "./StatusIcon";
import { VideoInfo } from "./VideoInfo";

export const BroadcastItem = ({ item }: { item: BroadcastWithFactChecks }) => {
  return (
    <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors">
      <StatusIcon status={item.status || "pending"} />
      <div className="flex-1">
        <p className="text-sm font-medium">{item.content}</p>
        <VideoInfo
          url={item.video_url || ""}
          title={item.video_title}
          transcriptStatus={item.transcript_status}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              item.confidence && item.confidence > 80
                ? "bg-green-500/10 text-green-500"
                : item.confidence && item.confidence > 60
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
            }
          >
            {item.confidence || 0}% confidence
          </Badge>
          {item.speaker && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
              {item.speaker}
            </Badge>
          )}
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
            {item.source}
          </Badge>
          {item.api_processed && (
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500">
              <Brain className="w-3 h-3 mr-1" />
              AI Processed
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp || item.created_at || "").toLocaleTimeString()}
          </span>
        </div>
        {item.factChecks && item.factChecks.length > 0 && (
          <div className="mt-3 space-y-2">
            <h4 className="text-sm font-semibold">Fact Check Results:</h4>
            {item.factChecks.map((check, index) => (
              <div key={index} className="text-sm pl-2 border-l-2 border-accent">
                <p className="font-medium">{check.verification_source}</p>
                <p className="text-muted-foreground">{check.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};