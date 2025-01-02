import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Settings, Home } from "lucide-react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar>
          <SidebarContent>
            <div className="space-y-4 py-4">
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold">Dashboard</h2>
                <div className="space-y-1">
                  <a href="#" className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-md">
                    <Home className="mr-2 h-4 w-4" />
                    Overview
                  </a>
                  <a href="#" className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-md">
                    <Bell className="mr-2 h-4 w-4" />
                    Alerts
                  </a>
                  <a href="#" className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-md">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </a>
                </div>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-hidden">
          <div className="h-full px-4 py-6 lg:px-8">
            <SidebarTrigger />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;