import { NextResponse } from "next/server";
import {
  createGraphQLClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

// Define interfaces for GraphQL response types
interface ShopifyOrdersResponse {
  data?: {
    orders?: {
      edges: Array<{
        node: {
          id: string;
          name: string;
          createdAt: string;
          displayFinancialStatus: string;
          totalPriceSet: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
          totalShippingPriceSet?: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
          lineItems: {
            edges: Array<{
              node: {
                id: string;
                title: string;
                quantity: number;
                product?: {
                  id: string;
                };
                variant?: {
                  id: string;
                  title: string;
                  price: string;
                };
                discountedTotalSet?: {
                  shopMoney: {
                    amount: string;
                    currencyCode: string;
                  };
                };
                originalTotalSet?: {
                  shopMoney: {
                    amount: string;
                    currencyCode: string;
                  };
                };
              };
            }>;
          };
        };
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

// Function to fetch Shopify data for a specific product ID
async function fetchProductStats(
  productId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const accessToken = getShopifyAccessToken();
    const graphqlClient = await createGraphQLClient(accessToken);

    // Initialize counters
    let salesCount = 0;
    let revenue = 0;

    // Build date filter for GraphQL query
    let dateFilter = "";
    if (startDate) {
      dateFilter += ` created_at:>=${startDate}`;
    } else {
      // For "all time" queries, use a very old start date
      dateFilter += ` created_at:>=2000-01-01`;
    }

    if (endDate) {
      dateFilter += ` created_at:<=${endDate}`;
    } else {
      // For "all time" queries, use today as end date
      const today = new Date().toISOString().split("T")[0];
      dateFilter += ` created_at:<=${today}`;
    }

    console.log(
      `Fetching orders for product ${productId} with date filter: ${
        dateFilter || "all time"
      }`
    );

    // Fetch orders using GraphQL for more accurate revenue calculation
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      // GraphQL query to get orders containing this product
      const query = `
        query getOrdersByProductId($cursor: String, $queryString: String!) {
          orders(first: 50, query: $queryString, after: $cursor) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalShippingPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 20) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      product {
                        id
                      }
                      variant {
                        id
                        title
                        price
                      }
                      discountedTotalSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      originalTotalSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables: { cursor: string | null; queryString: string } = {
        cursor,
        queryString: `financial_status:any${dateFilter} line_items_product_id:${productId}`,
      };

      // Execute the query
      const response = await graphqlClient.query({
        data: { query, variables },
      });

      if (
        response.body &&
        typeof response.body === "object" &&
        "data" in response.body
      ) {
        const responseData = response.body as ShopifyOrdersResponse;

        if (responseData.data?.orders?.edges) {
          responseData.data.orders.edges.forEach(({ node: order }) => {
            // Only count paid orders
            const status = order.displayFinancialStatus?.toUpperCase() || "";

            if (
              status === "PAID" ||
              status === "PARTIALLY_PAID" ||
              status === "PARTIALLY_REFUNDED" ||
              status.includes("PAID") ||
              status.includes("COMPLETE")
            ) {
              // Filter line items for this product
              const lineItems = order.lineItems.edges
                .map((edge) => edge.node)
                .filter((item) => {
                  if (!item.product || !item.product.id) return false;

                  // GraphQL IDs have a format like "gid://shopify/Product/12345"
                  // Extract just the numeric part for comparison
                  const graphqlId = item.product.id;
                  const numericId = graphqlId.split("/").pop();

                  return numericId === productId;
                });

              if (lineItems.length > 0) {
                let orderItemsCount = 0;
                let orderRevenue = 0;

                // Process each line item
                lineItems.forEach((item) => {
                  // Add to sales count
                  orderItemsCount += item.quantity || 0;

                  // Calculate revenue directly from the line item
                  if (item.discountedTotalSet?.shopMoney?.amount) {
                    orderRevenue += parseFloat(
                      item.discountedTotalSet.shopMoney.amount
                    );
                  } else if (item.originalTotalSet?.shopMoney?.amount) {
                    // Fallback to original price if discounted not available
                    orderRevenue += parseFloat(
                      item.originalTotalSet.shopMoney.amount
                    );
                  } else if (item.variant?.price && item.quantity) {
                    // Last fallback to variant price × quantity
                    orderRevenue +=
                      parseFloat(item.variant.price) * item.quantity;
                  }
                });

                // Update total counters
                salesCount += orderItemsCount;
                revenue += orderRevenue;
              }
            }
          });
        }

        // Check if there are more pages to fetch
        hasNextPage = responseData.data?.orders?.pageInfo?.hasNextPage || false;
        cursor = responseData.data?.orders?.pageInfo?.endCursor || null;
      } else {
        hasNextPage = false;
      }
    }

    // Calculate commission (30% to platform)
    const commission = revenue * 0.3;

    return {
      salesCount,
      revenue,
      commission,
    };
  } catch (error) {
    console.error(`Error calculating stats for product ${productId}:`, error);
    return {
      salesCount: 0,
      revenue: 0,
      commission: 0,
    };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const productId = (await params).id;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get date parameters from URL
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date") || undefined;
    const endDate = url.searchParams.get("end_date") || undefined;

    // Fetch stats for this product
    const stats = await fetchProductStats(productId, startDate, endDate);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching product stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch product stats" },
      { status: 500 }
    );
  }
}
