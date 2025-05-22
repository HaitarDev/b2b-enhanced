"use client";

import { useEffect, useState } from "react";
import { OrdersTable } from "@/components/orders-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeaderDashboard } from "@/components/site-header-dashboard";
import { useOrdersData } from "@/hooks/use-orders-data";
import { DashboardFilter } from "@/hooks/use-dashboard-data";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/client";

export default function OrdersPage() {
  const {
    orders,
    stats,
    isLoading,
    error,
    dateRange,
    timeRange,
    handleDateRangeChange,
    handleTimeRangeChange,
    refetch,
  } = useOrdersData();

  const [approvedProductsCount, setApprovedProductsCount] = useState<number>(0);
  const [approvedProductsError, setApprovedProductsError] = useState<
    string | null
  >(null);
  const [loadingApprovedProducts, setLoadingApprovedProducts] =
    useState<boolean>(true);
  const [isChangingDateRange, setIsChangingDateRange] =
    useState<boolean>(false);

  // Add effect to log stats for debugging
  useEffect(() => {
    if (stats && !isLoading) {
      console.log("OrdersPage stats:", {
        totalOrders: stats.totalOrders,
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue.toFixed(2),
        netRevenue: stats.netRevenue.toFixed(2),
      });

      // Count total items from orders for verification
      let totalItems = 0;
      orders.forEach((order) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item) => {
            totalItems += item.quantity;
          });
        }
      });

      console.log(
        `Counted ${totalItems} total items in ${orders.length} orders`
      );

      // Check if the stats match with calculated values
      if (totalItems !== stats.totalSales) {
        console.warn(
          "Discrepancy in sales count: stats.totalSales =",
          stats.totalSales,
          "but counted totalItems =",
          totalItems
        );
      }
    }
  }, [stats, isLoading, orders]);

  // Reset isChangingDateRange when loading completes
  useEffect(() => {
    if (!isLoading && isChangingDateRange) {
      setIsChangingDateRange(false);
    }
  }, [isLoading, isChangingDateRange]);

  // Check if the user has any approved products in Supabase
  // This is important because we need to show the user they need approved products
  // to see orders in the B2B dashboard
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
    setIsChangingDateRange(true);
    handleTimeRangeChange(value as DashboardFilter);
  };

  // Wrap the date range change handler to track loading state
  const handleDateRangeChangeWrapper = (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    setIsChangingDateRange(true);
    handleDateRangeChange(range);
  };

  // Combined loading state for better UI experience
  const isPageLoading =
    isLoading || loadingApprovedProducts || isChangingDateRange;

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
                      You don't have any approved products yet. Once your
                      products are approved, you'll be able to see orders and
                      revenue data here.
                    </AlertDescription>
                  </Alert>
                )}

              {isChangingDateRange && (
                <Alert>
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <AlertTitle>Updating data</AlertTitle>
                  <AlertDescription>
                    Loading orders for the selected time period...
                  </AlertDescription>
                </Alert>
              )}

              <OrdersTable
                orders={orders}
                isLoading={isPageLoading}
                isRefreshing={isChangingDateRange}
                orderStats={stats}
                onDateRangeChange={handleDateRangeChangeWrapper}
                onTimeRangeChange={handleTimeRangeChangeWithCasting}
                currentDateRange={dateRange}
                currentTimeRange={timeRange}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
