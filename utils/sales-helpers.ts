/**
 * Utility functions for calculating sales and revenue consistently across the application
 */

import type { EnhancedOrder } from "@/hooks/use-orders-data";
import type { ShopifyOrder } from "@/hooks/use-dashboard-data";

/**
 * Count total sales by summing the quantities of all line items across all orders
 * This is the preferred method for counting sales, treating each item sold as a sale
 * @param orders Array of orders to count sales from
 * @returns Total number of items sold
 */
export function countTotalSales<
  T extends { lineItems?: any[] } | { items?: any[] }
>(orders: T[]): number {
  let totalSales = 0;

  if (!orders || !Array.isArray(orders)) return 0;

  orders.forEach((order) => {
    // Handle ShopifyOrder format
    if (
      "lineItems" in order &&
      order.lineItems &&
      Array.isArray(order.lineItems)
    ) {
      order.lineItems.forEach((item) => {
        totalSales += item.quantity || 0;
      });
    }
    // Handle EnhancedOrder format
    else if ("items" in order && order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        totalSales += item.quantity || 0;
      });
    }
  });

  return totalSales;
}

/**
 * Calculate total revenue from orders, accounting for refunds
 * @param orders Array of orders to calculate revenue from
 * @returns Total revenue amount
 */
export function calculateTotalRevenue<
  T extends {
    totalAmount?: string | number;
    total?: number;
    refundAmount?: number;
    status?: string;
  }
>(orders: T[]): number {
  let totalRevenue = 0;

  if (!orders || !Array.isArray(orders)) return 0;

  orders.forEach((order) => {
    // First determine the order amount
    let orderAmount = 0;

    if ("totalAmount" in order && order.totalAmount) {
      // Handle ShopifyOrder format
      orderAmount =
        typeof order.totalAmount === "string"
          ? parseFloat(order.totalAmount)
          : order.totalAmount;
    } else if ("total" in order && typeof order.total === "number") {
      // Handle EnhancedOrder format
      orderAmount = order.total;
    }

    // Handle refunds if available
    if ("refundAmount" in order && typeof order.refundAmount === "number") {
      // If it's refunded or canceled, don't count it or subtract the refund
      if (order.status === "Refunded" || order.status === "Cancelled") {
        totalRevenue += Math.max(0, orderAmount - order.refundAmount);
      } else {
        // For other statuses, use the full amount
        totalRevenue += orderAmount;
      }
    } else {
      // If no refund information, just use the order amount
      totalRevenue += orderAmount;
    }
  });

  return totalRevenue;
}

/**
 * Deduplicate orders by ID
 * @param orders Array of orders that might contain duplicates
 * @returns Array of unique orders
 */
export function deduplicateOrders<T extends { id: string }>(orders: T[]): T[] {
  const uniqueOrders = new Map<string, T>();

  orders.forEach((order) => {
    uniqueOrders.set(order.id, order);
  });

  return Array.from(uniqueOrders.values());
}
