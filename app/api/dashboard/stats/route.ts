import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  createAdminApiClient,
  createGraphQLClient,
  getShopifyAccessToken,
  safelyFetchProduct,
} from "@/utils/shopify/client";

type Stats = {
  totalRevenue: number;
  totalSales: number;
  totalCommission: number;
  averageOrderValue: number;
  productsCount: number;
  ordersCount: number;
  approvedProductsCount: number;
  totalRefunds: number;
  netRevenue: number;
};

type SalesTrendPoint = {
  date: string;
  sales: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
};

// ShopifyOrder type for response data
type ShopifyOrderData = {
  id: string;
  orderNumber: string;
  createdAt: string;
  lineItems: {
    id: string;
    productId: string;
    title: string;
    price: string;
    quantity: number;
  }[];
  totalAmount: string;
  // Additional fields for enhanced order data
  customerName?: string;
  customerEmail?: string;
  refundAmount?: number;
  shippingAmount?: number;
  netRevenue?: number;
  financialStatus?: string;
  fulfillmentStatus?: string;
};

// Shopify product data from API response
type ShopifyProductData = {
  id: number;
  title: string;
  handle: string;
  images: Array<{
    id: number;
    src: string;
    position: number;
    width: number;
    height: number;
  }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
  }>;
  status: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  vendor?: string;
};

// ShopifyProduct for our data response
type FormattedProduct = {
  id: string;
  title: string;
  imageUrl: string;
  status: string;
  shopifyUrl: string;
  shopifyProductId: string;
  createdAt: string;
  salesCount: number;
  revenue: number;
  commission: number;
  variantTitle?: string;
  recentOrders?: ShopifyOrderData[];
};

// Add these interfaces after imports
interface ShopifyRestOrder {
  id: string;
  name: string;
  created_at: string;
  financial_status: string;
  line_items: ShopifyRestLineItem[];
}

interface ShopifyRestLineItem {
  id: string;
  product_id: number | string;
  quantity: number;
  price: string;
  title: string;
}

// Add retry logic for handling throttled requests
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries = 5,
  initialDelay = 1500
): Promise<any> => {
  let retries = 0;
  const execute = async (): Promise<any> => {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Throttled") ||
          error.message.includes("rate limit") ||
          error.message.includes("429")) &&
        retries < maxRetries
      ) {
        const jitter = Math.random() * 500;
        const delay = initialDelay * Math.pow(2, retries) + jitter;

        console.log(
          `Request throttled. Retrying in ${Math.round(delay)}ms. Retry ${
            retries + 1
          }/${maxRetries}`
        );
        retries++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return execute();
      }
      throw error;
    }
  };
  return execute();
};

