import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET all posters
export async function GET() {
  try {
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

    // Verify admin role
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

    // Fetch all posters with creator information
    const { data, error } = await supabase.from("posters").select(`
        *,
        profiles:creator_id (
          id,
          name,
          email
        )
      `);

    if (error) {
      throw error;
    }

    // Format the data to match the expected structure
    const formattedPosters = data.map((poster) => ({
      id: poster.id,
      creatorId: poster.creator_id,
      creatorName: poster.profiles.name || "Unknown",
      title: poster.title || "Untitled",
      imageUrl: poster.image_url || "",
      status: poster.status || "pending",
      uploadDate: new Date(poster.created_at).toLocaleDateString(),
      description: poster.description || "",
      driveLink: poster.drive_link || "",
      shopifyUrl: poster.shopify_url || "",
      shopifyProductId: poster.shopify_product_id || "",
      prices: poster.prices || {},
    }));

    return NextResponse.json(formattedPosters);
  } catch (error) {
    console.error("Error fetching posters:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}

// Update a poster's status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { posterId, status, shopifyUrl, shopifyProductId } = body;

    if (!posterId) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
        }
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

    // Verify admin role
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

    // Update poster
    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
    }

    if (shopifyUrl !== undefined) {
      updateData.shopify_url = shopifyUrl;
    }

    if (shopifyProductId !== undefined) {
      updateData.shopify_product_id = shopifyProductId;
    }

    const { data, error } = await supabase
      .from("posters")
      .update(updateData)
      .eq("id", posterId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating poster:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}

// Delete a poster
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const posterId = url.searchParams.get("id");

    if (!posterId) {
      return new NextResponse(
        JSON.stringify({ error: "Poster ID is required" }),
        {
          status: 400,
        }
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

    // Verify admin role
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

    // Delete poster
    const { error } = await supabase
      .from("posters")
      .delete()
      .eq("id", posterId);

    if (error) {
      throw error;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting poster:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}
