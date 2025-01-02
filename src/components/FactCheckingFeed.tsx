import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type FactCheckItem = {
  id: number;
  content: string;
  confidence: number | null;
  status: "verified" | "debunked" | "flagged" | "pending";
  timestamp: string | null;
  source: string;
  speaker?: string | null;
  api_processed?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

const fetchBroadcasts = async () => {
  const { data, error } = await supabase
    .from("broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data as FactCheckItem[];
};

const StatusIcon = ({ status }: { status: FactCheckItem["status"] }) => {
  switch (status) {
    case "verified":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "debunked":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "flagged":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};

const FactCheckingFeed = () => {
  const [items, setItems] = useState<FactCheckItem[]>([]);
  const { toast } = useToast();

  const { data: initialData, isLoading } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: fetchBroadcasts,
  });

  useEffect(() => {
    if (initialData) {
      setItems(initialData);
    }
  }, [initialData]);

  const processNewBroadcast = async (broadcast: FactCheckItem) => {
    if (broadcast.api_processed) return;

    try {
      const response = await supabase.functions.invoke('process-claim', {
        body: { broadcastId: broadcast.id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "AI Fact Check Complete",
        description: `Processed claim with ${response.data.confidence}% confidence`,
      });
    } catch (error) {
      console.error('Error processing claim:', error);
      toast({
        title: "Error",
        description: "Failed to process claim with AI",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "broadcasts",
        },
        (payload) => {
          console.log("Real-time update:", payload);
          if (payload.eventType === "INSERT") {
            const newBroadcast = payload.new as FactCheckItem;
            processNewBroadcast(newBroadcast);
          }
          // Refresh the data when changes occur
          fetchBroadcasts().then((newData) => setItems(newData));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader>
          <CardTitle>Live Fact-Checking Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-muted animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Fact-Checking Feed</span>
          <Badge variant="outline" className="ml-2">
            {items.length} claims
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
            >
              <StatusIcon status={item.status || "pending"} />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.content}</p>
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
                    {new Date(item.timestamp || item.created_at || '').toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FactCheckingFeed;