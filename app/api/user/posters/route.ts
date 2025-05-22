import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { ShopifyProduct } from "@/utils/shopifyApi";

// Type for product data from Shopify stats API

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Fetch posters for the current user
    const { data: posters, error } = await supabase
      .from("posters")
      .select("*")
      .eq("creator_id", user.id)
      .order("upload_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each poster, prepare basic data without stats
    // Stats will be fetched client-side for each poster
    const formattedPosters: ShopifyProduct[] = posters.map((poster) => {
      // Extract first image URL from image_urls array or use empty string
      const imageUrls = poster.image_urls as string[] | null;
      const firstImageUrl =
        imageUrls && imageUrls.length > 0 ? imageUrls[0] : "";

      return {
        id: poster.id,
        title: poster.title || "Untitled",
        imageUrl: firstImageUrl,
        status: poster.status || "pending",
        salesCount: poster.sales || 0,
        revenue: 0, // Will be filled in by client-side API call
        commission: 0, // Will be filled in by client-side API call
        shopifyUrl: poster.shopify_url || "",
        shopifyProductId: poster.shopify_product_id || "",
      };
    });

    return NextResponse.json({ posters: formattedPosters });
  } catch (error) {
    console.error("Error fetching posters:", error);
    return NextResponse.json(
      { error: "Failed to fetch posters" },
      { status: 500 }
    );
  }
}
