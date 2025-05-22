import { AppSidebar } from "../../components/app-sidebar";
import { ChartAreaInteractive } from "../../components/chart-area-interactive";
import { ProductsTable } from "../../components/products-table";
import { RecentOrders } from "../../components/recent-orders";
import { SectionCards } from "../../components/section-cards";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeaderDashboard } from "@/components/site-header-dashboard";
import { QueryProvider } from "@/components/query-provider";

export default function Page() {
  return (
    <QueryProvider>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeaderDashboard />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive />
                </div>
                <RecentOrders />
                <ProductsTable />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  );
}
