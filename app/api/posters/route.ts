import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Define the Supabase data types
type CreatorRow = {
  id: string;
  name: string;
};

type PosterRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected" | "willBeDeleted" | null;
  upload_date: string | null;
  description: string | null;
  drive_link: string | null;
  shopify_url: string | null;
  shopify_product_id: string | null;
  prices: Record<string, string> | null;
  creator_id: string;
  creators: CreatorRow;
};

type PosterUpdateData = {
  status?: "pending" | "approved" | "rejected" | "willBeDeleted";
  shopify_url?: string;
  shopify_product_id?: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch posters with creator information using join
    const { data, error } = await supabase
      .from("posters")
      .select(
        `
        id, 
        title, 
        image_url, 
        status, 
        upload_date, 
        description, 
        drive_link, 
        shopify_url, 
        shopify_product_id,
        prices,
        creator_id,
        profiles(id, name)
      `
      )
      .order("upload_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posters = data as unknown as PosterRow[];

    // Format posters to match expected client structure
    const formattedPosters = posters.map((poster) => {
      return {
        id: poster.id,
        creatorId: poster.creator_id,
        creatorName: poster.creators?.name || "Unknown Creator",
        title: poster.title || "Untitled",
        imageUrl: poster.image_url || "",
        status: poster.status || "pending",
        uploadDate: poster.upload_date
          ? new Date(poster.upload_date).toLocaleDateString()
          : "Unknown date",
        description: poster.description || "",
        driveLink: poster.drive_link || "",
        shopifyUrl: poster.shopify_url || "",
        shopifyProductId: poster.shopify_product_id || "",
        prices: poster.prices || {},
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

export async function PATCH(request: Request) {
  try {
    const { id, status, shopifyUrl, shopifyProductId } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Poster ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Prepare update data
    const updateData: PosterUpdateData = {};

    if (status) {
      updateData.status = status;
    }

    if (shopifyUrl !== undefined) {
      updateData.shopify_url = shopifyUrl;
    }

    if (shopifyProductId !== undefined) {
      updateData.shopify_product_id = shopifyProductId;
    }

    // Update the poster
    const { error } = await supabase
      .from("posters")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Poster updated successfully",
      updatedFields: updateData,
    });
  } catch (error) {
    console.error("Error updating poster:", error);
    return NextResponse.json(
      { error: "Failed to update poster" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Poster ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Delete the poster
    const { error } = await supabase.from("posters").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Poster deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting poster:", error);
    return NextResponse.json(
      { error: "Failed to delete poster" },
      { status: 500 }
    );
  }
}
