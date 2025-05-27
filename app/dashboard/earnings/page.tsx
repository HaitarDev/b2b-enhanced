import type { Metadata } from "next";
import { EarningsOverview } from "@/components/earnings-overview";
import { TopSellingPosters } from "@/components/top-selling-posters";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeaderDashboard } from "@/components/site-header-dashboard";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { QueryProvider } from "@/components/query-provider";
import { CurrencyProvider } from "@/components/currency-provider";

export const metadata: Metadata = {
  title: "Earnings | Creator Dashboard",
  description:
    "View your earnings, sales statistics, and commission information.",
};

export default function EarningsPage() {
  return (
    <QueryProvider>
      <CurrencyProvider>
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeaderDashboard />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight">
                        Earnings
                      </h1>
                      <p className="text-muted-foreground">
                        Track your sales performance and earnings over time.
                      </p>
                    </div>
                  </div>
                  <EarningsOverview />
                  <ChartAreaInteractive />
                  <TopSellingPosters />
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </CurrencyProvider>
    </QueryProvider>
  );
}
