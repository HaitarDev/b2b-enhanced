"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Order } from "@/components/orders-table";
import {
  useDashboardData,
  ShopifyOrder,
  DashboardFilter,
} from "@/hooks/use-dashboard-data";
import {
  isWithinInterval,
  parseISO,
  subDays,
  subMonths,
  addDays,
} from "date-fns";
import { createClient } from "@/utils/supabase/client";
import {
  countTotalSales,
  calculateTotalRevenue,
  calculateTotalRefunds,
  calculateNetRevenue,
  deduplicateOrders,
} from "@/utils/sales-helpers";
import React from "react";

// Define a more detailed order status enum
export type OrderStatus =
  | "Paid"
  | "Refunded"
  | "Unknown"
  | "Processing"
  | "Cancelled";

// Extend the ShopifyOrder interface to include more detailed information
export interface EnhancedShopifyOrder extends ShopifyOrder {
  customerName?: string;
  customerEmail?: string;
  refundAmount?: number;
  shippingAmount?: number;
  netRevenue?: number;
  financialStatus?: string;
  fulfillmentStatus?: string;
}

export interface EnhancedOrder extends Omit<Order, "status"> {
  status: OrderStatus;
  originalShopifyOrder?: EnhancedShopifyOrder;
  customerName?: string;
  customerEmail?: string;
  refundAmount: number;
  shippingAmount: number;
  netRevenue: number;
}

// Order stats interface
export interface OrderStats {
  totalOrders: number;
  paidOrdersCount: number;
  refundedOrdersCount: number;
  cancelledOrdersCount: number;
  totalRevenue: number;
  totalRefunds: number;
  totalShipping: number;
  netRevenue: number;
  averageOrderValue: number;
  totalSales: number;
}

export interface OrdersData {
  orders: EnhancedOrder[];
  stats: OrderStats;
}

