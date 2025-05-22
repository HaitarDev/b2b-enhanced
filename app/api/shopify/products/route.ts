import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createAdminApiClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

// Define types for Shopify API responses
interface ShopifyProduct {
  id: string | number;
  title: string;
  status: string;
  images?: { src: string }[];
  variants?: any[];
  tags?: string;
  vendor?: string;
  created_at?: string;
  updated_at?: string;
}

interface ShopifyLineItem {
  product_id: string | number;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: string | number;
  financial_status?: string;
  line_items?: ShopifyLineItem[];
  created_at?: string;
  total_price?: string;
  fulfillment_status?: string;
}

export async function GET(req: Request) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const cursor = url.searchParams.get("cursor") || null;
    const vendor = url.searchParams.get("vendor") || null;
    const startDate = url.searchParams.get("start_date") || null;
    const endDate = url.searchParams.get("end_date") || null;

    console.log("Shopify products API called with:", {
      vendor,
      startDate,
      endDate,
      limit,
      cursor,
    });

    if (!vendor) {
      return new NextResponse(
        JSON.stringify({ error: "Vendor parameter is required" }),
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    try {
      // Get Shopify Access Token
      const accessToken = getShopifyAccessToken();

      // Create REST client
      const restClient = await createAdminApiClient(accessToken);

      // Build query parameters for products
      const productQueryParams: Record<string, string> = {
        limit: limit.toString(),
        vendor: vendor,
        fields:
          "id,title,vendor,product_type,status,created_at,updated_at,variants,images,tags",
      };

      // Add cursor if available for pagination
      if (cursor) {
        productQueryParams.page_info = cursor;
      }

      try {
        console.log("Fetching products from Shopify...");

        // Fetch products using REST API
        const productsResponse = await restClient.get({
          path: "products",
          query: productQueryParams,
        });

        const products = productsResponse.body.products;
        console.log(`Found ${products.length} products for vendor ${vendor}`);

        // Build query parameters for orders
        const orderQueryParams: Record<string, string> = {
          status: "any",
          fields:
            "id,created_at,line_items,financial_status,fulfillment_status,total_price",
        };

        // Add date filters for orders
        if (startDate) {
          orderQueryParams.created_at_min = `${startDate}T00:00:00Z`;
        }
        if (endDate) {
          orderQueryParams.created_at_max = `${endDate}T23:59:59Z`;
        }

        console.log("Fetching orders with date range:", {
          created_at_min: orderQueryParams.created_at_min,
          created_at_max: orderQueryParams.created_at_max,
        });

        // Fetch orders for the date range
        const ordersResponse = await restClient.get({
          path: "orders",
          query: orderQueryParams,
        });

        const orders = ordersResponse.body.orders || [];
        console.log(
          `Found ${orders.length} orders for the specified date range`
        );

        // Calculate sales and revenue data for each product
        const productMap = new Map();
        products.forEach((product: ShopifyProduct) => {
          productMap.set(product.id.toString(), {
            id: product.id.toString(),
            title: product.title,
            imageUrl:
              product.images && product.images.length > 0
                ? product.images[0].src
                : "/placeholder.svg",
            status: product.status,
            salesCount: 0,
            revenue: 0,
            commission: 0,
            shopifyUrl: `https://admin.shopify.com/store/your-store/products/${product.id}`,
            shopifyProductId: product.id.toString(),
            // Include other product details as needed
            variants: product.variants,
            tags: product.tags,
            vendor: product.vendor,
            created_at: product.created_at,
            updated_at: product.updated_at,
          });
        });

        // Process orders to calculate sales, revenue, and commission
        orders.forEach((order: ShopifyOrder) => {
          // Only consider paid orders
          if (
            order.financial_status === "paid" ||
            order.financial_status === "partially_paid"
          ) {
            // Process line items
            if (order.line_items && Array.isArray(order.line_items)) {
              order.line_items.forEach((item: ShopifyLineItem) => {
                // Skip if no product_id
                if (!item.product_id) return;

                const productId = item.product_id.toString();
                // Only process if we have this product (it belongs to this vendor)
                if (productMap.has(productId)) {
                  const product = productMap.get(productId);
                  const quantity = item.quantity || 0;
                  const price = parseFloat(item.price) || 0;
                  const lineTotal = quantity * price;

                  // Update product sales data
                  product.salesCount += quantity;
                  product.revenue += lineTotal;
                  product.commission += lineTotal * 0.3; // Assuming 30% commission

                  productMap.set(productId, product);

                  console.log(
                    `Order item for product ${productId}: Qty=${quantity}, Price=${price}, Revenue=${lineTotal}`
                  );
                }
              });
            }
          }
        });

        // Convert map to array for response
        const productsWithSalesData = Array.from(productMap.values());

        // Log some stats for debugging
        let totalSales = 0;
        let totalRevenue = 0;
        productsWithSalesData.forEach((p) => {
          totalSales += p.salesCount;
          totalRevenue += p.revenue;
        });

        console.log("Sales data summary:", {
          products: productsWithSalesData.length,
          totalSales,
          totalRevenue,
          dateRange: { startDate, endDate },
        });

        // Return the enhanced product data
        return NextResponse.json(productsWithSalesData);
      } catch (fetchError) {
        console.error("Error fetching Shopify data:", fetchError);
        return new NextResponse(
          JSON.stringify({
            error: "Failed to fetch Shopify data",
            details:
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError),
          }),
          { status: 500 }
        );
      }
    } catch (authError) {
      console.error("Shopify authentication error:", authError);
      return new NextResponse(
        JSON.stringify({
          error: "Shopify API authentication failed",
          details:
            "Please check your Shopify access token and store configuration.",
          message:
            authError instanceof Error ? authError.message : String(authError),
        }),
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error in products API:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
