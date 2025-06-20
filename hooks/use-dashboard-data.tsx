"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useCurrencyContext } from "@/components/currency-provider";

// Define types based on the API response structure
export type DashboardFilter = "7d" | "30d" | "90d" | "this_month" | "custom";

export interface DashboardProduct {
  id: string;
  title: string;
  variantTitle?: string;
  imageUrl: string;
  price?: string;
  status: string;
  shopifyUrl: string;
  shopifyProductId: string;
  createdAt: string;
  salesCount: number;
  revenue: number;
  commission: number;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: string;
  lineItems: {
    id: string;
    productId: string;
    title: string;
    price: string;
    quantity: number;
  }[];
  customerName?: string;
  customerEmail?: string;
  refundAmount?: number;
  shippingAmount?: number;
  netRevenue?: number;
  financialStatus?: string;
  fulfillmentStatus?: string;
}

export interface SalesTrendPoint {
  date: string;
  sales: number;
  revenue: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalCommission: number;
  averageOrderValue: number;
  productsCount: number;
  ordersCount: number;
  approvedProductsCount: number;
  totalRefunds?: number;
  netRevenue?: number;
}

export interface DashboardData {
  products: DashboardProduct[];
  orders: ShopifyOrder[];
  stats: DashboardStats;
  salesTrend: SalesTrendPoint[];
  dateRange: {
    startDate: string;
    endDate: string;
    isAllTime: boolean;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

const fetchDashboardData = async (
  timeRange: DashboardFilter,
  customDateRange: DateRange | null
): Promise<DashboardData> => {
  let url = "/api/dashboard/stats";

  // Add time range query parameters
  if (timeRange === "custom" && customDateRange) {
    url += `?start_date=${customDateRange.startDate}&end_date=${customDateRange.endDate}`;
  } else if (timeRange !== "this_month") {
    const now = new Date();
    let startDate: Date;

    if (timeRange === "7d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === "30d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else if (timeRange === "90d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
    } else {
      // Default fallback
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    }

    url += `?start_date=${startDate.toISOString().split("T")[0]}`;
  } else {
    // This month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    url += `?start_date=${startDate.toISOString().split("T")[0]}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return await response.json();
};

export function useDashboardData(initialTimeRange: DashboardFilter = "30d") {
  const [timeRange, setTimeRange] = useState<DashboardFilter>(initialTimeRange);
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(
    null
  );
  const { userCurrency, version } = useCurrencyContext();

  // Initialize with reasonable defaults (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [dateRange, setDateRange] = useState({
    from: thirtyDaysAgo,
    to: today,
  });

  // Format date range for display
  const formattedDateRange =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(
          dateRange.to,
          "MMM d, yyyy"
        )}`
      : "";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", timeRange, customDateRange, userCurrency, version],
    queryFn: () => fetchDashboardData(timeRange, customDateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Add retry logic
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // When userCurrency changes, force a hard update of data
  useEffect(() => {
    // This runs when currency changes, forcing a refetch
    if (version > 0) {
      refetch();
    }
  }, [userCurrency, version, refetch]);

  return {
    data,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    customDateRange,
    setCustomDateRange,
    dateRange,
    setDateRange,
    formattedDateRange,
    refetch,
  };
}
