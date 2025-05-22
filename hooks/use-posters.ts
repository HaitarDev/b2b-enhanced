"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { z } from "zod";

// Define poster status mapping from Supabase enum to UI-friendly strings
const statusMapping = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  willBeDeleted: "Will be deleted",
};

// Define the schema for poster data
export const posterSchema = z.object({
  id: z.string(),
  title: z.string(),
  sales: z.number(),
  status: z.enum([
    "Approved",
    "Rejected",
    "Pending",
    "Will be deleted",
    "Deleted",
  ]),
  revenue: z.number().optional(),
  commission: z.number().optional(),
  image_urls: z.any().optional(), // This should match your Supabase schema
  shopify_url: z.string().optional(),
  creator_id: z.string(),
});

export type Poster = z.infer<typeof posterSchema>;

export function usePosters() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["posters"],
    queryFn: async () => {
      try {
        // Get current authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Fetch user's posters from Supabase
        const { data: postersData, error } = await supabase
          .from("posters")
          .select("*")
          .eq("creator_id", user.id);

        if (error) {
          throw new Error(error.message);
        }

        // Transform the data to match our schema
        const transformedPosters: Poster[] = postersData.map((poster) => ({
          id: poster.id,
          title: poster.title,
          sales: poster.sales || 0,
          // Map the status from Supabase enum to UI-friendly strings
          status: statusMapping[
            poster.status as keyof typeof statusMapping
          ] as Poster["status"],
          // Calculate revenue and commission based on sales (or use actual values if available)
          revenue: poster.revenue || poster.sales * 20, // Assume average of $20 per sale
          commission: poster.commission || poster.sales * 6, // Assume 30% commission
          image_urls: poster.image_urls, // This should be a URL or array of URLs
          shopify_url: poster.shopify_url,
          creator_id: poster.creator_id,
        }));

        return transformedPosters;
      } catch (error) {
        console.error("Error fetching posters:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
