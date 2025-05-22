// Types for Shopify API responses
export interface ShopifyProduct {
  id: string;
  title: string;
  handle?: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "willBeDeleted"
    | "active"
    | "draft"
    | "archived";
  variants?: {
    id: string;
    price: string;
    inventory_quantity: number;
  }[];
  images?: {
    id: string;
    src: string;
  }[];
  tags?: string[];
  vendor?: string;
  created_at?: string;
  updated_at?: string;

  // Additional fields from our Supabase implementation
  imageUrl: string;
  salesCount: number;
  revenue: number;
  commission: number;
  shopifyUrl: string;
  shopifyProductId: string;
}

export interface ShopifyLineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  sku?: string;
  variant_id?: string;
  product_id: string;
}

export interface ShopifyOrder {
  id: string;
  order_number?: number;
  name?: string; // Order name like "#1001"
  financial_status?: string;
  fulfillment_status?: string | null;
  created_at?: string;
  processed_at?: string;
  total_price?: string;
  lineItems?: ShopifyLineItem[];
  totalAmount?: string; // For consistency with GraphQL API response
  customer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  // Additional fields from API responses
  createdAt?: string; // Alternative field name from GraphQL API
  orderNumber?: string; // Alternative field from API
}

export interface ShopifyStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  activeProducts: number;
  pendingOrders: number;
  completedOrders: number;
  productCount: number;
  totalCommission: number;
  approvedProductsCount: number;
}

// Function to fetch products from Shopify API
export const fetchShopifyProducts = async (
  vendorName: string,
  startDate?: string,
  endDate?: string
): Promise<ShopifyProduct[]> => {
  try {
    // Prepare query parameters for Shopify API request
    const queryParams = new URLSearchParams();
    queryParams.append("vendor", encodeURIComponent(vendorName));

    // Add date range parameters - these are critical for revenue calculation
    if (startDate) {
      queryParams.append("start_date", startDate);
    }
    if (endDate) {
      queryParams.append("end_date", endDate);
    }

    console.log(
      `[ShopifyAPI] Fetching products for vendor ${vendorName} with date range:`,
      { startDate, endDate }
    );

    // Make the API call with date parameters to get proper revenue data
    const response = await fetch(
      `/api/shopify/products?${queryParams.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error fetching products: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const products = await response.json();

    // Log for debugging
    console.log(
      `[ShopifyAPI] Fetched ${products.length} products with revenue data for date range:`,
      { startDate, endDate, vendorName }
    );

    // Debug logging for sales data
    let totalSales = 0;
    let totalRevenue = 0;
    products.forEach((product: ShopifyProduct) => {
      totalSales += product.salesCount || 0;
      totalRevenue += product.revenue || 0;

      if (product.salesCount > 0) {
        console.log(
          `[ShopifyAPI] Product ${product.title} (${
            product.shopifyProductId
          }): ${product.salesCount} sales, Revenue: ${product.revenue.toFixed(
            2
          )}, Commission: ${product.commission.toFixed(2)}`
        );
      }
    });

    console.log(
      `[ShopifyAPI] Total sales: ${totalSales}, Total revenue: ${totalRevenue.toFixed(
        2
      )}`
    );

    return products;
  } catch (error) {
    console.error("[ShopifyAPI] Error fetching Shopify products:", error);
    throw error;
  }
};

// Function to fetch orders from Shopify API
export const fetchShopifyOrders = async (
  vendorName: string,
  startDate?: string,
  endDate?: string
): Promise<ShopifyOrder[]> => {
  try {
    // In a real app, this would make an API call to your backend
    const response = await fetch(
      `/api/shopify/orders?vendor=${encodeURIComponent(vendorName)}${
        startDate ? `&start_date=${startDate}` : ""
      }${endDate ? `&end_date=${endDate}` : ""}`
    );

    if (!response.ok) {
      throw new Error(`Error fetching orders: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Shopify orders:", error);
    throw error;
  }
};

// Calculate statistics from products and orders
export const calculateShopifyStats = (
  products: ShopifyProduct[],
  orders: ShopifyOrder[]
): ShopifyStats => {
  // Calculate total products and active products
  const totalProducts = products.length;
  const activeProducts = products.filter(
    (product) => product.status === "active"
  ).length;

  // Calculate sales metrics
  let totalSales = 0;
  let totalRevenue = 0;
  let pendingOrders = 0;
  let completedOrders = 0;

  // Process orders
  orders.forEach((order) => {
    // Count order status
    if (order.fulfillment_status === "fulfilled") {
      completedOrders++;
    } else {
      pendingOrders++;
    }

    // Count line items for sales total
    if (order.lineItems && Array.isArray(order.lineItems)) {
      order.lineItems.forEach((item) => {
        if (item.quantity && item.price) {
          totalSales += item.quantity;
          totalRevenue += parseFloat(item.price) * item.quantity;
        }
      });
    } else if (order.totalAmount) {
      // If we don't have line items but do have a total amount
      totalRevenue += parseFloat(order.totalAmount);
      totalSales += 1; // Count at least one sale
    }
  });

  return {
    totalSales,
    totalRevenue,
    totalProducts,
    activeProducts,
    pendingOrders,
    completedOrders,
    productCount: totalProducts,
    totalCommission: totalRevenue * 0.3, // Artist gets 30%
    approvedProductsCount: products.filter(
      (product) => product.status === "approved"
    ).length,
  };
};
