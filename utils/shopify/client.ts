import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api";

const shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  scopes: ["read_products", "read_orders", "read_customers", "read_analytics"],
  hostName: process.env.SHOPIFY_SHOP_DOMAIN?.replace(/https?:\/\//, "") || "",
  hostScheme: "https" as const,
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
  logger: { level: process.env.NODE_ENV === "production" ? 0 : 2 }, // Suppress deprecation warnings in production
};

console.log("Shopify configuration:", {
  apiKey: shopifyConfig.apiKey ? "[REDACTED]" : "missing",
  apiSecret: shopifyConfig.apiSecretKey ? "[REDACTED]" : "missing",
  hostName: shopifyConfig.hostName || "missing",
  apiVersion: shopifyConfig.apiVersion,
});

const shopify = shopifyApi(shopifyConfig);

export async function createAdminApiClient(accessToken: string) {
  try {
    const session = new Session({
      id: "",
      shop: `${shopifyConfig.hostName}`,
      state: "",
      isOnline: false,
      scope: shopifyConfig.scopes.join(","),
      accessToken,
    });

    const client = new shopify.clients.Rest({
      session,
      apiVersion: LATEST_API_VERSION,
    });

    return client;
  } catch (error) {
    console.error("Error creating Shopify Admin API client:", error);
    throw error;
  }
}

/**
 * Safely fetch a product from Shopify, handling 404 errors gracefully
 * @param client Shopify REST client
 * @param productId Product ID to fetch
 * @returns The product data or null if not found
 */
export async function safelyFetchProduct(client: any, productId: string) {
  try {
    const { body: productData } = await client.get({
      path: `products/${productId}`,
    });
    return productData;
  } catch (error: any) {
    // Handle 404 errors gracefully
    if (error.response && error.response.code === 404) {
      console.warn(`Product ${productId} not found in Shopify store`);
      // Return a minimal product structure to prevent downstream errors
      return {
        product: {
          id: productId,
          title: "Product Not Found",
          handle: "product-not-found",
          images: [],
          variants: [],
          status: "archived",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: null,
        },
      };
    }
    // Re-throw other errors
    throw error;
  }
}

export async function createGraphQLClient(accessToken: string) {
  try {
    const session = new Session({
      id: "",
      shop: `${shopifyConfig.hostName}`,
      state: "",
      isOnline: false,
      scope: shopifyConfig.scopes.join(","),
      accessToken,
    });

    console.log("Creating GraphQL client with session for shop:", session.shop);

    const client = new shopify.clients.Graphql({
      session,
      apiVersion: LATEST_API_VERSION,
    });

    return client;
  } catch (error) {
    console.error("Error creating Shopify GraphQL client:", error);
    throw error;
  }
}

// Get access token from env variable or secure storage
export function getShopifyAccessToken() {
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Shopify Admin API access token not found");
  }

  return accessToken;
}
