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

    // Fetch new support tickets count
    const { count: newTicketsCount, error: ticketsError } = await supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .order("created_at", { ascending: false });
    console.log({ newTicketsCount, ticketsError });
    if (ticketsError) throw ticketsError;

    // For now, we're setting total payouts to 0
    const totalPayouts = 0;

    return NextResponse.json({
      approvedCreatorsCount,
      pendingCreatorsCount,
      newTicketsCount,
      totalPayouts,
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
