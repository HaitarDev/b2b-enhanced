import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  createGraphQLClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";

/**
 * Monthly Payouts API
 *
 * This API handles the calculation and generation of monthly payouts for creators.
 *
 * Key features:
 * - Processes orders from Shopify for a specified date range
 * - Tracks revenue at both product and variant level
 * - Uses exact prices from order line items (not just default product prices)
 * - Properly handles different variants with different prices
 * - Excludes shipping fees from revenue calculations
 * - Splits revenue using a 70/30 model (creators get 70%)
 * - Creates payout records in the database if amount exceeds £20
 *
 * The variant-level tracking ensures accurate pricing information
 * when variants have different prices (e.g., framed vs unframed posters).
 */

// Helper to format dates for the monthly payout (previous month)
const getMonthDateRange = (dateString?: string) => {
  let date;

  // If a date string is provided, parse it
  if (dateString) {
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      // Format: YYYY-MM
      const [year, month] = dateString.split("-").map(Number);
      date = new Date(year, month - 1); // Month is 0-indexed in JS Date
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Format: YYYY-MM-DD - use the month from this date
      const inputDate = new Date(dateString);
      date = new Date(inputDate.getFullYear(), inputDate.getMonth());
    } else {
      // Invalid format, use current month
      date = new Date();
    }
  } else {
    // Otherwise use previous month for cron job (current month for manual testing)
    date = new Date();
    // For automated cron job, use previous month
    date.setMonth(date.getMonth() - 1);
  }

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  console.log(
    `Using date range: ${firstDay.toISOString().split("T")[0]} to ${
      lastDay.toISOString().split("T")[0]
    }`
  );

  return {
    firstDay: firstDay.toISOString().split("T")[0],
    lastDay: lastDay.toISOString().split("T")[0],
  };
};

// Define interface for selected options
interface SelectedOption {
  name: string;
  value: string;
}

// Update interface for variants
interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  inventoryQuantity?: number;
  selectedOptions?: SelectedOption[];
}

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
                  title?: string;
                };
                variant?: ShopifyVariant;
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

type ProductRevenueData = {
  productId: string;
  title: string;
  revenue: number;
  sales: number;
  currency: string;
  variants?: Array<{
    variantId: string;
    title: string;
    totalSold: number;
    totalRevenue: number;
    currency: string;
    orders: Array<{
      orderId: string;
      orderName: string;
      date: string;
      quantity: number;
      pricePaid: number;
      lineTotal: number;
    }>;
  }>;
};

