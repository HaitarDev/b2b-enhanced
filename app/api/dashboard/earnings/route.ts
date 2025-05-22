import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  createAdminApiClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

// Define types for the response data
type EarningsResponse = {
  earnings: number;
  sales: number;
  commission: number;
  chartData?: {
    earnings: { month: string; earnings: number }[];
    sales: { month: string; sales: number }[];
  };
  topSellingPosters?: Array<{
    id: string;
    title: string;
    image: string;
    sales: number;
    revenue: number;
  }>;
};

export async function GET(req: Request) {
  try {
    // Parse date range from query parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const year = url.searchParams.get("year");
    const dataType = url.searchParams.get("dataType") || "all"; // all, chart, overview, topSelling

    console.log("API Request params:", { startDate, endDate, year, dataType });

    // Get the user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Shopify access token
    const accessToken = getShopifyAccessToken();
    const adminApi = await createAdminApiClient(accessToken);

    // Prepare date filters
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(`created_at:>=${startDate}`);
    }
    if (endDate) {
      dateFilter.push(`created_at:<=${endDate}`);
    }

    // Fetch creator's products
    const { data: products } = await supabase
      .from("posters")
      .select("id, title, shopify_product_id, image_urls")
      .eq("creator_id", user.id)
      .eq("status", "approved");

    console.log("Found creator products:", products?.length || 0);

    if (!products || products.length === 0) {
      return NextResponse.json({
        earnings: 0,
        sales: 0,
        commission: 30,
        chartData: {
          earnings: [],
          sales: [],
        },
        topSellingPosters: [],
      });
    }

    // Get Shopify product IDs
    const shopifyProductIds = products
      .filter((p) => p.shopify_product_id)
      .map((p) => p.shopify_product_id);

    console.log("Valid Shopify product IDs:", shopifyProductIds.length);

    // Prepare the response data
    let response: EarningsResponse = {
      earnings: 0,
      sales: 0,
      commission: 30, // Default commission rate
    };

    // Fetch orders for these products within the date range
    let salesData: any[] = [];
    let totalRevenue = 0;
    let totalSales = 0;

    // Generate GraphQL query for orders with the products
    if (shopifyProductIds.length > 0) {
      try {
        // Fetch orders with line items containing the creator's products
        const lineItemsFilter = shopifyProductIds
          .map((id) => `line_items.product_id:${id}`)
          .join(" OR ");
        const query = `
          ${dateFilter.length > 0 ? dateFilter.join(" AND ") + " AND " : ""}
          (${lineItemsFilter})
          financial_status:paid
        `;

        console.log("Shopify orders query:", query);

        const { body: ordersData } = await adminApi.get({
          path: "orders",
          query: {
            limit: 250,
            status: "any",
            fields: "id,created_at,line_items,total_price",
            query: query,
          },
        });

        // Process orders to extract sales data
        if (ordersData.orders && ordersData.orders.length > 0) {
          console.log(
            "Retrieved orders from Shopify:",
            ordersData.orders.length
          );

          // Process each order
          ordersData.orders.forEach((order: any) => {
            const orderDate = new Date(order.created_at);
            const monthYear = orderDate.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
            const monthOnly = orderDate.toLocaleDateString("en-US", {
              month: "short",
            });
            const yearOnly = orderDate.getFullYear().toString();

            // Only process if the year matches (if specified)
            if (!year || yearOnly === year) {
              // Process line items to find those matching our products
              order.line_items.forEach((item: any) => {
                if (shopifyProductIds.includes(item.product_id)) {
                  const lineItemRevenue =
                    parseFloat(item.price) * item.quantity;
                  totalRevenue += lineItemRevenue;
                  totalSales += item.quantity;

                  // Add to sales data for charts
                  const existingEntry = salesData.find(
                    (data) => data.month === monthOnly && data.year === yearOnly
                  );
                  if (existingEntry) {
                    existingEntry.sales += item.quantity;
                    existingEntry.earnings += lineItemRevenue;
                  } else {
                    salesData.push({
                      month: monthOnly,
                      year: yearOnly,
                      monthYear,
                      sales: item.quantity,
                      earnings: lineItemRevenue,
                    });
                  }
                }
              });
            }
          });
        } else {
          console.log("No orders found matching the query");
        }
      } catch (error) {
        console.error("Error fetching orders from Shopify:", error);
      }
    }

    // Calculate commission (30% of revenue)
    const commission = totalRevenue * 0.3;

    // Set overview data
    response.earnings = parseFloat(commission.toFixed(2));
    response.sales = totalSales;
    response.commission = 30;

    // Build chart data if requested
    if (dataType === "all" || dataType === "chart") {
      // If year is specified, filter the salesData to only include that year
      if (year) {
        console.log(`Filtering chart data for year: ${year}`);
        salesData = salesData.filter((item) => item.year === year);
      }

      // Make sure we have data for each month of the year
      const monthsOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // If no data for the year, initialize empty months
      if (salesData.length === 0 && year) {
        monthsOrder.forEach((month) => {
          salesData.push({
            month,
            year,
            monthYear: `${month} ${year}`,
            sales: 0,
            earnings: 0,
          });
        });
      }

      // Sort sales data by date
      salesData.sort((a, b) => {
        const yearDiff = parseInt(a.year) - parseInt(b.year);
        if (yearDiff !== 0) return yearDiff;
        return monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month);
      });

      // Format chart data
      response.chartData = {
        earnings: salesData.map((item) => ({
          month: item.month,
          earnings: parseFloat((item.earnings * 0.3).toFixed(2)),
        })),
        sales: salesData.map((item) => ({
          month: item.month,
          sales: item.sales,
        })),
      };

      console.log(`Chart data points for ${year || "all years"}:`, {
        months: salesData.map((item) => item.month),
        earnings: response.chartData.earnings.map((item) => item.earnings),
        sales: response.chartData.sales.map((item) => item.sales),
      });
    }

    // Build top selling posters data if requested
    if (dataType === "all" || dataType === "topSelling") {
      // Group sales by product
      const productSales: Record<
        string,
        {
          id: string;
          title: string;
          image: string;
          sales: number;
          revenue: number;
        }
      > = {};

      // Collect data for each product
      for (const product of products) {
        if (!product.shopify_product_id) continue;

        // Initialize product in our tracking object
        if (!productSales[product.shopify_product_id]) {
          // Get the first image URL from the array, or use placeholder
          const imageUrl =
            Array.isArray(product.image_urls) && product.image_urls.length > 0
              ? product.image_urls[0]
              : "/placeholder.svg";

          productSales[product.shopify_product_id] = {
            id: product.id,
            title: product.title,
            image: imageUrl,
            sales: 0,
            revenue: 0,
          };
        }
      }

      // Add sales data from orders
      if (shopifyProductIds.length > 0) {
        try {
          // Build a query that includes the date range filters
          let topProductsQuery = "financial_status:paid";
          if (dateFilter.length > 0) {
            topProductsQuery = `${dateFilter.join(
              " AND "
            )} AND ${topProductsQuery}`;
          }

          console.log("Shopify top selling posters query:", topProductsQuery);

          const { body: ordersData } = await adminApi.get({
            path: "orders",
            query: {
              limit: 250,
              status: "any",
              fields: "id,created_at,line_items",
              query: topProductsQuery,
            },
          });

          console.log(
            "Retrieved orders for top selling products:",
            ordersData.orders?.length || 0
          );

          if (ordersData.orders && ordersData.orders.length > 0) {
            ordersData.orders.forEach((order: any) => {
              // Process the order date to check if it's within the desired range
              const orderDate = new Date(order.created_at);
              const orderYear = orderDate.getFullYear().toString();

              // Only process if the year matches (if specified)
              if (!year || orderYear === year) {
                order.line_items.forEach((item: any) => {
                  if (productSales[item.product_id]) {
                    productSales[item.product_id].sales += item.quantity;
                    productSales[item.product_id].revenue +=
                      parseFloat(item.price) * item.quantity * 0.3; // 30% commission
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error("Error fetching orders for top products:", error);
        }
      }

      // Convert to array and sort by sales
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5); // Get top 5

      response.topSellingPosters = topProducts;
    }

    console.log("Sending response:", {
      earnings: response.earnings,
      sales: response.sales,
      topSellingPosters: response.topSellingPosters?.length || 0,
      chartDataPoints: response.chartData
        ? {
            earnings: response.chartData.earnings.length,
            sales: response.chartData.sales.length,
          }
        : 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
}
