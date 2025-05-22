"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface PosterFormData {
  title: string;
  description: string;
  driveLink: string | null;
  selectedSizes: string[];
  prices: Record<string, string>;
  imageUrls: Record<string, string>;
}

export async function submitPoster(data: PosterFormData) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log(session);
    if (!session) {
      return {
        success: false,
        error: "You must be logged in to submit posters",
      };
    }

    const userId = session.user.id;

    // Prepare data for insertion
    const posterData = {
      title: data.title,
      description: data.description,
      drive_link: data.driveLink,
      selected_sizes: data.selectedSizes,
      prices: data.prices,
      image_urls: data.imageUrls,
      status: "pending",
      creator_id: userId,
      created_at: new Date().toISOString(),
      sales: 0,
    };

    // Insert into posters table
    const { error } = await supabase.from("posters").insert(posterData);

    if (error) {
      console.error("Error submitting poster:", error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard page
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in submitPoster:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