// Function to fetch Shopify data for a specific product ID
async function fetchShopifyProductData(
  productId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  product: ShopifyProductData;
  salesCount: number;
  revenue: number;
  commission: number;
  recentOrders: ShopifyOrderData[];
} | null> {
  try {
    const accessToken = getShopifyAccessToken();
    const restClient = await createAdminApiClient(accessToken);
    const graphqlClient = await createGraphQLClient(accessToken);

    // Use the safe fetch method to avoid 404 errors
    const productData = await safelyFetchProduct(restClient, productId);

    // Initialize counters
    let salesCount = 0;
    let revenue = 0;
    const recentOrders: ShopifyOrderData[] = [];

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

    // Log the date parameters
    console.log("startDate", startDate || "using default (2000-01-01)");
    console.log("endDate", endDate || "using default (today)");
    console.log(
      `Fetching orders for product ${productId} with date filter: ${
        dateFilter || "all time"
      }`
    );

    // Check if this is a large date range like 6 months
    const is6MonthQuery =
      startDate &&
      endDate &&
      new Date(endDate).getTime() - new Date(startDate).getTime() >
        90 * 24 * 60 * 60 * 1000; // More than 90 days

    // Use smaller page size for large date ranges to avoid timeouts
    const pageSize = is6MonthQuery ? 20 : 50;

    if (is6MonthQuery) {
      console.log("Large date range detected - using optimized query approach");
    }

    // Fetch orders using GraphQL for more accurate revenue calculation
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;
    const maxPages = is6MonthQuery ? 10 : 20; // Limit pages for large queries

    while (hasNextPage && pageCount < maxPages) {
      pageCount++;

      // Add debug logging
      if (cursor) {
        console.log(`Fetching page ${pageCount} with cursor: ${cursor}`);
      } else {
        console.log("Fetching first page of orders");
      }

      const query = cursor
        ? `
        query getOrdersByProducts($queryString: String!, $cursor: String!) {
          orders(first: 50, after: $cursor, query: $queryString) {
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
                customer {
                  displayName
                  email
                }
                refunds {
                  id
                  createdAt
                  note
                  refundLineItems {
                    edges {
                      node {
                        lineItem {
                          id
                          product {
                            id
                          }
                          quantity
                          originalTotalSet {
                            shopMoney {
                              amount
                            }
                          }
                        }
                        quantity
                        restockType
                        subtotalSet {
                          shopMoney {
                            amount
                          }
                        }
                      }
                    }
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
                        title
                      }
                      variant {
                        id
                        title
                        price
                        sku
                      }
                      originalUnitPriceSet {
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
      `
        : `
        query getOrdersByProducts($queryString: String!) {
          orders(first: 50, query: $queryString) {
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
                customer {
                  displayName
                  email
                }
                refunds {
                  id
                  createdAt
                  note
                  refundLineItems {
                    edges {
                      node {
                        lineItem {
                          id
                          product {
                            id
                          }
                          quantity
                          originalTotalSet {
                            shopMoney {
                              amount
                            }
                          }
                        }
                        quantity
                        restockType
                        subtotalSet {
                          shopMoney {
                            amount
                          }
                        }
                      }
                    }
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
                        title
                      }
                      variant {
                        id
                        title
                        price
                        sku
                      }
                      originalUnitPriceSet {
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

      // Execute the GraphQL query with variables
      const variables: any = {
        queryString: `status:any line_items_product_id:${productId}${dateFilter}`,
      };

      // Only include cursor if we have one
      if (cursor) {
        variables.cursor = cursor;
      }

      console.log("Debug - GraphQL variables:", JSON.stringify(variables));

      try {
        // For 6-month queries, add a delay between requests to avoid throttling
        if (is6MonthQuery && pageCount > 1) {
          console.log(
            "Adding delay between 6-month data pages to avoid throttling"
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const response = await retryWithBackoff(() =>
          graphqlClient.query({
            data: { query, variables },
          })
        );

        // Process response with error handling
        if (
          response.body &&
          typeof response.body === "object" &&
          "data" in response.body
        ) {
          const responseData = response.body as ShopifyGraphQLOrdersResponse;

          if (responseData.errors) {
            console.error("GraphQL Errors:", responseData.errors);
            console.log("Falling back to REST API...");

            // Simple fallback - return empty results for this product
            console.log(
              `GraphQL query failed for product ${
                productId || "unknown"
              }, returning empty results`
            );
            return {
              product: productData.product,
              salesCount: 0,
              revenue: 0,
              commission: 0,
              recentOrders: [],
            };
          }

          // Convert to expected structure for compatibility with existing code
          const orderData = responseData.data?.orders || {
            edges: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          };

          console.log(
            `Processing ${
              orderData.edges.length
            } orders from page ${pageCount} (${cursor || "initial"})`
          );

          // For large queries, stop after collecting enough data to avoid timeouts
          if (is6MonthQuery && recentOrders.length > 30) {
            console.log(
              "Collected sufficient data for 6-month query, stopping pagination"
            );
            hasNextPage = false;
            break;
          }

          // Process each order
          orderData.edges.forEach(
            ({ node: order }: { node: ShopifyGraphQLOrder }) => {
              // Log the order for debugging
              console.log(
                `Processing order ${order.id} with status ${order.displayFinancialStatus}`
              );

              // Process line items for this product
              const allLineItems = order.lineItems.edges.map(
                (edge: { node: ShopifyGraphQLLineItem }) => edge.node
              );
              console.log(`Order has ${allLineItems.length} line items total`);

              // Only count paid or partially paid orders
              const status = order.displayFinancialStatus?.toUpperCase() || "";
              if (
                status === "PAID" ||
                status === "PARTIALLY_PAID" ||
                status === "PARTIALLY_REFUNDED" ||
                status.includes("PAID") ||
                status.includes("COMPLETE")
              ) {
                // Filter line items for the specific product ID
                const lineItems = allLineItems.filter(
                  (item: ShopifyGraphQLLineItem) => {
                    if (!item.product || !item.product.id) return false;

                    // GraphQL IDs often have a format like "gid://shopify/Product/12345"
                    // Extract just the numeric part for comparison
                    const graphqlId = item.product.id;
                    const numericId = graphqlId.split("/").pop();

                    const isMatch = numericId === productId;
                    if (isMatch) {
                      console.log(
                        `Found matching product! GraphQL ID: ${graphqlId}, Expected product ID: ${productId}`
                      );
                    }
                    return isMatch;
                  }
                );

                // Only process if we found line items for this product
                if (lineItems.length > 0) {
                  let orderItemsCount = 0;
                  let orderRevenue = 0;

                  // Process each line item in a simpler way - similar to getShopifySalesTrend
                  lineItems.forEach((item: ShopifyGraphQLLineItem) => {
                    // Add to sales count
                    orderItemsCount += item.quantity || 0;

                    // Calculate revenue directly from the line item
                    if (item.discountedTotalSet?.shopMoney?.amount) {
                      orderRevenue += parseFloat(
                        item.discountedTotalSet.shopMoney.amount
                      );
                      console.log(
                        `Item ${item.id}: quantity=${item.quantity}, revenue=${item.discountedTotalSet.shopMoney.amount}`
                      );
                    } else if (item.originalTotalSet?.shopMoney?.amount) {
                      // Fallback to original price if discounted not available
                      orderRevenue += parseFloat(
                        item.originalTotalSet.shopMoney.amount
                      );
                      console.log(
                        `Item ${item.id} (using original price): quantity=${item.quantity}, revenue=${item.originalTotalSet.shopMoney.amount}`
                      );
                    } else {
                      console.log(
                        `Warning: No price information for item ${item.id} in order ${order.id}`
                      );
                    }
                  });

                  // Update total counters
                  salesCount += orderItemsCount;
                  revenue += orderRevenue;

                  console.log(
                    `Order ${
                      order.id
                    }: Added ${orderItemsCount} items with total revenue ${orderRevenue.toFixed(
                      2
                    )}`
                  );

                  // Add to recent orders (limit to most recent 50)
                  if (recentOrders.length < 50) {
                    const lineItemsFormatted = lineItems.map(
                      (item: ShopifyGraphQLLineItem) => {
                        // Get the actual price per unit
                        let pricePerUnit = "0.00";
                        if (item.quantity > 0) {
                          if (item.discountedTotalSet?.shopMoney?.amount) {
                            pricePerUnit = (
                              parseFloat(
                                item.discountedTotalSet.shopMoney.amount
                              ) / item.quantity
                            ).toFixed(2);
                          } else if (item.originalTotalSet?.shopMoney?.amount) {
                            pricePerUnit = (
                              parseFloat(
                                item.originalTotalSet.shopMoney.amount
                              ) / item.quantity
                            ).toFixed(2);
                          }
                        }

                        return {
                          id: item.id,
                          productId: productId,
                          title: item.title,
                          price: pricePerUnit,
                          quantity: item.quantity,
                          variantId: item.variant?.id,
                          variantTitle: item.variant?.title,
                        };
                      }
                    );

                    // Start of improved refund handling
                    // Calculate refunds for this specific product's line items in this order
                    let refundAmount = 0;
                    let hasRefunds = false;

                    // Check if the order has refunds
                    if (order.refunds && Array.isArray(order.refunds)) {
                      order.refunds.forEach((refund: ShopifyGraphQLRefund) => {
                        if (
                          refund.refundLineItems &&
                          refund.refundLineItems.edges
                        ) {
                          // Process each refund line item
                          refund.refundLineItems.edges.forEach(
                            (edge: { node: any }) => {
                              const refundLineItem = edge.node;

                              // Check if this refund is for our specific product
                              if (
                                refundLineItem.lineItem &&
                                refundLineItem.lineItem.product &&
                                refundLineItem.lineItem.product.id
                              ) {
                                // Extract the numeric product ID from the GraphQL ID
                                const refundProductId =
                                  refundLineItem.lineItem.product.id
                                    .split("/")
                                    .pop();

                                // Only count refunds for the current product we're processing
                                if (refundProductId === productId) {
                                  console.log(
                                    `Found refund for product ${productId} in order ${order.id}`
                                  );

                                  // Get the refunded amount from the subtotal
                                  if (
                                    refundLineItem.subtotalSet &&
                                    refundLineItem.subtotalSet.shopMoney &&
                                    refundLineItem.subtotalSet.shopMoney.amount
                                  ) {
                                    const refundedItemAmount = parseFloat(
                                      refundLineItem.subtotalSet.shopMoney
                                        .amount
                                    );
                                    refundAmount += refundedItemAmount;
                                    hasRefunds = true;

                                    console.log(
                                      `Refund amount for item: ${refundedItemAmount}, total refunds so far: ${refundAmount}`
                                    );
                                  }
                                }
                              }
                            }
                          );
                        }
                      });
                    }

                    // If we don't have specific line item refunds but the order is marked as refunded,
                    // fall back to the old approach for backward compatibility
                    if (
                      order.displayFinancialStatus &&
                      order.displayFinancialStatus
                        .toUpperCase()
                        .includes("REFUNDED")
                    ) {
                      // For any refunded order (partial or full), use the FULL order amount as refund
                      // This ensures refund === sale amount
                      refundAmount = orderRevenue;
                      hasRefunds = true;
                      console.log(
                        `Order ${order.id} has REFUNDED status, setting FULL refund: ${refundAmount}`
                      );
                    }

                    // Calculate net revenue (handle safely)
                    const netRevenue = Math.max(0, orderRevenue - refundAmount);
                    console.log(
                      `Order ${order.id} - Revenue: ${orderRevenue.toFixed(
                        2
                      )}, Refund: ${refundAmount.toFixed(
                        2
                      )}, Net: ${netRevenue.toFixed(2)}`
                    );
                    // End of improved refund handling

                    // Add enhanced order data
                    recentOrders.push({
                      id: order.id,
                      orderNumber: order.name,
                      createdAt: order.createdAt,
                      totalAmount: orderRevenue.toString(),
                      lineItems: lineItemsFormatted,
                      // Add additional order data
                      customerName:
                        order.customer?.displayName || "Unknown Customer",
                      customerEmail: order.customer?.email,
                      financialStatus: order.displayFinancialStatus,
                      fulfillmentStatus: order.displayFinancialStatus?.includes(
                        "FULFILLED"
                      )
                        ? "fulfilled"
                        : "unfulfilled",
                      // Use the precisely calculated refund amount for this product
                      refundAmount: refundAmount,
                      // Extract shipping amount if available
                      shippingAmount: parseFloat(
                        order.totalShippingPriceSet?.shopMoney?.amount || "0"
                      ),
                      // Use calculated net revenue
                      netRevenue: netRevenue,
                    });
                  }
                } else {
                  console.log(
                    `Skipping order ${order.id} with status ${order.displayFinancialStatus}`
                  );
                }
              }
            }
          );

          // Update pagination for next page
          hasNextPage = orderData.pageInfo.hasNextPage;
          cursor = orderData.pageInfo.endCursor;

          // If we're on a 6-month query and have processed 5+ pages, consider stopping
          // to avoid excessive API calls
          if (is6MonthQuery && pageCount >= 5) {
            console.log(
              `Processed ${pageCount} pages for 6-month query, stopping pagination to avoid excessive API calls`
            );
            hasNextPage = false;
          }
        } else {
          console.error("Invalid GraphQL response structure");
          break;
        }
      } catch (error) {
        console.error(
          `Error processing GraphQL response for product ${productId}:`,
          error
        );
        // Return partial results if we have some data already
        if (recentOrders.length > 0) {
          console.log(
            `Returning partial results (${recentOrders.length} orders) due to API error`
          );
          return {
            product: productData.product,
            salesCount,
            revenue,
            commission: revenue * 0.3, // Artist gets 30%
            recentOrders,
          };
        }

        // Otherwise return empty results
        return {
          product: productData.product,
          salesCount: 0,
          revenue: 0,
          commission: 0,
          recentOrders: [],
        };
      }
    }

    // Sort recent orders by date (newest first)
    recentOrders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate total refund amount
    const totalRefundAmount = recentOrders.reduce(
      (sum, order) => sum + (order.refundAmount || 0),
      0
    );

    // Calculate net revenue (total revenue minus refunds)
    const netRevenue = Math.max(0, revenue - totalRefundAmount);

    console.log(
      `FINAL: Product ${productId}: Found ${salesCount} sales with raw revenue ${revenue}, refunds ${totalRefundAmount}, net revenue ${netRevenue}`
    );

    return {
      product: productData.product,
      salesCount,
      revenue: netRevenue, // Use net revenue (after refunds) as the revenue figure
      commission: netRevenue * 0.3, // Artist gets 30% of net revenue
      recentOrders,
    };
  } catch (error) {
    console.error(
      `Error fetching Shopify data for product ${productId}:`,
      error
    );
    return null;
  }
}

// Function to collect sales trend data from Shopify orders
async function getShopifySalesTrend(
  shopifyOrders: ShopifyOrderData[]
): Promise<SalesTrendPoint[]> {
  // Get last 6 months
  const monthlyData: Record<
    string,
    { sales: number; revenue: number; refunds: number }
  > = {};
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = month.toLocaleString("default", { month: "short" });
    monthlyData[monthKey] = { sales: 0, revenue: 0, refunds: 0 };
  }

  // Process orders with error handling for date parsing
  shopifyOrders.forEach((order: ShopifyOrderData) => {
    try {
      // Handle both date formats by using an interface
      const dateString =
        order.createdAt || (order as { created_at?: string }).created_at;

      if (!dateString) {
        console.warn(`Order ${order.id} has no date information, skipping`);
        return; // Skip this order
      }

      const orderDate = new Date(dateString);

      // Validate date parsing
      if (isNaN(orderDate.getTime())) {
        console.warn(
          `Order ${order.id} has invalid date: ${dateString}, skipping`
        );
        return; // Skip this order
      }

      const monthKey = orderDate.toLocaleString("default", { month: "short" });

      if (monthlyData[monthKey]) {
        // Process line items for sales and revenue
        if (order.lineItems && Array.isArray(order.lineItems)) {
          order.lineItems.forEach((item) => {
            const quantity = item.quantity || 0;
            const price = parseFloat(item.price || "0");

            monthlyData[monthKey].sales += quantity;

            // Use netRevenue instead of raw revenue when available
            if (order.netRevenue !== undefined) {
              // For orders with refunds, use the calculated netRevenue
              // This is already distributed proportionally across line items
              const lineItemRevenue = price * quantity;
              const orderTotal = parseFloat(order.totalAmount || "0");

              // Calculate proportional net revenue for this line item
              if (orderTotal > 0) {
                const proportion = lineItemRevenue / orderTotal;
                const lineItemNetRevenue = order.netRevenue * proportion;
                monthlyData[monthKey].revenue += lineItemNetRevenue;
              } else {
                monthlyData[monthKey].revenue += lineItemRevenue;
              }

              // Track refund amount separately for reporting
              if (order.refundAmount && order.refundAmount > 0) {
                const refundProportion = lineItemRevenue / orderTotal;
                const lineItemRefund = order.refundAmount * refundProportion;
                monthlyData[monthKey].refunds += lineItemRefund;
              }
            } else {
              // For orders without refund information, use the original calculation
              monthlyData[monthKey].revenue += price * quantity;
            }
          });
        } else {
          // If no line items, try to use the order total
          if (order.totalAmount) {
            monthlyData[monthKey].sales += 1; // Count at least 1 sale

            // Use netRevenue if available, otherwise use totalAmount
            if (order.netRevenue !== undefined) {
              monthlyData[monthKey].revenue += order.netRevenue;

              // Track refund amount separately
              if (order.refundAmount && order.refundAmount > 0) {
                monthlyData[monthKey].refunds += order.refundAmount;
              }
            } else {
              monthlyData[monthKey].revenue += parseFloat(order.totalAmount);
            }
          }
        }
      } else {
        // For dates outside our 6-month window, we'll ignore them
        console.log(`Order date ${monthKey} is outside trend window, skipping`);
      }
    } catch (error) {
      console.error(
        `Error processing order ${order.id} for trend data:`,
        error
      );
      // Continue with next order
    }
  });

  // Log the monthly data for debugging
  console.log("Monthly trend data:", JSON.stringify(monthlyData, null, 2));

  // Convert to array format for the chart
  return Object.entries(monthlyData).map(([date, data]) => ({
    date,
    sales: data.sales,
    revenue: data.revenue,
    refunds: data.refunds || 0, // Include refund data
    netRevenue: Math.max(0, data.revenue - (data.refunds || 0)), // Include net revenue
  }));
}

// Define types for posters and products
interface ApprovedPoster {
  id: string;
  title?: string;
  status?: string;
  shopify_product_id?: string;
  creator_id?: string;
  poster_url?: string;
  upload_date?: string;
  shopify_url?: string;
  sales?: number;
}

interface EnhancedShopifyProductData {
  id: string;
  title?: string;
  shopifyProductId?: string;
  revenue?: number;
  recentOrders?: ShopifyOrderData[];
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Parse query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date") || undefined;
    const endDate = url.searchParams.get("end_date") || undefined;

    // Log the date parameters for debugging
    console.log("Date range parameters:", {
      startDate,
      endDate,
      isAllTime: !startDate && !endDate,
    });

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Fetching dashboard data for user ID: ${user.id}`);

    // Get all posters for this user from Supabase
    const { data: approvedPosters, error: postersError } = await supabase
      .from("posters")
      .select("*")
      .eq("creator_id", user.id)
      .eq("status", "approved");

    if (postersError) {
      console.error("Error fetching posters:", postersError);
      return NextResponse.json(
        { error: "Failed to fetch poster data" },
        { status: 500 }
      );
    }

    console.log(`Found ${approvedPosters.length} approved posters for user`);

    // Extract all Shopify product IDs for this creator
    const shopifyProductIds = approvedPosters
      .map((poster: ApprovedPoster) => poster.shopify_product_id)
      .filter(Boolean) as string[];

    console.log(
      `Creator has ${shopifyProductIds.length} Shopify products:`,
      shopifyProductIds
    );

    // Add debugging for date range
    console.log(`\n=== DATE RANGE DEBUGGING ===`);
    console.log(
      `Start date: ${startDate || "not specified (using 2000-01-01)"}`
    );
    console.log(`End date: ${endDate || "not specified (using today)"}`);
    console.log(
      `Date range query: ${startDate || "2000-01-01"} to ${
        endDate || new Date().toISOString().split("T")[0]
      }`
    );
    console.log(`=== END DATE RANGE DEBUGGING ===\n`);

    // Initialize product data map
    const productDataMap = new Map<string, FormattedProduct>();

    // First, get basic product information for each product
    const accessToken = getShopifyAccessToken();
    const restClient = await createAdminApiClient(accessToken);

    // Add rate limiting helper
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Fetch basic product data for all products with rate limiting
    for (let i = 0; i < approvedPosters.length; i++) {
      const poster = approvedPosters[i];
      if (!poster.shopify_product_id) continue;

      // Add delay between requests to respect rate limits
      if (i > 0) {
        await delay(600); // 600ms delay = ~1.6 calls per second
      }

      try {
        const productData = await retryWithBackoff(
          async () => {
            return await safelyFetchProduct(
              restClient,
              poster.shopify_product_id
            );
          },
          3,
          1500
        ); // 3 retries with 1.5 second initial delay

        // Get image URL from Shopify product data
        let imageUrl = "";
        if (
          productData.product.images &&
          Array.isArray(productData.product.images) &&
          productData.product.images.length > 0
        ) {
          imageUrl = productData.product.images[0].src;
        }

        // Initialize product data with zero sales/revenue (will be updated later)
        productDataMap.set(poster.shopify_product_id, {
          id: poster.id,
          title: poster.title || productData.product.title || "Untitled",
          imageUrl: imageUrl,
          status: poster.status || "pending",
          shopifyUrl: `${process.env.SHOPIFY_SHOP_DOMAIN}/products/${productData.product.handle}`,
          shopifyProductId: poster.shopify_product_id,
          createdAt: poster.upload_date || new Date().toISOString(),
          salesCount: 0,
          revenue: 0,
          commission: 0,
          recentOrders: [],
        });
      } catch (error) {
        console.error(
          `Error fetching basic data for product ${poster.shopify_product_id}:`,
          error
        );
        // Add basic product data even if Shopify fetch fails
        productDataMap.set(poster.shopify_product_id!, {
          id: poster.id,
          title: poster.title || "Untitled",
          imageUrl: poster.poster_url || "",
          status: poster.status || "pending",
          shopifyUrl: poster.shopify_url || "",
          shopifyProductId: poster.shopify_product_id!,
          createdAt: poster.upload_date || new Date().toISOString(),
          salesCount: 0,
          revenue: 0,
          commission: 0,
          recentOrders: [],
        });
      }
    }

    // Now fetch ALL orders containing ANY of the creator's products (holistic approach)
    const allOrders: ShopifyOrderData[] = [];

    if (shopifyProductIds.length > 0) {
      console.log("\n=== REST API ORDER FETCHING START ===");

      // Fetch all orders containing any creator products using a simpler approach
      let allOrdersFromAPI: ShopifyOrderData[] = [];

      try {
        // Use REST API instead of GraphQL to avoid pagination issues
        const restClient = await createAdminApiClient(accessToken);

        // Add rate limiting to avoid Shopify throttling
        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        // Fetch orders for each product individually to avoid complex GraphQL queries
        for (let i = 0; i < shopifyProductIds.length; i++) {
          const productId = shopifyProductIds[i];
          console.log(
            `Fetching orders for product ${productId} (${i + 1}/${
              shopifyProductIds.length
            })...`
          );

          // Add delay between requests to respect rate limits (2 calls per second max)
          if (i > 0) {
            console.log("Adding delay to respect Shopify rate limits...");
            await delay(600); // 600ms delay = ~1.6 calls per second (safely under 2/sec limit)
          }

          try {
            // Use REST API to get orders containing this product with retry logic
            const ordersResponse = await retryWithBackoff(
              async () => {
                return await restClient.get({
                  path: "orders",
                  query: {
                    status: "any",
                    limit: 250, // Maximum allowed by Shopify REST API
                    created_at_min: startDate || "2000-01-01",
                    created_at_max:
                      endDate || new Date().toISOString().split("T")[0],
                    fields:
                      "id,name,created_at,financial_status,total_price,customer,line_items,shipping_lines,refunds",
                  },
                });
              },
              5,
              2000
            ); // 5 retries with 2 second initial delay

            if (
              ordersResponse.body &&
              typeof ordersResponse.body === "object" &&
              "orders" in ordersResponse.body
            ) {
              const orders = (ordersResponse.body as any).orders;

              // Check if we need to fetch more pages (REST API returns max 250 orders per page)
              let allOrdersForProduct = [...orders];

              // If we got 250 orders, there might be more pages
              if (orders.length === 250) {
                console.log(
                  `Product ${productId} has 250+ orders, fetching additional pages...`
                );

                // Get the last order's created_at date for pagination
                let lastOrderDate = orders[orders.length - 1]?.created_at;
                let pageCount = 1;
                const maxPages = 5; // Limit to prevent excessive API calls

                while (lastOrderDate && pageCount < maxPages) {
                  pageCount++;

                  // Add delay between pagination requests
                  await delay(800);

                  try {
                    const nextPageResponse = await retryWithBackoff(
                      async () => {
                        return await restClient.get({
                          path: "orders",
                          query: {
                            status: "any",
                            limit: 250,
                            created_at_min: startDate || "2000-01-01",
                            created_at_max: lastOrderDate, // Use last order date as max for next page
                            fields:
                              "id,name,created_at,financial_status,total_price,customer,line_items,shipping_lines,refunds",
                          },
                        });
                      },
                      3,
                      1500
                    );

                    if (
                      nextPageResponse.body &&
                      typeof nextPageResponse.body === "object" &&
                      "orders" in nextPageResponse.body
                    ) {
                      const nextPageOrders = (nextPageResponse.body as any)
                        .orders;

                      if (nextPageOrders.length === 0) {
                        console.log(
                          `No more orders found for product ${productId} on page ${pageCount}`
                        );
                        break;
                      }

                      // Filter out the last order from previous page to avoid duplicates
                      const newOrders = nextPageOrders.filter(
                        (order: any) => order.created_at !== lastOrderDate
                      );
                      allOrdersForProduct.push(...newOrders);

                      console.log(
                        `Fetched ${newOrders.length} additional orders for product ${productId} (page ${pageCount})`
                      );

                      // Update lastOrderDate for next iteration
                      if (newOrders.length > 0) {
                        lastOrderDate =
                          newOrders[newOrders.length - 1]?.created_at;
                      } else {
                        break;
                      }

                      // If we got less than 250 orders, we've reached the end
                      if (nextPageOrders.length < 250) {
                        break;
                      }
                    } else {
                      break;
                    }
                  } catch (paginationError) {
                    console.error(
                      `Error fetching page ${pageCount} for product ${productId}:`,
                      paginationError
                    );
                    break;
                  }
                }

                console.log(
                  `Total orders fetched for product ${productId}: ${allOrdersForProduct.length}`
                );
              }

              // Filter orders that contain this specific product
              const relevantOrders = allOrdersForProduct.filter(
                (order: any) => {
                  const hasProduct =
                    order.line_items &&
                    order.line_items.some(
                      (item: any) =>
                        item.product_id &&
                        item.product_id.toString() === productId
                    );

                  if (hasProduct) {
                    console.log(
                      `✅ Order ${order.name} contains product ${productId}`
                    );
                  }

                  return hasProduct;
                }
              );

              console.log(
                `Found ${relevantOrders.length} relevant orders for product ${productId} out of ${allOrdersForProduct.length} total orders`
              );

              if (relevantOrders.length === 0) {
                console.log(
                  `⚠️  No orders found for product ${productId}. This might be why sales are showing as 0.`
                );
                console.log(
                  `Sample of orders checked:`,
                  allOrdersForProduct.slice(0, 3).map((o) => ({
                    name: o.name,
                    line_items: o.line_items?.map((item: any) => ({
                      product_id: item.product_id,
                      title: item.title,
                    })),
                  }))
                );
              }

              // Convert to our format
              relevantOrders.forEach((order: any) => {
                // Filter line items for this specific product
                const productLineItems = order.line_items.filter(
                  (item: any) =>
                    item.product_id && item.product_id.toString() === productId
                );

                if (productLineItems.length > 0) {
                  // Calculate totals for this product's line items
                  let itemTotal = 0;
                  const lineItemsFormatted = productLineItems.map(
                    (item: any) => {
                      const itemPrice = parseFloat(item.price || "0");
                      itemTotal += itemPrice * (item.quantity || 0);

                      return {
                        id: item.id?.toString() || "",
                        productId: productId,
                        title: item.title || "",
                        price: itemPrice.toString(),
                        quantity: item.quantity || 0,
                      };
                    }
                  );

                  // Calculate refunds for this product
                  let refundAmount = 0;
                  if (order.refunds && Array.isArray(order.refunds)) {
                    order.refunds.forEach((refund: any) => {
                      if (refund.refund_line_items) {
                        refund.refund_line_items.forEach((refundItem: any) => {
                          if (
                            refundItem.line_item &&
                            refundItem.line_item.product_id?.toString() ===
                              productId
                          ) {
                            refundAmount += parseFloat(
                              refundItem.subtotal || "0"
                            );
                          }
                        });
                      }
                    });
                  }

                  // Check if the order is marked as refunded OR partially_refunded and handle as full refunds
                  const financialStatus =
                    order.financial_status?.toLowerCase() || "";
                  if (
                    financialStatus === "refunded" ||
                    financialStatus === "partially_refunded"
                  ) {
                    // For fully refunded OR partially refunded orders, use the full item total as refund amount
                    refundAmount = itemTotal;
                    console.log(
                      `Order ${order.name} is ${financialStatus}, setting refund amount to full item total: ${refundAmount}`
                    );
                  }

                  // Calculate shipping proportionally
                  const orderTotal = parseFloat(order.total_price || "0");
                  const proportion =
                    orderTotal > 0 ? itemTotal / orderTotal : 0;
                  const shippingAmount = order.shipping_lines
                    ? order.shipping_lines.reduce(
                        (sum: number, shipping: any) =>
                          sum + parseFloat(shipping.price || "0"),
                        0
                      ) * proportion
                    : 0;

                  // Calculate net revenue correctly
                  const netRevenue = Math.max(0, itemTotal - refundAmount);

                  console.log(
                    `Order ${order.name}: itemTotal=${itemTotal}, refundAmount=${refundAmount}, netRevenue=${netRevenue}, financialStatus=${order.financial_status}`
                  );

                  // Add to our orders array
                  const orderData: ShopifyOrderData = {
                    id: order.id?.toString() || "",
                    orderNumber: order.name || "",
                    createdAt: order.created_at || "",
                    totalAmount: itemTotal.toString(),
                    lineItems: lineItemsFormatted,
                    customerName:
                      order.customer?.first_name && order.customer?.last_name
                        ? `${order.customer.first_name} ${order.customer.last_name}`
                        : "Unknown Customer",
                    customerEmail: order.customer?.email || "",
                    financialStatus: order.financial_status || "",
                    refundAmount: refundAmount,
                    shippingAmount: shippingAmount,
                    netRevenue: netRevenue,
                  };

                  allOrdersFromAPI.push(orderData);

                  // Update product data
                  const productData = productDataMap.get(productId);
                  if (productData) {
                    const quantityToAdd = lineItemsFormatted.reduce(
                      (sum: number, item: any) => sum + item.quantity,
                      0
                    );

                    console.log(`📊 Updating product ${productId} data:`);
                    console.log(
                      `  - Adding ${quantityToAdd} to sales count (was ${productData.salesCount})`
                    );
                    console.log(
                      `  - Adding £${netRevenue} to revenue (was £${productData.revenue})`
                    );
                    console.log(
                      `  - Adding £${netRevenue * 0.3} to commission (was £${
                        productData.commission
                      })`
                    );

                    productData.salesCount += quantityToAdd;
                    productData.revenue += netRevenue;
                    productData.commission += netRevenue * 0.3;

                    if (!productData.recentOrders) {
                      productData.recentOrders = [];
                    }
                    productData.recentOrders.push(orderData);

                    console.log(
                      `  - New totals: ${productData.salesCount} sales, £${productData.revenue} revenue, £${productData.commission} commission`
                    );
                  } else {
                    console.log(
                      `❌ Product data not found in map for product ${productId}`
                    );
                  }
                }
              });
            }
          } catch (productError) {
            console.error(
              `Error fetching orders for product ${productId}:`,
              productError
            );
            // Continue with next product after a longer delay
            await delay(1000);
          }
        }

        // Add all orders to the main array
        allOrders.push(...allOrdersFromAPI);

        console.log(`\n=== REST API ORDER FETCHING COMPLETE ===`);
        console.log(`Total orders processed: ${allOrders.length}`);
      } catch (error) {
        console.error("Error in REST API order fetching:", error);
        // Continue with empty orders array
      }
    }

    // Convert product data map to array
    const validShopifyData = Array.from(productDataMap.values());

    console.log(`\n=== FINAL PRODUCT DATA SUMMARY ===`);
    validShopifyData.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.title}`);
      console.log(`  - ID: ${product.id}`);
      console.log(`  - Shopify Product ID: ${product.shopifyProductId}`);
      console.log(`  - Status: ${product.status}`);
      console.log(`  - Sales Count: ${product.salesCount}`);
      console.log(`  - Revenue: £${product.revenue}`);
      console.log(`  - Commission: £${product.commission}`);
      console.log(`  - Recent Orders: ${product.recentOrders?.length || 0}`);
    });
    console.log(`=== END PRODUCT DATA SUMMARY ===\n`);

    // Get pending products
    const { data } = await supabase
      .from("posters")
      .select("*")
      .eq("creator_id", user.id)
      .eq("status", "pending")
      .not("shopify_product_id", "is", null);

    const nonApprovedProducts =
      data?.map((poster: ApprovedPoster) => {
        return {
          id: poster.id,
          title: poster.title || "Untitled",
          variantTitle: "",
          imageUrl: "",
          price: "0.00",
          status: poster.status || "pending",
          salesCount: poster.sales || 0,
          revenue: 0,
          commission: 0,
          shopifyUrl: poster.shopify_url || "",
          shopifyProductId: poster.shopify_product_id || "",
          createdAt: poster.upload_date || new Date().toISOString(),
        };
      }) || [];

    // Combine all products
    const formattedProducts = [...validShopifyData, ...nonApprovedProducts];

    // Use the orders we collected during the holistic fetch
    const shopifyOrders = allOrders;

    // Calculate sales statistics
    const calculateStats = (products: FormattedProduct[]): Stats => {
      // Count approved products
      const approvedProductsCount = products.filter(
        (p) => p.status === "approved"
      ).length;

      // IMPORTANT: Since we've already subtracted refunds at the product level in fetchShopifyProductData,
      // the revenue values in products[] already represent net revenue (after refunds).
      // Using these values directly will prevent double-counting of refunds.
      const totalRevenue = products.reduce(
        (sum, p) => sum + (p.revenue || 0),
        0
      );

      // For display and reporting purposes, calculate the total refund amount
      // But don't subtract this again from revenue
      console.log(
        `\n=== CALCULATING TOTAL REFUNDS FROM ${shopifyOrders.length} ORDERS ===`
      );
      const totalRefunds = shopifyOrders.reduce((sum, order) => {
        // Check if this order has any refunds
        const hasRefunds = order.refundAmount && order.refundAmount > 0;
        const financialStatus = order.financialStatus?.toLowerCase() || "";
        const isFullyRefunded = financialStatus === "refunded";
        const isPartiallyRefunded = financialStatus === "partially_refunded";

        console.log(
          `Order ${order.orderNumber}: financialStatus="${order.financialStatus}", refundAmount=${order.refundAmount}, totalAmount=${order.totalAmount}`
        );

        if (isFullyRefunded || isPartiallyRefunded) {
          // For fully refunded OR partially refunded orders, use the full order amount
          const orderTotal = parseFloat(order.totalAmount || "0");
          console.log(
            `  ✅ Tracking FULL refund for ${financialStatus} order ${order.orderNumber}: £${orderTotal}`
          );
          return sum + orderTotal;
        } else if (hasRefunds && order.refundAmount) {
          // For partial refunds on non-refunded orders
          console.log(
            `  ✅ Tracking PARTIAL refund for order ${order.orderNumber}: £${order.refundAmount}`
          );
          return sum + order.refundAmount;
        } else {
          console.log(`  ⏭️  No refunds for order ${order.orderNumber}`);
        }

        return sum;
      }, 0);

      console.log(`=== TOTAL REFUNDS CALCULATED: £${totalRefunds} ===\n`);

      // Since product.revenue is already net of refunds, we don't need to subtract refunds again
      const netRevenue = totalRevenue;

      console.log(
        `Stats calculation: Total Revenue (already net of refunds): £${totalRevenue}, Total Refunds (for reporting): £${totalRefunds}`
      );

      return {
        totalRevenue: totalRevenue + totalRefunds, // Add refunds back to show true gross revenue
        totalSales: products.reduce((sum, p) => sum + (p.salesCount || 0), 0),
        totalCommission: totalRevenue * 0.3, // Commission based on net revenue (after refunds)
        averageOrderValue: shopifyOrders.length
          ? shopifyOrders.reduce(
              (sum, o) => sum + parseFloat(o.totalAmount || "0"),
              0
            ) / shopifyOrders.length
          : 0,
        productsCount: products.length,
        ordersCount: shopifyOrders.length,
        approvedProductsCount,
        totalRefunds,
        netRevenue,
      };
    };

    const stats = calculateStats(formattedProducts as FormattedProduct[]);

    console.log(
      `Total stats: ${stats.totalSales} sales, $${stats.totalRevenue.toFixed(
        2
      )} revenue`
    );

    // Generate sales trend data from Shopify orders
    const salesTrend =
      shopifyOrders.length > 0
        ? await getShopifySalesTrend(shopifyOrders)
        : generateDefaultSalesTrend();

    // Function for generating default sales trend when no orders exist
    function generateDefaultSalesTrend(): SalesTrendPoint[] {
      // Get last 6 months
      const monthlyData: Record<
        string,
        { sales: number; revenue: number; refunds: number }
      > = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toLocaleString("default", { month: "short" });
        monthlyData[monthKey] = { sales: 0, revenue: 0, refunds: 0 };
      }

      // Convert to array format for the chart
      return Object.entries(monthlyData).map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue,
        refunds: data.refunds,
        netRevenue: Math.max(0, data.revenue - data.refunds),
      }));
    }

    // Remove recentOrders from products to avoid large response
    const cleanedProducts = formattedProducts.map((product) => {
      const productCopy = { ...product };
      if ("recentOrders" in productCopy) {
        delete productCopy.recentOrders;
      }
      return productCopy;
    });

    // Add date range information to the response
    const dateRange = {
      startDate: startDate || "all-time-start",
      endDate: endDate || "present",
      isAllTime: !startDate && !endDate,
    };

    return NextResponse.json({
      products: cleanedProducts,
      orders: shopifyOrders,
      stats,
      salesTrend,
      dateRange,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