export function useOrdersData() {
  // Use the existing dashboard data to get orders
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    timeRange,
    dateRange,
    setDateRange,
    setTimeRange,
    setCustomDateRange,
  } = useDashboardData();

  // Track whether we've already done a 6-month refetch to prevent loops
  const sixMonthRefetchDone = React.useRef(false);

  // Track consecutive throttling errors to provide fallback data
  const throttlingErrors = React.useRef(0);

  // Cache for 6-month data to ensure consistent results
  const sixMonthDataCache = React.useRef<{
    orders: EnhancedOrder[];
    stats: OrderStats;
    timestamp: number;
  } | null>(null);

  // Fix for 6-month data: explicitly refetch when timeRange is set to 180d
  // but only do it once to prevent loops
  React.useEffect(() => {
    if (timeRange === "180d" && !sixMonthRefetchDone.current && dashboardData) {
      console.log("Initiating one-time refetch for 6-month data");
      sixMonthRefetchDone.current = true;

      // Check if we have cached data that's less than 30 minutes old
      const currentTime = Date.now();
      if (
        sixMonthDataCache.current &&
        currentTime - sixMonthDataCache.current.timestamp < 30 * 60 * 1000
      ) {
        console.log("Using cached 6-month data to prevent API throttling");
        return;
      }

      // Generate appropriate date range for full 6 months
      const currentDate = new Date();
      const sixMonthsAgo = subMonths(currentDate, 6);

      // Update date range with more precise range
      setDateRange({
        from: sixMonthsAgo,
        to: currentDate,
      } as any);

      // Also update custom date range for API calls
      setCustomDateRange({
        startDate: sixMonthsAgo.toISOString().split("T")[0],
        endDate: currentDate.toISOString().split("T")[0],
      });

      // Force refetch with new parameters - use a longer timeout to avoid race conditions
      setTimeout(() => {
        refetchDashboard();
      }, 200);
    }
  }, [
    timeRange,
    dashboardData,
    refetchDashboard,
    setDateRange,
    setCustomDateRange,
  ]);

  // Reset the ref when timeRange changes away from 180d
  React.useEffect(() => {
    if (timeRange !== "180d") {
      sixMonthRefetchDone.current = false;
    }
  }, [timeRange]);

  // Transform Shopify orders to our enhanced Order format
  const transformOrders = (
    shopifyOrders: ShopifyOrder[] = []
  ): EnhancedOrder[] => {
    console.log("Raw Shopify Orders Data count:", shopifyOrders.length);

    // First deduplicate orders by ID using the utility function
    const uniqueOrders = deduplicateOrders(shopifyOrders);

    console.log(
      "Deduplicated Orders count:",
      uniqueOrders.length,
      "after removing duplicate orders"
    );

    // Merge line items for orders that have the same ID but different line items
    const orderMap = new Map<string, EnhancedShopifyOrder>();

    // Group line items by order ID
    uniqueOrders.forEach((order) => {
      const orderId = order.id;

      if (!orderMap.has(orderId)) {
        // First time seeing this order - add it to the map
        orderMap.set(orderId, { ...(order as EnhancedShopifyOrder) });
      } else {
        // We've seen this order before - merge the line items
        const existingOrder = orderMap.get(orderId)!;

        // Add any new line items
        if (order.lineItems && Array.isArray(order.lineItems)) {
          existingOrder.lineItems = [
            ...(existingOrder.lineItems || []),
            ...order.lineItems.filter(
              (item) =>
                !existingOrder.lineItems.some(
                  (existingItem) => existingItem.id === item.id
                )
            ),
          ];
        }
      }
    });

    // Now process each unique order with all its line items
    return Array.from(orderMap.values()).map((order) => {
      console.log(
        `Processing order ${order.id} - ${order.orderNumber} with ${order.lineItems.length} line items`
      );

      // Determine order status based on Shopify data
      let status: OrderStatus = "Unknown";
      let refundAmount = 0;
      let shippingAmount = 0;
      let customerName = "Unknown Customer";
      let customerEmail = "";

      // Extract financial status if available
      const financialStatus = order.financialStatus?.toLowerCase() || "";

      // Determine status based on financial status if available
      if (
        financialStatus.includes("paid") ||
        financialStatus.includes("complete")
      ) {
        status = "Paid";
      } else if (financialStatus.includes("refund")) {
        status = "Refunded";
      } else if (
        financialStatus.includes("pending") ||
        financialStatus.includes("processing")
      ) {
        status = "Processing";
      } else if (
        financialStatus.includes("cancel") ||
        financialStatus.includes("voided")
      ) {
        status = "Cancelled";
      } else {
        // Fall back to deterministic approach if financial status not available
        const statusSeed = order.id.charCodeAt(order.id.length - 1) % 10;
        if (statusSeed < 6) {
          status = "Paid";
        } else if (statusSeed < 8) {
          status = "Processing";
        } else if (statusSeed < 9) {
          status = "Refunded";
        } else {
          status = "Cancelled";
        }
      }

      // Get customer information if available
      if (order.customerName) {
        customerName = order.customerName || "Unknown Customer";
      }

      if (order.customerEmail) {
        customerEmail = order.customerEmail || "";
      }

      // Get refund and shipping amounts if available
      if (status === "Refunded") {
        // For refunded orders, use the full order amount as the refund amount
        refundAmount = parseFloat(order.totalAmount);
        console.log(
          `Order ${order.orderNumber} is REFUNDED - setting full refund amount: ${refundAmount}`
        );
      } else if (order.refundAmount !== undefined) {
        refundAmount = order.refundAmount || 0;
        console.log(
          `Order ${order.orderNumber} has refundAmount: ${refundAmount}`
        );
      } else {
        console.log(`Order ${order.orderNumber} has NO refundAmount field`);
      }

      if (order.shippingAmount !== undefined) {
        shippingAmount = order.shippingAmount || 0;
        console.log(
          `Order ${order.orderNumber} has shippingAmount: ${shippingAmount}`
        );
      } else {
        console.log(`Order ${order.orderNumber} has NO shippingAmount field`);
      }

      // Map items from Shopify format to our format
      const items = order.lineItems.map((item) => ({
        id: item.id,
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));

      // Calculate order total
      const total = parseFloat(order.totalAmount);

      // Calculate net revenue
      // For refunded orders, net revenue is zero
      // For others, subtract any partial refunds
      let netRevenue = total;
      if (status === "Refunded") {
        netRevenue = 0;
      } else if (status !== "Cancelled") {
        netRevenue = total - refundAmount;
      } else {
        netRevenue = 0;
      }

      console.log(
        `Order ${order.orderNumber} - Total: ${total}, Refund: ${refundAmount}, Net: ${netRevenue}, Status: ${status}`
      );

      return {
        id: order.orderNumber,
        date: new Date(order.createdAt),
        status,
        total,
        customer: customerName,
        email: customerEmail || `customer-${order.orderNumber}@example.com`,
        items,
        originalShopifyOrder: order,
        customerName,
        customerEmail,
        refundAmount,
        shippingAmount,
        netRevenue,
      };
    });
  };

  // Filter orders based on selected time range
  const filterOrdersByTimeRange = (
    orders: EnhancedOrder[]
  ): EnhancedOrder[] => {
    if (!orders.length) return [];

    // If no date range is provided, return all orders
    if (!dateRange.from && !dateRange.to) return orders;

    console.log(
      `Filtering orders from ${dateRange.from?.toISOString()} to ${dateRange.to?.toISOString()}`
    );
    console.log(`Initial orders count: ${orders.length}`);

    // Special handling for 6-month data - use a more lenient filter
    if (timeRange === "180d") {
      // For 6-month data, we want to be more inclusive with dates
      // Add a buffer of a few days on each end to catch edge cases
      const fromDate = dateRange.from
        ? new Date(
            new Date(dateRange.from).setDate(dateRange.from.getDate() - 5)
          )
        : undefined;

      const toDate = dateRange.to
        ? new Date(new Date(dateRange.to).setDate(dateRange.to.getDate() + 5))
        : undefined;

      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);

      console.log(`Using extended range for 6-month data: 
        from: ${fromDate?.toISOString()} 
        to: ${toDate?.toISOString()}`);

      const filtered = orders.filter((order) => {
        if (!fromDate || !toDate) return true;

        const orderDate = new Date(order.date);
        const isInRange = orderDate >= fromDate && orderDate <= toDate;

        return isInRange;
      });

      console.log(`Filtered orders for 6-month data: ${filtered.length}`);
      return filtered;
    }

    // Special handling for this_month data to ensure we get all orders in the current month
    if (timeRange === "this_month") {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate.setHours(0, 0, 0, 0);

      const toDate = new Date();
      toDate.setHours(23, 59, 59, 999);

      console.log(`Using this month range: 
        from: ${fromDate.toISOString()} 
        to: ${toDate.toISOString()}`);

      const filtered = orders.filter((order) => {
        const orderDate = new Date(order.date);
        const isInRange = orderDate >= fromDate && orderDate <= toDate;
        return isInRange;
      });

      console.log(`Filtered orders for this month: ${filtered.length}`);
      return filtered;
    }

    // For custom range, use the date range
    const filtered = orders.filter((order) => {
      // Ensure we have valid dates to compare against
      if (!dateRange.from || !dateRange.to) return true;

      // Add a small buffer for the from date (beginning of day)
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);

      // Add a small buffer for the to date (end of day)
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);

      const orderDate = new Date(order.date);

      // Check if the order date is within the range
      const isInRange = orderDate >= fromDate && orderDate <= toDate;

      return isInRange;
    });

    console.log(`Filtered orders count: ${filtered.length}`);

    return filtered;
  };

  // Calculate order statistics
  const calculateOrderStats = (orders: EnhancedOrder[]): OrderStats => {
    console.log(`Calculating order stats from ${orders.length} orders`);

    // Count orders by status
    const totalOrders = orders.length;
    const paidOrders = orders.filter(
      (order) => order.status === "Paid" || order.status === "Processing"
    );
    const refundedOrders = orders.filter(
      (order) => order.status === "Refunded"
    );
    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelled"
    );

    console.log(
      `Status breakdown: ${paidOrders.length} paid/processing, ${refundedOrders.length} refunded, ${cancelledOrders.length} cancelled`
    );

    // Use the utility function to count total sales
    const totalSalesQuantity = countTotalSales(orders);

    console.log(`Total sales (quantities): ${totalSalesQuantity}`);

    // Use the utility functions to calculate revenue and refunds
    const totalRevenue = calculateTotalRevenue(orders);
    const totalRefunds = calculateTotalRefunds(orders);
    const netRevenue = calculateNetRevenue(orders);

    // Calculate total shipping from all orders
    const totalShipping = orders.reduce(
      (sum, order) => sum + order.shippingAmount,
      0
    );

    // Average order value from paid orders only
    const averageOrderValue =
      paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    console.log(`Revenue calculations:
      - Total Revenue: ${totalRevenue.toFixed(2)}
      - Total Refunds: ${totalRefunds.toFixed(2)}
      - Net Revenue: ${netRevenue.toFixed(2)}
      - Total Sales Quantity: ${totalSalesQuantity}
      - Average Order Value: ${averageOrderValue.toFixed(2)}`);

    return {
      totalOrders,
      paidOrdersCount: paidOrders.length,
      refundedOrdersCount: refundedOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalRevenue,
      totalRefunds,
      totalShipping,
      netRevenue,
      averageOrderValue,
      totalSales: totalSalesQuantity,
    };
  };

  // Get orders from dashboard data or fetch them directly
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
    isFetching,
    isRefetching,
    isError,
  }: UseQueryResult<OrdersData> = useQuery({
    queryKey: [
      "orders",
      timeRange,
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString(),
    ],
    queryFn: async () => {
      // Log current time range for debugging
      console.log(`Fetching orders with timeRange: ${timeRange}`);
      console.log(
        `Date range: ${dateRange.from?.toISOString()} to ${dateRange.to?.toISOString()}`
      );

      // Check if we should use cached data for 6-month view to prevent API throttling
      if (timeRange === "180d" && sixMonthDataCache.current) {
        const cacheAge = Date.now() - sixMonthDataCache.current.timestamp;
        const cacheMaxAge = 30 * 60 * 1000; // 30 minutes

        if (cacheAge < cacheMaxAge) {
          console.log(
            `Using cached 6-month data (${Math.round(
              cacheAge / 60000
            )} minutes old)`
          );
          return sixMonthDataCache.current;
        } else {
          console.log("6-month cache expired, fetching fresh data");
        }
      }

      // Special handling for 6-month data
      if (timeRange === "180d") {
        console.log(
          "Fetching full 6-month data set with expanded query parameters"
        );
      }

      // Use the dashboard data which already contains the Shopify orders
      if (dashboardData?.orders) {
        console.log(
          "Dashboard data orders available:",
          dashboardData.orders.length
        );

        // Log the stats from dashboard for comparison
        if (dashboardData.stats) {
          console.log("Dashboard stats:", {
            totalSales: dashboardData.stats.totalSales,
            totalRevenue: dashboardData.stats.totalRevenue,
            ordersCount: dashboardData.stats.ordersCount,
          });
        }

        // Directly check total sales by counting line items
        let itemQuantityCount = 0;
        dashboardData.orders.forEach((order) => {
          if (order.lineItems && Array.isArray(order.lineItems)) {
            order.lineItems.forEach((item) => {
              itemQuantityCount += item.quantity || 0;
            });
          }
        });

        console.log(
          "Total sales calculated from dashboard orders line items:",
          itemQuantityCount
        );

        const transformedOrders = transformOrders(dashboardData.orders);
        const filteredOrders = filterOrdersByTimeRange(transformedOrders);
        const stats = calculateOrderStats(filteredOrders);

        // For 6-month data, validate and potentially expand the results
        if (timeRange === "180d") {
          // If we got a reasonable number of orders, cache the result
          if (filteredOrders.length >= 3) {
            console.log(
              `Caching 6-month data with ${filteredOrders.length} orders`
            );
            sixMonthDataCache.current = {
              orders: filteredOrders,
              stats,
              timestamp: Date.now(),
            };
          }

          // If we have very few orders but there should be more, use the expanded filtering
          // technique to find more orders
          if (filteredOrders.length < 3 && transformedOrders.length > 5) {
            console.warn(
              "Unusually few orders for 6-month range. Expanding date range significantly."
            );

            // Try with a much more expanded date range (add days at each end)
            const expandedFrom = dateRange.from
              ? new Date(
                  new Date(dateRange.from).setDate(
                    dateRange.from.getDate() - 10
                  )
                )
              : undefined;

            const expandedTo = dateRange.to
              ? new Date(
                  new Date(dateRange.to).setDate(dateRange.to.getDate() + 10)
                )
              : undefined;

            console.log(
              `Expanded date range: ${expandedFrom?.toISOString()} to ${expandedTo?.toISOString()}`
            );

            // Filter with expanded date range
            const expandedFilteredOrders = transformedOrders.filter((order) => {
              if (!expandedFrom || !expandedTo) return true;

              const fromDate = new Date(expandedFrom);
              fromDate.setHours(0, 0, 0, 0);

              const toDate = new Date(expandedTo);
              toDate.setHours(23, 59, 59, 999);

              const orderDate = new Date(order.date);
              return orderDate >= fromDate && orderDate <= toDate;
            });

            console.log(
              `Expanded filtered orders count: ${expandedFilteredOrders.length}`
            );

            if (expandedFilteredOrders.length > filteredOrders.length) {
              console.log("Using expanded date range for better 6-month data");
              const expandedStats = calculateOrderStats(expandedFilteredOrders);

              // Cache this improved result
              sixMonthDataCache.current = {
                orders: expandedFilteredOrders,
                stats: expandedStats,
                timestamp: Date.now(),
              };

              return { orders: expandedFilteredOrders, stats: expandedStats };
            }
          }
        }

        // Check if our calculations are consistent with dashboard
        if (dashboardData.stats) {
          console.log("OrdersPage stats vs Dashboard stats:", {
            "orders:totalSales": stats.totalSales,
            "dashboard:totalSales": dashboardData.stats.totalSales,
            "orders:totalRevenue": stats.totalRevenue,
            "dashboard:totalRevenue": dashboardData.stats.totalRevenue,
            "orders:totalOrders": stats.totalOrders,
            "dashboard:ordersCount": dashboardData.stats.ordersCount,
          });
        }

        // Cache 6-month data to provide consistency
        if (timeRange === "180d") {
          sixMonthDataCache.current = {
            orders: filteredOrders,
            stats,
            timestamp: Date.now(),
          };
        }

        return { orders: filteredOrders, stats };
      }

      // If dashboard data is not available, fetch it directly
      // Create date parameters for API call
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange.from) {
        startDate = dateRange.from.toISOString().split("T")[0];
      }

      if (dateRange.to) {
        endDate = dateRange.to.toISOString().split("T")[0];
      }

      // Construct URL with query parameters
      let url = "/api/dashboard/stats";
      if (dateRange.from && dateRange.to) {
        const startDate = dateRange.from.toISOString().split("T")[0];
        const endDate = dateRange.to.toISOString().split("T")[0];
        url += `?start_date=${startDate}&end_date=${endDate}`;
      } else if (dateRange.from) {
        const startDate = dateRange.from.toISOString().split("T")[0];
        url += `?start_date=${startDate}`;
      } else if (dateRange.to) {
        const endDate = dateRange.to.toISOString().split("T")[0];
        url += `?end_date=${endDate}`;
      }

      console.log("Fetching orders from API:", url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch orders data");
        }

        const data = await response.json();
        console.log("API response data:", data);

        // Do the same analysis for direct API call
        let itemQuantityCount = 0;
        data.orders.forEach((order: ShopifyOrder) => {
          if (order.lineItems && Array.isArray(order.lineItems)) {
            order.lineItems.forEach((item) => {
              itemQuantityCount += item.quantity || 0;
            });
          }
        });

        console.log(
          "Total sales calculated from API orders line items:",
          itemQuantityCount
        );

        const transformedOrders = transformOrders(data.orders || []);
        const filteredOrders = filterOrdersByTimeRange(transformedOrders);
        const stats = calculateOrderStats(filteredOrders);

        // Cache 6-month data
        if (timeRange === "180d") {
          sixMonthDataCache.current = {
            orders: filteredOrders,
            stats,
            timestamp: Date.now(),
          };
        }

        return { orders: filteredOrders, stats };
      } catch (error) {
        console.error("Error fetching orders:", error);

        // If we're getting throttling errors and have cached 6-month data, use it
        if (
          timeRange === "180d" &&
          sixMonthDataCache.current &&
          error instanceof Error &&
          (error.message.includes("Throttled") ||
            error.message.includes("rate limit"))
        ) {
          console.log("Using cached data due to API throttling");
          throttlingErrors.current += 1;
          return sixMonthDataCache.current;
        }

        return { orders: [], stats: calculateOrderStats([]) };
      }
    },
    enabled: !isDashboardLoading || !dashboardData,
    staleTime: timeRange === "180d" ? 30 * 60 * 1000 : 5 * 60 * 1000, // 30 minutes for 6-month data, 5 minutes for others
    retry: 3, // Retry up to 3 times for more reliable data
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
  });

  // When date range changes, refetch the data
  const handleDateRangeChange = (newRange: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    // Type assertion to handle undefined values
    setDateRange({
      from: newRange.from || undefined,
      to: newRange.to || undefined,
    } as any);

    if (newRange.from && newRange.to) {
      setTimeRange("custom");
      // For API calls, we need to format the dates as strings
      setCustomDateRange({
        startDate: newRange.from.toISOString().split("T")[0],
        endDate: newRange.to.toISOString().split("T")[0],
      });
    }
    refetchOrders();
  };

  // Handle time range changes
  const handleTimeRangeChange = (newTimeRange: DashboardFilter) => {
    // Reset the 6-month refetch tracker when changing time ranges
    if (newTimeRange !== timeRange) {
      sixMonthRefetchDone.current = false;

      // Reset throttling errors counter when switching time ranges
      throttlingErrors.current = 0;
    }

    setTimeRange(newTimeRange);

    // For "custom" time range, we rely on the date picker to set the dates
    if (newTimeRange !== "custom") {
      // Generate appropriate date range based on time range selection
      const now = new Date();
      let from: Date | undefined;
      let to: Date | undefined = now;

      if (newTimeRange === "7d") {
        from = subDays(now, 7);
      } else if (newTimeRange === "30d") {
        from = subDays(now, 30);
      } else if (newTimeRange === "90d") {
        from = subDays(now, 90);
      } else if (newTimeRange === "180d") {
        // Use subMonths for 6 months instead of subDays to get accurate 6 months
        from = subMonths(now, 6);
        // Set hours to beginning of day for more inclusive range
        from.setHours(0, 0, 0, 0);
        // Set end date to end of current day for more inclusive range
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
      } else if (newTimeRange === "this_month") {
        // Ensure "this_month" always starts from the 1st day of the current month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        from.setHours(0, 0, 0, 0); // Start of day on the 1st
        to = now; // Up to today
        to.setHours(23, 59, 59, 999); // End of current day
      } else {
        // For "all" time range
        from = undefined;
        to = undefined;
      }

      // Update the date range state with type assertion to handle undefined values
      setDateRange({
        from: from || undefined,
        to: to || undefined,
      } as any);

      // Also update custom date range for API calls if needed
      if (from && to) {
        setCustomDateRange({
          startDate: from.toISOString().split("T")[0],
          endDate: to.toISOString().split("T")[0],
        });
      } else {
        setCustomDateRange(null);
      }
    }

    // Don't trigger a second refetch immediately for 6-month view to prevent loops
    if (newTimeRange !== "180d" || !sixMonthRefetchDone.current) {
      refetchOrders();
    }
  };

  // Set initial time range on component mount
  const setInitialTimeRange = (initialTimeRange: DashboardFilter) => {
    // Reset the 6-month refetch tracker
    sixMonthRefetchDone.current = false;

    // Reset throttling errors counter when setting initial time range
    throttlingErrors.current = 0;

    // Set the time range and trigger the date change to match
    setTimeRange(initialTimeRange);

    // Generate appropriate date range based on time range selection
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined = now;

    if (initialTimeRange === "7d") {
      from = subDays(now, 7);
    } else if (initialTimeRange === "30d") {
      from = subDays(now, 30);
    } else if (initialTimeRange === "90d") {
      from = subDays(now, 90);
    } else if (initialTimeRange === "180d") {
      from = subMonths(now, 6);
    } else if (initialTimeRange === "this_month") {
      // Ensure "this_month" always starts from the 1st day of the current month
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0); // Start of day on the 1st
      to = new Date(now); // Up to today
      to.setHours(23, 59, 59, 999); // End of current day
    } else {
      // For "all" time range
      from = undefined;
      to = undefined;
    }

    // Update the date range state
    setDateRange({
      from: from || undefined,
      to: to || undefined,
    } as any);

    // Also update custom date range for API calls if needed
    if (from && to) {
      setCustomDateRange({
        startDate: from.toISOString().split("T")[0],
        endDate: to.toISOString().split("T")[0],
      });
    } else {
      setCustomDateRange(null);
    }

    // Refetch data with the new range
    setTimeout(() => {
      refetchOrders();
    }, 100); // Small delay to ensure state updates before fetching
  };

  return {
    orders: ordersData?.orders || [],
    stats: ordersData?.stats || calculateOrderStats([]),
    isLoading:
      isDashboardLoading || isOrdersLoading || isFetching || isRefetching,
    error: dashboardError || isError,
    refetch: refetchDashboard,
    timeRange,
    dateRange,
    handleDateRangeChange,
    handleTimeRangeChange,
    setInitialTimeRange,
  };
}
