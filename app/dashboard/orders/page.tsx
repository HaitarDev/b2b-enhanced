"use client";

import { useEffect, useState } from "react";
import { OrdersTable } from "@/components/orders-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeaderDashboard } from "@/components/site-header-dashboard";
import { useOrdersData } from "@/hooks/use-orders-data";
import { DashboardFilter } from "@/hooks/use-dashboard-data";
import { OrdersDateRange } from "@/components/orders-date-range-picker";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/client";

export default function OrdersPage() {
  const {
    orders,
    stats,
    isLoading,
    dateRange,
    timeRange,
    handleTimeRangeChange,
    handleDateRangeChange,
    refetch,
    setInitialTimeRange,
  } = useOrdersData();

  const [approvedProductsCount, setApprovedProductsCount] = useState<number>(0);
  const [approvedProductsError, setApprovedProductsError] = useState<
    string | null
  >(null);
  const [loadingApprovedProducts, setLoadingApprovedProducts] =
    useState<boolean>(true);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);

  // Set initial time range to "this_month" on component mount
  useEffect(() => {
    if (!initialLoadDone) {
      console.log("Setting initial time range to this_month");
      setInitialTimeRange("this_month");
      setInitialLoadDone(true);
    }
  }, [setInitialTimeRange, initialLoadDone]);

  // Log time range changes for debugging
  useEffect(() => {
    console.log("Current time range:", timeRange);
    console.log("Current date range:", {
      from: dateRange.from?.toISOString(),
      to: dateRange.to?.toISOString(),
    });
    if (stats) {
      console.log("Order stats:", {
        totalRevenue: stats.totalRevenue,
        totalRefunds: stats.totalRefunds,
        netRevenue: stats.netRevenue,
      });
    }
  }, [timeRange, dateRange, stats]);

  // Check if the user has any approved products in Supabase
  useEffect(() => {
    const checkApprovedProducts = async () => {
      try {
        setLoadingApprovedProducts(true);
        const supabase = createClient();

        // Get user session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setApprovedProductsError("You need to be logged in to view orders.");
          return;
        }

        // Query for approved products
        const { data: approvedPosters, error: postersError } = await supabase
          .from("posters")
          .select("id")
          .eq("creator_id", user.id)
          .eq("status", "approved");

        if (postersError) {
          throw postersError;
        }

        // Set the count of approved products
        setApprovedProductsCount(approvedPosters?.length || 0);

        // If we have approved products but no orders, refetch to make sure
        if (
          approvedPosters &&
          approvedPosters.length > 0 &&
          orders.length === 0 &&
          !isLoading
        ) {
          refetch();
        }
      } catch (error) {
        console.error("Error checking approved products:", error);
        setApprovedProductsError("Failed to verify your approved products.");
      } finally {
        setLoadingApprovedProducts(false);
      }
    };

    checkApprovedProducts();
  }, [orders.length, isLoading, refetch]);

  // Handle time range change with correct type casting
  const handleTimeRangeChangeWithCasting = (value: string) => {
    handleTimeRangeChange(value as DashboardFilter);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeaderDashboard />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {approvedProductsError && (
                <Alert variant="destructive">
                  <Icons.warning className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{approvedProductsError}</AlertDescription>
                </Alert>
              )}

              {!approvedProductsError &&
                approvedProductsCount === 0 &&
                !loadingApprovedProducts && (
                  <Alert>
                    <Icons.info className="h-4 w-4" />
                    <AlertTitle>No approved products</AlertTitle>
                    <AlertDescription>
                      You don&apos;t have any approved products yet. Once your
                      products are approved, you&apos;ll be able to see orders
                      and revenue data here.
                    </AlertDescription>
                  </Alert>
                )}

              <OrdersTable
                orders={orders}
                isLoading={isLoading || loadingApprovedProducts}
                orderStats={stats}
                onTimeRangeChange={handleTimeRangeChangeWithCasting}
                onRangeChange={handleDateRangeChange}
                currentTimeRange={timeRange}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
