import { createClient } from "@/utils/supabase/server";
import {
  createAdminApiClient,
  createGraphQLClient,
  getShopifyAccessToken,
} from "@/utils/shopify/client";
import { NextResponse } from "next/server";

// Define types for GraphQL response to avoid using 'any'
interface ShopifyGraphQLResponse {
  body: {
    data?: {
      shop?: {
        name: string;
        myshopifyDomain: string;
        plan?: {
          displayName: string;
          partnerDevelopment: boolean;
        };
        primaryDomain?: {
          url: string;
          host: string;
        };
        timezoneOffset?: string;
        currencyCode?: string;
        featuredProducts?: {
          edges: Array<{
            node: {
              id: string;
              title: string;
            };
          }>;
        };
        customerAccounts?: string;
        analyticsToken?: string;
      };
    };
    errors?: Array<{
      message: string;
    }>;
  };
  headers: Record<string, string | string[]>;
}

// Define shop data type
interface ShopData {
  basicInfo: Record<string, unknown>;
  graphqlInfo?: Record<string, unknown>;
}

export async function GET() {
  try {
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

    // Uncomment to enforce admin-only access
    /*
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }
    */

    try {
      // Get Shopify Access Token
      const accessToken = getShopifyAccessToken();
      console.log({ accessToken });

      // Create REST and GraphQL clients
      const restClient = await createAdminApiClient(accessToken);
      const graphqlClient = await createGraphQLClient(accessToken);

      try {
        // Fetch shop information using REST API
        const { body: shopInfo } = await restClient.get({
          path: "shop",
        });

        try {
          // Fetch shop metrics using GraphQL
          const graphqlResponse = await graphqlClient.query({
            data: `{
              shop {
                name
                myshopifyDomain
                plan {
                  displayName
                  partnerDevelopment
                }
                primaryDomain {
                  url
                  host
                }
                timezoneOffset
                currencyCode
                featuredProducts: products(first: 5) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
                customerAccounts
                }
                }`,
          });
          // analyticsToken

          // Format shop data with proper typing
          const shopData: ShopData = {
            basicInfo: shopInfo.shop,
          };

          // Safely access GraphQL data
          const typedResponse =
            graphqlResponse as unknown as ShopifyGraphQLResponse;
          if (typedResponse?.body?.data?.shop) {
            shopData.graphqlInfo = typedResponse.body.data.shop;
          }

          return NextResponse.json({ shopData });
        } catch (graphqlError) {
          console.error("GraphQL query failed:", graphqlError);
          // Return partial data if GraphQL fails but REST succeeded
          return NextResponse.json({
            shopData: { basicInfo: shopInfo.shop },
            errors: {
              graphql:
                graphqlError instanceof Error
                  ? graphqlError.message
                  : String(graphqlError),
            },
          });
        }
      } catch (restError) {
        console.error("REST API request failed:", restError);
        return new NextResponse(
          JSON.stringify({
            error: "Failed to fetch store information",
            details:
              restError instanceof Error
                ? restError.message
                : String(restError),
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
    console.error("Error fetching Shopify store information:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch store information",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
// {"products":[{"id":15065137742211,"title":"Abstract Form Poster","vendor":"Deinspar","product_type":"","created_at":"2025-03-09T13:37:49+01:00","updated_at":"2025-04-21T22:20:28+02:00","tags":"vertical","status":"active","variants":[{"product_id":15065137742211,"id":55142541754755,"title":"21x30 cm / Weiter ohne Rahmen","price":"13.99","position":1,"inventory_policy":"deny","compare_at_price":"24.99","option1":"21x30 cm","option2":"Weiter ohne Rahmen","option3":null,"created_at":"2025-03-09T13:37:49+01:00","updated_at":"2025-03-31T21:11:39+02:00","taxable":true,"barcode":null,"fulfillment_service":"manual","grams":0,"inventory_management":"shopify","requires_shipping":true,"sku":null,"weight":0,"weight_unit":"kg","inventory_item_id":53737754788227,"inventory_quantity":99999,"old_inventory_quantity":99999,"admin_graphql_api_id":"gid://shopify/ProductVariant/55142541754755","image_id":74533807456643},{"product_id":15065137742211,"id":55142541787523,"title":"21x30 cm / Bilderrahmen Holz Eiche","price":"34.99","position":2,"inventory_policy":"deny","compare_at_price":"48.99","option1":"21x30 cm","option2":"Bilderrahmen Holz Eiche","option3":null,"created_at":"2025-03-09T13:37:49+01:00","updated_at":"2025-03-31T21:11:39+02:00","taxable":true,"barcode":null,"fulfillment_service":"manual","grams":0,"inventory_management":"shopify","requires_shipping":true,"sku":null,"weight":0,"weight_unit":"kg","inventory_item_id":53737754820995,"inventory_quantity":100000,"old_inventory_quantity":100000,"admin_graphql_api_id":"gid://shopify/ProductVariant/55142541787523","image_id":74533807653251},
