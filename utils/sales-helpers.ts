/**
 * Utility functions for calculating sales and revenue consistently across the application
 */

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
 * Calculate total revenue from ALL orders (including refunded ones)
 * This represents the gross revenue before any refunds are considered
 * @param orders Array of orders to calculate revenue from
 * @returns Total revenue amount (including refunded orders)
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
    // Skip cancelled orders only - include all other orders including refunded ones
    if (order.status === "Cancelled") {
      return;
    }

    // Calculate the order amount
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

    totalRevenue += orderAmount;
  });

  return totalRevenue;
}

/**
 * Calculate total refund amount across all orders
 * For refunded orders, use the full order amount as the refund amount
 * For orders with partial refunds, use the refundAmount field
 * @param orders Array of orders to calculate refunds from
 * @returns Total refund amount
 */
export function calculateTotalRefunds<
  T extends {
    totalAmount?: string | number;
    total?: number;
    refundAmount?: number;
    status?: string;
  }
>(orders: T[]): number {
  let totalRefunds = 0;

  if (!orders || !Array.isArray(orders)) return 0;

  orders.forEach((order) => {
    // For refunded orders, use the refundAmount if available, otherwise use full order amount
    if (order.status === "Refunded") {
      // Check if we have a specific refund amount
      if (
        "refundAmount" in order &&
        typeof order.refundAmount === "number" &&
        order.refundAmount > 0
      ) {
        totalRefunds += order.refundAmount;
      } else {
        // Fall back to full order amount for refunded orders without specific refund amount
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

        totalRefunds += orderAmount;
      }
    } else if (
      order.status !== "Cancelled" &&
      "refundAmount" in order &&
      typeof order.refundAmount === "number" &&
      order.refundAmount > 0
    ) {
      // For non-refunded and non-cancelled orders, add any partial refunds
      totalRefunds += order.refundAmount;
    }
  });

  return totalRefunds;
}

/**
 * Calculate net revenue (total revenue minus refunds)
 * @param orders Array of orders to calculate net revenue from
 * @returns Net revenue amount
 */
export function calculateNetRevenue<
  T extends {
    totalAmount?: string | number;
    total?: number;
    refundAmount?: number;
    status?: string;
  }
>(orders: T[]): number {
  const totalRevenue = calculateTotalRevenue(orders);
  const totalRefunds = calculateTotalRefunds(orders);
  return totalRevenue - totalRefunds;
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
