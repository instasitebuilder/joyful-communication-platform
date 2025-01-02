import { supabase } from "@/integrations/supabase/client";
import { BroadcastWithFactChecks } from "./types";

export const fetchBroadcasts = async (): Promise<BroadcastWithFactChecks[]> => {
  const { data: broadcasts, error: broadcastsError } = await supabase
    .from("broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (broadcastsError) throw broadcastsError;

  // Fetch fact checks for each broadcast
  const factChecksPromises = broadcasts.map(async (broadcast) => {
    const { data: factChecks } = await supabase
      .from("fact_checks")
      .select("*")
      .eq("broadcast_id", broadcast.id);
    
    // Ensure status is one of the allowed values
    const status = broadcast.status as BroadcastWithFactChecks["status"];
    return { 
      ...broadcast, 
      status: status || "pending",
      factChecks 
    };
  });

  return Promise.all(factChecksPromises);
};

export const processNewBroadcast = async (broadcastId: number) => {
  const response = await supabase.functions.invoke('process-claim', {
    body: { broadcastId },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
};