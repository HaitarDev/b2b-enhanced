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
    });

    return client;
  } catch (error) {
    console.error("Error creating Shopify Admin API client:", error);
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
