import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

    // Fetch approved creators count
    const { count: approvedCreatorsCount, error: approvedError } =
      await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("approved", true)
        .eq("role", "creator");
    console.log({ approvedCreatorsCount, approvedError });

    if (approvedError) throw approvedError;

    // Fetch pending creators count
    const { count: pendingCreatorsCount, error: pendingError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("approved", false)
      .eq("role", "creator");

    console.log({ pendingCreatorsCount, pendingError });
    if (pendingError) throw pendingError;

    // Fetch unresolved support tickets count (not solved)
    const { count: unresolvedTicketsCount, error: ticketsError } =
      await supabase
        .from("support_messages")
        .select("*", { count: "exact", head: true })
        .neq("status", "solved")
        .order("created_at", { ascending: false });
    console.log({ unresolvedTicketsCount, ticketsError });
    if (ticketsError) throw ticketsError;

    // Calculate total amount of successful payouts (completed status)
    const { data: successfulPayoutsData, error: payoutsError } = await supabase
      .from("payout")
      .select("amount")
      .eq("status", "completed");

    if (payoutsError) {
      console.error("Error fetching successful payouts:", payoutsError);
      throw payoutsError;
    }

    // Sum up all successful payout amounts
    const totalSuccessfulPayouts = successfulPayoutsData.reduce(
      (total, payout) => {
        return total + (parseFloat(payout.amount) || 0);
      },
      0
    );

    console.log({
      totalSuccessfulPayouts,
      successfulPayoutsCount: successfulPayoutsData.length,
    });

    return NextResponse.json({
      approvedCreatorsCount,
      pendingCreatorsCount,
      unresolvedTicketsCount,
      totalSuccessfulPayouts,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}
