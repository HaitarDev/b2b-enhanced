import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Parse query parameters for date filtering
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date") || undefined;
    const endDate = url.searchParams.get("end_date") || undefined;

    // Get current user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query for payouts
    let query = supabase
      .from("payout")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    // Apply date filtering if provided
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      // Add one day to include the end date fully
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt("created_at", nextDay.toISOString().split("T")[0]);
    }

    // Execute the query
    const { data: payouts, error } = await query;

    if (error) {
      console.error("Error fetching payouts:", error);
      return NextResponse.json(
        { error: "Failed to fetch payout data" },
        { status: 500 }
      );
    }

    // Get total lifetime earnings
    const { data: lifetimeData, error: lifetimeError } = await supabase
      .from("payout")
      .select("amount")
      .eq("creator_id", user.id);

    if (lifetimeError) {
      console.error("Error fetching lifetime earnings:", lifetimeError);
    }

    // Calculate total lifetime earnings
    const lifetimeEarnings = lifetimeData
      ? lifetimeData.reduce((sum, payout) => sum + (payout.amount || 0), 0)
      : 0;

    return NextResponse.json({
      payouts: payouts || [],
      lifetimeEarnings,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
