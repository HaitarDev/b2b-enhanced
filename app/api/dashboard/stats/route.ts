import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  createAdminApiClient,
  createGraphQLClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

type Stats = {
  totalRevenue: number;
  totalSales: number;
  totalCommission: number;
  averageOrderValue: number;
  productsCount: number;
  ordersCount: number;
  approvedProductsCount: number;
};

type SalesTrendPoint = {
  date: string;
  sales: number;
  revenue: number;
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

// Shopify GraphQL response types
interface ShopifyGraphQLLineItem {
  id: string;
  title: string;
  quantity: number;
  product: {
    id: string;
  };
  variant: {
    id: string;
    title: string;
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
}

interface ShopifyGraphQLRefund {
  id: string;
  createdAt: string;
  note?: string;
  refundLineItems: {
    edges: Array<{
      node: {
        lineItem: {
          id: string;
          product?: {
            id: string;
          };
          quantity: number;
          originalTotalSet?: {
            shopMoney: {
              amount: string;
            };
          };
        };
        quantity: number;
        restockType: string;
        subtotalSet?: {
          shopMoney: {
            amount: string;
          };
        };
      };
    }>;
  };
}

interface ShopifyGraphQLOrder {
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
  customer?: {
    displayName?: string;
    email?: string;
  };
  refunds?: ShopifyGraphQLRefund[];
  lineItems: {
    edges: Array<{
      node: ShopifyGraphQLLineItem;
    }>;
  };
}

interface ShopifyGraphQLOrdersResponse {
  data?: {
    orders?: {
      edges: Array<{
        node: ShopifyGraphQLOrder;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

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

    // Fetch product data from Shopify using REST API
    const { body: productData } = await restClient.get({
      path: `products/${productId}`,
    });

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

      const query = `
        query getOrdersByProductId($cursor: String, $queryString: String!) {
          orders(first: ${pageSize}, query: $queryString, after: $cursor) {
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
                        title
                      }
                      variant {
                        id
                        title
                        price
                        sku
                        inventoryQuantity
                        selectedOptions {
                          name
                          value
                        }
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

      // Execute the GraphQL query
      const variables: { cursor: string | null; queryString: string } = {
        cursor,
        queryString: `status:any line_items_product_id:${productId}${dateFilter}`,
      };

      console.log("Debug - GraphQL variables:", JSON.stringify(variables));

      try {
        // For 6-month queries, add a delay between requests to avoid throttling
        if (is6MonthQuery && pageCount > 1) {
          console.log(
            "Adding delay between 6-month data pages to avoid throttling"
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const { data, errors, extensions } = await retryWithBackoff(() =>
          graphqlClient.request(query, {
            variables,
          })
        );

        // Process response with error handling
        if (errors) {
          console.error("GraphQL Errors:", errors);
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
        const responseData = {
          data: {
            orders: data?.orders || {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        };

        const orderData = responseData.data.orders;
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
                            parseFloat(item.originalTotalSet.shopMoney.amount) /
                            item.quantity
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
                                    refundLineItem.subtotalSet.shopMoney.amount
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
                    !hasRefunds &&
                    order.displayFinancialStatus &&
                    order.displayFinancialStatus
                      .toUpperCase()
                      .includes("REFUNDED")
                  ) {
                    // For partially refunded, estimate 50% refund
                    if (
                      order.displayFinancialStatus
                        .toUpperCase()
                        .includes("PARTIALLY")
                    ) {
                      refundAmount = orderRevenue * 0.5;
                      console.log(
                        `Order ${order.id} has PARTIALLY_REFUNDED status, estimated refund: ${refundAmount}`
                      );
                    } else {
                      // For fully refunded, use the full amount
                      refundAmount = orderRevenue;
                      console.log(
                        `Order ${order.id} has REFUNDED status, full refund: ${refundAmount}`
                      );
                    }
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

    console.log(
      `FINAL: Product ${productId}: Found ${salesCount} sales with revenue ${revenue}`
    );

    return {
      product: productData.product,
      salesCount,
      revenue,
      commission: revenue * 0.3, // Artist gets 30%
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

    // Fetch Shopify data for each approved poster with retry logic
    const shopifyProductsPromises = approvedPosters.map(
      async (poster: ApprovedPoster) => {
        if (!poster.shopify_product_id) return null;

        console.log(
          `Fetching Shopify data for product: ${poster.shopify_product_id}`
        );

        try {
          const shopifyData = await retryWithBackoff(() =>
            fetchShopifyProductData(
              poster.shopify_product_id as string, // Add type assertion here
              startDate,
              endDate
            )
          );

          if (!shopifyData) return null;

          // Get image URL from Shopify product data
          let imageUrl = "";
          if (
            shopifyData.product.images &&
            Array.isArray(shopifyData.product.images) &&
            shopifyData.product.images.length > 0
          ) {
            imageUrl = shopifyData.product.images[0].src;
          }

          // Combine poster and Shopify data
          return {
            id: poster.id,
            title: poster.title || shopifyData.product.title || "Untitled",
            imageUrl: imageUrl,
            status: poster.status || "pending",
            shopifyUrl: `${process.env.SHOPIFY_SHOP_DOMAIN}/products/${shopifyData.product.handle}`,
            shopifyProductId: poster.shopify_product_id,
            createdAt: poster.upload_date || new Date().toISOString(),
            salesCount: shopifyData.salesCount,
            revenue: shopifyData.revenue,
            commission: shopifyData.commission,
            recentOrders: shopifyData.recentOrders,
          };
        } catch (error) {
          console.error(
            `Error fetching data for product ${poster.shopify_product_id}:`,
            error
          );
          // Return a basic object with available poster data but zero sales
          return {
            id: poster.id,
            title: poster.title || "Untitled",
            imageUrl: poster.poster_url || "",
            status: poster.status || "pending",
            shopifyUrl: poster.shopify_product_id
              ? `${process.env.SHOPIFY_SHOP_DOMAIN}/products/${poster.shopify_product_id}`
              : "",
            shopifyProductId: poster.shopify_product_id,
            createdAt: poster.upload_date || new Date().toISOString(),
            salesCount: 0,
            revenue: 0,
            commission: 0,
            recentOrders: [],
          };
        }
      }
    );

    const shopifyProductsData = await Promise.all(shopifyProductsPromises);
    const validShopifyData = shopifyProductsData.filter(Boolean);

    // Detailed logging for products with revenue
    validShopifyData.forEach((product: any) => {
      if (product && product.revenue > 0) {
        console.log(
          `Revenue found for product ${product.shopifyProductId}: ${product.revenue}`
        );
      }
    });

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
          imageUrl: "", // Use empty string if no image available
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

    // Extract and deduplicate Shopify orders
    const shopifyOrders: ShopifyOrderData[] = [];
    validShopifyData.forEach((product: any) => {
      if (product && "recentOrders" in product) {
        const orders = product.recentOrders || [];
        orders.forEach((order: ShopifyOrderData) => {
          if (
            !shopifyOrders.some(
              (existingOrder) => existingOrder.id === order.id
            )
          ) {
            shopifyOrders.push(order);
          }
        });
      }
    });

    // Calculate sales statistics
    const calculateStats = (products: FormattedProduct[]): Stats => {
      // Count approved products
      const approvedProductsCount = products.filter(
        (p) => p.status === "approved"
      ).length;

      return {
        totalRevenue: products.reduce((sum, p) => sum + (p.revenue || 0), 0),
        totalSales: products.reduce((sum, p) => sum + (p.salesCount || 0), 0),
        totalCommission: products.reduce(
          (sum, p) => sum + (p.commission || 0),
          0
        ),
        averageOrderValue: shopifyOrders.length
          ? shopifyOrders.reduce(
              (sum, o) => sum + parseFloat(o.totalAmount || "0"),
              0
            ) / shopifyOrders.length
          : 0,
        productsCount: products.length,
        ordersCount: shopifyOrders.length,
        approvedProductsCount,
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
      const monthlyData: Record<string, { sales: number; revenue: number }> =
        {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toLocaleString("default", { month: "short" });
        monthlyData[monthKey] = { sales: 0, revenue: 0 };
      }

      // Convert to array format for the chart
      return Object.entries(monthlyData).map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue,
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