// Calculate sales and revenue for a product
async function calculateProductRevenue(
  productId: string,
  startDate: string,
  endDate: string
) {
  try {
    const accessToken = getShopifyAccessToken();
    const graphqlClient = await createGraphQLClient(accessToken);

    let hasNextPage = true;
    let cursor: string | null = null;
    let totalRevenue = 0;
    let totalSales = 0;
    let currencyCode = "EUR"; // Default currency

    // Track variant-level data
    const variants: Record<
      string,
      {
        variantId: string;
        title: string;
        totalSold: number;
        totalRevenue: number;
        currency: string;
        orders: Array<{
          orderId: string;
          orderName: string;
          date: string;
          quantity: number;
          pricePaid: number;
          lineTotal: number;
        }>;
      }
    > = {};

    while (hasNextPage) {
      // Build GraphQL query to get product sales data with pagination
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

      const variables = {
        cursor,
        queryString: `financial_status:any created_at:>=${startDate} created_at:<=${endDate} line_items_product_id:${productId}`,
      };

      console.log(
        `Querying Shopify for product ${productId} with date range ${startDate} to ${endDate}`
      );
      console.log(`Full query string: ${variables.queryString}`);

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
          const allOrders = responseData.data.orders.edges;
          const includedOrders: string[] = [];
          const excludedOrders: string[] = [];

          allOrders.forEach(({ node: order }) => {
            // Only count paid orders
            const status = order.displayFinancialStatus?.toUpperCase() || "";

            console.log(`Processing order ${order.name} with status ${status}`);

            // Store the currency code from the order
            if (order.totalPriceSet?.shopMoney?.currencyCode) {
              currencyCode = order.totalPriceSet.shopMoney.currencyCode;
              console.log(`Order currency: ${currencyCode}`);
            }

            // Log all line items for debugging
            const allLineItems = order.lineItems.edges.map((edge) => edge.node);
            console.log(`Order has ${allLineItems.length} line items total`);

            allLineItems.forEach((item) => {
              if (item.product) {
                console.log(
                  `Line item ${item.id}: product ID = ${item.product.id}, title = ${item.title}`
                );
                if (item.variant) {
                  console.log(
                    `Variant: ID = ${item.variant.id}, title = ${item.variant.title}, price = ${item.variant.price}`
                  );
                }
                if (item.discountedTotalSet?.shopMoney) {
                  console.log(
                    `Discounted total: ${item.discountedTotalSet.shopMoney.amount} ${item.discountedTotalSet.shopMoney.currencyCode}`
                  );
                }
              } else {
                console.log(`Line item ${item.id}: No product information`);
              }
            });

            if (
              status === "PAID" ||
              status === "PARTIALLY_PAID" ||
              status.includes("PAID") ||
              status.includes("COMPLETE")
            ) {
              // Skip orders that contain "REFUND" in their status
              if (status.includes("REFUND")) {
                console.log(
                  `❌ EXCLUDING refunded order ${order.name} with status ${status}`
                );
                excludedOrders.push(`${order.name} (${status})`);
                return;
              }

              console.log(
                `✅ INCLUDING order ${order.name} with status ${status}`
              );
              includedOrders.push(`${order.name} (${status})`);

              // Filter line items for this product
              const lineItems = order.lineItems.edges
                .map((edge) => edge.node)
                .filter((item) => {
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
                });

              if (lineItems.length > 0) {
                let orderItemsCount = 0;
                let orderRevenue = 0;

                // Process each line item directly - similar to product stats API
                lineItems.forEach((item) => {
                  // Add to sales count
                  orderItemsCount += item.quantity || 0;

                  // Calculate revenue directly from the line item - excluding shipping fees
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
                  } else if (item.variant?.price) {
                    // Fallback to variant price if no total set is available
                    const variantRevenue =
                      parseFloat(item.variant.price) * (item.quantity || 1);
                    orderRevenue += variantRevenue;
                    console.log(
                      `Item ${item.id} (using variant price): quantity=${item.quantity}, variant price=${item.variant.price}, revenue=${variantRevenue}`
                    );
                  } else {
                    console.log(
                      `Warning: No price information for item ${item.id} in order ${order.name}`
                    );
                    return;
                  }

                  // Process variant data for detailed reporting
                  if (item.variant) {
                    const variantId = item.variant.id;

                    // Get a user-friendly variant title
                    let variantTitle = item.variant.title || "Default";

                    // Extract variant options if available
                    try {
                      const variantData = item.variant as {
                        selectedOptions?: Array<{
                          name?: string;
                          value?: string;
                        }>;
                      };

                      if (
                        variantData &&
                        variantData.selectedOptions &&
                        Array.isArray(variantData.selectedOptions)
                      ) {
                        const options = variantData.selectedOptions
                          .map((opt) => {
                            if (
                              opt &&
                              typeof opt.name === "string" &&
                              typeof opt.value === "string"
                            ) {
                              return `${opt.name}: ${opt.value}`;
                            }
                            return "";
                          })
                          .filter(Boolean)
                          .join(", ");

                        if (options) {
                          variantTitle = options;
                        }
                      }
                    } catch (e) {
                      console.log(`Error formatting variant title: ${e}`);
                    }

                    const quantity = item.quantity || 0;

                    // Calculate unit price from the total
                    let unitPrice = 0;
                    let lineItemRevenue = 0;

                    if (
                      item.discountedTotalSet?.shopMoney?.amount &&
                      quantity > 0
                    ) {
                      lineItemRevenue = parseFloat(
                        item.discountedTotalSet.shopMoney.amount
                      );
                      unitPrice = lineItemRevenue / quantity;
                    } else if (
                      item.originalTotalSet?.shopMoney?.amount &&
                      quantity > 0
                    ) {
                      lineItemRevenue = parseFloat(
                        item.originalTotalSet.shopMoney.amount
                      );
                      unitPrice = lineItemRevenue / quantity;
                    } else if (item.variant.price) {
                      unitPrice = parseFloat(item.variant.price);
                      lineItemRevenue = unitPrice * quantity;
                    }

                    console.log(
                      `Variant ${variantId} (${variantTitle}): Unit price=${unitPrice.toFixed(
                        2
                      )}, Quantity=${quantity}, Revenue=${lineItemRevenue.toFixed(
                        2
                      )}`
                    );

                    // Initialize variant record if it doesn't exist
                    if (!variants[variantId]) {
                      variants[variantId] = {
                        variantId,
                        title: variantTitle,
                        totalSold: 0,
                        totalRevenue: 0,
                        currency:
                          item.discountedTotalSet?.shopMoney?.currencyCode ||
                          item.originalTotalSet?.shopMoney?.currencyCode ||
                          currencyCode,
                        orders: [],
                      };
                    }

                    // Update variant totals
                    variants[variantId].totalSold += quantity;
                    variants[variantId].totalRevenue += lineItemRevenue;

                    // Add order details with exact price information
                    variants[variantId].orders.push({
                      orderId: order.id,
                      orderName: order.name,
                      date: order.createdAt,
                      quantity,
                      pricePaid: unitPrice,
                      lineTotal: lineItemRevenue,
                    });
                  }
                });

                // Update total counters
                totalSales += orderItemsCount;
                totalRevenue += orderRevenue;

                console.log(
                  `Order ${
                    order.name
                  }: Added ${orderItemsCount} items with revenue ${orderRevenue.toFixed(
                    2
                  )} ${currencyCode}`
                );
              }
            } else {
              console.log(`Skipping order ${order.name} with status ${status}`);
            }
          });

          // Log summary of included vs excluded orders
          console.log(
            `\n=== ORDER PROCESSING SUMMARY FOR PRODUCT ${productId} ===`
          );
          console.log(`✅ INCLUDED ORDERS (${includedOrders.length}):`);
          includedOrders.forEach((order) => console.log(`  - ${order}`));
          console.log(`❌ EXCLUDED ORDERS (${excludedOrders.length}):`);
          excludedOrders.forEach((order) => console.log(`  - ${order}`));
          console.log(`=== END SUMMARY ===\n`);
        }

        // Check if there are more pages to fetch
        hasNextPage = responseData.data?.orders?.pageInfo?.hasNextPage || false;
        cursor = responseData.data?.orders?.pageInfo?.endCursor || null;
      } else {
        console.log(`No data returned for product ${productId}`);
        hasNextPage = false;
      }
    }

    // Convert variants record to array for easier consumption
    const variantsArray = Object.values(variants);

    console.log(
      `FINAL: Product ${productId}: Found ${totalSales} sales with revenue ${totalRevenue.toFixed(
        2
      )} ${currencyCode}`
    );

    if (variantsArray.length > 0) {
      console.log(`Variant breakdown:`);
      variantsArray.forEach((variant) => {
        console.log(
          `  - ${variant.title}: ${
            variant.totalSold
          } sold, revenue: ${variant.totalRevenue.toFixed(2)} ${
            variant.currency
          }`
        );
      });
    }

    return {
      revenue: totalRevenue,
      sales: totalSales,
      currencyCode,
      variants: variantsArray,
    };
  } catch (error) {
    console.error(`Error calculating revenue for product ${productId}:`, error);
    return {
      revenue: 0,
      sales: 0,
      currencyCode: "EUR",
      variants: [],
    };
  }
}

