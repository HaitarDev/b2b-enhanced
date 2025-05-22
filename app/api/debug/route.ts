import { NextResponse } from "next/server";
import {
  createAdminApiClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

export async function GET(req: Request) {
  try {
    // This route is for debugging purposes only
    const accessToken = getShopifyAccessToken();
    const adminApi = await createAdminApiClient(accessToken);

    // Get query parameters
    const url = new URL(req.url);
    const testType = url.searchParams.get("test") || "orders";

    let result: any = {};

    if (testType === "orders") {
      // Test orders query
      const { body: ordersData } = await adminApi.get({
        path: "orders",
        query: {
          limit: 10,
          status: "any",
          fields: "id,created_at,line_items",
          query: "financial_status:paid",
        },
      });

      result = {
        orderCount: ordersData.orders?.length || 0,
        firstOrder: ordersData.orders?.[0] || null,
      };
    } else if (testType === "products") {
      // Test products query
      const { body: productsData } = await adminApi.get({
        path: "products",
        query: {
          limit: 10,
          fields: "id,title,variants",
        },
      });

      result = {
        productCount: productsData.products?.length || 0,
        firstProduct: productsData.products?.[0] || null,
      };
    } else if (testType === "config") {
      // Return configuration information (redacted)
      result = {
        shopifyConfig: {
          apiKey: process.env.SHOPIFY_API_KEY ? "[REDACTED]" : "missing",
          accessToken: accessToken ? "[REDACTED]" : "missing",
          shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || "missing",
        },
      };
    }

    return NextResponse.json({
      message: "Debug info",
      timestamp: new Date().toISOString(),
      testType,
      result,
    });
  } catch (error: any) {
    console.error("API Debug Error:", error);

    return NextResponse.json(
      {
        error: "Debug endpoint error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
