import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BroadcastItem } from "./fact-checking/BroadcastItem";
import { fetchBroadcasts, processNewBroadcast } from "./fact-checking/api";
import { BroadcastWithFactChecks } from "./fact-checking/types";

const FactCheckingFeed = () => {
  const [items, setItems] = useState<BroadcastWithFactChecks[]>([]);
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
        async (payload) => {
          console.log("Real-time update:", payload);
          if (payload.eventType === "INSERT") {
            try {
              const response = await processNewBroadcast(payload.new.id);
              toast({
                title: "AI Fact Check Complete",
                description: `Processed claim with ${response.confidence}% confidence`,
              });
            } catch (error) {
              console.error('Error processing claim:', error);
              toast({
                title: "Error",
                description: "Failed to process claim with AI",
                variant: "destructive",
              });
            }
          }
          // Refresh the data when changes occur
          const newData = await fetchBroadcasts();
          setItems(newData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

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
            <BroadcastItem key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FactCheckingFeed;