export async function GET(request: Request) {
  try {
    // Verify authorization header
    const authHeader = request.headers.get("Authorization");
    const apiKey = process.env.CRON_API_KEY;

    // Skip auth check in development if no API key is set
    if (
      process.env.NODE_ENV === "production" &&
      (!apiKey || authHeader !== `Bearer ${apiKey}`)
    ) {
      console.log("Unauthorized access attempt to cron job");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date parameter and preview mode from URL if provided
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const previewMode = url.searchParams.get("preview") === "true";

    // Get manual amounts from the request if provided
    const manualAmountsParam = url.searchParams.get("manual_amounts");
    const manualAmounts = manualAmountsParam
      ? JSON.parse(manualAmountsParam)
      : {};

    const supabase = await createClient();
    const { firstDay, lastDay } = getMonthDateRange(dateParam || undefined);

    console.log(
      `Starting monthly payout ${
        previewMode ? "preview" : "processing"
      } for period: ${firstDay} to ${lastDay}`
    );

    // Get all approved creators
    const { data: creators, error: creatorsError } = await supabase
      .from("profiles")
      .select("id, name, vendor, email, payment_method, currency")
      .eq("role", "creator")
      .eq("approved", true);

    if (creatorsError) {
      console.error("Error fetching creators:", creatorsError);
      return NextResponse.json(
        { error: "Failed to fetch creators" },
        { status: 500 }
      );
    }

    console.log(`Processing payouts for ${creators.length} creators`);

    // Process each creator
    const payoutResults = [];

    for (const creator of creators) {
      console.log(`Processing creator: ${creator.name || creator.id}`);

      // Get approved products for this creator
      const { data: products, error: productsError } = await supabase
        .from("posters")
        .select("id, title, shopify_product_id")
        .eq("creator_id", creator.id)
        .eq("status", "approved")
        .not("shopify_product_id", "is", null);

      if (productsError) {
        console.error(
          `Error fetching products for creator ${creator.id}:`,
          productsError
        );
        continue;
      }

      // Skip if no products
      if (!products || products.length === 0) {
        console.log(`No approved products found for creator ${creator.id}`);
        continue;
      }

      console.log(
        `Found ${products.length} products for creator ${creator.id}`
      );

      // Calculate total revenue for this creator across all products
      let creatorTotalRevenue = 0;
      let creatorTotalSales = 0;
      let mainCurrency = "EUR"; // Default currency
      const productRevenueData: Array<ProductRevenueData> = [];

      console.log(
        `Processing ${products.length} products for creator ${creator.id} (${creator.name})`
      );

      for (const product of products) {
        if (!product.shopify_product_id) {
          console.log(`Skipping product ${product.id} - no Shopify ID`);
          continue;
        }

        // Extract numeric ID from shopify_product_id if it contains a slash
        const productId = product.shopify_product_id.includes("/")
          ? product.shopify_product_id.split("/").pop()
          : product.shopify_product_id;

        if (!productId) {
          console.log(
            `Invalid product ID format: ${product.shopify_product_id}`
          );
          continue;
        }

        console.log(
          `Processing product ${product.id} - Shopify ID: ${productId}`
        );

        // Calculate revenue for this product
        const { revenue, sales, currencyCode, variants } =
          await calculateProductRevenue(productId, firstDay, lastDay);

        // Store product revenue data for reporting
        productRevenueData.push({
          productId,
          title: product.title || "Untitled",
          revenue,
          sales,
          currency: currencyCode,
          variants,
        });

        console.log(
          `Product "${product.title}" (${
            product.shopify_product_id
          }): Revenue: ${revenue.toFixed(2)} ${currencyCode}, Sales: ${sales}`
        );

        // Set main currency to the first product with revenue
        if (revenue > 0 && mainCurrency === "EUR") {
          mainCurrency = currencyCode;
          console.log(
            `Setting main currency to ${mainCurrency} from product ${productId}`
          );
        }

        // Add all revenue regardless of currency (for simplicity)
        // A real production system might need currency conversion
        creatorTotalRevenue += revenue;
        creatorTotalSales += sales;
      }

      console.log(
        `Creator ${creator.id} (${creator.name}): Processed ${productRevenueData.length} products`
      );
      console.log(
        `Total revenue: ${creatorTotalRevenue.toFixed(
          2
        )}, Total sales: ${creatorTotalSales}`
      );

      // Debug: log all products with revenue
      const productsWithRevenue = productRevenueData.filter(
        (p) => p.revenue > 0
      );
      console.log(`Products with revenue (${productsWithRevenue.length}):`);
      productsWithRevenue.forEach((p) => {
        console.log(`- ${p.title}: ${p.revenue.toFixed(2)} ${p.currency}`);
      });

      // Debug: Show detailed revenue breakdown
      console.log(`=== REVENUE BREAKDOWN FOR CREATOR ${creator.id} ===`);
      console.log(`Period: ${firstDay} to ${lastDay}`);
      console.log(
        `Total Revenue: ${creatorTotalRevenue.toFixed(2)} ${mainCurrency}`
      );
      console.log(
        `Expected Commission (30%): ${(creatorTotalRevenue * 0.3).toFixed(
          2
        )} ${mainCurrency}`
      );

      // Show product-by-product breakdown
      productRevenueData.forEach((product) => {
        if (product.revenue > 0) {
          console.log(`Product: ${product.title}`);
          console.log(
            `  - Revenue: ${product.revenue.toFixed(2)} ${product.currency}`
          );
          console.log(`  - Sales: ${product.sales}`);
          if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variant) => {
              if (variant.totalRevenue > 0) {
                console.log(
                  `  - Variant "${variant.title}": ${
                    variant.totalSold
                  } sold, ${variant.totalRevenue.toFixed(2)} ${
                    variant.currency
                  }`
                );
                variant.orders.forEach((order) => {
                  console.log(
                    `    * Order ${order.orderName}: ${
                      order.quantity
                    }x @ ${order.pricePaid.toFixed(
                      2
                    )} = ${order.lineTotal.toFixed(2)}`
                  );
                });
              }
            });
          }
        }
      });
      console.log(`=== END BREAKDOWN ===`);

      // Creator gets 30% of total revenue (commission to creator)
      const creatorCommission = creatorTotalRevenue * 0.3;

      console.log(
        `Creator ${creator.id} total: Revenue: ${creatorTotalRevenue.toFixed(
          2
        )} ${mainCurrency}, Commission: ${creatorCommission.toFixed(
          2
        )} ${mainCurrency}, Sales: ${creatorTotalSales}`
      );

      // Skip if no revenue
      if (creatorCommission <= 0) {
        console.log(`No revenue for creator ${creator.id} in this period`);
        payoutResults.push({
          creator_id: creator.id,
          creator_name: creator.name,
          success: true,
          message: "No revenue in this period",
          amount: 0,
          currency: mainCurrency,
          products: productRevenueData,
        });
        continue;
      }

      // Log detailed revenue information
      console.log(
        `Creator ${
          creator.name || creator.id
        }: Total revenue (excl. shipping): ${creatorTotalRevenue.toFixed(
          2
        )} ${mainCurrency}, Creator commission (30%): ${creatorCommission.toFixed(
          2
        )} ${mainCurrency}`
      );

      // Check if a payout record already exists for this creator and month
      const { data: existingPayout } = await supabase
        .from("payout")
        .select("id")
        .eq("creator_id", creator.id)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)
        .single();

      if (existingPayout) {
        console.log(
          `Payout already exists for creator ${creator.id} in this period`
        );
        payoutResults.push({
          creator_id: creator.id,
          creator_name: creator.name,
          success: false,
          error: "Payout already exists for this period",
        });
        continue;
      }

      // Format the amount with 2 decimal places
      const formattedAmount = Math.round(creatorCommission * 100) / 100;

      // Get creator's currency or default to GBP
      const creatorCurrency = creator.currency || "GBP";

      // Check if there's a manual amount for this creator
      const manualAmount = manualAmounts[creator.id];
      const finalAmount =
        manualAmount !== undefined ? manualAmount : formattedAmount;

      // Check if we're in preview mode - don't create payouts if we are
      if (previewMode) {
        console.log(
          `[PREVIEW MODE] Would create payout of ${finalAmount.toFixed(
            2
          )} ${creatorCurrency} for creator ${creator.id}`
        );

        // Include a list of all revenue-generating products in the preview results
        const productsWithRevenue = productRevenueData.filter(
          (p) => p.revenue > 0
        );

        payoutResults.push({
          creator_id: creator.id,
          creator_name: creator.name,
          success: true,
          message: "Payout preview generated",
          amount: formattedAmount, // This is the calculated amount
          manualAmount: manualAmount, // Include manual amount if provided
          currency: creatorCurrency, // Use creator's currency
          products: productRevenueData,
          revenueProducts: productsWithRevenue.length,
        });
        continue;
      }

      // Create payout record (only in non-preview mode)
      const { error: payoutError } = await supabase.from("payout").insert({
        creator_id: creator.id,
        amount: finalAmount, // Use manual amount if provided, otherwise use calculated amount
        status: "pending",
        method: creator.payment_method || "iban", // Include payment method from creator profile
        currency: creatorCurrency, // Add creator's currency
        created_at: new Date().toISOString(),
        payout_month: { start: firstDay, end: lastDay }, // Store the date range as JSON
        name: creator.name, // Store creator name for easy reference
      });

      if (payoutError) {
        console.error(
          `Error creating payout for creator ${creator.id}:`,
          payoutError
        );
        payoutResults.push({
          creator_id: creator.id,
          creator_name: creator.name,
          success: false,
          error: payoutError.message,
        });
      } else {
        console.log(
          `Created payout of ${finalAmount.toFixed(
            2
          )} ${creatorCurrency} for creator ${creator.id}`
        );

        // Include a list of all revenue-generating products in the payout results
        const productsWithRevenue = productRevenueData.filter(
          (p) => p.revenue > 0
        );

        payoutResults.push({
          creator_id: creator.id,
          creator_name: creator.name,
          success: true,
          message: "Payout created successfully",
          amount: finalAmount, // Use the final amount to match what's stored in DB
          manualAmount: manualAmount, // Include manual amount if provided
          currency: creatorCurrency, // Use creator's currency
          products: productRevenueData, // Include all products for full visibility
          revenueProducts: productsWithRevenue.length, // Count of products with revenue
        });
      }
    }

    console.log({ payoutResults });
    return NextResponse.json({
      message: previewMode
        ? "Monthly payouts preview generated"
        : "Monthly payouts processed successfully",
      period: { start: firstDay, end: lastDay },
      results: payoutResults,
    });
  } catch (error) {
    console.error("Error processing monthly payouts:", error);
    return NextResponse.json(
      { error: "Failed to process monthly payouts" },
      { status: 500 }
    );
  }
}
