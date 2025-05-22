import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeaderDashboard } from "@/components/site-header-dashboard";
import { QueryProvider } from "@/components/query-provider";
import { PosterTableContainer } from "@/components/poster-table-container";

export default function ProductsPage() {
  return (
    <QueryProvider>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeaderDashboard />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <PosterTableContainer />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  );
}
