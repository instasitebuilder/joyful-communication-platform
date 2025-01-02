import DashboardLayout from "@/components/DashboardLayout";
import FactCheckingFeed from "@/components/FactCheckingFeed";
import LiveStreamInput from "@/components/LiveStreamInput";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchStats = async () => {
  const { data: broadcasts, error: broadcastsError } = await supabase
    .from("broadcasts")
    .select("status", { count: "exact" });

  if (broadcastsError) throw broadcastsError;

  const verified = broadcasts?.filter((b) => b.status === "verified").length || 0;
  const debunked = broadcasts?.filter((b) => b.status === "debunked").length || 0;
  const flagged = broadcasts?.filter((b) => b.status === "flagged").length || 0;
  const pending = broadcasts?.filter((b) => b.status === "pending" || !b.status).length || 0;

  return { verified, debunked, flagged, pending };
};

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fact-Checking Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-2">
            <LiveStreamInput />
            <div className="h-4" /> {/* Spacer */}
            <FactCheckingFeed />
          </div>
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Verified Claims</span>
                  <span className="font-medium text-green-500">
                    {statsLoading ? "..." : stats?.verified || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Debunked Claims</span>
                  <span className="font-medium text-red-500">
                    {statsLoading ? "..." : stats?.debunked || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Flagged Claims</span>
                  <span className="font-medium text-yellow-500">
                    {statsLoading ? "..." : stats?.flagged || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Review</span>
                  <span className="font-medium text-gray-500">
                    {statsLoading ? "..." : stats?.pending || 0}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;