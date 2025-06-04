"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { format, subDays, startOfMonth } from "date-fns";
import { DateRange, DateRangeOption } from "@/components/date-range-filter";
import { toast } from "sonner";

// Define product shape for the table
export interface Product {
  id: string | null;
  name: string;
  sales: number;
  status: "Approved" | "Rejected" | "Pending" | "Will be deleted" | "Deleted";
  revenue: number;
  commission: number;
  image?: string;
  shopUrl?: string;
  shopifyProductId?: string | null;
}

// Status mappings from backend to frontend
const statusMapping: Record<string, Product["status"]> = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  willBeDeleted: "Will be deleted",
  deleted: "Deleted",
};

// Helper to generate date ranges based on selected option
export function getDateRange(option: DateRangeOption): DateRange {
  const now = new Date();
  let result: DateRange;

  switch (option) {
    case "7d":
      result = { from: subDays(now, 7), to: now };
      break;
    case "30d":
      result = { from: subDays(now, 30), to: now };
      break;
    case "90d":
      result = { from: subDays(now, 90), to: now };
      break;
    case "180d":
      result = { from: subDays(now, 180), to: now };
      break;
    case "this_month":
      result = { from: startOfMonth(now), to: now };
      break;
    case "custom":
      result = { from: undefined, to: undefined };
      break;
    default:
      result = { from: startOfMonth(now), to: now };
  }

  console.log(`[DateRange] Created date range for option "${option}":`, {
    from: result.from ? format(result.from, "yyyy-MM-dd") : undefined,
    to: result.to ? format(result.to, "yyyy-MM-dd") : undefined,
  });

  return result;
}

// Format date for API requests
function formatDateForApi(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, "yyyy-MM-dd");
}

export function useProductData(dateRange?: DateRange) {
  const supabase = createClient();

  return useQuery({
    queryKey: [
      "products",
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    queryFn: async () => {
      try {
        console.log("[useProductData] Fetching products with date range:", {
          from: dateRange?.from
            ? format(dateRange.from, "yyyy-MM-dd")
            : undefined,
          to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        });

        // Get current authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(`Authentication error: ${userError.message}`);
        }

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Fetch posters from Supabase for this user
        const { data: postersData, error: postersError } = await supabase
          .from("posters")
          .select("*")
          .eq("creator_id", user.id);

        if (postersError) {
          throw new Error(`Posters fetch error: ${postersError.message}`);
        }

        if (!postersData) {
          return [];
        }

        console.log(
          `[useProductData] Fetched ${postersData.length} posters from Supabase`
        );

        // Format dates for API requests
        const startDate = formatDateForApi(dateRange?.from);
        const endDate = formatDateForApi(dateRange?.to);

        // Prepare API request to our dashboard stats endpoint
        let url = "/api/dashboard/stats";
        if (startDate || endDate) {
          const params = new URLSearchParams();
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);
          url += `?${params.toString()}`;
        }

        console.log("[useProductData] Fetching dashboard data from:", url);

        // Use a timeout to cancel the fetch request if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

        try {
          // Fetch dashboard data which includes all product stats
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          // Clear the timeout since the request completed
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error (${response.status}): ${errorText}`);
          }

          const dashboardData = await response.json();

          console.log(
            `[useProductData] Fetched dashboard data with ${
              dashboardData.products?.length || 0
            } products`
          );

          // Create a map of Shopify products by ID for quick lookups
          const shopifyProductMap = new Map();
          if (dashboardData.products && Array.isArray(dashboardData.products)) {
            dashboardData.products.forEach((product: any) => {
              if (product.shopifyProductId) {
                shopifyProductMap.set(product.shopifyProductId, {
                  salesCount: product.salesCount || 0,
                  revenue: product.revenue || 0,
                  commission: product.commission || 0,
                  imageUrl: product.imageUrl || "/placeholder.svg",
                  shopifyUrl: product.shopifyUrl || "",
                });
              }
            });
          }

          console.log(
            "[useProductData] Created product map with",
            shopifyProductMap.size,
            "products"
          );

          // Combine data from both sources
          const products: Product[] = postersData.map((poster) => {
            // Check if we have matching Shopify data
            const shopifyData = poster.shopify_product_id
              ? shopifyProductMap.get(poster.shopify_product_id)
              : undefined;

            if (shopifyData) {
              console.log(
                `[useProductData] Found Shopify data for poster ${poster.id}: ${
                  shopifyData.salesCount
                } sales, $${shopifyData.revenue.toFixed(2)} revenue`
              );
            }

            const product = {
              // Use the Supabase ID for easier deletion
              id: poster.id || null,
              name: poster.title || "",
              sales: shopifyData?.salesCount || 0,
              status:
                statusMapping[poster.status as keyof typeof statusMapping] ||
                "Pending",
              // Revenue data from Shopify
              revenue: shopifyData?.revenue || 0,
              commission: shopifyData?.commission || 0,
              createdAt: poster.created_at,
              image:
                shopifyData?.imageUrl ||
                (poster.image_urls
                  ? Array.isArray(poster.image_urls) &&
                    poster.image_urls.length > 0
                    ? poster.image_urls[0]
                    : typeof poster.image_urls === "object" &&
                      poster.image_urls !== null
                    ? Object.values(poster.image_urls)[0]
                    : "/placeholder.svg"
                  : "/placeholder.svg"),
              shopUrl:
                shopifyData?.shopifyUrl || poster.shopify_url || undefined,
              shopifyProductId: poster.shopify_product_id || null,
            };

            return product;
          });

          // Log final result summary
          let finalTotalSales = 0;
          let finalTotalRevenue = 0;

          products.forEach((p) => {
            finalTotalSales += p.sales;
            finalTotalRevenue += p.revenue;
          });

          console.log(
            `[useProductData] Final result: ${
              products.length
            } products, ${finalTotalSales} total sales, $${finalTotalRevenue.toFixed(
              2
            )} total revenue`
          );

          return products;
        } catch (fetchError: any) {
          if (fetchError.name === "AbortError") {
            // Handle timeout specifically
            console.error("[useProductData] Request timed out");
            throw new Error("Request timed out. Please try again.");
          }
          throw fetchError;
        }
      } catch (error: any) {
        console.error("[useProductData] Error in useProductData:", error);

        // Provide a user-friendly error message while logging the full error
        const errorMessage = error.message || "Failed to fetch product data";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to avoid excessive retries on persistent errors
  });
}
