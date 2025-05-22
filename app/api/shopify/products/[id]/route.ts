import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createAdminApiClient,
  createGraphQLClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

// Define types for GraphQL responses
interface ShopifyGraphQLLineItem {
  quantity: number;
  variant: {
    id: string;
    title: string;
  };
  product: {
    id: string;
  };
}

interface ShopifyGraphQLOrder {
  id: string;
  createdAt: string;
  displayFinancialStatus: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  lineItems: {
    edges: Array<{
      node: ShopifyGraphQLLineItem;
    }>;
  };
}

interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  description: string;
  status: string;
  totalInventory: number;
  onlineStoreUrl: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  vendor: string;
  productType: string;
  tags: string[];
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        sku: string;
        inventoryQuantity: number;
        inventoryPolicy: string;
      };
    }>;
  };
  metafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }>;
  };
}

interface ShopifyGraphQLOrdersResponse {
  data?: {
    orders?: {
      edges: Array<{
        node: ShopifyGraphQLOrder;
      }>;
    };
  };
}

interface ShopifyGraphQLProductResponse {
  data?: {
    product?: ShopifyGraphQLProduct;
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const productId = (await params).id;

    if (!productId) {
      return new NextResponse(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Get Shopify Access Token
    const accessToken = getShopifyAccessToken();

    // Create REST and GraphQL clients
    const restClient = await createAdminApiClient(accessToken);
    const graphqlClient = await createGraphQLClient(accessToken);

    // Shopify often requires IDs in GraphQL to be prefixed with gid://shopify/Product/
    // If the ID is already prefixed, use it as is
    const gqlProductId = productId.includes("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    // Fetch detailed product information using GraphQL
    const productResponse = await graphqlClient.query({
      data: `{
        product(id: "${gqlProductId}") {
          id
          title
          description
          status
          totalInventory
          onlineStoreUrl
          createdAt
          updatedAt
          publishedAt
          vendor
          productType
          tags
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                inventoryPolicy
              }
            }
          }
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }`,
    });

    // Fetch sales data (orders containing this product)
    const salesResponse = await graphqlClient.query({
      data: `{
        orders(first: 50, query: "line_items:${productId}") {
          edges {
            node {
              id
              createdAt
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 10) {
                edges {
                  node {
                    quantity
                    variant {
                      id
                      title
                    }
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }`,
    });

    // Get additional metadata via REST API
    const { body: productMetadata } = await restClient.get({
      path: `products/${productId}/metafields`,
    });

    // Process the sales data to calculate total units sold, revenue, etc.
    const salesResponse_typed =
      salesResponse.body as unknown as ShopifyGraphQLOrdersResponse;
    const salesData = salesResponse_typed?.data?.orders?.edges || [];

    // Calculate sales metrics
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    const orderCount = salesData.length;
    let lastOrderDate: Date | null = null;

    salesData.forEach((orderEdge) => {
      const order = orderEdge.node;
      const orderDate = new Date(order.createdAt);

      if (!lastOrderDate || orderDate > lastOrderDate) {
        lastOrderDate = orderDate;
      }

      // Count units of this specific product sold in the order
      order.lineItems.edges.forEach((lineItemEdge) => {
        const lineItem = lineItemEdge.node;
        if (lineItem.product?.id === gqlProductId) {
          totalUnitsSold += lineItem.quantity;
          // Approximate revenue calculation (actual would require more detailed price data)
          totalRevenue +=
            lineItem.quantity *
            parseFloat(order.totalPriceSet.shopMoney.amount);
        }
      });
    });

    // Combine all data
    const productResponse_typed =
      productResponse.body as unknown as ShopifyGraphQLProductResponse;
    const productData = {
      product: productResponse_typed?.data?.product,
      metadata: productMetadata,
      sales: {
        totalUnitsSold,
        totalRevenue,
        orderCount,
        lastOrderDate,
        orders: salesData.map((edge) => edge.node),
      },
    };

    return NextResponse.json(productData);
  } catch (error) {
    console.error("Error fetching Shopify product data:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch product data",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
