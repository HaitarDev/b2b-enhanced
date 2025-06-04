"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Order } from "@/components/orders-table";
import {
  useDashboardData,
  ShopifyOrder,
  DashboardFilter,
} from "@/hooks/use-dashboard-data";
import { subDays } from "date-fns";
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

  // Transform Shopify orders to our enhanced Order format
  const transformOrders = (
    shopifyOrders: ShopifyOrder[] = []
  ): EnhancedOrder[] => {
    console.log("\n=== FRONTEND ORDER TRANSFORMATION START ===");
    console.log("Raw Shopify Orders Data count:", shopifyOrders.length);

    // Log raw data structure
    console.log("\nRaw Shopify Orders (first 3):");
    shopifyOrders.slice(0, 3).forEach((order, index) => {
      console.log(`  Order ${index + 1}:`, {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        lineItemsCount: order.lineItems?.length || 0,
        lineItems: order.lineItems?.map((item) => ({
          id: item.id,
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        refundAmount: order.refundAmount,
        shippingAmount: order.shippingAmount,
        netRevenue: order.netRevenue,
        financialStatus: order.financialStatus,
      });
    });

    // The API now handles order splitting and deduplication correctly,
    // so we don't need to deduplicate here - each entry is intentional
    console.log(
      "\nSkipping deduplication - API handles order splitting correctly"
    );
    console.log("Total orders from API:", shopifyOrders.length);

    // The API now handles order splitting, so we just need to transform the data
    const orderEntries: EnhancedOrder[] = shopifyOrders.map(
      (order, orderIndex) => {
        console.log(
          `\n--- Transforming order ${orderIndex + 1}/${
            shopifyOrders.length
          }: ${order.orderNumber} ---`
        );
        console.log(`  Original ID: ${order.id}`);
        console.log(`  Order Number: ${order.orderNumber}`);
        console.log(`  Line Items Count: ${order.lineItems?.length || 0}`);
        console.log(`  Total Amount: ${order.totalAmount}`);
        console.log(`  Financial Status: ${order.financialStatus}`);
        console.log(`  Customer: ${order.customerName}`);
        console.log(`  Refund Amount: ${order.refundAmount}`);
        console.log(`  Shipping Amount: ${order.shippingAmount}`);
        console.log(`  Net Revenue: ${order.netRevenue}`);

        // Determine order status based on Shopify data
        let status: OrderStatus = "Unknown";
        const financialStatus = order.financialStatus?.toLowerCase() || "";

        console.log(`  Processing financial status: "${financialStatus}"`);

        // Determine status based on financial status if available
        if (
          financialStatus.includes("paid") ||
          financialStatus.includes("complete")
        ) {
          status = "Paid";
        } else if (
          financialStatus.includes("refund") ||
          financialStatus === "refunded"
        ) {
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
          console.log(
            `  Used fallback status determination (seed: ${statusSeed})`
          );
        }

        console.log(`  Determined status: ${status}`);

        // Get customer information
        const customerName = order.customerName || "Unknown Customer";
        const customerEmail = order.customerEmail || "";

        // Use the values already calculated by the API
        const refundAmount = order.refundAmount || 0;
        const shippingAmount = order.shippingAmount || 0;
        const total = parseFloat(order.totalAmount || "0");

        // Calculate correct net revenue and refund amount based on status
        let netRevenue = order.netRevenue || 0;
        let finalRefundAmount = refundAmount;

        // For refunded orders, ensure proper refund amount and net revenue calculation
        if (status === "Refunded") {
          // For fully refunded orders, refund amount should equal the total
          if (refundAmount === 0 || refundAmount < total) {
            // If API didn't provide correct refund amount, set it to the full total
            finalRefundAmount = total;
          }

          // For fully refunded orders, net revenue should always be 0
          netRevenue = 0;

          console.log(
            `  Refunded order: total=${total}, originalRefund=${refundAmount}, correctedRefund=${finalRefundAmount}, corrected netRevenue=${netRevenue}`
          );
        } else if (refundAmount > 0) {
          // For partial refunds on non-refunded orders
          netRevenue = Math.max(0, total - refundAmount);
          finalRefundAmount = refundAmount;

          console.log(
            `  Partial refund: total=${total}, refund=${refundAmount}, netRevenue=${netRevenue}`
          );
        }

        // Transform line items
        const items = order.lineItems.map((item) => ({
          id: item.id,
          name: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price),
        }));

        console.log(`  Transformed line items:`, items);

        const transformedOrder = {
          id: order.orderNumber,
          date: new Date(order.createdAt),
          status,
          total,
          customer: customerName,
          email: customerEmail || `customer-${order.orderNumber}@example.com`,
          items,
          originalShopifyOrder: order as EnhancedShopifyOrder,
          customerName,
          customerEmail,
          refundAmount: finalRefundAmount,
          shippingAmount,
          netRevenue,
        };

        console.log(`  ✅ Transformed order result:`, {
          id: transformedOrder.id,
          status: transformedOrder.status,
          total: transformedOrder.total,
          customer: transformedOrder.customer,
          itemsCount: transformedOrder.items.length,
          refundAmount: transformedOrder.refundAmount,
          shippingAmount: transformedOrder.shippingAmount,
          netRevenue: transformedOrder.netRevenue,
        });

        return transformedOrder;
      }
    );

    console.log(`\n=== FRONTEND TRANSFORMATION COMPLETE ===`);
    console.log(
      `Transformed ${orderEntries.length} order entries from ${shopifyOrders.length} API orders`
    );

    // Log summary of transformed orders
    console.log(`\nTransformed orders summary:`);
    orderEntries.forEach((entry, index) => {
      console.log(
        `  ${index + 1}. ${entry.id} - ${entry.status} - $${
          entry.total
        } (Net: $${entry.netRevenue}) - ${entry.items?.length || 0} items`
      );
    });

    return orderEntries;
  };

  // Filter orders based on selected time range
  const filterOrdersByTimeRange = (
    orders: EnhancedOrder[]
  ): EnhancedOrder[] => {
    // If no date range is provided, return all orders
    if (!dateRange.from && !dateRange.to) return orders;

    console.log(
      `Filtering orders from ${dateRange.from?.toISOString()} to ${dateRange.to?.toISOString()}`
    );
    console.log(`Initial orders count: ${orders.length}`);

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

        return { orders: filteredOrders, stats };
      }

      // If dashboard data is not available, fetch it directly
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

        return { orders: filteredOrders, stats };
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { orders: [], stats: calculateOrderStats([]) };
      }
    },
    enabled: !isDashboardLoading || !dashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } else if (newTimeRange === "this_month") {
        // Ensure "this_month" always starts from the 1st day of the current month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        from.setHours(0, 0, 0, 0); // Start of day on the 1st
        to = now; // Up to today
        to.setHours(23, 59, 59, 999); // End of current day
      } else {
        // Default fallback
        from = undefined;
        to = undefined;
      }

      // Update the date range state with type assertion to handle undefined values
      setDateRange({
        from: from || undefined,
        to: to || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Refetch orders with new time range
    refetchOrders();
  };

  // Set initial time range on component mount
  const setInitialTimeRange = (initialTimeRange: DashboardFilter) => {
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
    } else if (initialTimeRange === "this_month") {
      // Ensure "this_month" always starts from the 1st day of the current month
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0); // Start of day on the 1st
      to = new Date(now); // Up to today
      to.setHours(23, 59, 59, 999); // End of current day
    } else {
      // Default fallback
      from = undefined;
      to = undefined;
    }

    // Update the date range state
    setDateRange({
      from: from || undefined,
      to: to || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
